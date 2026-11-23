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
