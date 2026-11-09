/**
 * Finds a required element and throws when the page markup is incomplete.
 * @param {string} selector CSS selector for the element.
 * @param {typeof Element} elementType Expected DOM element type.
 * @param {ParentNode} root Search root.
 * @returns {Element} The matching element.
 */
function requireElement(selector, elementType, root = document) {
    const element = root.querySelector(selector);
    if (!(element instanceof elementType)) {
        throw new Error(`Required board element is missing: ${selector}`);
    }
    return element;
}

const taskDialog = requireElement(".task-dialog", HTMLDialogElement);
const dialogCategory = requireElement(".task-dialog-category", HTMLElement, taskDialog);
const dialogTitle = requireElement(".task-dialog-title", HTMLElement, taskDialog);
const dialogDescription = requireElement(".task-dialog-description", HTMLElement, taskDialog);
const dialogDueDate = requireElement(".task-dialog-due-date", HTMLElement, taskDialog);
const dialogPriorityLabel = requireElement(".task-dialog-priority-label", HTMLElement, taskDialog);
const dialogPriorityIcon = requireElement(".task-dialog-priority-icon", HTMLImageElement, taskDialog);
const dialogAssignees = requireElement(".task-dialog-assignees", HTMLUListElement, taskDialog);
const dialogSubtasks = requireElement(".task-dialog-subtasks", HTMLUListElement, taskDialog);
const closeButton = requireElement(".task-dialog-close", HTMLButtonElement, taskDialog);
const boardSearchInput = requireElement("#boardSearchInput", HTMLInputElement);
const boardSearchEmpty = requireElement("#boardSearchEmpty", HTMLElement);
const taskCards = [...document.querySelectorAll(".task-card")];
const emptyColumnMessages = [...document.querySelectorAll(".board-empty")];

/**
 * Reads the required fields from a task card.
 * @param {Element} card Task card element.
 * @returns {{category: Element, title: Element, description: Element, priority: HTMLImageElement}}
 */
function getTaskDetails(card) {
    return {
        category: requireElement(".task-category", HTMLElement, card),
        title: requireElement("h4", HTMLElement, card),
        description: requireElement(".task-description", HTMLElement, card),
        priority: requireElement(".task-priority", HTMLImageElement, card)
    };
}

/**
 * Copies the task's main details into the dialog.
 * @param {Element} card Task card element.
 * @param {ReturnType<typeof getTaskDetails>} details Required task fields.
 */
function populateTaskSummary(card, details) {
    dialogCategory.textContent = details.category.textContent.trim();
    dialogCategory.classList.toggle("task-category-technical", details.category.classList.contains("task-category-technical"));
    dialogTitle.textContent = details.title.textContent.trim();
    dialogDescription.textContent = details.description.textContent.trim();
    dialogDueDate.textContent = card.dataset.dueDate || "Not set";
    dialogPriorityLabel.textContent = details.priority.alt.replace(/\s+priority$/i, "");
    dialogPriorityIcon.src = details.priority.src;
    dialogPriorityIcon.alt = details.priority.alt;
}

/**
 * Creates one assigned-contact row for the task dialog.
 * @param {Element} assignee Assigned contact badge.
 * @returns {HTMLLIElement} Dialog row with avatar and contact name.
 */
function createAssigneeItem(assignee) {
    const item = document.createElement("li");
    const avatar = document.createElement("span");
    const name = document.createElement("span");
    avatar.className = assignee.className;
    avatar.textContent = assignee.textContent.trim();
    name.textContent = assignee.dataset.name || assignee.textContent.trim();
    item.append(avatar, name);
    return item;
}

/**
 * Copies assigned contacts from the card into the dialog.
 * @param {Element} card Task card element.
 */
function populateAssignees(card) {
    dialogAssignees.replaceChildren();
    for (const assignee of card.querySelectorAll(".task-assignees .task-assignee")) {
        appendAssigneeItem(assignee);
    }
}

/**
 * Appends an assigned contact row to the dialog list.
 * @param {Element} assignee Assigned contact badge.
 */
function appendAssigneeItem(assignee) {
    dialogAssignees.append(createAssigneeItem(assignee));
}

/**
 * Creates one subtask row with its completed state.
 * @param {Element} subtask Subtask source element.
 * @returns {HTMLLIElement} Dialog row for the subtask.
 */
function createSubtaskItem(subtask) {
    const item = document.createElement("li");
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = subtask.dataset.completed === "true";
    checkbox.disabled = true;
    item.append(checkbox, document.createTextNode(subtask.textContent.trim()));
    return item;
}

/**
 * Copies subtasks from the card into the dialog.
 * @param {Element} card Task card element.
 */
function populateSubtasks(card) {
    const subtasks = card.querySelectorAll(".task-subtask-data li");
    dialogSubtasks.replaceChildren();
    if (subtasks.length === 0) {
        dialogSubtasks.append(createEmptySubtaskItem());
        return;
    }
    for (const subtask of subtasks) appendSubtaskItem(subtask);
}

/**
 * Creates the empty-state row when a task has no subtask details.
 * @returns {HTMLLIElement} Empty subtask row.
 */
function createEmptySubtaskItem() {
    const item = document.createElement("li");
    item.textContent = "No subtasks";
    return item;
}

/**
 * Appends a subtask row to the dialog list.
 * @param {Element} subtask Subtask source element.
 */
function appendSubtaskItem(subtask) {
    dialogSubtasks.append(createSubtaskItem(subtask));
}

/**
 * Opens the dialog with details from the selected card.
 * @param {Element} card Selected task card.
 */
function showTaskDetails(card) {
    const details = getTaskDetails(card);
    populateTaskSummary(card, details);
    populateAssignees(card);
    populateSubtasks(card);
    taskDialog.showModal();
    closeButton.focus();
}

/**
 * Opens a task card when clicked.
 * @param {MouseEvent} event Card click event.
 */
function handleTaskCardClick(event) {
    showTaskDetails(event.currentTarget);
}

/**
 * Opens a task card with Enter or Space.
 * @param {KeyboardEvent} event Card keyboard event.
 */
function handleTaskCardKeydown(event) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    showTaskDetails(event.currentTarget);
}

/**
 * Attaches pointer and keyboard handlers to a task card.
 * @param {Element} card Task card element.
 */
function bindTaskCard(card) {
    card.addEventListener("click", handleTaskCardClick);
    card.addEventListener("keydown", handleTaskCardKeydown);
}

/**
 * Checks whether a task title or description contains the query.
 * @param {Element} card Task card element.
 * @param {string} query Normalized search query.
 * @returns {boolean} Whether the task matches.
 */
function taskMatchesQuery(card, query) {
    const title = card.querySelector("h4")?.textContent || "";
    const description = card.querySelector(".task-description")?.textContent || "";
    return title.toLocaleLowerCase().includes(query) ||
        description.toLocaleLowerCase().includes(query);
}

/**
 * Applies the current query to every task card.
 * @param {string} query Normalized search query.
 * @returns {number} Number of visible task cards.
 */
function filterTaskCards(query) {
    let visibleTaskCount = 0;
    for (const card of taskCards) {
        const matches = !query || taskMatchesQuery(card, query);
        card.hidden = !matches;
        if (matches) visibleTaskCount += 1;
    }
    return visibleTaskCount;
}

/**
 * Shows empty-column hints only when the search field is empty.
 * @param {string} query Normalized search query.
 */
function updateEmptyColumnMessages(query) {
    for (const message of emptyColumnMessages) message.hidden = query.length > 0;
}

/**
 * Updates the search no-results message.
 * @param {string} query Normalized search query.
 * @param {number} visibleTaskCount Number of matching cards.
 */
function updateSearchMessage(query, visibleTaskCount) {
    boardSearchEmpty.hidden = query.length === 0 || visibleTaskCount > 0;
}

/**
 * Filters tasks as the user types.
 */
function handleBoardSearchInput() {
    const query = boardSearchInput.value.trim().toLocaleLowerCase();
    const visibleTaskCount = filterTaskCards(query);
    updateEmptyColumnMessages(query);
    updateSearchMessage(query, visibleTaskCount);
}

/**
 * Closes the dialog when the close button is activated.
 */
function closeTaskDialog() {
    taskDialog.close();
}

/**
 * Closes the dialog when the backdrop itself is clicked.
 * @param {MouseEvent} event Dialog click event.
 */
function closeTaskDialogOnBackdrop(event) {
    if (event.target === taskDialog) taskDialog.close();
}

taskCards.forEach(bindTaskCard);
boardSearchInput.addEventListener("input", handleBoardSearchInput);
closeButton.addEventListener("click", closeTaskDialog);
taskDialog.addEventListener("click", closeTaskDialogOnBackdrop);
