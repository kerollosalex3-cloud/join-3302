import { escapeHtml, getAssigneeBadgeGroup, getAssigneeColors, getInitials } from "../script.js?v=4";

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
 * Builds subtask progress markup for a task card.
 * @param {Object} task Task data.
 * @returns {string} Subtask markup or an empty string.
 */
function getTaskSubtasksHtml(task) {
    return task.subtasks && task.subtasks.length > 0
        ? `<ul class="task-subtask-data" hidden>
            ${task.subtasks.map(st => `<li data-completed="${st.completed}">${escapeHtml(st.title)}</li>`).join("")}
           </ul>
           <div class="task-subtasks">
               <span class="task-progress" aria-label="${task.subtasks.filter(s => s.completed).length} of ${task.subtasks.length} subtasks completed">
                   <span style="width: ${task.subtasks.length > 0 ? Math.round((task.subtasks.filter(s => s.completed).length / task.subtasks.length) * 100) : 0}%"></span>
               </span>
               <span class="task-subtask-count">${task.subtasks.filter(s => s.completed).length}/${task.subtasks.length} Subtasks</span>
           </div>`
        : "";
}

/**
 * Builds assigned-contact markup for a task card.
 * @param {Object} task Task data.
 * @returns {string} Assigned-contact markup.
 */
function getTaskAssigneesHtml(task) {
    const assignees = Array.isArray(task.assignedTo) ? task.assignedTo.filter(assignee => assignee?.name) : [];
    if (!assignees.length) return `<div class="task-assignees"></div>`;
    const { visible, remaining } = getAssigneeBadgeGroup(assignees);
    const names = escapeHtml(assignees.map(assignee => assignee.name).join(", "));
    const badges = visible.map(assignee => {
        const colors = getAssigneeColors(assignee);
        return `<span class="task-assignee" style="background-color: ${colors.background}; color: ${colors.text}" data-name="${escapeHtml(assignee.name)}" aria-hidden="true">
            ${escapeHtml(assignee.initials || getInitials(assignee.name))}
        </span>`;
    }).join("");
    const overflow = remaining
        ? `<span class="task-assignee task-assignee-overflow" title="${remaining} more assigned contacts" aria-hidden="true">+${remaining}</span>`
        : "";
    return `<div class="task-assignees" aria-label="Assigned to ${names}">${badges}${overflow}</div>`;
}

/**
 * Builds the task card's contents.
 * @param {Object} task Task data.
 * @returns {string} Task card markup.
 */
function getTaskCardHtml(task) {
    const categoryClass = task.category === "technical-task" ? "task-category-technical" : "";
    const categoryLabel = task.category === "technical-task" ? "Technical Task" : "User Story";
    const subtaskHtml = getTaskSubtasksHtml(task);
    const assigneesHtml = getTaskAssigneesHtml(task);
    return `
        <div class="task-card-top">
            <span class="task-category ${categoryClass}">${categoryLabel}</span>
            <div class="task-move-menu">
                <button class="task-move-toggle" type="button"
                    aria-label="Move task" aria-expanded="false">
                    <img src="../assets/icons/move-to-mobile.svg" alt="">
                </button>
                <div class="task-move-options" hidden>
                    <span>Move to</span>
                    <button type="button" data-destination-status="todo">
                        <img class="task-move-option-icon" src="../assets/icons/arrow-up-mobile.svg" alt="">
                        <span>To do</span>
                    </button>
                    <button type="button" data-destination-status="in-progress">
                        <img class="task-move-option-icon" src="../assets/icons/arrow-down-mobile.svg" alt="">
                        <span>In progress</span>
                    </button>
                    <button type="button" data-destination-status="await-feedback">
                        <img class="task-move-option-icon" src="../assets/icons/arrow-down-mobile.svg" alt="">
                        <span>Await feedback</span>
                    </button>
                    <button type="button" data-destination-status="done">
                        <img class="task-move-option-icon" src="../assets/icons/arrow-down-mobile.svg" alt="">
                        <span>Done</span>
                    </button>
                </div>
            </div>
        </div>
        <h4>${escapeHtml(task.title)}</h4>
        <p class="task-description">${escapeHtml(task.description)}</p>
        ${subtaskHtml}
        <div class="task-card-footer">
            ${assigneesHtml}
            <img class="task-priority task-priority-${task.priority}"
                src="${getPriorityIcon(task.priority)}" alt="${getPriorityLabel(task.priority)} priority">
        </div>
    `;
}

/**
 * Creates a task card element from task data.
 * @param {Object} task Task data.
 * @returns {HTMLArticleElement} A task card element.
 */
export function createTaskCard(task) {
    const card = document.createElement("article");
    card.className = "task-card";
    card.setAttribute("role", "button");
    card.setAttribute("tabindex", "0");
    card.setAttribute("aria-haspopup", "dialog");
    if (task.dueDate) card.dataset.dueDate = task.dueDate;
    card.innerHTML = getTaskCardHtml(task);
    card.setAttribute("aria-label", `View task: ${task.title}`);
    card.dataset.taskId = task.id;
    card.dataset.taskStatus = task.status || "todo";
    return card;
}
