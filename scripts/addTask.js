import { db, auth } from './firebase.js';
import { ref, push, child, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const taskAssignees = document.getElementById('task-assignees');
const taskForm = document.getElementById('task-form');
const taskPreview = document.getElementById('task-preview');
const taskSaveNote = document.getElementById('task-save-note');
const taskFields = ['title', 'dueDate', 'category'];
let previewTask = null;
let currentUser = null;
let editingTaskId = null;

document.addEventListener('click', closeTaskContacts);
document.addEventListener('keydown', closeTaskContacts);
taskForm.addEventListener('input', updateTaskForm);
taskForm.addEventListener('change', updateTaskForm);
taskForm.addEventListener('click', updateTaskForm);
taskForm.addEventListener('focusout', validateTaskField);
taskForm.addEventListener('submit', previewTaskForm);
document.getElementById('clear-task').addEventListener('click', clearTaskForm);
document.getElementById('edit-task-preview').addEventListener('click', editTaskPreview);
document.getElementById('save-task').addEventListener('click', saveTaskToFirebase);
updateTaskPreviewButton();

/**
 * Saves or updates the task in Firebase Realtime Database.
 */
async function saveTaskToFirebase() {
    if (!previewTask) return;
    
    const errors = getTaskErrors(previewTask, getLocalTaskDate());
    if (taskFields.some(field => errors[field])) {
        taskSaveNote.textContent = 'Cannot save task with validation errors.';
        return;
    }

    try {
        const taskData = {
            title: previewTask.title,
            description: previewTask.description,
            dueDate: previewTask.dueDate,
            priority: previewTask.priority,
            category: previewTask.category === 'user-story' ? 'user-story' : 'technical-task',
            subtasks: previewTask.subtasks.map(title => ({
                title,
                completed: false
            })),
            assignedTo: [],
            createdBy: currentUser?.uid || 'unknown',
            createdAt: new Date().toISOString()
        };

        if (editingTaskId) {
            const taskRef = ref(db, `tasks/${editingTaskId}`);
            await update(taskRef, {
                ...taskData,
                updatedAt: new Date().toISOString()
            });
            taskSaveNote.textContent = 'Task updated successfully!';
            sessionStorage.removeItem('editingTaskId');
            sessionStorage.removeItem('editingTask');
            editingTaskId = null;
        } else {
            const tasksRef = ref(db, 'tasks');
            await push(tasksRef, {
                ...taskData,
                status: 'todo'
            });
            taskSaveNote.textContent = 'Task saved successfully!';
        }

        taskSaveNote.style.color = 'green';
        clearTaskForm();
        setTimeout(() => {
            taskSaveNote.textContent = editingTaskId ? 'Task updated. Click "Save Task" to save changes.' : 'Preview only. Click "Save Task" to save it permanently.';
            taskSaveNote.style.color = '';
        }, 3000);
    } catch (error) {
        taskSaveNote.textContent = `Error saving task: ${error.message}`;
        taskSaveNote.style.color = 'red';
    }
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
        subtasks: Array.from(document.querySelectorAll('#subtask-list .subtask-text'), item => item.textContent)
    };
}

/** Returns today's date using the browser's local time.
 * @returns {string} Local date in YYYY-MM-DD format.
 */
function getLocalTaskDate() {
    const today = new Date();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${today.getFullYear()}-${month}-${day}`;
}

/** Shows or clears the error for one required field.
 * @param {string} field - Form field name.
 * @param {string} message - Validation message.
 */
function setTaskFieldError(field, message) {
    taskForm.elements[field].setAttribute('aria-invalid', Boolean(message));
    document.getElementById('task-' + field + '-error').textContent = message;
}

/** Checks a field when the user leaves it.
 * @param {FocusEvent} event - Form focus event.
 */
function validateTaskField(event) {
    const field = event.target.name;
    if (!taskFields.includes(field)) return;
    const errors = getTaskErrors(readTaskForm(), getLocalTaskDate());
    setTaskFieldError(field, errors[field]);
}

/** Updates validation and hides an older preview after an edit.
 * @param {Event} event - Form input or change event.
 */
function updateTaskForm(event) {
    if (taskFields.includes(event.target.name)) setTaskFieldError(event.target.name, '');
    taskPreview.hidden = true;
    updateTaskPreviewButton();
}

/** Enables preview only when the required fields are valid. */
function updateTaskPreviewButton() {
    const errors = getTaskErrors(readTaskForm(), getLocalTaskDate());
    document.getElementById('preview-task').disabled = taskFields.some(field => errors[field]);
}

/** Asks the user to finish a pending subtask before previewing.
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

/** Validates the task and displays an unsaved preview.
 * @param {SubmitEvent} event - Form submit event.
 */
function previewTaskForm(event) {
    event.preventDefault();
    const task = readTaskForm();
    const errors = getTaskErrors(task, getLocalTaskDate());
    taskFields.forEach(field => setTaskFieldError(field, errors[field]));
    const firstError = taskFields.find(field => errors[field]);
    if (firstError) return taskForm.elements[firstError].focus();
    if (hasPendingSubtasks()) return;
    taskSaveNote.textContent = 'Preview only. Click "Save Task" to save it permanently.';
    showTaskPreview(task);
}

/** Displays task values as text without storing them.
 * @param {object} task - Validated task values.
 */
function showTaskPreview(task) {
    previewTask = task;
    ['title', 'description', 'dueDate'].forEach(field => {
        document.getElementById('preview-task-' + field).textContent = task[field] || 'No description.';
    });
    document.getElementById('preview-task-priority').textContent = task.priority[0].toUpperCase() + task.priority.slice(1);
    document.getElementById('preview-task-category').textContent = task.category === 'user-story' ? 'User Story' : 'Technical Task';
    showTaskSubtasks(task.subtasks);
    taskPreview.hidden = false;
    taskPreview.focus();
}

/** Displays the current subtask titles in the preview.
 * @param {string[]} subtasks - Subtask titles.
 */
function showTaskSubtasks(subtasks) {
    const list = document.getElementById('preview-task-subtasks');
    list.replaceChildren();
    subtasks.forEach(text => {
        const item = document.getElementById('preview-subtask-template').content.firstElementChild.cloneNode(true);
        item.textContent = text;
        list.appendChild(item);
    });
}

/** Resets fields, subtasks, validation messages and the preview. */
function clearTaskForm() {
    previewTask = null;
    taskForm.reset();
    document.getElementById('subtask-list').replaceChildren();
    updateSubtaskButton();
    taskAssignees.open = false;
    taskFields.forEach(field => setTaskFieldError(field, ''));
    taskPreview.hidden = true;
    taskSaveNote.textContent = 'Preview only. Click "Save Task" to save it permanently.';
    updateTaskPreviewButton();
    taskForm.elements.title.focus();
}

/** Loads unsaved preview values back into the same form.
 * @param {object} task - Values from the local preview, not database data.
 */
function loadTaskForm(task) {
    clearTaskForm();
    ['title', 'description', 'dueDate', 'priority', 'category'].forEach(field => {
        taskForm.elements[field].value = task[field];
    });
    task.subtasks.forEach(appendSubtask);
    updateTaskPreviewButton();
    taskForm.elements.title.focus();
}

/** Returns to editing the current unsaved preview. */
function editTaskPreview() {
    if (!previewTask) return;
    loadTaskForm(previewTask);
}

/**
 * Loads editing task when page is ready.
 */
function loadEditingTaskIfPresent() {
    const params = new URLSearchParams(window.location.search);
    if (!params.get('edit')) return;

    editingTaskId = params.get('edit');
    const taskJson = sessionStorage.getItem('editingTask');
    
    if (!taskJson) {
        console.warn('No editing task found in sessionStorage');
        return;
    }

    try {
        const task = JSON.parse(taskJson);
        console.log('Loading editing task:', task);
        
        if (typeof loadTaskForm === 'function') {
            loadTaskForm({
                title: task.title || '',
                description: task.description || '',
                dueDate: task.dueDate || '',
                priority: task.priority || 'medium',
                category: task.category || '',
                subtasks: task.subtasks ? task.subtasks.map(st => st.title || st) : []
            });
            taskSaveNote.textContent = 'Editing task. Click "Save Task" to save changes.';
            window.history.replaceState({}, document.title, 'addTask.html');
        } else {
            console.error('loadTaskForm is not available');
        }
    } catch (error) {
        console.error('Error loading editing task:', error);
    }
}

/**
 * Checks authentication state and loads editing task if present.
 */
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        
        // Warte bis DOM ready ist, dann lade die Task
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', loadEditingTaskIfPresent);
        } else {
            loadEditingTaskIfPresent();
        }
    } else {
        window.location.href = "../index.html";
    }
});
