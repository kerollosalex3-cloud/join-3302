import { auth, db } from './firebase.js';
import { get, ref } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { getInitials } from '../script.js';
import { readContactRecords } from './contactData.js';

const contactOptions = document.getElementById('task-contact-options');
const contactStatus = document.getElementById('task-contact-status');
const contactTemplate = document.getElementById('task-contact-template');
const contactSummary = document.querySelector('#task-assignees summary');
let contacts = [];
let previousAssignees = [];
let selectionChanged = false;

contactOptions.addEventListener('change', () => {
    selectionChanged = true;
    updateContactSummary();
});

/**
 * Loads the contacts available to the current account.
 * @param {object} user - Current Firebase user.
 */
export async function loadTaskAssignees(user) {
    try {
        const snapshot = await get(ref(db, 'contacts'));
        if (auth.currentUser?.uid !== user.uid) return;
        contacts = readContactRecords(snapshot.val());
        contactStatus.textContent = contacts.length ? '' : 'No contacts yet.';
        contactStatus.hidden = Boolean(contacts.length);
        renderTaskAssignees();
    } catch {
        if (auth.currentUser?.uid === user.uid) contactStatus.textContent = 'Could not load contacts.';
    }
}

/**
 * Restores the saved selection when editing a task.
 * @param {object[]} assignments - Existing task assignments.
 */
export function restoreTaskAssignees(assignments = []) {
    previousAssignees = Array.isArray(assignments) ? assignments : [];
    selectionChanged = false;
    renderTaskAssignees();
}

/** Clears the selected contacts when the form is cleared. */
export function clearTaskAssignees() {
    restoreTaskAssignees();
    selectionChanged = true;
}

/** Builds checkbox rows for the available contacts. */
function renderTaskAssignees() {
    const selected = new Set(previousAssignees.map(assignee => assignee?.id));
    contactOptions.replaceChildren();
    for (const contact of contacts) {
        const row = contactTemplate.content.firstElementChild.cloneNode(true);
        const checkbox = row.querySelector('input');
        checkbox.value = contact.id;
        checkbox.checked = selected.has(contact.id);
        row.querySelector('span').textContent = contact.name;
        contactOptions.append(row);
    }
    updateContactSummary();
}

/**
 * Reads the selected contacts while preserving unknown older assignments.
 * @returns {object[]|null} Changed assignments or null for an unchanged selection.
 */
export function readTaskAssignees() {
    if (!selectionChanged) return null;
    const checked = new Set(Array.from(contactOptions.querySelectorAll('input:checked'), input => input.value));
    const available = new Set(contacts.map(contact => contact.id));
    const retained = previousAssignees.filter(assignee => assignee && !available.has(assignee.id));
    const selected = contacts.filter(contact => checked.has(contact.id)).map(contact => ({
        id: contact.id,
        name: contact.name.replaceAll('"', '”'),
        initials: getInitials(contact.name)
    }));
    return [...retained, ...selected];
}

/** Shows how many contacts are assigned. */
function updateContactSummary() {
    const count = (readTaskAssignees() || previousAssignees).length;
    contactSummary.textContent = count ? `${count} selected` : 'Select contacts to assign';
}
