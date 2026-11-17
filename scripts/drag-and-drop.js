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
 * Handle drag end on a task card.
 * @param {DragEvent} event
 */
function handleDragEnd(event) {
    console.log("Drag ended");
    draggedTaskId = null;
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
    if (zone === event.target) {
        zone.classList.remove("drag-area-highlight");
    }
}

/**
 * Handle drop on a drop zone.
 * @param {DragEvent} event
 */
async function handleDrop(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const zone = event.currentTarget;
    zone.classList.remove("drag-area-highlight");
    
    const status = zone.dataset.status;
    const taskId = draggedTaskId;
    
    console.log("Drop event - taskId:", taskId, "status:", status);
    
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
    
    draggedTaskId = null;
}

/**
 * Attach drag handlers to a card.
 * @param {HTMLElement} card
 */
function attachCardHandlers(card) {
    card.removeEventListener("dragstart", handleDragStart);
    card.removeEventListener("dragend", handleDragEnd);
    card.addEventListener("dragstart", handleDragStart);
    card.addEventListener("dragend", handleDragEnd);
}

/**
 * Attach drop handlers to a zone.
 * @param {HTMLElement} zone
 */
function attachZoneHandlers(zone) {
    zone.removeEventListener("dragover", handleDragOver);
    zone.removeEventListener("dragleave", handleDragLeave);
    zone.removeEventListener("drop", handleDrop);
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

    // Watch for new cards and zones
    const observer = new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLElement) {
                    // New card added
                    if (node.classList.contains("task-card")) {
                        attachCardHandlers(node);
                    }
                    // New zone added
                    if (node.classList.contains("board-column-tasks")) {
                        attachZoneHandlers(node);
                    }
                    // Search in subtree
                    for (const card of node.querySelectorAll(".task-card")) {
                        attachCardHandlers(card);
                    }
                    for (const zone of node.querySelectorAll(".board-column-tasks")) {
                        attachZoneHandlers(zone);
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
