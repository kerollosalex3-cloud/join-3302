const taskAssignees = document.getElementById('task-assignees');

document.addEventListener('click', closeTaskContacts);
document.addEventListener('keydown', closeTaskContacts);

/** Closes the contacts dropdown on an outside click or Escape.
 * @param {MouseEvent|KeyboardEvent} event - Click or keyboard event.
 */
function closeTaskContacts(event) {
    if (!taskAssignees.open) return;
    if (event.type === 'click' && taskAssignees.contains(event.target)) return;
    if (event.type === 'keydown' && event.key !== 'Escape') return;
    taskAssignees.open = false;
    if (event.key === 'Escape') taskAssignees.querySelector('summary').focus();
}
