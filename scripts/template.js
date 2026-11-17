import { escapeHtml } from "./firebase.js";

/**
 * Returns the priority icon path based on the priority level.
 * @param {string} priority - Priority level: "low", "medium", "urgent".
 * @returns {string} Path to the priority icon.
 */
function getPriorityIcon(priority) {
    const icons = {
        "low": "../assets/icons/board-prio-low.svg",
        "medium": "../assets/icons/boar-prio-medium.svg",
        "urgent": "../assets/icons/boar-prio-urgent.svg"
    };
    return icons[priority] || icons["low"];
}

/**
 * Returns the human-readable priority label.
 * @param {string} priority - Priority level: "low", "medium", "urgent".
 * @returns {string} Capitalized priority label.
 */
function getPriorityLabel(priority) {
    return priority.charAt(0).toUpperCase() + priority.slice(1);
}

/**
 * Creates a task card element from task data.
 * @param {Object} task - Task object with id, title, description, category, priority, dueDate, subtasks, assignedTo.
 * @returns {HTMLArticleElement} A task card element.
 */
export function createTaskCard(task) {
    const card = document.createElement("article");
    card.className = "task-card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-haspopup", "dialog");
    card.setAttribute("draggable", "true");
    if (task.dueDate) {
        card.dataset.dueDate = task.dueDate;
    }

    const categoryClass = task.category === "technical-task" ? "task-category-technical" : "";
    const categoryLabel = task.category === "technical-task" ? "Technical Task" : "User Story";

    const subtaskHtml = task.subtasks && task.subtasks.length > 0
        ? `<ul class="task-subtask-data" hidden>
            ${task.subtasks.map(st => `<li data-completed="${st.completed}">${escapeHtml(st.title)}</li>`).join("")}
           </ul>
           <div class="task-subtasks">
               <span class="task-progress" aria-label="${task.subtasks.filter(s => s.completed).length} of ${task.subtasks.length} subtasks completed">
                   <span style="width: ${task.subtasks.length > 0 ? Math.round((task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100) : 0}%"></span>
               </span>
               <span>${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length} Subtasks</span>
           </div>`
        : "";

    const assigneesHtml = task.assignedTo && task.assignedTo.length > 0
        ? `<div class="task-assignees" aria-label="Assigned to ${task.assignedTo.map(a => a.name).join(", ")}">
            ${task.assignedTo.slice(0, 3).map((assignee, idx) => `
                <span class="task-assignee task-assignee-${idx + 1}" data-name="${escapeHtml(assignee.name)}">
                    ${escapeHtml(assignee.initials)}
                </span>
            `).join("")}
           </div>`
        : `<div class="task-assignees"></div>`;

    card.innerHTML = `
        <span class="task-category ${categoryClass}">${categoryLabel}</span>
        <h4>${escapeHtml(task.title)}</h4>
        <p class="task-description">${escapeHtml(task.description)}</p>
        ${subtaskHtml}
        <div class="task-card-footer">
            ${assigneesHtml}
            <img class="task-priority task-priority-${task.priority}"
                src="${getPriorityIcon(task.priority)}" alt="${getPriorityLabel(task.priority)} priority">
        </div>
    `;

    const ariaLabel = `View task: ${task.title}`;
    card.setAttribute("aria-label", ariaLabel);
    
    // Set dataset AFTER innerHTML to prevent it from being lost
    card.dataset.taskId = task.id;

    return card;
}
