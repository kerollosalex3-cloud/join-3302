import { db } from "./firebase.js";
import { ref, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const validStatuses = new Set(["todo", "in-progress", "await-feedback", "done"]);
let draggedTaskId = null;

/**
 * Handle drag start on a task card.
 * @param {DragEvent} event
 */
function handleDragStart(event) {
    const card = event.target.closest(".task-card");
    if (!card) return;
    
    draggedTaskId = card.dataset.taskId;
    if (event.dataTransfer) {
        event.dataTransfer.effectAllowed = "move";
        event.dataTransfer.setData("text/plain", draggedTaskId);
    }
    console.log("Started dragging:", draggedTaskId);
}

/**
 * Handle drag over a drop zone.
 * @param {DragEvent} event
 */
function handleDragOver(event) {
    event.preventDefault();
    if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "move";
    }
    const zone = event.currentTarget;
    zone.classList.add("drag-area-highlight");
}

/**
 * Handle drag leave from a drop zone.
 * @param {DragEvent} event
 */
function handleDragLeave(event) {
    const zone = event.currentTarget;
    zone.classList.remove("drag-area-highlight");
}

/**
 * Handle drop on a drop zone.
 * @param {DragEvent} event
 */
async function handleDrop(event) {
    event.preventDefault();
    const zone = event.currentTarget;
    zone.classList.remove("drag-area-highlight");
    
    const status = zone.dataset.status;
    if (!draggedTaskId || !validStatuses.has(status)) {
        console.log("Invalid drop - taskId:", draggedTaskId, "status:", status);
        return;
    }

    console.log("Dropping task", draggedTaskId, "to status", status);
    
    try {
        await update(ref(db, `tasks/${draggedTaskId}`), { status });
        console.log("Task moved successfully");
    } catch (error) {
        console.error("Could not move task:", error);
        alert(`Error: ${error.message}`);
    }
    
    draggedTaskId = null;
}

/**
 * Attach drag handlers to a card.
 * @param {HTMLElement} card
 */
function attachCardHandlers(card) {
    card.addEventListener("dragstart", handleDragStart);
}

/**
 * Attach drop handlers to a zone.
 * @param {HTMLElement} zone
 */
function attachZoneHandlers(zone) {
    zone.addEventListener("dragover", handleDragOver);
    zone.addEventListener("dragleave", handleDragLeave);
    zone.addEventListener("drop", handleDrop);
}

/**
 * Initialize drag and drop for existing elements.
 */
function initializeDragAndDrop() {
    const boardColumns = document.querySelector(".board-columns");
    if (!boardColumns) {
        console.log("Board columns not found");
        return;
    }

    // Attach to existing cards
    for (const card of boardColumns.querySelectorAll(".task-card")) {
        attachCardHandlers(card);
    }

    // Attach to drop zones
    for (const zone of boardColumns.querySelectorAll(".board-column-tasks")) {
        attachZoneHandlers(zone);
    }

    // Watch for new cards
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLElement) {
                    if (node.classList.contains("task-card")) {
                        attachCardHandlers(node);
                    }
                    for (const card of node.querySelectorAll(".task-card")) {
                        attachCardHandlers(card);
                    }
                }
            }
        }
    });

    observer.observe(boardColumns, { childList: true, subtree: true });
    console.log("Drag and drop initialized");
}

// Wait for DOM to be ready
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeDragAndDrop);
} else {
    setTimeout(initializeDragAndDrop, 50);
}
