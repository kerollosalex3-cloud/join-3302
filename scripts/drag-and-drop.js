import { db } from "./firebase.js";
import { ref, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const validStatuses = new Set(["todo", "in-progress", "await-feedback", "done"]);
let draggedCard = null;

/**
 * Highlight the drop zone column.
 * @param {HTMLElement|null} activeZone
 */
function highlightDropZone(activeZone) {
    document.querySelectorAll(".board-column-tasks").forEach((zone) => {
        zone.classList.toggle("drag-area-highlight", zone === activeZone);
    });
}

/**
 * Handle task drop and update Firebase.
 * @param {string} taskId
 * @param {string} status
 */
async function handleTaskDrop(taskId, status) {
    if (!taskId || !validStatuses.has(status)) {
        console.log("Invalid drop - taskId:", taskId, "status:", status);
        return;
    }

    console.log("Dropping task", taskId, "to status", status);
    
    try {
        await update(ref(db, `tasks/${taskId}`), { status });
        console.log("Task moved successfully");
    } catch (error) {
        console.error("Could not move task:", error);
        alert(`Error: ${error.message}`);
    }
}

/**
 * Initialize drag and drop for the board.
 */
function initializeDragAndDrop() {
    const boardColumns = document.querySelector(".board-columns");
    if (!boardColumns) {
        console.log("Board columns not found");
        return;
    }

    boardColumns.addEventListener("dragstart", (event) => {
        const card = event.target.closest(".task-card");
        if (!card) return;
        draggedCard = card;
        card.classList.add("dragging");
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", card.dataset.taskId);
        }
        console.log("Started dragging:", card.dataset.taskId);
    });

    boardColumns.addEventListener("dragend", () => {
        draggedCard?.classList.remove("dragging");
        draggedCard = null;
        highlightDropZone(null);
        console.log("Drag ended");
    });

    boardColumns.addEventListener("dragover", (event) => {
        const zone = event.target.closest(".board-column-tasks");
        if (!zone || !draggedCard) return;
        event.preventDefault();
        if (event.dataTransfer) {
            event.dataTransfer.dropEffect = "move";
        }
        highlightDropZone(zone);
    });

    boardColumns.addEventListener("dragleave", (event) => {
        if (!draggedCard) return;
        // Check if we're leaving the entire board or just a child element
        if (!event.relatedTarget || !event.relatedTarget.closest?.(".board-column-tasks")) {
            highlightDropZone(null);
        }
    });

    boardColumns.addEventListener("drop", (event) => {
        const zone = event.target.closest(".board-column-tasks");
        if (!zone || !draggedCard) return;
        event.preventDefault();
        event.stopPropagation();
        highlightDropZone(null);
        
        const taskId = event.dataTransfer?.getData("text/plain");
        const status = zone.dataset.status;
        handleTaskDrop(taskId, status);
    });

    console.log("Drag and drop initialized");
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeDragAndDrop);
} else {
    setTimeout(initializeDragAndDrop, 50);
}
