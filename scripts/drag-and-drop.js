import { db } from "./firebase.js";
import { ref, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const validStatuses = new Set(["todo", "in-progress", "await-feedback", "done"]);
let draggedCard = null;
let draggedTaskId = null;
let dropPlaceholder = null;
let dragImage = null;

/**
 * Handle task drop and update Firebase.
 * @param {string} taskId
 * @param {string} status
 */
async function handleTaskDrop(taskId, status) {
    if (!taskId || !validStatuses.has(status)) {
        console.error("Invalid drop - taskId:", taskId, "status:", status);
        return;
    }

    console.log("Dropping task", taskId, "to status", status);
    
    try {
        const updateRef = ref(db, `tasks/${taskId}`);
        console.log("Updating Firebase at:", `tasks/${taskId}`);
        await update(updateRef, { status });
        console.log("Task moved successfully to", status);
    } catch (error) {
        console.error("Could not move task:", error);
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        alert(`Error moving task: ${error.message}`);
    }
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
            if (dropPlaceholder?.parentElement === column.querySelector(".board-column-tasks")) {
                dropPlaceholder.remove();
            }
        }
    });

    column.addEventListener("drop", (event) => {
        if (!draggedCard) return;
        event.preventDefault();
        column.classList.remove("drag-area-highlight");

        const status = column.querySelector(".board-column-tasks")?.dataset.status;
        const taskId = event.dataTransfer?.getData("text/plain") || draggedTaskId;
        handleTaskDrop(taskId, status);
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
            dragImage = card.cloneNode(true);
            dragImage.classList.add("dragging");
            dragImage.setAttribute("aria-hidden", "true");
            dragImage.removeAttribute("id");
            Object.assign(dragImage.style, {
                position: "fixed",
                left: "-10000px",
                top: "0",
                width: `${rect.width}px`,
                height: `${rect.height}px`,
                margin: "0",
                pointerEvents: "none",
                opacity: "1",
                transform: "rotate(5deg)"
            });
            document.body.append(dragImage);
            dragImage.getBoundingClientRect();
            event.dataTransfer.setDragImage(dragImage, event.clientX - rect.left, event.clientY - rect.top);
        }
        console.log("Drag started:", draggedTaskId);
    });

    boardColumns.addEventListener("dragend", () => {
        draggedCard?.classList.remove("dragging");
        draggedCard = null;
        draggedTaskId = null;
        dropPlaceholder?.remove();
        dropPlaceholder = null;
        dragImage?.remove();
        dragImage = null;
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
