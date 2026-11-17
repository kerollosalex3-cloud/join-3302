import { db } from "./firebase.js";
import { ref, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const validStatuses = new Set(["todo", "in-progress", "await-feedback", "done"]);
let draggedCard = null;
let draggedTaskId = null;
let dropPlaceholder = null;
let dragImage = null;
let dragImageOffsetX = 0;
let dragImageOffsetY = 0;
let nativeDragImage = null;

/**
 * Handle task drop and update Firebase.
 * @param {string} taskId
 * @param {string} status
 */
async function handleTaskDrop(taskId, status, orderedTaskIds) {
    if (!taskId || !validStatuses.has(status) || !orderedTaskIds.includes(taskId)) {
        console.error("Invalid drop - taskId:", taskId, "status:", status);
        return;
    }

    console.log("Dropping task", taskId, "to status", status);
    
    try {
        const updates = {};
        orderedTaskIds.forEach((orderedTaskId, order) => {
            updates[`${orderedTaskId}/status`] = status;
            updates[`${orderedTaskId}/order`] = order;
        });
        await update(ref(db, "tasks"), updates);
        console.log("Task moved successfully to", status);
    } catch (error) {
        console.error("Could not move task:", error);
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        alert(`Error moving task: ${error.message}`);
    }
}

function positionDragImage(event) {
    if (!dragImage || (event.clientX === 0 && event.clientY === 0)) return;
    dragImage.style.left = `${event.clientX - dragImageOffsetX}px`;
    dragImage.style.top = `${event.clientY - dragImageOffsetY}px`;
}

function removeDragImages() {
    dragImage?.remove();
    dragImage = null;
    nativeDragImage?.remove();
    nativeDragImage = null;
}

function findNearestColumn(boardColumns, clientX, clientY) {
    let nearestColumn = null;
    let shortestDistance = Infinity;

    for (const column of boardColumns.querySelectorAll(".board-column")) {
        const rect = column.getBoundingClientRect();
        const distanceX = Math.max(rect.left - clientX, 0, clientX - rect.right);
        const distanceY = Math.max(rect.top - clientY, 0, clientY - rect.bottom);
        const distance = distanceX ** 2 + distanceY ** 2;
        if (distance < shortestDistance) {
            nearestColumn = column;
            shortestDistance = distance;
        }
    }

    return nearestColumn;
}

function completeDrop(event, column) {
    const taskList = column?.querySelector(".board-column-tasks");
    const status = taskList?.dataset.status;
    const taskId = event.dataTransfer?.getData("text/plain") || draggedTaskId;
    if (!taskList) {
        handleTaskDrop(taskId, status, [taskId]);
        removeDragImages();
        return;
    }

    const orderedCards = [...taskList.querySelectorAll(".task-card")]
        .filter(card => card !== draggedCard);
    if (!dropPlaceholder) {
        orderedCards.push(draggedCard);
        handleTaskDrop(taskId, status, orderedCards.map(card => card.dataset.taskId));
        removeDragImages();
        return;
    }

    if (dropPlaceholder.parentElement !== taskList) taskList.append(dropPlaceholder);
    const children = [...taskList.children];
    const placeholderIndex = children.indexOf(dropPlaceholder);
    const insertionIndex = children
        .slice(0, placeholderIndex)
        .filter(child => child.classList.contains("task-card") && child !== draggedCard)
        .length;
    orderedCards.splice(insertionIndex, 0, draggedCard);
    handleTaskDrop(taskId, status, orderedCards.map(card => card.dataset.taskId));
    removeDragImages();
}

/**
 * Attach drop handlers to a full board column, including its empty-state message.
 * @param {HTMLElement} column
 */
function attachDropZoneListeners(column) {
    column.addEventListener("dragover", (event) => {
        if (!draggedCard) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        positionDragImage(event);
        column.classList.add("drag-area-highlight");

        const taskList = column.querySelector(".board-column-tasks");
        if (!taskList || !dropPlaceholder) return;

        const targetCard = event.target.closest(".task-card");
        if (targetCard && targetCard !== draggedCard && taskList.contains(targetCard)) {
            const insertBefore = event.clientY < targetCard.getBoundingClientRect().top + targetCard.offsetHeight / 2;
            taskList.insertBefore(dropPlaceholder, insertBefore ? targetCard : targetCard.nextSibling);
        } else {
            taskList.append(dropPlaceholder);
        }
    });

    column.addEventListener("dragleave", (event) => {
        if (!event.relatedTarget || !column.contains(event.relatedTarget)) {
            column.classList.remove("drag-area-highlight");
        }
    });

    column.addEventListener("drop", (event) => {
        if (!draggedCard) return;
        event.preventDefault();
        event.stopPropagation();
        column.classList.remove("drag-area-highlight");
        completeDrop(event, column);
    });
}

/**
 * Initialize drag and drop for the board.
 */
function initializeDragAndDrop() {
    const boardColumns = document.querySelector(".board-columns");
    if (!boardColumns) {
        console.log("Board columns not found, retrying...");
        setTimeout(initializeDragAndDrop, 500);
        return;
    }

    console.log("Initializing drag and drop");

    boardColumns.addEventListener("dragover", (event) => {
        if (!draggedCard) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = "move";
        positionDragImage(event);
    });

    boardColumns.addEventListener("drop", (event) => {
        if (!draggedCard || event.target !== boardColumns) return;
        event.preventDefault();

        const column = findNearestColumn(boardColumns, event.clientX, event.clientY);
        completeDrop(event, column);
    });

    // Dragstart on task cards
    boardColumns.addEventListener("dragstart", (event) => {
        const card = event.target.closest(".task-card");
        if (!card) return;
        draggedCard = card;
        draggedTaskId = card.dataset.taskId;
        card.classList.add("dragging");
        dropPlaceholder = document.createElement("div");
        dropPlaceholder.className = "task-drop-placeholder";
        const cardStyle = getComputedStyle(card);
        dropPlaceholder.style.width = `${card.getBoundingClientRect().width}px`;
        dropPlaceholder.style.height = `${card.getBoundingClientRect().height}px`;
        dropPlaceholder.style.marginBottom = cardStyle.marginBottom;
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", draggedTaskId);

            const rect = card.getBoundingClientRect();
            dragImageOffsetX = event.clientX - rect.left;
            dragImageOffsetY = event.clientY - rect.top;
            dragImage = card.cloneNode(true);
            dragImage.setAttribute("aria-hidden", "true");
            dragImage.removeAttribute("id");
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
            document.body.append(dragImage);
            dragImage.getBoundingClientRect();
            nativeDragImage = document.createElement("canvas");
            nativeDragImage.width = 1;
            nativeDragImage.height = 1;
            Object.assign(nativeDragImage.style, {
                position: "fixed",
                left: "0",
                top: "0",
                pointerEvents: "none"
            });
            document.body.append(nativeDragImage);
            event.dataTransfer.setDragImage(nativeDragImage, 0, 0);
        }
        console.log("Drag started:", draggedTaskId);
    });

    boardColumns.addEventListener("drag", positionDragImage);

    document.addEventListener("dragend", () => {
        draggedCard?.classList.remove("dragging");
        draggedCard = null;
        draggedTaskId = null;
        dropPlaceholder?.remove();
        dropPlaceholder = null;
        removeDragImages();
        document.querySelectorAll(".board-column").forEach(column => {
            column.classList.remove("drag-area-highlight");
        });
        console.log("Drag ended");
    });

    for (const column of boardColumns.querySelectorAll(".board-column")) {
        attachDropZoneListeners(column);
    }

    console.log("Drag and drop initialized");
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        console.log("DOMContentLoaded fired");
        initializeDragAndDrop();
    });
} else {
    console.log("DOM already loaded");
    setTimeout(initializeDragAndDrop, 50);
}
