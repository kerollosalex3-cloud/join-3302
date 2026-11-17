import { db, auth, escapeHtml } from "./firebase.js";
import { createTaskCard } from "./template.js";
import { onValue, ref, remove, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/**
 * Finds a required element and throws when the page markup is incomplete.
 * @param {string} selector CSS selector for the element.
 * @param {typeof Element} elementType Expected DOM element type.
 * @param {ParentNode} root Search root.
 * @returns {Element} The matching element.
 */
function requireElement(selector, elementType, root = document) {
    const element = root.querySelector(selector);
    if (!(element instanceof elementType)) {
        throw new Error(`Required board element is missing: ${selector}`);
    }
    return element;
}

const taskDialog = requireElement(".task-dialog", HTMLDialogElement);
const dialogCategory = requireElement(".task-dialog-category", HTMLElement, taskDialog);
const dialogTitle = requireElement(".task-dialog-title", HTMLElement, taskDialog);
const dialogDescription = requireElement(".task-dialog-description", HTMLElement, taskDialog);
const dialogDueDate = requireElement(".task-dialog-due-date", HTMLElement, taskDialog);
const dialogPriorityLabel = requireElement(".task-dialog-priority-label", HTMLElement, taskDialog);
const dialogPriorityIcon = requireElement(".task-dialog-priority-icon", HTMLImageElement, taskDialog);
const dialogAssignees = requireElement(".task-dialog-assignees", HTMLUListElement, taskDialog);
const dialogSubtasks = requireElement(".task-dialog-subtasks", HTMLUListElement, taskDialog);
const closeButton = requireElement(".task-dialog-close", HTMLButtonElement, taskDialog);
const deleteButton = requireElement(".task-dialog-delete", HTMLButtonElement, taskDialog);
const editButton = requireElement(".task-dialog-edit", HTMLButtonElement, taskDialog);
const boardSearchInput = requireElement("#boardSearchInput", HTMLInputElement);
const boardSearchForm = requireElement("#boardSearchForm", HTMLFormElement);
const boardSearchButton = requireElement(".board-search-icon", HTMLButtonElement, boardSearchForm);
const boardSearchEmpty = requireElement("#boardSearchEmpty", HTMLElement);
const boardColumns = requireElement(".board-columns", HTMLElement);
const addTaskDialog = requireElement(".board-add-task-dialog", HTMLDialogElement);
const addTaskFrame = requireElement(".board-add-task-frame", HTMLIFrameElement, addTaskDialog);
const addTaskCloseButton = requireElement(".board-add-task-close", HTMLButtonElement, addTaskDialog);
const emptyColumnMessages = [...document.querySelectorAll(".board-empty")];
const validTaskStatuses = new Set(["todo", "in-progress", "await-feedback", "done"]);

let allTasks = [];
let currentUser = null;
let currentTaskId = null;
let activeSearchQuery = "";
let subtaskUpdateInProgress = false;

/**
 * Reads the required fields from a task card.
 * @param {Element} card Task card element.
 * @returns {{category: Element, title: Element, description: Element, priority: HTMLImageElement}}
 */
function getTaskDetails(card) {
    return {
        category: requireElement(".task-category", HTMLElement, card),
        title: requireElement("h4", HTMLElement, card),
        description: requireElement(".task-description", HTMLElement, card),
        priority: requireElement(".task-priority", HTMLImageElement, card)
    };
}

/**
 * Copies the task's main details into the dialog.
 * @param {Object} task Task object from Firebase.
 * @param {Element} card Task card element.
 */
function populateTaskSummary(task, card) {
    const details = getTaskDetails(card);
    const categoryLabel = task.category === "technical-task" ? "Technical Task" : "User Story";
    
    dialogCategory.textContent = categoryLabel;
    dialogCategory.classList.toggle("task-category-technical", task.category === "technical-task");
    dialogTitle.textContent = task.title;
    dialogDescription.textContent = task.description || "No description.";
    dialogDueDate.textContent = task.dueDate || "Not set";
    dialogPriorityLabel.textContent = task.priority.charAt(0).toUpperCase() + task.priority.slice(1);
    dialogPriorityIcon.src = details.priority.src;
    dialogPriorityIcon.alt = details.priority.alt;
}

/**
 * Creates one assigned-contact row for the task dialog.
 * @param {Object} assignee Assigned contact object.
 * @returns {HTMLLIElement} Dialog row with avatar and contact name.
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
 * Copies assigned contacts from the task into the dialog.
 * @param {Object} task Task object from Firebase.
 */
function populateAssignees(task) {
    dialogAssignees.replaceChildren();
    if (task.assignedTo && task.assignedTo.length > 0) {
        for (const assignee of task.assignedTo) {
            dialogAssignees.append(createAssigneeItem(assignee));
        }
    }
}

/**
 * Creates one clickable subtask row.
 * @param {Object} subtask Subtask object.
 * @param {number} index Subtask index.
 * @param {string} taskId Parent task ID.
 * @returns {HTMLLIElement} Dialog row for the subtask.
 */
function createSubtaskItem(subtask, index, taskId) {
    const item = document.createElement("li");
    const subtaskToggle = document.createElement("button");
    subtaskToggle.type = "button";
    subtaskToggle.className = "task-subtask-toggle";
    subtaskToggle.dataset.subtaskIndex = String(index);
    updateSubtaskToggle(subtaskToggle, subtask);
    subtaskToggle.addEventListener("click", () => toggleTaskSubtask(taskId, index));
    item.append(subtaskToggle, document.createTextNode(subtask.title));
    return item;
}

/**
 * Updates a subtask button without replacing its row.
 * @param {HTMLButtonElement} toggleButton Subtask toggle button.
 * @param {Object} subtask Subtask data.
 */
function updateSubtaskToggle(toggleButton, subtask) {
    const completed = Boolean(subtask.completed);
    toggleButton.disabled = subtaskUpdateInProgress;
    toggleButton.setAttribute("aria-pressed", String(completed));
    toggleButton.setAttribute(
        "aria-label",
        `${completed ? "Mark subtask incomplete" : "Mark subtask complete"}: ${subtask.title}`
    );

    const checkIcon = toggleButton.querySelector("img");
    if (completed && !checkIcon) {
        const icon = document.createElement("img");
        icon.src = "../assets/icons/check.svg";
        icon.alt = "";
        toggleButton.append(icon);
    } else if (!completed && checkIcon) {
        checkIcon.remove();
    }
}

/**
 * Toggles a subtask's completed state in Firebase.
 * @param {string} taskId Parent task ID.
 * @param {number} subtaskIndex Subtask index.
 */
async function toggleTaskSubtask(taskId, subtaskIndex) {
    const task = allTasks.find(candidate => candidate.id === taskId);
    if (subtaskUpdateInProgress || !task || !Array.isArray(task.subtasks) || !task.subtasks[subtaskIndex]) return;

    subtaskUpdateInProgress = true;
    dialogSubtasks.querySelectorAll(".task-subtask-toggle").forEach(button => {
        button.disabled = true;
    });
    const subtasks = task.subtasks.map((subtask, index) => (
        index === subtaskIndex
            ? { ...subtask, completed: !Boolean(subtask.completed) }
            : subtask
    ));

    try {
        await update(ref(db, `tasks/${taskId}`), { subtasks });
    } catch (error) {
        alert(`Error updating subtask: ${error.message}`);
    } finally {
        subtaskUpdateInProgress = false;
        dialogSubtasks.querySelectorAll(".task-subtask-toggle").forEach(button => {
            button.disabled = false;
        });
    }
}

/**
 * Copies subtasks from the task into the dialog.
 * @param {Object} task Task object from Firebase.
 */
function populateSubtasks(task) {
    const focusedSubtaskIndex = dialogSubtasks.contains(document.activeElement)
        ? document.activeElement.dataset.subtaskIndex
        : null;
    dialogSubtasks.replaceChildren();
    if (task.subtasks && task.subtasks.length > 0) {
        task.subtasks.forEach((subtask, index) => {
            dialogSubtasks.append(createSubtaskItem(subtask, index, task.id));
        });
    } else {
        const item = document.createElement("li");
        item.textContent = "No subtasks";
        dialogSubtasks.append(item);
    }
    if (focusedSubtaskIndex != null) {
        dialogSubtasks.querySelector(`[data-subtask-index="${focusedSubtaskIndex}"]`)?.focus();
    }
}

/**
 * Updates the card progress and open dialog after a subtask-only change.
 * @param {Object} task Updated task data.
 */
function updateSubtaskDisplay(task) {
    const card = [...boardColumns.querySelectorAll(".task-card")]
        .find(candidate => candidate.dataset.taskId === task.id);
    const subtasks = task.subtasks || [];
    const completedCount = subtasks.filter(subtask => subtask.completed).length;
    const progress = card?.querySelector(".task-progress");
    if (progress) {
        progress.setAttribute("aria-label", `${completedCount} of ${subtasks.length} subtasks completed`);
        progress.firstElementChild.style.width = `${Math.round((completedCount / subtasks.length) * 100)}%`;
        card.querySelector(".task-subtask-count").textContent =
            `${completedCount}/${subtasks.length} Subtasks`;
    }

    if (taskDialog.open && currentTaskId === task.id) {
        subtasks.forEach((subtask, index) => {
            const toggleButton = dialogSubtasks.querySelector(`[data-subtask-index="${index}"]`);
            if (toggleButton) updateSubtaskToggle(toggleButton, subtask);
        });
    }
}

/**
 * Opens the dialog with details from the selected card.
 * @param {Element} card Selected task card.
 * @param {Object} task Task data from Firebase.
 */
function showTaskDetails(card, task) {
    currentTaskId = task.id;
    populateTaskSummary(task, card);
    populateAssignees(task);
    populateSubtasks(task);
    taskDialog.showModal();
    closeButton.focus();
}

/**
 * Opens a task card when clicked.
 * @param {MouseEvent} event Card click event.
 */
function handleTaskCardClick(event) {
    const card = event.currentTarget;
    const taskId = card.dataset.taskId;
    const task = allTasks.find(t => t.id === taskId);
    if (task) showTaskDetails(card, task);
}

/**
 * Opens a task card with Enter or Space.
 * @param {KeyboardEvent} event Card keyboard event.
 */
function handleTaskCardKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    handleTaskCardClick(event);
}

/**
 * Attaches pointer and keyboard handlers to a task card.
 * @param {Element} card Task card element.
 */
function bindTaskCard(card) {
    card.addEventListener("click", handleTaskCardClick);
    card.addEventListener("keydown", handleTaskCardKeydown);
}

/**
 * Checks whether a task title or description contains the query.
 * @param {Object} task Task object.
 * @param {string} query Normalized search query.
 * @returns {boolean} Whether the task matches.
 */
function taskMatchesQuery(task, query) {
    const title = task.title || "";
    const description = task.description || "";
    return title.toLowerCase().includes(query) || description.toLowerCase().includes(query);
}

/**
 * Renders all tasks in their respective columns.
 */
function renderTasks() {
    const columnContainers = {
        "todo": requireElement('[data-status="todo"]', HTMLElement),
        "in-progress": requireElement('[data-status="in-progress"]', HTMLElement),
        "await-feedback": requireElement('[data-status="await-feedback"]', HTMLElement),
        "done": requireElement('[data-status="done"]', HTMLElement)
    };

    for (const container of Object.values(columnContainers)) {
        container.replaceChildren();
    }

    const insertionOrder = new Map(allTasks.map((task, index) => [task.id, index]));
    for (const [status, container] of Object.entries(columnContainers)) {
        const columnTasks = allTasks
            .filter(task => (task.status || "todo") === status)
            .sort((first, second) => {
                const firstOrder = first.order != null && Number.isFinite(Number(first.order))
                    ? Number(first.order)
                    : insertionOrder.get(first.id);
                const secondOrder = second.order != null && Number.isFinite(Number(second.order))
                    ? Number(second.order)
                    : insertionOrder.get(second.id);
                return firstOrder - secondOrder || insertionOrder.get(first.id) - insertionOrder.get(second.id);
            });

        for (const task of columnTasks) {
            const card = createTaskCard(task);
            container.append(card);
            bindTaskCard(card);
        }
    }

    updateEmptyColumnMessages("");
}

/**
 * Applies the current search query and filters tasks.
 * @param {string} query Normalized search query.
 * @returns {number} Number of visible task cards.
 */
function filterTaskCards(query) {
    const cards = boardColumns.querySelectorAll(".task-card");
    let visibleTaskCount = 0;
    
    for (const card of cards) {
        const taskId = card.dataset.taskId;
        const task = allTasks.find(t => t.id === taskId);
        const matches = !query || (task && taskMatchesQuery(task, query));
        card.hidden = !matches;
        if (matches) visibleTaskCount += 1;
    }
    return visibleTaskCount;
}

/**
 * Shows empty-column hints only when the search field is empty.
 * @param {string} query Normalized search query.
 */
function updateEmptyColumnMessages(query) {
    for (const message of emptyColumnMessages) {
        const section = message.closest(".board-column");
        if (!section) continue;
        const status = section.querySelector("[data-status]")?.dataset.status;
        const hasVisibleTasks = status && allTasks.some(t => (t.status || "todo") === status) &&
                               [...section.querySelectorAll(".task-card")].some(c => !c.hidden);
        message.hidden = query.length > 0 || hasVisibleTasks;
    }
}

/**
 * Updates the search no-results message.
 * @param {string} query Normalized search query.
 * @param {number} visibleTaskCount Number of matching cards.
 */
function updateSearchMessage(query, visibleTaskCount) {
    boardSearchEmpty.hidden = query.length === 0 || visibleTaskCount > 0;
}

/**
 * Opens the Add Task form with the selected column's status.
 * @param {MouseEvent} event Column add-button click.
 */
function openColumnAddTask(event) {
    const column = event.currentTarget.closest(".board-column");
    const status = column?.querySelector(".board-column-tasks")?.dataset.status;
    if (!validTaskStatuses.has(status)) {
        alert("The selected board column is invalid.");
        return;
    }
    addTaskFrame.src = `./addTask.html?overlay=1&status=${encodeURIComponent(status)}`;
    addTaskDialog.showModal();
}

/**
 * Closes the Add Task overlay when its backdrop is clicked.
 * @param {MouseEvent} event Dialog click event.
 */
function closeAddTaskOnBackdrop(event) {
    if (event.target === addTaskDialog) closeAddTaskDialog();
}

/**
 * Closes the Add Task form overlay.
 */
function closeAddTaskDialog() {
    if (addTaskDialog.open) addTaskDialog.close();
}

/**
 * Stops the embedded Add Task page after the dialog closes.
 */
function resetAddTaskFrame() {
    addTaskFrame.src = "about:blank";
}

/**
 * Closes the Add Task overlay after a successful save from its iframe.
 * @param {MessageEvent} event Message from the embedded Add Task page.
 */
function handleAddTaskMessage(event) {
    if (event.origin !== window.location.origin || event.source !== addTaskFrame.contentWindow) return;
    if (event.data?.type === "join-task-saved") closeAddTaskDialog();
}

/**
 * Filters tasks as the user types.
 */
function handleBoardSearchInput() {
    activeSearchQuery = boardSearchInput.value.trim().toLowerCase();
    applyBoardSearchQuery(activeSearchQuery);
}

/**
 * Applies a search query to the board and updates its empty-state messages.
 * @param {string} query Normalized search query.
 */
function applyBoardSearchQuery(query) {
    const visibleTaskCount = filterTaskCards(query);
    updateEmptyColumnMessages(query);
    updateSearchMessage(query, visibleTaskCount);
}

/**
 * Runs the search when the form is submitted by Enter or the search button.
 * @param {SubmitEvent} event Search form submission.
 */
function handleBoardSearchSubmit(event) {
    event.preventDefault();
    const query = boardSearchInput.value.trim().toLowerCase();
    if (!query) return;
    activeSearchQuery = query;
    boardSearchInput.value = "";
    applyBoardSearchQuery(activeSearchQuery);
}

/**
 * Clears the active search when the search button is double-clicked.
 */
function clearBoardSearch() {
    boardSearchInput.value = "";
    activeSearchQuery = "";
    applyBoardSearchQuery(activeSearchQuery);
}

/**
 * Closes the dialog when the close button is activated.
 */
function closeTaskDialog() {
    taskDialog.close();
}

/**
 * Closes the dialog when the backdrop itself is clicked.
 * @param {MouseEvent} event Dialog click event.
 */
function closeTaskDialogOnBackdrop(event) {
    if (event.target === taskDialog) taskDialog.close();
}

/**
 * Deletes a task from Firebase.
 */
async function deleteTask() {
    if (!currentTaskId || !confirm("Are you sure you want to delete this task?")) return;

    try {
        const taskRef = ref(db, `tasks/${currentTaskId}`);
        await remove(taskRef);
        taskDialog.close();
    } catch (error) {
        alert(`Error deleting task: ${error.message}`);
    }
}

/**
 * Exports current task for editing in Add Task form.
 */
function editTask() {
    if (!currentTaskId) return;
    const task = allTasks.find(t => t.id === currentTaskId);
    if (!task) return;

    sessionStorage.setItem('editingTaskId', currentTaskId);
    sessionStorage.setItem('editingTask', JSON.stringify(task));
    window.location.href = 'addTask.html?edit=' + currentTaskId;
}

/**
 * Returns the changed task when only one task's subtasks changed.
 * @param {Object[]} previousTasks Previously loaded tasks.
 * @param {Object[]} updatedTasks Tasks from the latest Firebase snapshot.
 * @returns {Object|null} Updated task, or null for other changes.
 */
function findSubtaskOnlyChange(previousTasks, updatedTasks) {
    if (previousTasks.length !== updatedTasks.length) return null;
    let changedTask = null;

    for (const updatedTask of updatedTasks) {
        const previousTask = previousTasks.find(task => task.id === updatedTask.id);
        if (!previousTask) return null;
        if (JSON.stringify(previousTask) === JSON.stringify(updatedTask)) continue;
        if (changedTask) return null;

        const { subtasks: previousSubtasks, ...previousFields } = previousTask;
        const { subtasks: updatedSubtasks, ...updatedFields } = updatedTask;
        if (JSON.stringify(previousFields) !== JSON.stringify(updatedFields)) return null;
        if (!Array.isArray(previousSubtasks) || !Array.isArray(updatedSubtasks) ||
            previousSubtasks.length !== updatedSubtasks.length) return null;

        let completionChanged = false;
        for (let index = 0; index < previousSubtasks.length; index += 1) {
            const { completed: previousCompleted, ...previousSubtaskFields } = previousSubtasks[index];
            const { completed: updatedCompleted, ...updatedSubtaskFields } = updatedSubtasks[index];
            if (JSON.stringify(previousSubtaskFields) !== JSON.stringify(updatedSubtaskFields)) return null;
            if (Boolean(previousCompleted) !== Boolean(updatedCompleted)) completionChanged = true;
        }
        if (!completionChanged) return null;
        changedTask = updatedTask;
    }

    return changedTask;
}

/**
 * Loads tasks from Firebase Realtime Database.
 */
function loadTasksFromFirebase() {
    const tasksRef = ref(db, "tasks");
    
    onValue(tasksRef, (snapshot) => {
        const previousTasks = allTasks;
        if (snapshot.exists()) {
            const data = snapshot.val();
            allTasks = Object.entries(data).map(([id, task]) => ({
                id,
                ...task
            }));
        } else {
            allTasks = [];
        }
        const changedTask = findSubtaskOnlyChange(previousTasks, allTasks);
        if (changedTask) {
            updateSubtaskDisplay(changedTask);
            return;
        }
        renderTasks();
        applyBoardSearchQuery(activeSearchQuery);
        const openTask = allTasks.find(task => task.id === currentTaskId);
        if (taskDialog.open && openTask) populateSubtasks(openTask);
    });
}

/**
 * Initializes the board when user is authenticated.
 */
function initializeBoard() {
    loadTasksFromFirebase();
    boardSearchInput.addEventListener("input", handleBoardSearchInput);
    boardSearchForm.addEventListener("submit", handleBoardSearchSubmit);
    boardSearchButton.addEventListener("dblclick", clearBoardSearch);
    closeButton.addEventListener("click", closeTaskDialog);
    deleteButton.addEventListener("click", deleteTask);
    editButton.addEventListener("click", editTask);
    taskDialog.addEventListener("click", closeTaskDialogOnBackdrop);
    for (const button of boardColumns.querySelectorAll(".board-column-add")) {
        button.addEventListener("click", openColumnAddTask);
    }
    addTaskCloseButton.addEventListener("click", closeAddTaskDialog);
    addTaskDialog.addEventListener("click", closeAddTaskOnBackdrop);
    addTaskDialog.addEventListener("close", resetAddTaskFrame);
    window.addEventListener("message", handleAddTaskMessage);
}

/**
 * Checks authentication state and initializes board.
 */
onAuthStateChanged(auth, (user) => {
    if (user) {
        currentUser = user;
        initializeBoard();
    } else {
        window.location.href = "../index.html";
    }
});
