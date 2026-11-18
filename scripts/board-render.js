import { createTaskCard } from "./template.js";
import { boardElements } from "./board-elements.js";

let renderedTasks = [];
let taskSelectHandler = null;

/**
 * Checks whether a task title or description contains the query.
 * @param {Object} task Task object.
 * @param {string} query Normalized search query.
 * @returns {boolean} Whether the task matches.
 */
export function taskMatchesQuery(task, query) {
    const title = task.title || "";
    const description = task.description || "";
    return title.toLowerCase().includes(query) || description.toLowerCase().includes(query);
}

/**
 * Gets the task containers from the board.
 * @returns {Object<string, HTMLElement>} Containers keyed by status.
 */
function getColumnContainers() {
    const containers = {};
    for (const status of ["todo", "in-progress", "await-feedback", "done"]) {
        containers[status] = boardElements.boardColumns.querySelector(`[data-status="${status}"]`);
    }
    return containers;
}

/**
 * Clears the task cards from all board columns.
 * @param {Object<string, HTMLElement>} columns Task containers.
 */
function clearTaskColumns(columns) {
    Object.values(columns).forEach(column => column.replaceChildren());
}

/**
 * Returns the persisted or fallback order of a task.
 * @param {Object} task Task object.
 * @param {Map<string, number>} insertionOrder Original task order.
 * @returns {number} Sort order.
 */
function getTaskOrder(task, insertionOrder) {
    const order = Number(task.order);
    return task.order != null && Number.isFinite(order) ? order : insertionOrder.get(task.id);
}

/**
 * Compares two tasks by their persisted order and original order.
 * @param {Object} first First task.
 * @param {Object} second Second task.
 * @param {Map<string, number>} insertionOrder Original task order.
 * @returns {number} Sort result.
 */
function compareTaskOrder(first, second, insertionOrder) {
    const orderDifference = getTaskOrder(first, insertionOrder) - getTaskOrder(second, insertionOrder);
    return orderDifference || insertionOrder.get(first.id) - insertionOrder.get(second.id);
}

/**
 * Gets sorted tasks for one status.
 * @param {Object[]} tasks All tasks.
 * @param {string} status Column status.
 * @param {Map<string, number>} insertionOrder Original task order.
 * @returns {Object[]} Sorted column tasks.
 */
function getColumnTasks(tasks, status, insertionOrder) {
    return tasks
        .filter(task => (task.status || "todo") === status)
        .sort((first, second) => compareTaskOrder(first, second, insertionOrder));
}

/**
 * Finds the task represented by a rendered card.
 * @param {Element} card Task card.
 * @returns {Object|undefined} Matching task.
 */
function findRenderedTask(card) {
    return renderedTasks.find(task => task.id === card.dataset.taskId);
}

/**
 * Opens task details for a clicked card.
 * @param {MouseEvent} event Card click event.
 */
function handleTaskCardClick(event) {
    const task = findRenderedTask(event.currentTarget);
    if (task) taskSelectHandler?.(event.currentTarget, task);
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
 * @param {Element} card Task card.
 */
function bindTaskCard(card) {
    card.addEventListener("click", handleTaskCardClick);
    card.addEventListener("keydown", handleTaskCardKeydown);
}

/**
 * Renders one task card into a column.
 * @param {HTMLElement} container Column task container.
 * @param {Object} task Task data.
 */
function renderTaskCard(container, task) {
    const card = createTaskCard(task);
    container.append(card);
    bindTaskCard(card);
}

/**
 * Renders the tasks for one board column.
 * @param {Object[]} tasks All tasks.
 * @param {string} status Column status.
 * @param {HTMLElement} container Column task container.
 * @param {Map<string, number>} insertionOrder Original task order.
 */
function renderColumn(tasks, status, container, insertionOrder) {
    getColumnTasks(tasks, status, insertionOrder)
        .forEach(task => renderTaskCard(container, task));
}

/**
 * Returns visible task cards from one column.
 * @param {HTMLElement} container Column task container.
 * @returns {HTMLElement[]} Visible cards.
 */
function getVisibleCards(container) {
    return [...container.querySelectorAll(".task-card:not([hidden])")];
}

/**
 * Limits one column to the combined height of five cards.
 * @param {HTMLElement} container Column task container.
 */
function updateColumnHeight(container) {
    const cards = getVisibleCards(container);
    if (cards.length <= 5) {
        container.style.maxHeight = "";
        return;
    }
    const fiveCardHeight = cards[5].offsetTop - cards[0].offsetTop;
    container.style.maxHeight = `${fiveCardHeight}px`;
}

/**
 * Updates the visible height of every task column.
 */
function updateColumnHeights() {
    Object.values(getColumnContainers()).forEach(updateColumnHeight);
}

/**
 * Renders all tasks in their respective columns.
 * @param {Object[]} tasks All task data.
 * @param {Function} onTaskSelect Task selection callback.
 */
export function renderTasks(tasks, onTaskSelect) {
    renderedTasks = tasks;
    taskSelectHandler = onTaskSelect;
    const columns = getColumnContainers();
    clearTaskColumns(columns);
    const insertionOrder = new Map(tasks.map((task, index) => [task.id, index]));
    Object.entries(columns).forEach(([status, container]) =>
        renderColumn(tasks, status, container, insertionOrder));
    updateColumnHeights();
}

/**
 * Applies a search query to rendered cards.
 * @param {string} query Normalized search query.
 * @returns {number} Number of visible task cards.
 */
export function filterTaskCards(query) {
    let visibleTaskCount = 0;
    for (const card of boardElements.boardColumns.querySelectorAll(".task-card")) {
        const task = findRenderedTask(card);
        card.hidden = !(!query || (task && taskMatchesQuery(task, query)));
        if (!card.hidden) visibleTaskCount += 1;
    }
    updateColumnHeights();
    return visibleTaskCount;
}

/**
 * Checks whether a column contains a visible task card.
 * @param {HTMLElement} section Board column.
 * @returns {boolean} Whether the column has visible tasks.
 */
function hasVisibleTasks(section) {
    return [...section.querySelectorAll(".task-card")].some(card => !card.hidden);
}

/**
 * Updates the empty-state visibility for one column message.
 * @param {HTMLElement} message Empty-state element.
 * @param {string} query Normalized search query.
 */
function updateColumnEmptyMessage(message, query) {
    const section = message.closest(".board-column");
    if (!section) return;
    message.hidden = query.length > 0 || hasVisibleTasks(section);
}

/**
 * Shows empty-column hints only when the search field is empty.
 * @param {string} query Normalized search query.
 */
export function updateEmptyColumnMessages(query) {
    boardElements.emptyColumnMessages.forEach(message =>
        updateColumnEmptyMessage(message, query));
}
