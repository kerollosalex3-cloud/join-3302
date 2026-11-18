/**
 * Finds a required element and throws when the page markup is incomplete.
 * @param {string} selector CSS selector for the element.
 * @param {typeof Element} elementType Expected DOM element type.
 * @param {ParentNode} root Search root.
 * @returns {Element} Matching element.
 */
function requireElement(selector, elementType, root = document) {
    const element = root.querySelector(selector);
    if (!(element instanceof elementType)) {
        throw new Error(`Required board element is missing: ${selector}`);
    }
    return element;
}

const taskDialog = requireElement(".task-dialog", HTMLDialogElement);

export const validTaskStatuses = new Set(["todo", "in-progress", "await-feedback", "done"]);

export const boardElements = {
    taskDialog,
    dialogCategory: requireElement(".task-dialog-category", HTMLElement, taskDialog),
    dialogTitle: requireElement(".task-dialog-title", HTMLElement, taskDialog),
    dialogDescription: requireElement(".task-dialog-description", HTMLElement, taskDialog),
    dialogDueDate: requireElement(".task-dialog-due-date", HTMLElement, taskDialog),
    dialogPriorityLabel: requireElement(".task-dialog-priority-label", HTMLElement, taskDialog),
    dialogPriorityIcon: requireElement(".task-dialog-priority-icon", HTMLImageElement, taskDialog),
    dialogAssignees: requireElement(".task-dialog-assignees", HTMLUListElement, taskDialog),
    dialogSubtasks: requireElement(".task-dialog-subtasks", HTMLUListElement, taskDialog),
    closeButton: requireElement(".task-dialog-close", HTMLButtonElement, taskDialog),
    deleteButton: requireElement(".task-dialog-delete", HTMLButtonElement, taskDialog),
    editButton: requireElement(".task-dialog-edit", HTMLButtonElement, taskDialog),
    boardSearchInput: requireElement("#boardSearchInput", HTMLInputElement),
    boardSearchForm: requireElement("#boardSearchForm", HTMLFormElement),
    boardSearchEmpty: requireElement("#boardSearchEmpty", HTMLElement),
    boardColumns: requireElement(".board-columns", HTMLElement),
    addTaskDialog: requireElement(".board-add-task-dialog", HTMLDialogElement),
    emptyColumnMessages: [...document.querySelectorAll(".board-empty")]
};

boardElements.boardSearchButton = requireElement(
    ".board-search-icon",
    HTMLButtonElement,
    boardElements.boardSearchForm
);
boardElements.addTaskFrame = requireElement(
    ".board-add-task-frame",
    HTMLIFrameElement,
    boardElements.addTaskDialog
);
boardElements.addTaskCloseButton = requireElement(
    ".board-add-task-close",
    HTMLButtonElement,
    boardElements.addTaskDialog
);
