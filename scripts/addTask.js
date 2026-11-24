import { db, auth } from './firebase.js';
import { ref, push, runTransaction } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getLocalDate, getUrlSearchParam, setFieldError } from "../script.js";
import { clearTaskAssignees, loadTaskAssignees, readTaskAssignees, restoreTaskAssignees } from './taskAssignees.js';
import { bindLogout } from './pageSession.js';

const validTaskStatuses = new Set(['todo', 'in-progress', 'await-feedback', 'done']);
const requestedTaskStatus = getUrlSearchParam('status');
const taskStatus = validTaskStatuses.has(requestedTaskStatus) ? requestedTaskStatus : 'todo';
const isOverlayMode = getUrlSearchParam('overlay') === '1';

if (isOverlayMode) document.documentElement.classList.add('add-task-overlay-mode');

const taskAssignees = document.getElementById('task-assignees');
const taskForm = document.getElementById('task-form');
const taskSaveButton = document.getElementById('save-task');
const clearTaskButton = document.getElementById('clear-task');
const taskSaveNote = document.getElementById('task-save-note');
const taskFields = ['title', 'dueDate', 'category'];
let editingTaskId = getUrlSearchParam('edit');
let originalTask = null;
let savingTask = false;

document.addEventListener('click', closeTaskContacts);
document.addEventListener('keydown', closeTaskContacts);
taskForm.addEventListener('input', updateTaskForm);
taskForm.addEventListener('change', updateTaskForm);
taskForm.addEventListener('click', updateTaskForm);
taskForm.addEventListener('focusout', validateTaskField);
taskForm.addEventListener('submit', saveTaskForm);
clearTaskButton.addEventListener('click', clearTaskForm);
bindLogout(document.getElementById('task-logout'), taskSaveNote);
onAuthStateChanged(auth, handleTaskAuthChange);

/**
 * Validates the form before saving.
 * @param {SubmitEvent} event - Task form submission.
 */
async function saveTaskForm(event) {
    event.preventDefault();
    if (savingTask || !auth.currentUser || (editingTaskId && !originalTask)) return;
    const task = readTaskForm();
    const errors = validateTask(task);
    taskFields.forEach(field => setTaskFieldError(field, errors[field]));
    const firstError = taskFields.find(field => errors[field]);
    if (firstError) return taskForm.elements[firstError].focus();
    if (!hasPendingSubtasks()) await saveTaskToFirebase(task);
}

/**
 * Saves the form and keeps its values if the database write fails.
 * @param {object} task - Validated task form values.
 */
async function saveTaskToFirebase(task) {
    setTaskSaving(true);
    try {
        await persistTask(task);
    } catch {
        taskSaveNote.textContent = 'Could not save the task. Please try again.';
        return;
    } finally {
        setTaskSaving(false);
    }
    finishTaskSave();
}

/**
 * Writes a new task or updates the fields from the edit form.
 * @param {object} task - Task form values.
 */
async function persistTask(task) {
    const assignedTo = readTaskAssignees();
    if (editingTaskId) {
        const changes = { ...task, updatedAt: new Date().toISOString() };
        if (assignedTo !== null) changes.assignedTo = assignedTo;
        if (JSON.stringify(task.subtasks) === JSON.stringify(originalTask.subtasks)) delete changes.subtasks;
        await updateExistingTask(changes);
        return;
    }
    await push(ref(db, 'tasks'), {
        ...task, assignedTo: assignedTo || [], status: taskStatus,
        createdBy: auth.currentUser.uid, createdAt: new Date().toISOString()
    });
}

/**
 * Applies form changes only if the task still exists.
 * @param {object} changes - Edited task fields.
 */
async function updateExistingTask(changes) {
    const result = await runTransaction(ref(db, `tasks/${editingTaskId}`), task => {
        return task ? { ...task, ...changes } : null;
    }, { applyLocally: false });
    if (!result.committed || !result.snapshot.exists()) throw new Error('Task no longer exists.');
}

/** Clears the form and tells the user that Firebase confirmed the save. */
function finishTaskSave() {
    const message = editingTaskId ? 'Task updated.' : 'Task saved.';
    if (editingTaskId) clearTaskEditMode();
    clearTaskForm();
    taskSaveNote.textContent = message;
    notifyParentTaskSaved();
}

/**
 * Locks the task fields while Firebase saves the task.
 * @param {boolean} saving - Whether a save is pending.
 */
function setTaskSaving(saving) {
    savingTask = saving;
    clearTaskButton.disabled = saving;
    taskForm.querySelectorAll('.task-fields').forEach(section => { section.inert = saving; });
    if (saving) taskSaveNote.textContent = 'Saving task…';
    updateTaskSaveButton();
}

/**
 * Notifies the board after a task is saved from its embedded form.
 */
function notifyParentTaskSaved() {
    if (!isOverlayMode || window.parent === window) return;
    window.parent.postMessage({ type: 'join-task-saved' }, window.location.origin);
}

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

/** Reads the current task and added subtask entries.
 * @returns {object} Unsaved task values.
 */
function readTaskForm() {
    return {
        title: taskForm.elements.title.value.trim(),
        description: taskForm.elements.description.value.trim(),
        dueDate: taskForm.elements.dueDate.value,
        priority: taskForm.elements.priority.value,
        category: taskForm.elements.category.value,
        subtasks: readTaskSubtasks()
    };
}

/**
 * Reads the subtask titles and their completion status.
 * @returns {object[]} Current subtasks.
 */
function readTaskSubtasks() {
    return Array.from(document.querySelectorAll('#subtask-list .subtask-item'), row => ({
        title: row.querySelector('.subtask-text').textContent,
        completed: row.dataset.completed === 'true'
    }));
}

/**
 * Checks task fields while allowing an existing due date to stay unchanged.
 * @param {object} task - Task form values.
 * @returns {object} Validation messages.
 */
function validateTask(task) {
    const today = getLocalDate();
    const unchangedDate = originalTask && task.dueDate === originalTask.dueDate;
    return getTaskErrors(task, unchangedDate ? task.dueDate : today);
}

/** Shows or clears the error for one required field.
 * @param {string} field - Form field name.
 * @param {string} message - Validation message.
 */
function setTaskFieldError(field, message) {
    setFieldError(
        taskForm.elements[field],
        document.getElementById(`task-${field}-error`),
        message
    );
}

/** Checks a field when the user leaves it.
 * @param {FocusEvent} event - Form focus event.
 */
function validateTaskField(event) {
    const field = event.target.name;
    if (!taskFields.includes(field)) return;
    setTaskFieldError(field, validateTask(readTaskForm())[field]);
}

/** Updates the Save button when the task fields change.
 * @param {Event} event - Form input or change event.
 */
function updateTaskForm(event) {
    if (taskFields.includes(event.target.name)) setTaskFieldError(event.target.name, '');
    updateTaskSaveButton();
}

/** Enables Save once the form and Firebase session are ready. */
function updateTaskSaveButton() {
    const errors = validateTask(readTaskForm());
    taskSaveButton.disabled = savingTask || !auth.currentUser || Boolean(editingTaskId && !originalTask) ||
        taskFields.some(field => errors[field]);
}

/** Asks the user to finish a pending subtask before saving.
 * @returns {boolean} Whether a subtask is still being entered or edited.
 */
function hasPendingSubtasks() {
    const input = document.getElementById('subtask-input');
    const pending = document.querySelector('.subtask-edit-input:not([hidden])') || (input.value.trim() ? input : null);
    if (!pending) return false;
    taskSaveNote.textContent = 'Finish adding or editing your subtask first. Nothing has been saved.';
    pending.focus();
    return true;
}

/** Resets task fields, subtasks and validation messages. */
function clearTaskForm() {
    taskForm.reset();
    document.getElementById('subtask-list').replaceChildren();
    updateSubtaskButton();
    taskAssignees.open = false;
    clearTaskAssignees();
    taskFields.forEach(field => setTaskFieldError(field, ''));
    taskSaveNote.textContent = '';
    updateTaskSaveButton();
    taskForm.elements.title.focus();
}

/**
 * Loads editable fields for a task opened from the Board.
 * @param {object} task - Saved task values.
 */
function loadTaskForm(task) {
    clearTaskForm();
    ['title', 'description', 'dueDate', 'priority', 'category'].forEach(field => {
        taskForm.elements[field].value = task[field] ?? (field === 'priority' ? 'medium' : '');
    });
    const subtasks = Array.isArray(task.subtasks) ? task.subtasks : [];
    subtasks.forEach(item => appendSubtask(item.title ?? item, item.completed === true));
    restoreTaskAssignees(task.assignedTo);
    originalTask = readTaskForm();
    taskSaveButton.textContent = 'Save Task';
    updateTaskSaveButton();
    taskForm.elements.title.focus();
}

/** Loads the task selected on the Board. */
function loadEditingTask() {
    try {
        const task = JSON.parse(sessionStorage.getItem('editingTask'));
        if (!task || sessionStorage.getItem('editingTaskId') !== editingTaskId) throw new Error('Missing task');
        loadTaskForm(task);
    } catch {
        taskSaveNote.textContent = 'Could not open this task. Open it again from the Board.';
    }
}

/** Leaves edit mode once the changes have been saved. */
function clearTaskEditMode() {
    editingTaskId = null;
    originalTask = null;
    taskSaveButton.textContent = 'Create Task';
    sessionStorage.removeItem('editingTaskId');
    sessionStorage.removeItem('editingTask');
    const url = new URL(window.location.href);
    url.searchParams.delete('edit');
    window.history.replaceState({}, document.title, url);
}

/**
 * Redirects signed-out visitors and starts the task form.
 * @param {object|null} user - Current Firebase user.
 */
function handleTaskAuthChange(user) {
    if (!user) {
        window.location.href = '../index.html';
        return;
    }
    if (editingTaskId && !originalTask) loadEditingTask();
    loadTaskAssignees(user);
    updateTaskSaveButton();
}
