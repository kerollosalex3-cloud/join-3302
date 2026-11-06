const subtaskInput = document.getElementById('subtask-input');
const subtaskAddButton = document.getElementById('add-subtask');
const subtaskList = document.getElementById('subtask-list');

subtaskInput.addEventListener('input', updateSubtaskButton);
subtaskInput.addEventListener('keydown', handleSubtaskEnter);
subtaskAddButton.addEventListener('click', addSubtask);
subtaskList.addEventListener('click', handleSubtaskAction);
subtaskList.addEventListener('keydown', handleSubtaskEditKey);

/** Enables adding a subtask when text has been entered. */
function updateSubtaskButton() {
    subtaskAddButton.disabled = !subtaskInput.value.trim();
}

/** Adds one subtask without saving it to the database. */
function addSubtask() {
    const text = subtaskInput.value.trim();
    if (!text) return;
    const row = document.getElementById('subtask-template').content.firstElementChild.cloneNode(true);
    row.querySelector('.subtask-text').textContent = text;
    subtaskList.appendChild(row);
    subtaskInput.value = '';
    updateSubtaskButton();
    subtaskInput.focus();
}

/** Adds a subtask with Enter without submitting the task.
 * @param {KeyboardEvent} event - Input keyboard event.
 */
function handleSubtaskEnter(event) {
    if (event.key !== 'Enter') return;
    event.preventDefault();
    addSubtask();
}

/** Handles the edit, save and delete buttons in the list.
 * @param {MouseEvent} event - Click inside the subtask list.
 */
function handleSubtaskAction(event) {
    const button = event.target.closest('button');
    if (!button) return;
    const row = button.closest('.subtask-item');
    if (button.classList.contains('delete-subtask')) {
        row.remove();
        subtaskInput.focus();
    }
    if (button.classList.contains('edit-subtask')) editSubtask(row);
    if (button.classList.contains('save-subtask')) saveSubtask(row);
}

/** Opens the text input for an existing subtask.
 * @param {HTMLElement} row - Subtask list item.
 */
function editSubtask(row) {
    const input = row.querySelector('.subtask-edit-input');
    input.value = row.querySelector('.subtask-text').textContent;
    row.querySelector('.subtask-text').hidden = true;
    input.hidden = false;
    row.querySelector('.edit-subtask').hidden = true;
    row.querySelector('.save-subtask').hidden = false;
    input.focus();
    input.select();
}

/** Applies a nonempty subtask title.
 * @param {HTMLElement} row - Subtask list item.
 */
function saveSubtask(row) {
    const input = row.querySelector('.subtask-edit-input');
    const text = input.value.trim();
    if (!text) {
        input.setAttribute('aria-invalid', 'true');
        row.querySelector('.subtask-error').hidden = false;
        return input.focus();
    }
    row.querySelector('.subtask-text').textContent = text;
    finishSubtaskEdit(row);
}

/** Returns a subtask row to its normal view.
 * @param {HTMLElement} row - Subtask list item.
 */
function finishSubtaskEdit(row) {
    row.querySelector('.subtask-text').hidden = false;
    row.querySelector('.subtask-edit-input').hidden = true;
    row.querySelector('.subtask-edit-input').removeAttribute('aria-invalid');
    row.querySelector('.subtask-error').hidden = true;
    row.querySelector('.edit-subtask').hidden = false;
    row.querySelector('.save-subtask').hidden = true;
    row.querySelector('.edit-subtask').focus();
}

/** Saves with Enter or cancels editing with Escape.
 * @param {KeyboardEvent} event - Subtask edit keyboard event.
 */
function handleSubtaskEditKey(event) {
    if (!event.target.classList.contains('subtask-edit-input')) return;
    if (event.key !== 'Enter' && event.key !== 'Escape') return;
    event.preventDefault();
    const row = event.target.closest('.subtask-item');
    if (event.key === 'Enter') saveSubtask(row);
    else finishSubtaskEdit(row);
}
