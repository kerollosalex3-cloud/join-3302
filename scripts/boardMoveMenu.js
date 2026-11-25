import { boardElements } from "./board-elements.js";
import { db } from "./firebase.js";
import { ref, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const boardStatusOrder = ["todo", "in-progress", "await-feedback", "done"];
const moveDestinationsByStatus = {
    todo: ["in-progress", "await-feedback"],
    "in-progress": ["todo", "await-feedback"],
    "await-feedback": ["in-progress", "done"],
    done: ["in-progress", "await-feedback"]
};

/** Closes every task move menu. */
function closeMoveMenus() {
    document.querySelectorAll(".task-move-options").forEach(menu => { menu.hidden = true; });
    document.querySelectorAll(".task-move-toggle")
        .forEach(button => button.setAttribute("aria-expanded", "false"));
}

/**
 * Closes an open move menu with Escape.
 * @param {KeyboardEvent} event Keyboard event.
 */
function closeMoveMenusOnEscape(event) {
    if (event.key !== "Escape") return;
    const openMenu = document.querySelector(".task-move-options:not([hidden])");
    if (!openMenu) return;
    const toggle = openMenu.closest(".task-move-menu")?.querySelector(".task-move-toggle");
    closeMoveMenus();
    toggle?.focus();
}

/**
 * Toggles the move menu without opening task details.
 * @param {MouseEvent} event Move button click.
 */
function toggleMoveMenu(event) {
    event.stopPropagation();
    const button = event.currentTarget;
    const menu = button.nextElementSibling;
    const willOpen = menu.hidden;
    closeMoveMenus();
    menu.hidden = !willOpen;
    button.setAttribute("aria-expanded", String(willOpen));
}

/**
 * Counts tasks currently rendered in a destination column.
 * @param {string} status Destination status.
 * @returns {number} Destination card count.
 */
function getDestinationTaskCount(status) {
    const column = boardElements.boardColumns.querySelector(`[data-status="${status}"]`);
    return column.querySelectorAll(".task-card").length;
}

/**
 * Persists a task move and closes the menu.
 * @param {string} taskId Task ID.
 * @param {string} status Destination status.
 * @returns {Promise<void>} Resolves after the move.
 */
async function saveTaskMove(taskId, status) {
    await update(ref(db, `tasks/${taskId}`), {
        status,
        order: getDestinationTaskCount(status)
    });
    closeMoveMenus();
}

/**
 * Moves a task to the selected status.
 * @param {MouseEvent} event Move option click.
 * @returns {Promise<void>} Resolves after Firebase update.
 */
async function moveTaskViaMenu(event) {
    event.stopPropagation();
    const card = event.currentTarget.closest(".task-card");
    const taskId = card.dataset.taskId;
    const status = event.currentTarget.dataset.destinationStatus;
    if (status === card.dataset.taskStatus) return closeMoveMenus();
    try {
        await saveTaskMove(taskId, status);
    } catch (error) {
        window.alert(`Could not move the task: ${error.message}`);
    }
}

/**
 * Configures a move option for the current task status.
 * @param {HTMLButtonElement} button Move option.
 * @param {string} currentStatus Current task status.
 */
function bindMoveOption(button, currentStatus) {
    const destinationStatus = button.dataset.destinationStatus;
    const allowedDestinations = moveDestinationsByStatus[currentStatus] || [];
    const movesUp = boardStatusOrder.indexOf(destinationStatus) < boardStatusOrder.indexOf(currentStatus);
    button.hidden = !allowedDestinations.includes(destinationStatus);
    button.querySelector(".task-move-option-icon").src = movesUp
        ? "../assets/icons/arrow-up-mobile.svg" : "../assets/icons/arrow-down-mobile.svg";
    button.addEventListener("click", moveTaskViaMenu);
}

/**
 * Binds the mobile move controls of a task card.
 * @param {HTMLElement} card Task card.
 */
export function bindMoveMenu(card) {
    const toggle = card.querySelector(".task-move-toggle");
    const options = card.querySelectorAll(".task-move-options button");
    toggle.addEventListener("click", toggleMoveMenu);
    options.forEach(button => bindMoveOption(button, card.dataset.taskStatus));
}

document.addEventListener("click", closeMoveMenus);
document.addEventListener("keydown", closeMoveMenusOnEscape);
