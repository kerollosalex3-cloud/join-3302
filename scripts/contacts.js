import { auth, db, userPath } from './firebase.js';
import { get, push, ref, runTransaction, update } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getAssigneeColors, getInitials, isBackdropClick, setFieldError } from "../script.js";
import { getContactErrors } from "./contactValidation.js";
import { getContactDeletion, readContactRecords, readOwnContact } from './contactData.js';
import { bindLogout } from './pageSession.js';

const contactDialog = document.getElementById('contact-dialog');
const contactForm = document.getElementById('contact-form');
const contactFields = ['name', 'email', 'phone'];
const contactSubmit = contactForm.querySelector('button[type="submit"]');
const contactFormNote = document.getElementById('contact-form-note');
const contactStatus = document.getElementById('contact-status');
const contactList = document.getElementById('contact-list');
const contactListStatus = document.getElementById('contact-list-status');
const contactDetails = document.getElementById('contact-details');
const editContactButton = document.getElementById('edit-contact');
const deleteContactButton = document.getElementById('delete-contact');

const contactSearch = document.getElementById('contact-search');
const contactSearchStatus = document.getElementById('contact-search-status');
let contactLoadId = 0;
let savedContacts = [];
let selectedContact = null;
let editingContactId = null;
let ownContact = null;

onAuthStateChanged(auth, handleContactAuthChange);
contactSearch.addEventListener('input', filterContacts);
bindLogout(document.getElementById('contacts-logout'), contactStatus);

document.getElementById('add-contact').addEventListener('click', () => openContactForm());
editContactButton.addEventListener('click', () => openContactForm(selectedContact));
deleteContactButton.addEventListener('click', deleteSelectedContact);
document.getElementById('close-contact').addEventListener('click', closeContactForm);
document.getElementById('cancel-contact').addEventListener('click', closeContactForm);
contactForm.addEventListener('submit', saveContact);
contactDialog.addEventListener('click', event => {
    if (isBackdropClick(event, contactDialog)) closeContactForm();
});
contactDialog.addEventListener('cancel', event => {
    if (contactSubmit.disabled) event.preventDefault();
});
contactDialog.addEventListener('close', () => document.body.classList.remove('contact-dialog-open'));
contactDialog.addEventListener('keydown', keepContactFormFocus);
contactForm.addEventListener('input', clearContactFieldError);

/**
 * Opens the same form for a new or existing contact.
 * @param {object|null} contact - Contact to edit, if selected.
 */
function openContactForm(contact = null) {
    resetContactForm();
    editingContactId = contact?.id || null;
    document.getElementById('contact-dialog-title').textContent = contact ? 'Edit contact' : 'Add contact';
    contactSubmit.textContent = contact ? 'Save contact' : 'Create contact';
    if (contact) contactFields.forEach(field => { contactForm.elements[field].value = contact[field] || ''; });
    contactStatus.textContent = '';
    contactDialog.showModal();
    document.body.classList.add('contact-dialog-open');
    contactForm.elements.name.focus();
}

/** Clears contact fields and their messages. */
function resetContactForm() {
    contactForm.reset();
    contactFormNote.textContent = '';
    contactFields.forEach(field => setContactFieldError(field, ''));
}

/** Closes the contact form without saving data. */
function closeContactForm() {
    if (!contactSubmit.disabled) contactDialog.close();
}

/** Keeps Tab navigation inside the open contact form.
 * @param {KeyboardEvent} event - Dialog keyboard event.
 */
function keepContactFormFocus(event) {
    if (event.key !== 'Tab') return;
    const controls = contactDialog.querySelectorAll('button:not(:disabled), input');
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    }
}

/** Reads trimmed contact input values.
 * @returns {{name: string, email: string, phone: string}} Contact values.
 */
function readContactForm() {
    return {
        name: contactForm.elements.name.value.trim(),
        email: contactForm.elements.email.value.trim().toLowerCase(),
        phone: contactForm.elements.phone.value.trim()
    };
}

/** Shows a validation message below one input.
 * @param {string} field - Input name.
 * @param {string} message - Error text, empty when valid.
 */
function setContactFieldError(field, message) {
    setFieldError(
        contactForm.elements[field],
        document.getElementById(`${field}-error`),
        message
    );
}

/** Clears the old error while the user corrects a field.
 * @param {Event} event - Input event.
 */
function clearContactFieldError(event) {
    if (contactFields.includes(event.target.name)) setContactFieldError(event.target.name, '');
}

/**
 * Checks the form before saving a contact.
 * @param {SubmitEvent} event - Form submit event.
 */
async function saveContact(event) {
    event.preventDefault();
    if (contactSubmit.disabled) return;
    const contact = readContactForm();
    const errors = getContactErrors(contact);
    contactFields.forEach(field => setContactFieldError(field, errors[field]));
    const firstError = contactFields.find(field => errors[field]);
    if (firstError) return contactForm.elements[firstError].focus();
    await writeContact(contact);
}

/**
 * Saves the contact and keeps the form open on failure.
 * @param {{name: string, email: string, phone: string}} contact - Valid contact values.
 */
async function writeContact(contact) {
    setContactSaving(true);
    try {
        await auth.authStateReady();
        const user = auth.currentUser;
        if (!user) throw new Error('Sign in before adding a contact.');
        const id = await persistContact(contact, user);
        if (auth.currentUser?.uid === user.uid) finishContactSave(user, id, contact);
    } catch {
        contactFormNote.textContent = 'Could not save the contact. Check your connection or sign in again.';
    } finally {
        setContactSaving(false);
    }
}

/**
 * Saves a contact and keeps edits from recreating a deleted record.
 * @param {object} values - Validated contact values.
 * @param {object} user - Signed-in account.
 * @returns {Promise<string>} Saved contact key.
 */
async function persistContact(values, user) {
    if (editingContactId === ownContact?.id) {
        await update(ref(db, userPath(user.uid)), values);
        return editingContactId;
    }
    return persistSharedContact(values);
}

/**
 * Writes a contact from the shared list.
 * @param {object} values - Validated contact values.
 * @returns {Promise<string>} Saved contact key.
 */
async function persistSharedContact(values) {
    if (!editingContactId) return (await push(ref(db, 'contacts'), values)).key;
    const id = editingContactId;
    const result = await runTransaction(ref(db, `contacts/${id}`), current => {
        return current ? { ...current, ...values } : null;
    }, { applyLocally: false });
    if (!result.committed || !result.snapshot.exists()) throw new Error('Contact no longer exists.');
    return id;
}

/** Confirms deletion of the selected contact. */
function deleteSelectedContact() {
    if (!selectedContact || selectedContact.id === ownContact?.id || !auth.currentUser || deleteContactButton.disabled) return;
    if (window.confirm(`Delete ${selectedContact.name}?`)) removeContact(selectedContact.id, auth.currentUser);
}

/**
 * Deletes the contact and clears their task assignments together.
 * @param {string} id - Contact key.
 * @param {object} user - Current Firebase user.
 */
async function removeContact(id, user) {
    deleteContactButton.disabled = editContactButton.disabled = true;
    try {
        const tasks = await get(ref(db, 'tasks'));
        await update(ref(db), getContactDeletion(id, tasks.val()));
        if (auth.currentUser?.uid === user.uid) finishContactDeletion(id, user);
    } catch {
        contactStatus.textContent = 'Could not delete the contact.';
    } finally {
        deleteContactButton.disabled = editContactButton.disabled = false;
    }
}

/**
 * Updates the list after Firebase confirms deletion.
 * @param {string} id - Deleted contact.
 * @param {object} user - Current Firebase user.
 */
function finishContactDeletion(id, user) {
    if (selectedContact?.id === id) {
        selectedContact = null;
        contactDetails.hidden = true;
        document.getElementById('add-contact').focus();
    }
    savedContacts = savedContacts.filter(contact => contact.id !== id);
    filterContacts();
    contactStatus.textContent = 'Contact deleted.';
    loadContacts(user);
}

/**
 * Returns to the list and reloads it after a successful save.
 * @param {object} user - Current Firebase user.
 * @param {string} id - Saved contact key.
 * @param {object} contact - Saved contact fields.
 */
function finishContactSave(user, id, contact) {
    contactStatus.textContent = editingContactId ? 'Contact updated.' : 'Contact saved.';
    if (editingContactId && selectedContact?.id === id) showContactDetails({ ...contact, id }, false);
    resetContactForm();
    contactDialog.close();
    loadContacts(user);
}

/**
 * Prevents changes and repeat submissions while saving.
 * @param {boolean} saving - Whether a save is pending.
 */
function setContactSaving(saving) {
    contactSubmit.disabled = saving;
    contactFields.forEach(field => {
        contactForm.elements[field].readOnly = saving;
    });
    if (saving) contactFormNote.textContent = 'Saving contact…';
}

/**
 * Clears contacts from the previous account and loads the current list.
 * @param {object|null} user - Current Firebase user.
 */
function handleContactAuthChange(user) {
    savedContacts = [];
    selectedContact = ownContact = null;
    editingContactId = null;
    contactSearch.value = '';
    filterContacts();
    contactDetails.hidden = true;
    contactStatus.textContent = '';
    if (!user) return window.location.replace('../index.html');
    return loadContacts(user);
}

/**
 * Loads contacts while keeping already displayed rows visible.
 * @param {object|null} user - Current Firebase user.
 */
async function loadContacts(user) {
    const loadId = ++contactLoadId;
    contactListStatus.textContent = 'Loading contacts…';
    try {
        const [snapshot, profile] = await Promise.all([get(ref(db, 'contacts')), readOwnContact(user)]);
        if (loadId === contactLoadId && auth.currentUser?.uid === user.uid) showContacts(snapshot.val(), profile);
    } catch {
        if (loadId !== contactLoadId || auth.currentUser?.uid !== user.uid) return;
        contactListStatus.textContent = savedContacts.length ? 'Could not refresh contacts.' : 'Could not load contacts.';
    }
}

/**
 * Stores contacts in alphabetical order and updates the visible list.
 * @param {object|null} records - Contacts returned by Firebase.
 * @param {object|null} profile - Private contact for the signed-in account.
 */
function showContacts(records, profile) {
    ownContact = profile;
    const contacts = { ...records };
    if (profile) contacts[profile.id] = profile;
    savedContacts = readContactRecords(contacts);
    contactListStatus.textContent = savedContacts.length ? '' : 'No contacts yet.';
    filterContacts();
}

/** Filters the list by name, email or phone. */
function filterContacts() {
    const query = contactSearch.value.trim().toLocaleLowerCase();
    const matches = savedContacts.filter(contact =>
        [contact.name, contact.email, contact.phone].some(value =>
            String(value || '').toLocaleLowerCase().includes(query)));
    contactSearchStatus.textContent = query && savedContacts.length && !matches.length
        ? 'No matching contacts.' : '';
    renderContactRows(matches);
}

/**
 * Displays contact rows grouped by letter.
 * @param {object[]} contacts - Visible contacts.
 */
function renderContactRows(contacts) {
    contactList.replaceChildren();
    let previousLetter = '';
    for (const contact of contacts) {
        const letter = contact.name.trim().charAt(0).normalize('NFD').replace(/\p{M}/gu, '').toUpperCase();
        if (letter !== previousLetter) addContactGroup(letter);
        contactList.append(createContactRow(contact));
        previousLetter = letter;
    }
}

/**
 * Adds a letter heading above its contact rows.
 * @param {string} letter - First letter of the name.
 */
function addContactGroup(letter) {
    const group = document.getElementById('contact-group-template').content.firstElementChild.cloneNode(true);
    group.textContent = letter;
    contactList.append(group);
}

/**
 * Creates a list row from the saved name and email.
 * @param {object} contact - Saved contact.
 * @returns {HTMLElement} Contact list row.
 */
function createContactRow(contact) {
    const row = document.getElementById('contact-row-template').content.firstElementChild.cloneNode(true);
    const avatar = row.querySelector('.contact-list-avatar');
    const colors = getAssigneeColors(contact);
    avatar.textContent = getInitials(contact.name);
    avatar.style.backgroundColor = colors.background;
    avatar.style.color = colors.text;
    row.querySelector('.contact-list-name').textContent = contact.id === ownContact?.id ? contact.name + ' (You)' : contact.name;
    row.querySelector('.contact-list-email').textContent = contact.email || '';
    const button = row.querySelector('button');
    button.setAttribute('aria-pressed', String(contact.id === selectedContact?.id));
    button.addEventListener('click', () => selectContact(contact, button));
    return row;
}

/**
 * Highlights the selected contact and displays their details.
 * @param {object} contact - Selected contact.
 * @param {HTMLElement} button - Selected row button.
 */
function selectContact(contact, button) {
    contactList.querySelector('[aria-pressed="true"]')?.setAttribute('aria-pressed', 'false');
    button.setAttribute('aria-pressed', 'true');
    showContactDetails(contact);
}

/**
 * Displays the saved details of the selected contact.
 * @param {object} contact - Saved contact.
 * @param {boolean} [focus] - Whether to focus the detail heading.
 */
function showContactDetails(contact, focus = true) {
    selectedContact = contact;
    deleteContactButton.hidden = contact.id === ownContact?.id;
    const name = document.getElementById('contact-detail-name');
    name.textContent = contact.name;
    document.getElementById('contact-detail-email').textContent = contact.email || '—';
    document.getElementById('contact-detail-phone').textContent = contact.phone || '—';
    contactDetails.hidden = false;
    if (focus) name.focus();
}
