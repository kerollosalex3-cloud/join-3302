/**
 * Returns initials from a full name.
 * @param {string} name Full name.
 * @param {string} fallback Value for an empty name.
 * @returns {string} One or two uppercase initials.
 */
export function getInitials(name, fallback = "G") {
    const parts = String(name).trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
        return `${parts[0][0]}${parts.at(-1)[0]}`.toUpperCase();
    }
    return parts[0]?.slice(0, 2).toUpperCase() || fallback;
}

/**
 * Sets a field's validation state and message.
 * @param {HTMLInputElement|HTMLSelectElement} input Form control.
 * @param {HTMLElement} errorElement Error message element.
 * @param {string} message Error message.
 */
export function setFieldError(input, errorElement, message) {
    input.setAttribute("aria-invalid", String(Boolean(message)));
    errorElement.textContent = message;
}

/**
 * Checks whether an event targets a dialog backdrop.
 * @param {Event} event Dialog click event.
 * @param {HTMLDialogElement} dialog Dialog element.
 * @returns {boolean} Whether the backdrop was clicked.
 */
export function isBackdropClick(event, dialog) {
    return event.target === dialog;
}

/**
 * Finds a required element and validates its type.
 * @param {string} selector CSS selector.
 * @param {typeof Element} elementType Expected element class.
 * @param {ParentNode} root Search root.
 * @returns {Element} Matching element.
 */
export function requireElement(selector, elementType, root = document) {
    const element = root.querySelector(selector);
    if (!(element instanceof elementType)) {
        throw new Error(`Required element is missing or invalid: ${selector}`);
    }
    return element;
}

/**
 * Reads a URL query parameter.
 * @param {string} name Parameter name.
 * @returns {string|null} Parameter value.
 */
export function getUrlSearchParam(name) {
    return new URLSearchParams(window.location.search).get(name);
}

/**
 * Escapes HTML-sensitive characters in plain text.
 * @param {string} value Text to escape.
 * @returns {string} Safe HTML text.
 */
export function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, escapeHtmlCharacter);
}

/**
 * Converts one HTML-sensitive character to an entity.
 * @param {string} character Matched character.
 * @returns {string} Escaped character.
 */
function escapeHtmlCharacter(character) {
    const entities = {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;",
    };
    return entities[character] || character;
}

/**
 * Finds an element in a root.
 * @param {string} selector CSS selector.
 * @param {ParentNode} root Search root.
 * @returns {Element|null} Matching element.
 */
export function getElement(selector, root = document) {
    return root.querySelector(selector);
}

/**
 * Shows a short status message.
 * @param {string} message Status text.
 */
export function showToast(message) {
    const toast = getElement("#toast");
    if (!toast) return;

    toast.textContent = message;
    toast.style.display = "block";
    clearTimeout(showToast.hideTimer);
    showToast.hideTimer = setTimeout(() => {
        toast.style.display = "none";
    }, 2500);
}

/**
 * Updates one password visibility control.
 * @param {HTMLInputElement} input Password field.
 * @param {HTMLButtonElement} toggle Visibility button.
 * @param {HTMLImageElement} icon Button icon.
 * @param {Object<string, string>} icons Icon sources.
 */
function updatePasswordToggle(input, toggle, icon, icons) {
    const hasValue = input.value.length > 0;
    toggle.disabled = !hasValue;
    input.type = hasValue ? input.type : "password";
    icon.src = !hasValue
        ? icons.lock
        : input.type === "password" ? icons.hidden : icons.visible;
    toggle.setAttribute("aria-label", input.type === "password" ? "Show password" : "Hide password");
}

/**
 * Toggles password visibility and refreshes its control.
 * @param {HTMLInputElement} input Password field.
 * @param {HTMLButtonElement} toggle Visibility button.
 * @param {HTMLImageElement} icon Button icon.
 * @param {Object<string, string>} icons Icon sources.
 */
function togglePasswordVisibility(input, toggle, icon, icons) {
    input.type = input.type === "password" ? "text" : "password";
    updatePasswordToggle(input, toggle, icon, icons);
}

/**
 * Binds password visibility behavior to an input and button.
 * @param {HTMLInputElement} input Password field.
 * @param {HTMLButtonElement} toggle Visibility button.
 */
export function bindPasswordVisibility(input, toggle) {
    const icon = toggle.querySelector("img");
    const icons = {
        lock: icon.getAttribute("src"),
        hidden: toggle.dataset.hiddenIcon,
        visible: toggle.dataset.visibleIcon
    };
    const refresh = () => updatePasswordToggle(input, toggle, icon, icons);
    input.addEventListener("input", refresh);
    toggle.addEventListener("click", () => togglePasswordVisibility(input, toggle, icon, icons));
    refresh();
}

/**
 * Sets and opens a modal.
 * @param {string} contentHtml Modal content.
 * @param {string} dialogClass Additional class.
 */
export function openModal(contentHtml, dialogClass = "") {
    const modalBox = getElement("#mbox");
    modalBox.classList.remove("wide");
    if (dialogClass) modalBox.classList.add(dialogClass);
    modalBox.innerHTML = contentHtml;
    getElement("#modal").classList.add("show");
}

/**
 * Closes the shared modal.
 */
export function closeModal() {
    getElement("#modal").classList.remove("show");
    getElement("#mbox").classList.remove("wide");
}

/**
 * Opens a delete confirmation modal.
 * @param {string} question Confirmation question.
 * @param {Function} onConfirm Delete callback.
 */
export function openDeleteConfirmDialog(question, onConfirm) {
    openModal(`<h3>${escapeHtml(question)}</h3><div class="row">
    <button class="btn danger" id="y">Löschen</button>
    <button class="btn sec" id="n">Abbrechen</button></div>`);
    getElement("#y").onclick = onConfirm;
    getElement("#n").onclick = closeModal;
}

/**
 * Closes the shared modal after a backdrop click.
 * @param {MouseEvent} event Document click.
 */
function closeOnBackdrop(event) {
    if (isBackdropClick(event, getElement("#modal"))) closeModal();
}

document.addEventListener("click", closeOnBackdrop);
