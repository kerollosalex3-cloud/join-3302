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
        console.error("Invalid drop - taskId:", taskId, "status:", status);
        return;
    }

    console.log("🚀 Dropping task", taskId, "to status", status);
    
    try {
        const updateRef = ref(db, `tasks/${taskId}`);
        console.log("📝 Updating Firebase at:", `tasks/${taskId}`);
        await update(updateRef, { status });
        console.log("✅ Task moved successfully to", status);
    } catch (error) {
        console.error("❌ Could not move task:", error);
        console.error("Error message:", error.message);
        console.error("Error code:", error.code);
        alert(`Error moving task: ${error.message}`);
    }
}

/**
 * Initialize drag and drop for the board.
 */
function initializeDragAndDrop() {
    const boardColumns = document.querySelector(".board-columns");
    if (!boardColumns) {
        console.log("⏳ Board columns not found, retrying...");
        setTimeout(initializeDragAndDrop, 500);
        return;
    }

    console.log("🎯 Initializing drag and drop on boardColumns");

    boardColumns.addEventListener("dragstart", (event) => {
        const card = event.target.closest(".task-card");
        if (!card) return;
        draggedCard = card;
        card.classList.add("dragging");
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", card.dataset.taskId);
        }
        console.log("🎬 Drag started:", card.dataset.taskId);
    });

    boardColumns.addEventListener("dragend", () => {
        draggedCard?.classList.remove("dragging");
        draggedCard = null;
        highlightDropZone(null);
        console.log("🛑 Drag ended");
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
        // Only remove highlight if we're leaving the board entirely
        if (!event.relatedTarget || !event.relatedTarget.closest?.(".board-column-tasks")) {
            highlightDropZone(null);
        }
    });

    boardColumns.addEventListener("drop", (event) => {
        const zone = event.target.closest(".board-column-tasks");
        if (!zone || !draggedCard) {
            console.log("⚠️ Drop rejected: zone?", !!zone, "draggedCard?", !!draggedCard);
            return;
        }
        event.preventDefault();
        event.stopPropagation();
        highlightDropZone(null);
        
        const taskId = event.dataTransfer?.getData("text/plain");
        const status = zone.dataset.status;
        console.log("📥 Drop zone:", status, "Task ID from dataTransfer:", taskId);
        handleTaskDrop(taskId, status);
    });

    console.log("✨ Drag and drop initialized");
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        console.log("📄 DOMContentLoaded fired");
        initializeDragAndDrop();
    });
} else {
    console.log("📄 DOM already loaded");
    setTimeout(initializeDragAndDrop, 50);
}
