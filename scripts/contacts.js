import { auth, db } from './firebase.js';
import { get, push, ref } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getInitials, isBackdropClick, setFieldError } from "../script.js";
import { getContactErrors } from "./contactValidation.js";

const contactDialog = document.getElementById('contact-dialog');
const contactForm = document.getElementById('contact-form');
const contactFields = ['name', 'email', 'phone'];
const contactSubmit = contactForm.querySelector('button[type="submit"]');
const contactFormNote = document.getElementById('contact-form-note');
const contactStatus = document.getElementById('contact-status');
const contactList = document.getElementById('contact-list');
const contactListStatus = document.getElementById('contact-list-status');
const contactDetails = document.getElementById('contact-details');

let contactLoadId = 0;

onAuthStateChanged(auth, handleContactAuthChange);

document.getElementById('add-contact').addEventListener('click', openContactForm);
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

/** Opens a fresh contact form. */
function openContactForm() {
    resetContactForm();
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
        email: contactForm.elements.email.value.trim(),
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
    await writeNewContact(contact);
}

/**
 * Saves the contact and keeps the form open on failure.
 * @param {{name: string, email: string, phone: string}} contact - Valid contact values.
 */
async function writeNewContact(contact) {
    setContactSaving(true);
    try {
        await auth.authStateReady();
        const user = auth.currentUser;
        if (!user) throw new Error('Sign in before adding a contact.');
        await push(ref(db, 'contacts'), contact);
        if (auth.currentUser?.uid === user.uid) finishContactSave(user);
    } catch {
        contactFormNote.textContent = 'Could not save the contact. Check your connection or sign in again.';
        return;
    } finally {
        setContactSaving(false);
    }
}

/**
 * Returns to the list and reloads it after a successful save.
 * @param {object} user - Current Firebase user.
 */
function finishContactSave(user) {
    resetContactForm();
    contactDialog.close();
    contactStatus.textContent = 'Contact saved.';
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
    contactList.replaceChildren();
    contactDetails.hidden = true;
    contactStatus.textContent = '';
    return loadContacts(user);
}

/**
 * Loads contacts while keeping already displayed rows visible.
 * @param {object|null} user - Current Firebase user.
 */
async function loadContacts(user) {
    const loadId = ++contactLoadId;
    contactListStatus.textContent = user ? 'Loading contacts…' : 'Sign in to view contacts.';
    if (!user) return;
    try {
        const snapshot = await get(ref(db, 'contacts'));
        if (loadId === contactLoadId && auth.currentUser?.uid === user.uid) showContacts(snapshot.val());
    } catch {
        if (loadId !== contactLoadId || auth.currentUser?.uid !== user.uid) return;
        contactListStatus.textContent = contactList.children.length ? 'Could not refresh contacts.' : 'Could not load contacts.';
    }
}

/**
 * Sorts saved contacts and groups their rows by first letter.
 * @param {object|null} records - Contacts returned by Firebase.
 */
function showContacts(records) {
    contactList.replaceChildren();
    const contacts = Object.values(records || {})
        .filter(contact => typeof contact?.name === 'string' && contact.name.trim())
        .sort((first, second) => first.name.localeCompare(second.name, undefined, { sensitivity: 'base' }));
    contactListStatus.textContent = contacts.length ? '' : 'No contacts yet.';
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
    row.querySelector('.contact-list-avatar').textContent = getInitials(contact.name);
    row.querySelector('.contact-list-name').textContent = contact.name;
    row.querySelector('.contact-list-email').textContent = contact.email || '';
    row.querySelector('button').addEventListener('click', () => showContactDetails(contact));
    return row;
}

/**
 * Displays the saved details of the selected contact.
 * @param {object} contact - Saved contact.
 */
function showContactDetails(contact) {
    const name = document.getElementById('contact-detail-name');
    name.textContent = contact.name;
    document.getElementById('contact-detail-email').textContent = contact.email || '—';
    document.getElementById('contact-detail-phone').textContent = contact.phone || '—';
    contactDetails.hidden = false;
    name.focus();
}
