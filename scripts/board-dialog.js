import { db } from "./firebase.js";
import { ref, remove, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { boardElements } from "./board-elements.js";
import { isBackdropClick } from "../script.js";

let getTasks = () => [];
let currentTaskId = null;
let subtaskUpdateInProgress = false;

/**
 * Reads required task-card elements.
 * @param {Element} card Task card.
 * @returns {{priority: HTMLImageElement}} Card details.
 */
function getTaskDetails(card) {
    return {
        priority: card.querySelector(".task-priority")
    };
}

/**
 * Gets the readable category name of a task.
 * @param {Object} task Task data.
 * @returns {string} Category label.
 */
function getCategoryLabel(task) {
    return task.category === "technical-task" ? "Technical Task" : "User Story";
}

/**
 * Copies the task summary into the dialog.
 * @param {Object} task Task data.
 * @param {Element} card Selected task card.
 */
function populateTaskSummary(task, card) {
    const details = getTaskDetails(card);
    boardElements.dialogCategory.textContent = getCategoryLabel(task);
    boardElements.dialogCategory.classList.toggle(
        "task-category-technical",
        task.category === "technical-task"
    );
    populateTaskText(task);
    populateTaskPriority(task, details.priority);
}

/**
 * Copies task text fields into the dialog.
 * @param {Object} task Task data.
 */
function populateTaskText(task) {
    boardElements.dialogTitle.textContent = task.title;
    boardElements.dialogDescription.textContent = task.description || "No description.";
    boardElements.dialogDueDate.textContent = task.dueDate || "Not set";
}

/**
 * Copies the priority into the dialog.
 * @param {Object} task Task data.
 * @param {HTMLImageElement} priorityIcon Card priority icon.
 */
function populateTaskPriority(task, priorityIcon) {
    boardElements.dialogPriorityLabel.textContent =
        task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    boardElements.dialogPriorityIcon.src = priorityIcon.src;
    boardElements.dialogPriorityIcon.alt = priorityIcon.alt;
}

/**
 * Creates one assigned-contact row.
 * @param {Object} assignee Assigned contact.
 * @returns {HTMLLIElement} Contact row.
 */
function createAssigneeItem(assignee) {
    const item = document.createElement("li");
    const avatar = document.createElement("span");
    const name = document.createElement("span");
    avatar.textContent = assignee.initials;
    name.textContent = assignee.name;
    item.append(avatar, name);
    return item;
}

/**
 * Copies assigned contacts into the dialog.
 * @param {Object} task Task data.
 */
function populateAssignees(task) {
    boardElements.dialogAssignees.replaceChildren();
    for (const assignee of task.assignedTo || []) {
        boardElements.dialogAssignees.append(createAssigneeItem(assignee));
    }
}

/**
 * Builds the check icon for a subtask toggle.
 * @returns {HTMLImageElement} Check icon.
 */
function createCheckIcon() {
    const icon = document.createElement("img");
    icon.src = "../assets/icons/check.svg";
    icon.alt = "";
    return icon;
}

/**
 * Synchronizes the check icon with subtask completion.
 * @param {HTMLButtonElement} button Subtask toggle.
 * @param {boolean} completed Completion state.
 */
function updateSubtaskIcon(button, completed) {
    const icon = button.querySelector("img");
    if (completed && !icon) button.append(createCheckIcon());
    if (!completed && icon) icon.remove();
}

/**
 * Updates a subtask button without replacing its row.
 * @param {HTMLButtonElement} button Subtask toggle.
 * @param {Object} subtask Subtask data.
 */
function updateSubtaskToggle(button, subtask) {
    const completed = Boolean(subtask.completed);
    const action = completed ? "Mark subtask incomplete" : "Mark subtask complete";
    button.disabled = subtaskUpdateInProgress;
    button.setAttribute("aria-pressed", String(completed));
    button.setAttribute("aria-label", `${action}: ${subtask.title}`);
    updateSubtaskIcon(button, completed);
}

/**
 * Creates one clickable subtask row.
 * @param {Object} subtask Subtask data.
 * @param {number} index Subtask index.
 * @param {string} taskId Parent task ID.
 * @returns {HTMLLIElement} Subtask row.
 */
function createSubtaskItem(subtask, index, taskId) {
    const item = document.createElement("li");
    const button = document.createElement("button");
    button.type = "button";
    button.className = "task-subtask-toggle";
    button.dataset.subtaskIndex = String(index);
    updateSubtaskToggle(button, subtask);
    button.addEventListener("click", () => toggleTaskSubtask(taskId, index));
    item.append(button, document.createTextNode(subtask.title));
    return item;
}

/**
 * Enables or disables all subtask toggles.
 * @param {boolean} disabled Disabled state.
 */
function setSubtaskButtonsDisabled(disabled) {
    boardElements.dialogSubtasks.querySelectorAll(".task-subtask-toggle")
        .forEach(button => { button.disabled = disabled; });
}

/**
 * Returns a valid task containing the requested subtask.
 * @param {string} taskId Task ID.
 * @param {number} subtaskIndex Subtask index.
 * @returns {Object|null} Task data or null.
 */
function getToggleableTask(taskId, subtaskIndex) {
    const task = getTasks().find(candidate => candidate.id === taskId);
    const isValid = !subtaskUpdateInProgress &&
        Array.isArray(task?.subtasks) && task.subtasks[subtaskIndex];
    return isValid ? task : null;
}

/**
 * Creates updated subtask data with one toggled state.
 * @param {Object[]} subtasks Current subtasks.
 * @param {number} toggledIndex Index to toggle.
 * @returns {Object[]} Updated subtasks.
 */
function toggleSubtaskData(subtasks, toggledIndex) {
    return subtasks.map((subtask, index) => index === toggledIndex
        ? { ...subtask, completed: !Boolean(subtask.completed) }
        : subtask);
}

/**
 * Saves updated subtask data and reports failures.
 * @param {string} taskId Parent task ID.
 * @param {Object[]} subtasks Updated subtasks.
 * @returns {Promise<void>} Resolves after the update attempt.
 */
async function persistSubtasks(taskId, subtasks) {
    try {
        await update(ref(db, `tasks/${taskId}`), { subtasks });
    } catch (error) {
        alert(`Error updating subtask: ${error.message}`);
    }
}

/**
 * Toggles a subtask's completed state in Firebase.
 * @param {string} taskId Parent task ID.
 * @param {number} subtaskIndex Subtask index.
 * @returns {Promise<void>} Resolves after the update.
 */
async function toggleTaskSubtask(taskId, subtaskIndex) {
    const task = getToggleableTask(taskId, subtaskIndex);
    if (!task) return;
    subtaskUpdateInProgress = true;
    setSubtaskButtonsDisabled(true);
    await persistSubtasks(taskId, toggleSubtaskData(task.subtasks, subtaskIndex));
    subtaskUpdateInProgress = false;
    setSubtaskButtonsDisabled(false);
}

/**
 * Returns the currently focused subtask index.
 * @returns {string|null} Focused subtask index.
 */
function getFocusedSubtaskIndex() {
    return boardElements.dialogSubtasks.contains(document.activeElement)
        ? document.activeElement.dataset.subtaskIndex
        : null;
}

/**
 * Restores focus to a subtask toggle if needed.
 * @param {string|null} subtaskIndex Subtask index.
 */
function restoreSubtaskFocus(subtaskIndex) {
    if (subtaskIndex == null) return;
    boardElements.dialogSubtasks
        .querySelector(`[data-subtask-index="${subtaskIndex}"]`)?.focus();
}

/**
 * Renders an empty subtask message.
 */
function renderNoSubtasks() {
    const item = document.createElement("li");
    item.textContent = "No subtasks";
    boardElements.dialogSubtasks.append(item);
}

/**
 * Copies subtasks into the dialog.
 * @param {Object} task Task data.
 */
function populateSubtasks(task) {
    const focusedIndex = getFocusedSubtaskIndex();
    boardElements.dialogSubtasks.replaceChildren();
    const subtasks = task.subtasks || [];
    if (subtasks.length === 0) renderNoSubtasks();
    subtasks.forEach((subtask, index) =>
        boardElements.dialogSubtasks.append(createSubtaskItem(subtask, index, task.id)));
    restoreSubtaskFocus(focusedIndex);
}

/**
 * Finds the card matching a task.
 * @param {string} taskId Task ID.
 * @returns {Element|undefined} Matching task card.
 */
function findTaskCard(taskId) {
    return [...boardElements.boardColumns.querySelectorAll(".task-card")]
        .find(card => card.dataset.taskId === taskId);
}

/**
 * Updates the progress display on a task card.
 * @param {Object} task Updated task.
 */
function updateTaskCardProgress(task) {
    const card = findTaskCard(task.id);
    const progress = card?.querySelector(".task-progress");
    if (!progress) return;
    const completed = task.subtasks.filter(subtask => subtask.completed).length;
    progress.setAttribute("aria-label", `${completed} of ${task.subtasks.length} subtasks completed`);
    progress.firstElementChild.style.width =
        `${Math.round((completed / task.subtasks.length) * 100)}%`;
    card.querySelector(".task-subtask-count").textContent =
        `${completed}/${task.subtasks.length} Subtasks`;
}

/**
 * Updates visible subtask buttons in the open dialog.
 * @param {Object} task Updated task.
 */
function updateOpenDialogSubtasks(task) {
    if (!boardElements.taskDialog.open || currentTaskId !== task.id) return;
    task.subtasks.forEach((subtask, index) => {
        const button = boardElements.dialogSubtasks
            .querySelector(`[data-subtask-index="${index}"]`);
        if (button) updateSubtaskToggle(button, subtask);
    });
}

/**
 * Updates the card progress and open dialog after a subtask-only change.
 * @param {Object} task Updated task.
 */
export function updateSubtaskDisplay(task) {
    updateTaskCardProgress(task);
    updateOpenDialogSubtasks(task);
}

/**
 * Opens the task detail dialog.
 * @param {Element} card Selected task card.
 * @param {Object} task Task data.
 */
export function showTaskDetails(card, task) {
    currentTaskId = task.id;
    populateTaskSummary(task, card);
    populateAssignees(task);
    populateSubtasks(task);
    boardElements.taskDialog.showModal();
    boardElements.closeButton.focus();
}

/**
 * Refreshes subtasks when the open task was fully rerendered.
 */
export function refreshOpenTaskSubtasks() {
    const task = getTasks().find(candidate => candidate.id === currentTaskId);
    if (boardElements.taskDialog.open && task) populateSubtasks(task);
}

/**
 * Closes the task dialog.
 */
function closeTaskDialog() {
    boardElements.taskDialog.close();
}

/**
 * Closes the dialog when its backdrop is clicked.
 * @param {MouseEvent} event Dialog click event.
 */
function closeTaskDialogOnBackdrop(event) {
    if (isBackdropClick(event, boardElements.taskDialog)) closeTaskDialog();
}

/**
 * Deletes the currently open task.
 * @returns {Promise<void>} Resolves after deletion.
 */
async function deleteTask() {
    if (!currentTaskId || !confirm("Are you sure you want to delete this task?")) return;
    try {
        await remove(ref(db, `tasks/${currentTaskId}`));
        closeTaskDialog();
    } catch (error) {
        alert(`Error deleting task: ${error.message}`);
    }
}

/**
 * Opens the current task in the Add Task editing form.
 */
function editTask() {
    if (!currentTaskId) return;
    const task = getTasks().find(candidate => candidate.id === currentTaskId);
    if (!task) return;
    sessionStorage.setItem("editingTaskId", currentTaskId);
    sessionStorage.setItem("editingTask", JSON.stringify(task));
    window.location.href = `addTask.html?edit=${currentTaskId}`;
}

/**
 * Initializes task detail handlers.
 * @param {Function} taskProvider Returns current task data.
 */
export function initializeBoardDialog(taskProvider) {
    getTasks = taskProvider;
    boardElements.closeButton.addEventListener("click", closeTaskDialog);
    boardElements.deleteButton.addEventListener("click", deleteTask);
    boardElements.editButton.addEventListener("click", editTask);
    boardElements.taskDialog.addEventListener("click", closeTaskDialogOnBackdrop);
}
