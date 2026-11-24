import { auth, db } from './firebase.js';
import { get, ref } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { getInitials } from '../script.js';
import { getContactColor, readContactRecords, readOwnContact } from './contactData.js?v=2';

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
contactToggle.addEventListener('click', () => {
    if (!contactList.hidden) return closeTaskContacts();
    openTaskContacts();
    contactSearch.focus();
});
contactOptions.addEventListener('change', () => {
    selectionChanged = true;
    updateContactPlaceholder();
});
contactPicker.addEventListener('keydown', handleContactKeys);
contactPicker.addEventListener('focusout', event => {
    if (event.relatedTarget && !contactPicker.contains(event.relatedTarget)) closeTaskContacts();
});
document.addEventListener('click', event => {
    if (!contactPicker.contains(event.target)) closeTaskContacts();
});

function openTaskContacts() {
    contactList.hidden = false;
    contactToggle.setAttribute('aria-expanded', 'true');
    updateContactPlaceholder();
    filterTaskContacts();
}

function closeTaskContacts() {
    if (contactList.hidden) return;
    contactList.hidden = true;
    contactToggle.setAttribute('aria-expanded', 'false');
    contactSearch.value = '';
    updateContactPlaceholder();
}

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

function filterTaskContacts() {
    const query = contactSearch.value.trim().toLocaleLowerCase();
    let matches = 0;
    for (const row of contactOptions.children) {
        row.hidden = !row.querySelector('.task-contact-name').textContent.toLocaleLowerCase().includes(query);
        if (!row.hidden) matches++;
    }
    contactStatus.textContent = contactMessage || (matches ? '' : 'No matching contacts.');
    contactStatus.hidden = !contactStatus.textContent;
}

export async function loadTaskAssignees(user) {
    try {
        const [snapshot, ownContact] = await Promise.all([get(ref(db, 'contacts')), readOwnContact(user)]);
        if (auth.currentUser?.uid !== user.uid) return;
        contacts = readContactRecords(snapshot.val());
        if (ownContact) contacts.unshift({ ...ownContact, own: true });
        contactMessage = contacts.length ? '' : 'No contacts yet.';
        renderTaskAssignees();
    } catch {
        if (auth.currentUser?.uid !== user.uid) return;
        contactMessage = 'Could not load contacts.';
        filterTaskContacts();
    }
}

export function restoreTaskAssignees(assignments = []) {
    previousAssignees = Array.isArray(assignments) ? assignments : [];
    selectionChanged = false;
    renderTaskAssignees();
}

export function clearTaskAssignees() {
    closeTaskContacts();
    restoreTaskAssignees();
    selectionChanged = true;
}

function renderTaskAssignees() {
    const selected = new Set(previousAssignees.map(assignee => assignee?.id));
    contactOptions.replaceChildren();
    contacts.forEach(contact => {
        const row = contactTemplate.content.firstElementChild.cloneNode(true);
        const checkbox = row.querySelector('input');
        const avatar = row.querySelector('.task-contact-avatar');
        checkbox.value = contact.id;
        checkbox.checked = selected.has(contact.id);
        avatar.textContent = getInitials(contact.name);
        avatar.style.backgroundColor = getContactColor(contact.id);
        row.querySelector('.task-contact-name').textContent = contact.name + (contact.own ? ' (You)' : '');
        contactOptions.append(row);
    });
    filterTaskContacts();
    updateContactPlaceholder();
}

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

function updateContactPlaceholder() {
    const count = (readTaskAssignees() || previousAssignees).length;
    contactSearch.placeholder = count ? count + ' selected' : 'Select contacts to assign';
    if (!contactList.hidden) contactSearch.placeholder = '';
}
