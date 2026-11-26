import { auth, db } from './firebase.js';
import { get, ref } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { getAssigneeColors, getInitials } from '../script.js?v=3';
import { readContactRecords, readOwnContact } from './contactData.js?v=3';

const contactPicker = document.getElementById('task-assignees');
const contactSearch = document.getElementById('task-contact-search');
const contactToggle = document.getElementById('task-contact-toggle');
const contactList = document.getElementById('task-contact-list');
const contactOptions = document.getElementById('task-contact-options');
const contactStatus = document.getElementById('task-contact-status');
const contactTemplate = document.getElementById('task-contact-template');
let contacts = [];
let contactMessage = 'Loading contacts…';
let previousAssignees = [];
let selectionChanged = false;

contactSearch.addEventListener('click', openTaskContacts);
contactSearch.addEventListener('input', openTaskContacts);
contactToggle.addEventListener('click', toggleContactList);
contactOptions.addEventListener('change', handleContactOptionsChange);
contactPicker.addEventListener('keydown', handleContactKeys);
contactPicker.addEventListener('focusout', handleContactFocusOut);
document.addEventListener('click', handleOutsideContactPickerClick);

/** Toggles the contact list and focuses its search field when opened. */
function toggleContactList() {
    if (!contactList.hidden) return closeTaskContacts();
    openTaskContacts();
    contactSearch.focus();
}

/** Marks the contact selection as changed and refreshes its placeholder. */
function handleContactOptionsChange() {
    selectionChanged = true;
    updateContactPlaceholder();
}

/**
 * Closes the contact list when focus moves outside its picker.
 * @param {FocusEvent} event Focus transition.
 */
function handleContactFocusOut(event) {
    if (event.relatedTarget && !contactPicker.contains(event.relatedTarget)) closeTaskContacts();
}

/**
 * Closes the contact list when the user clicks outside its picker.
 * @param {MouseEvent} event Document click.
 */
function handleOutsideContactPickerClick(event) {
    if (!contactPicker.contains(event.target)) closeTaskContacts();
}

/** Opens the contact list and filters its current options. */
function openTaskContacts() {
    contactList.hidden = false;
    contactToggle.setAttribute('aria-expanded', 'true');
    updateContactPlaceholder();
    filterTaskContacts();
}

/** Closes the contact list and restores its placeholder. */
function closeTaskContacts() {
    if (contactList.hidden) return;
    contactList.hidden = true;
    contactToggle.setAttribute('aria-expanded', 'false');
    contactSearch.value = '';
    updateContactPlaceholder();
}

/**
 * Handles keyboard navigation in the contact picker.
 * @param {KeyboardEvent} event Keyboard interaction.
 */
function handleContactKeys(event) {
    if (event.key === 'Escape' && !contactList.hidden) {
        event.preventDefault();
        closeTaskContacts();
        contactToggle.focus();
    }
    if (event.target !== contactSearch) return;
    if (event.key === 'Enter') event.preventDefault();
    if (event.key !== 'ArrowDown') return;
    event.preventDefault();
    openTaskContacts();
    contactOptions.querySelector('.task-contact-option:not([hidden]) input')?.focus();
}

/** Filters contact options by the current search text. */
function filterTaskContacts() {
    const query = contactSearch.value.trim().toLocaleLowerCase();
    let matches = 0;
    for (const row of contactOptions.children) {
        const name = row.querySelector('.task-contact-name').textContent.toLocaleLowerCase();
        row.hidden = !name.includes(query);
        if (!row.hidden) matches++;
    }
    contactStatus.textContent = contactMessage || (matches ? '' : 'No matching contacts.');
    contactStatus.hidden = !contactStatus.textContent;
}

/**
 * Loads shared contacts and the current user's own contact.
 * @param {object} user Signed-in Firebase user.
 * @returns {Promise<void>} Resolves after the picker is updated.
 */
export async function loadTaskAssignees(user) {
    try {
        const [snapshot, ownContact] = await Promise.all([get(ref(db, 'contacts')), readOwnContact(user)]);
        if (isCurrentUser(user)) setLoadedContacts(snapshot.val(), ownContact);
    } catch {
        if (isCurrentUser(user)) showContactLoadError();
    }
}

/**
 * Checks whether the same account is still signed in.
 * @param {object} user Firebase user whose data was requested.
 * @returns {boolean} Whether the requested user is still current.
 */
function isCurrentUser(user) {
    return auth.currentUser?.uid === user.uid;
}

/**
 * Stores loaded contacts and refreshes the picker.
 * @param {object|null} records Shared Firebase contact records.
 * @param {object|null} ownContact Current user's contact record.
 */
function setLoadedContacts(records, ownContact) {
    contacts = readContactRecords(records);
    if (ownContact) contacts.unshift({ ...ownContact, own: true });
    contactMessage = contacts.length ? '' : 'No contacts yet.';
    renderTaskAssignees();
}

/** Displays the contact-loading error in the picker. */
function showContactLoadError() {
    contactMessage = 'Could not load contacts.';
    filterTaskContacts();
}

/**
 * Restores previously assigned contacts.
 * @param {object[]} assignments Saved task assignees.
 */
export function restoreTaskAssignees(assignments = []) {
    previousAssignees = Array.isArray(assignments) ? assignments : [];
    selectionChanged = false;
    renderTaskAssignees();
}

/** Clears the contact selection for a new task. */
export function clearTaskAssignees() {
    closeTaskContacts();
    restoreTaskAssignees();
    selectionChanged = true;
}

/** Renders contacts with their current selected state. */
function renderTaskAssignees() {
    const selected = new Set();
    for (const assignee of previousAssignees) selected.add(assignee?.id);
    contactOptions.replaceChildren();
    for (const contact of contacts) contactOptions.append(createContactOption(contact, selected));
    filterTaskContacts();
    updateContactPlaceholder();
}

/**
 * Creates a contact option with its selected state and avatar.
 * @param {object} contact Contact shown in the picker.
 * @param {Set<string>} selected IDs already assigned to the task.
 * @returns {HTMLElement} Rendered contact option.
 */
function createContactOption(contact, selected) {
    const row = contactTemplate.content.firstElementChild.cloneNode(true);
    const checkbox = row.querySelector('input');
    checkbox.value = contact.id;
    checkbox.checked = selected.has(contact.id);
    setContactAvatar(row, contact);
    setContactName(row, contact);
    return row;
}

/**
 * Sets the contact option's avatar and colors.
 * @param {HTMLElement} row Contact option.
 * @param {object} contact Contact data.
 */
function setContactAvatar(row, contact) {
    const avatar = row.querySelector('.task-contact-avatar');
    const colors = getAssigneeColors(contact);
    avatar.textContent = getInitials(contact.name);
    avatar.style.backgroundColor = colors.background;
    avatar.style.color = colors.text;
}

/**
 * Sets the contact option's displayed name.
 * @param {HTMLElement} row Contact option.
 * @param {object} contact Contact data.
 */
function setContactName(row, contact) {
    const suffix = contact.own ? ' (You)' : '';
    row.querySelector('.task-contact-name').textContent = contact.name + suffix;
}

/**
 * Reads changed task assignees, retaining records absent from the picker.
 * @returns {object[]|null} Updated assignees, or null when unchanged.
 */
export function readTaskAssignees() {
    if (!selectionChanged) return null;
    const checked = getCheckedContactIds();
    const available = getAvailableContactIds();
    return [...getRetainedAssignees(available), ...getSelectedAssignees(checked)];
}

/**
 * Returns the IDs of checked contact options.
 * @returns {Set<string>} Checked contact IDs.
 */
function getCheckedContactIds() {
    const checked = new Set();
    for (const input of contactOptions.querySelectorAll('input:checked')) checked.add(input.value);
    return checked;
}

/**
 * Returns the IDs of contacts currently available in the picker.
 * @returns {Set<string>} Available contact IDs.
 */
function getAvailableContactIds() {
    const available = new Set();
    for (const contact of contacts) available.add(contact.id);
    return available;
}

/**
 * Keeps saved assignees that are not present in the current contact list.
 * @param {Set<string>} available Available contact IDs.
 * @returns {object[]} Assignees that must be retained.
 */
function getRetainedAssignees(available) {
    const retained = [];
    for (const assignee of previousAssignees) {
        if (assignee && !available.has(assignee.id)) retained.push(assignee);
    }
    return retained;
}

/**
 * Builds assignee records for the checked contacts.
 * @param {Set<string>} checked Checked contact IDs.
 * @returns {object[]} Selected assignees.
 */
function getSelectedAssignees(checked) {
    const selected = [];
    for (const contact of contacts) {
        if (checked.has(contact.id)) selected.push(createTaskAssignee(contact));
    }
    return selected;
}

/**
 * Creates the task representation of a contact.
 * @param {object} contact Selected contact.
 * @returns {{id: string, name: string, initials: string}} Task assignee.
 */
function createTaskAssignee(contact) {
    return {
        id: contact.id,
        name: contact.name.replaceAll('"', '”'),
        initials: getInitials(contact.name)
    };
}

/** Updates the picker placeholder to reflect the current selection. */
function updateContactPlaceholder() {
    const count = (readTaskAssignees() || previousAssignees).length;
    contactSearch.placeholder = count ? count + ' selected' : 'Select contacts to assign';
    if (!contactList.hidden) contactSearch.placeholder = '';
}
