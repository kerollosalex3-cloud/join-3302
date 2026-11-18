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
const boardSearchEmpty = requireElement("#boardSearchEmpty", HTMLElement);
const boardColumns = requireElement(".board-columns", HTMLElement);
const emptyColumnMessages = [...document.querySelectorAll(".board-empty")];

let allTasks = [];
let currentUser = null;
let currentTaskId = null;

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
 * Creates one subtask row with its completed state.
 * @param {Object} subtask Subtask object.
 * @returns {HTMLLIElement} Dialog row for the subtask.
 */
function createSubtaskItem(subtask) {
    const item = document.createElement("li");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = subtask.completed;
    checkbox.disabled = true;
    item.append(checkbox, document.createTextNode(subtask.title));
    return item;
}

/**
 * Copies subtasks from the task into the dialog.
 * @param {Object} task Task object from Firebase.
 */
function populateSubtasks(task) {
    dialogSubtasks.replaceChildren();
    if (task.subtasks && task.subtasks.length > 0) {
        for (const subtask of task.subtasks) {
            dialogSubtasks.append(createSubtaskItem(subtask));
        }
    } else {
        const item = document.createElement("li");
        item.textContent = "No subtasks";
        dialogSubtasks.append(item);
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

    for (const task of allTasks) {
        const status = task.status || "todo";
        const container = columnContainers[status];
        if (container) {
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
        const hasVisibleTasks = status && allTasks.some(t => t.status === status) && 
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
 * Filters tasks as the user types.
 */
function handleBoardSearchInput() {
    const query = boardSearchInput.value.trim().toLowerCase();
    const visibleTaskCount = filterTaskCards(query);
    updateEmptyColumnMessages(query);
    updateSearchMessage(query, visibleTaskCount);
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
 * Loads tasks from Firebase Realtime Database.
 */
function loadTasksFromFirebase() {
    const tasksRef = ref(db, "tasks");
    
    onValue(tasksRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            allTasks = Object.entries(data).map(([id, task]) => ({
                id,
                ...task
            }));
        } else {
            allTasks = [];
        }
        renderTasks();
        handleBoardSearchInput();
    });
}

/**
 * Initializes the board when user is authenticated.
 */
function initializeBoard() {
    loadTasksFromFirebase();
    boardSearchInput.addEventListener("input", handleBoardSearchInput);
    closeButton.addEventListener("click", closeTaskDialog);
    deleteButton.addEventListener("click", deleteTask);
    editButton.addEventListener("click", editTask);
    taskDialog.addEventListener("click", closeTaskDialogOnBackdrop);
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
