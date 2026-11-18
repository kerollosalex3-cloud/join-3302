import { db } from "./firebase.js";
import { ref, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const validStatuses = new Set(["todo", "in-progress", "await-feedback", "done"]);
let draggedCard = null;
let draggedTaskId = null;
let dropPlaceholder = null;
let dragImage = null;
let dragImageOffsetX = 0;
let dragImageOffsetY = 0;
let dragImageTransformOffsetX = 0;
let dragImageTransformOffsetY = 0;
let nativeDragImage = null;

/**
 * Shows a task move error to the user.
 * @param {string} message Error message.
 */
function showDropError(message) {
    window.alert(`Die Aufgabe konnte nicht verschoben werden: ${message}`);
}

/**
 * Creates Firebase updates for the ordered tasks.
 * @param {string[]} taskIds Task IDs in display order.
 * @param {string} status Destination status.
 * @returns {Object} Firebase update values.
 */
function createTaskUpdates(taskIds, status) {
    const updates = {};
    for (let order = 0; order < taskIds.length; order += 1) {
        updates[`${taskIds[order]}/status`] = status;
        updates[`${taskIds[order]}/order`] = order;
    }
    return updates;
}

/**
 * Persists the destination status and order for a dropped task.
 * @param {string} taskId Moved task ID.
 * @param {string} status Destination status.
 * @param {string[]} orderedTaskIds Destination task IDs in display order.
 */
async function handleTaskDrop(taskId, status, orderedTaskIds) {
    if (!taskId || !validStatuses.has(status) || !orderedTaskIds.includes(taskId)) {
        showDropError("Ungültiges Ablageziel.");
        return;
    }
    try {
        await update(ref(db, "tasks"), createTaskUpdates(orderedTaskIds, status));
    } catch (error) {
        showDropError(error.message);
    }
}

/**
 * Positions the visible drag preview at the pointer.
 * @param {DragEvent} event Current drag event.
 */
function positionDragImage(event) {
    if (!dragImage || (!event.clientX && !event.clientY)) return;
    dragImage.style.left = `${event.clientX - dragImageOffsetX - dragImageTransformOffsetX}px`;
    dragImage.style.top = `${event.clientY - dragImageOffsetY - dragImageTransformOffsetY}px`;
}

/**
 * Removes the visible and native drag preview elements.
 */
function removeDragImages() {
    dragImage?.remove();
    nativeDragImage?.remove();
    dragImage = null;
    nativeDragImage = null;
}

/**
 * Finds the board column nearest to the pointer.
 * @param {HTMLElement} boardColumns Board columns container.
 * @param {number} clientX Pointer horizontal coordinate.
 * @param {number} clientY Pointer vertical coordinate.
 * @returns {HTMLElement|null} Nearest column.
 */
function findNearestColumn(boardColumns, clientX, clientY) {
    let nearestColumn = null;
    let shortestDistance = Infinity;
    for (const column of boardColumns.querySelectorAll(".board-column")) {
        const rect = column.getBoundingClientRect();
        const dx = Math.max(rect.left - clientX, 0, clientX - rect.right);
        const dy = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
        const distance = dx ** 2 + dy ** 2;
        if (distance < shortestDistance) [nearestColumn, shortestDistance] = [column, distance];
    }
    return nearestColumn;
}

/**
 * Gets task IDs in the target column with the dragged task at the placeholder.
 * @param {HTMLElement} taskList Target task container.
 * @returns {string[]} Task IDs in display order.
 */
function getOrderedTaskIds(taskList) {
    const cards = [...taskList.querySelectorAll(".task-card")].filter(card => card !== draggedCard);
    const children = [...dropPlaceholder.parentElement.children];
    const precedingCards = children
        .slice(0, children.indexOf(dropPlaceholder))
        .filter(element => element.classList.contains("task-card") && element !== draggedCard);
    const insertionIndex = Math.min(precedingCards.length, cards.length);
    cards.splice(insertionIndex, 0, draggedCard);
    return cards.map(card => card.dataset.taskId);
}

/**
 * Completes the drop into a board column.
 * @param {DragEvent} event Drop event.
 * @param {HTMLElement|null} column Destination column.
 */
function completeDrop(event, column) {
    const taskList = column?.querySelector(".board-column-tasks");
    const taskId = event.dataTransfer?.getData("text/plain") || draggedTaskId;
    if (!taskList || !dropPlaceholder) return showDropError("Kein gültiges Ablageziel.");
    if (dropPlaceholder.parentElement !== taskList) taskList.append(dropPlaceholder);
    const orderedTaskIds = getOrderedTaskIds(taskList);
    taskList.insertBefore(draggedCard, dropPlaceholder);
    dropPlaceholder.remove();
    handleTaskDrop(taskId, taskList.dataset.status, orderedTaskIds);
    removeDragImages();
}

/**
 * Checks whether the pointer is currently over the placeholder.
 * @param {DragEvent} event Current drag event.
 * @returns {boolean} Whether the placeholder already marks the pointer position.
 */
function pointerIsOverPlaceholder(event) {
    const rect = dropPlaceholder?.getBoundingClientRect();
    return Boolean(rect && event.clientY >= rect.top && event.clientY <= rect.bottom);
}

/**
 * Finds the first visible card below the pointer.
 * @param {DragEvent} event Current drag event.
 * @param {HTMLElement} taskList Target task container.
 * @returns {HTMLElement|null} Card that should follow the placeholder.
 */
function findCardAfterPointer(event, taskList) {
    const cards = [...taskList.querySelectorAll(".task-card")]
        .filter(card => card !== draggedCard && !card.hidden);

    return cards.find(card => {
        const rect = card.getBoundingClientRect();
        return event.clientY < rect.top + rect.height / 2;
    }) || null;
}

/**
 * Moves the placeholder to the insertion position under the pointer.
 * @param {DragEvent} event Current drag event.
 * @param {HTMLElement} taskList Target task container.
 */
function placeDropPlaceholder(event, taskList) {
    if (dropPlaceholder.parentElement === taskList && pointerIsOverPlaceholder(event)) return;

    const cardAfter = findCardAfterPointer(event, taskList);
    if (dropPlaceholder.parentElement === taskList && dropPlaceholder.nextElementSibling === cardAfter) return;
    taskList.insertBefore(dropPlaceholder, cardAfter);
}

/**
 * Handles dragover on a board column.
 * @param {DragEvent} event Current drag event.
 */
function handleColumnDragOver(event) {
    if (!draggedCard) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    positionDragImage(event);
    const column = event.currentTarget;
    column.classList.add("drag-area-highlight");
    placeDropPlaceholder(event, column.querySelector(".board-column-tasks"));
}

/**
 * Removes the visual highlight when the pointer leaves a column.
 * @param {DragEvent} event Current drag event.
 */
function handleColumnDragLeave(event) {
    if (!event.relatedTarget || !event.currentTarget.contains(event.relatedTarget)) {
        event.currentTarget.classList.remove("drag-area-highlight");
    }
}

/**
 * Handles dropping a task onto a board column.
 * @param {DragEvent} event Drop event.
 */
function handleColumnDrop(event) {
    if (!draggedCard) return;
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.classList.remove("drag-area-highlight");
    completeDrop(event, event.currentTarget);
}

/**
 * Handles dragover on the gaps between board columns.
 * @param {DragEvent} event Current drag event.
 */
function handleBoardDragOver(event) {
    if (!draggedCard) return;
    event.preventDefault();
    if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
    positionDragImage(event);
}

/**
 * Handles dropping a task into a gap between columns.
 * @param {DragEvent} event Drop event.
 */
function handleBoardDrop(event) {
    const boardColumns = event.currentTarget;
    if (!draggedCard || event.target !== boardColumns) return;
    event.preventDefault();
    completeDrop(event, findNearestColumn(boardColumns, event.clientX, event.clientY));
}

/**
 * Creates a placeholder matching the dragged task card.
 * @param {HTMLElement} card Task card being dragged.
 */
function createDropPlaceholder(card) {
    dropPlaceholder = document.createElement("div");
    dropPlaceholder.className = "task-drop-placeholder";
    dropPlaceholder.style.width = `${card.offsetWidth}px`;
    dropPlaceholder.style.height = `${card.offsetHeight}px`;
    dropPlaceholder.style.marginBottom = getComputedStyle(card).marginBottom;
    card.before(dropPlaceholder);
}

/**
 * Creates the visible drag preview and hides the browser's native preview.
 * @param {DragEvent} event Drag-start event.
 * @param {HTMLElement} card Task card being dragged.
 */
function createDragImages(event, card) {
    if (!event.dataTransfer) return;
    const rect = card.getBoundingClientRect();
    dragImage = card.cloneNode(true);
    dragImage.classList.add("dragging");
    dragImage.setAttribute("aria-hidden", "true");
    dragImage.removeAttribute("id");
    setDragPreviewStyle(card, rect);
    document.body.append(dragImage);
    setDragImagePointerOffset(event, rect);
    createNativeDragImage(event);
}

/**
 * Calculates the pointer offset, including the preview's rotation.
 * @param {DragEvent} event Drag-start event.
 * @param {DOMRect} sourceRect Original card bounds.
 */
function setDragImagePointerOffset(event, sourceRect) {
    const previewRect = dragImage.getBoundingClientRect();
    dragImageOffsetX = event.clientX - previewRect.left;
    dragImageOffsetY = event.clientY - previewRect.top;
    dragImageTransformOffsetX = previewRect.left - sourceRect.left;
    dragImageTransformOffsetY = previewRect.top - sourceRect.top;
}

/**
 * Styles the visible drag preview over its source card.
 * @param {HTMLElement} card Source task card.
 * @param {DOMRect} rect Source card position.
 */
function setDragPreviewStyle(card, rect) {
    Object.assign(dragImage.style, {
        position: "fixed",
        left: `${rect.left}px`,
        top: `${rect.top}px`,
        width: `${card.offsetWidth}px`,
        height: `${card.offsetHeight}px`,
        margin: "0",
        pointerEvents: "none",
        zIndex: "2147483647"
    });
}

/**
 * Sets the browser's native drag image to a transparent canvas.
 * @param {DragEvent} event Drag-start event.
 */
function createNativeDragImage(event) {
    nativeDragImage = document.createElement("canvas");
    nativeDragImage.width = 1;
    nativeDragImage.height = 1;
    document.body.append(nativeDragImage);
    event.dataTransfer.setDragImage(nativeDragImage, 0, 0);
}

/**
 * Starts dragging a task and creates its drag visuals.
 * @param {DragEvent} event Drag-start event.
 */
function handleDragStart(event) {
    const card = event.target.closest(".task-card");
    if (!card) return;
    draggedCard = card;
    draggedTaskId = card.dataset.taskId;
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", draggedTaskId);
        createDragImages(event, card);
    }
    createDropPlaceholder(card);
    requestAnimationFrame(() => {
        if (draggedCard === card) card.classList.add("drag-source-hidden");
    });
}

/**
 * Clears drag state and restores board visuals after dragging.
 */
function handleDragEnd() {
    draggedCard?.classList.remove("drag-source-hidden");
    draggedCard = null;
    draggedTaskId = null;
    dropPlaceholder?.remove();
    dropPlaceholder = null;
    removeDragImages();
    document.querySelectorAll(".board-column").forEach(clearColumnHighlight);
}

/**
 * Removes the drag highlight from one column.
 * @param {HTMLElement} column Board column.
 */
function clearColumnHighlight(column) {
    column.classList.remove("drag-area-highlight");
}

/**
 * Attaches drag handlers to a board column.
 * @param {HTMLElement} column Board column.
 */
function attachDropZoneListeners(column) {
    column.addEventListener("dragover", handleColumnDragOver);
    column.addEventListener("dragleave", handleColumnDragLeave);
    column.addEventListener("drop", handleColumnDrop);
}

/**
 * Initializes drag-and-drop handlers for the board.
 */
function initializeDragAndDrop() {
    const boardColumns = document.querySelector(".board-columns");
    if (!boardColumns) return;
    boardColumns.addEventListener("dragover", handleBoardDragOver);
    boardColumns.addEventListener("drop", handleBoardDrop);
    boardColumns.addEventListener("dragstart", handleDragStart);
    boardColumns.addEventListener("drag", positionDragImage);
    document.addEventListener("dragend", handleDragEnd);
    boardColumns.querySelectorAll(".board-column").forEach(attachDropZoneListeners);
}

if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeDragAndDrop, { once: true });
} else {
    initializeDragAndDrop();
}
