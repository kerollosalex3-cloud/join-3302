/** Checks the required task fields.
 * @param {{title: string, dueDate: string, category: string}} task - Task values.
 * @param {string} today - Current local date in YYYY-MM-DD format.
 * @returns {{title: string, dueDate: string, category: string}} Field errors.
 */
function getTaskErrors(task, today) {
    return {
        title: task.title.trim() ? '' : 'This field is required.',
        dueDate: getTaskDateError(task.dueDate, today),
        category: ['user-story', 'technical-task'].includes(task.category) ? '' : 'Please select a category.'
    };
}

/** Checks that the due date exists and is not in the past.
 * @param {string} value - Entered due date.
 * @param {string} today - Current local date in YYYY-MM-DD format.
 * @returns {string} Error text or an empty string.
 */
function getTaskDateError(value, today) {
    if (!value) return 'This field is required.';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'Please enter a valid date.';
    const parts = value.split('-').map(Number);
    const date = new Date(parts[0], parts[1] - 1, parts[2]);
    if (date.getFullYear() !== parts[0] || date.getMonth() !== parts[1] - 1 || date.getDate() !== parts[2]) return 'Please enter a valid date.';
    if (value < today) return 'Please select today or a future date.';
    return '';
}
