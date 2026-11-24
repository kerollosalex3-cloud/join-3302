import { db, userPath } from './firebase.js';
import { get, ref } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const contactColors = ['#ff7a00', '#9327ff', '#6e52ff', '#d545dc', '#008f82', '#00a4ce'];

export function getContactColor(id) {
    const total = Array.from(id).reduce((sum, character) => sum + character.charCodeAt(0), 0);
    return contactColors[total % contactColors.length];
}

/**
 * Returns named Firebase contacts with their keys in alphabetical order.
 * @param {object|null} records - Contacts snapshot value.
 * @returns {object[]} Sorted contacts.
 */
export function readContactRecords(records) {
    return Object.entries(records || {})
        .filter(([, contact]) => typeof contact?.name === 'string' && contact.name.trim())
        .map(([id, contact]) => ({ ...contact, id }))
        .sort((first, second) => first.name.localeCompare(second.name, undefined, { sensitivity: 'base' }));
}

/**
 * Removes a contact and its task assignments in one Firebase update.
 * @param {string} contactId - Contact being removed.
 * @param {object|null} tasks - Current task records.
 * @returns {object} Updated paths.
 */
export function getContactDeletion(contactId, tasks) {
    const changes = { [`contacts/${contactId}`]: null };
    for (const [taskId, task] of Object.entries(tasks || {})) {
        const assignees = task?.assignedTo;
        if (!Array.isArray(assignees)) continue;
        const remaining = assignees.filter(contact => contact?.id !== contactId);
        if (remaining.length !== assignees.length) changes[`tasks/${taskId}/assignedTo`] = remaining;
    }
    return changes;
}

/**
 * Reads the current registered user's own contact information.
 * @param {object} user - Signed-in account.
 * @returns {Promise<object|null>} Private contact details.
 */
export async function readOwnContact(user) {
    if (user.isAnonymous) return null;
    const path = userPath(user.uid);
    try {
        const snapshot = await get(ref(db, path));
        return makeOwnContact(user, snapshot.val());
    } catch {
        return makeOwnContact(user);
    }
}

/**
 * Combines saved contact details and sign-in defaults.
 * @param {object} user - Signed-in account.
 * @param {object} [profile] - Saved contact details.
 * @returns {object} Contact for the current user.
 */
function makeOwnContact(user, profile = {}) {
    return {
        id: `profile:${user.uid}`,
        name: profile?.name || user.displayName || user.email || 'My contact',
        email: profile?.email || user.email || '',
        phone: profile?.phone || ''
    };
}
