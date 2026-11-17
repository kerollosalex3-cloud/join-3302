import { db } from "./firebase.js";
import { ref, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const validStatuses = new Set(["todo", "in-progress", "await-feedback", "done"]);
let draggedTaskId = null;

// Globale Funktionen für HTML-Attribute
window.startDragging = function(taskId) {
    draggedTaskId = taskId;
    console.log("Dragging task:", taskId);
};

window.allowDrop = function(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    const zone = event.currentTarget;
    zone.classList.add("drag-area-highlight");
};

window.removeDragHighlight = function(event) {
    event.currentTarget.classList.remove("drag-area-highlight");
};

window.dropTask = async function(event, status) {
    event.preventDefault();
    event.currentTarget.classList.remove("drag-area-highlight");
    
    if (!draggedTaskId || !validStatuses.has(status)) {
        console.log("Invalid drop:", draggedTaskId, status);
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
};

// Dynamisch Attribute zu neu geladenen Karten hinzufügen
function enhanceTaskCards(root) {
    for (const card of root.querySelectorAll(".task-card:not([draggable])")) {
        card.setAttribute("draggable", "true");
        const taskId = card.dataset.taskId;
        card.setAttribute("ondragstart", `startDragging('${taskId}')`);
        card.setAttribute("ondragend", "draggedTaskId = null;");
    }
}

function enhanceDropZones(root) {
    for (const zone of root.querySelectorAll(".board-column-tasks")) {
        const status = zone.dataset.status;
        zone.setAttribute("ondragover", "allowDrop(event)");
        zone.setAttribute("ondragleave", "removeDragHighlight(event)");
        zone.setAttribute("ondrop", `dropTask(event, '${status}')`);
    }
}

function initializeDragAndDrop() {
    const boardColumns = document.querySelector(".board-columns");
    if (!boardColumns) {
        console.log("Board columns not found yet");
        return;
    }

    enhanceTaskCards(boardColumns);
    enhanceDropZones(boardColumns);

    // Beobachte neue Karten
    new MutationObserver((mutations) => {
        for (const mutation of mutations) {
            for (const node of mutation.addedNodes) {
                if (node instanceof HTMLElement) {
                    enhanceTaskCards(node);
                    enhanceDropZones(node);
                }
            }
        }
    }).observe(boardColumns, { childList: true, subtree: true });

    console.log("Drag and drop initialized");
}

// Warte auf DOM und starte dann
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeDragAndDrop);
} else {
    setTimeout(initializeDragAndDrop, 100);
}
