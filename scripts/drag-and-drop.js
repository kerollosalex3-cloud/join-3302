import { db } from "./firebase.js";
import { ref, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const validStatuses = new Set(["todo", "in-progress", "await-feedback", "done"]);
let draggedCard = null;
let draggedTaskId = null;

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
 * Attach event listeners to a drop zone.
 * @param {HTMLElement} zone
 */
function attachDropZoneListeners(zone) {
    zone.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "move";
        zone.classList.add("drag-area-highlight");
        console.log("🎯 Dragover on zone:", zone.dataset.status);
    });

    zone.addEventListener("dragleave", (event) => {
        // Only remove highlight if leaving the zone itself, not child elements
        if (event.target === zone) {
            zone.classList.remove("drag-area-highlight");
            console.log("👋 Dragleave from zone:", zone.dataset.status);
        }
    });

    zone.addEventListener("drop", (event) => {
        event.preventDefault();
        event.stopPropagation();
        zone.classList.remove("drag-area-highlight");
        
        const taskId = event.dataTransfer.getData("text/plain");
        const status = zone.dataset.status;
        console.log("📥 Drop on zone:", status, "Task:", taskId);
        handleTaskDrop(taskId, status);
    });
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

    console.log("🎯 Initializing drag and drop");

    // Dragstart on task cards
    boardColumns.addEventListener("dragstart", (event) => {
        const card = event.target.closest(".task-card");
        if (!card) return;
        draggedCard = card;
        draggedTaskId = card.dataset.taskId;
        card.classList.add("dragging");
        if (event.dataTransfer) {
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", draggedTaskId);
        }
        console.log("🎬 Drag started:", draggedTaskId);
    });

    boardColumns.addEventListener("dragend", () => {
        draggedCard?.classList.remove("dragging");
        draggedCard = null;
        draggedTaskId = null;
        // Remove highlights from all zones
        document.querySelectorAll(".board-column-tasks").forEach(zone => {
            zone.classList.remove("drag-area-highlight");
        });
        console.log("🛑 Drag ended");
    });

    // Attach listeners to existing drop zones
    for (const zone of boardColumns.querySelectorAll(".board-column-tasks")) {
        attachDropZoneListeners(zone);
    }

    // Watch for new drop zones
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLElement && node.classList.contains("board-column-tasks")) {
                    console.log("📌 New drop zone detected, attaching listeners");
                    attachDropZoneListeners(node);
                }
            }
        }
    });

    observer.observe(boardColumns, { childList: true, subtree: true });
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
