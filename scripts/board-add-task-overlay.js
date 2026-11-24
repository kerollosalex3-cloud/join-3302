import { boardElements, validTaskStatuses } from "./board-elements.js";
import { isBackdropClick } from "../script.js";

/**
 * Gets the status associated with an add-task button.
 * @param {HTMLElement} button Column add-task button.
 * @returns {string|undefined} Column status.
 */
function getColumnStatus(button) {
    return button.closest(".board-column")
        ?.querySelector(".board-column-tasks")?.dataset.status;
}

/**
 * Opens the Add Task form for the selected column.
 * @param {MouseEvent} event Add-task button click.
 */
function openColumnAddTask(event) {
    const status = getColumnStatus(event.currentTarget);
    if (!validTaskStatuses.has(status)) {
        alert("The selected board column is invalid.");
        return;
    }
    if (window.matchMedia("(max-width: 767px)").matches) {
        window.location.href = "./addTask.html?status=" + encodeURIComponent(status);
        return;
    }
    showAddTaskDialog(status);
}

function showAddTaskDialog(status) {
    boardElements.addTaskFrame.src =
        `./addTask.html?overlay=1&status=${encodeURIComponent(status)}`;
    boardElements.addTaskDialog.showModal();
}

/**
 * Closes the Add Task form overlay.
 */
function closeAddTaskDialog() {
    if (boardElements.addTaskDialog.open) boardElements.addTaskDialog.close();
}

/**
 * Closes the Add Task overlay when its backdrop is clicked.
 * @param {MouseEvent} event Dialog click event.
 */
function closeAddTaskOnBackdrop(event) {
    if (isBackdropClick(event, boardElements.addTaskDialog)) closeAddTaskDialog();
}

/**
 * Stops the embedded Add Task page after the dialog closes.
 */
function resetAddTaskFrame() {
    boardElements.addTaskFrame.src = "about:blank";
}

/**
 * Closes the overlay after receiving a successful save message.
 * @param {MessageEvent} event Message from the embedded page.
 */
function handleAddTaskMessage(event) {
    const isExpectedSource = event.origin === window.location.origin &&
        event.source === boardElements.addTaskFrame.contentWindow;
    if (isExpectedSource && event.data?.type === "join-task-saved") closeAddTaskDialog();
}

/**
 * Adds listeners to all column add-task buttons.
 */
function bindColumnAddButtons() {
    boardElements.boardColumns.querySelectorAll(".board-column-add")
        .forEach(button => button.addEventListener("click", openColumnAddTask));
}

/**
 * Initializes the Add Task overlay.
 */
export function initializeAddTaskOverlay() {
    bindColumnAddButtons();
    document.getElementById("addTaskButton").addEventListener("click", event => {
        if (event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        if (window.matchMedia("(max-width: 767px)").matches) return;
        event.preventDefault();
        showAddTaskDialog("todo");
    });
    boardElements.addTaskCloseButton.addEventListener("click", closeAddTaskDialog);
    boardElements.addTaskDialog.addEventListener("click", closeAddTaskOnBackdrop);
    boardElements.addTaskDialog.addEventListener("close", resetAddTaskFrame);
    window.addEventListener("message", handleAddTaskMessage);
}
