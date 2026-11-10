import { escapeHtml } from "./scripts/firebase.js";

// Sucht ein Element innerhalb des angegebenen Bereichs oder des Dokuments.
export function getElement(selector, root = document) {
    return root.querySelector(selector);
}

// Zeigt eine kurze Statusmeldung an und blendet vorherige Timer aus.
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

export function bindPasswordVisibility(input, toggle) {
    const icon = toggle.querySelector("img");
    const lockIcon = icon.getAttribute("src");
    const visibleIcon = toggle.dataset.visibleIcon;
    const hiddenIcon = toggle.dataset.hiddenIcon;

    function updateToggle() {
        const hasValue = input.value.length > 0;
        toggle.disabled = !hasValue;
        if (!hasValue) {
            input.type = "password";
            icon.src = lockIcon;
        } else {
            icon.src = input.type === "password" ? hiddenIcon : visibleIcon;
        }
        toggle.setAttribute("aria-label", input.type === "password" ? "Show password" : "Hide password");
    }

    input.addEventListener("input", updateToggle);
    toggle.addEventListener("click", () => {
        input.type = input.type === "password" ? "text" : "password";
        updateToggle();
    });
    updateToggle();
}

// Setzt den Dialoginhalt und zeigt den Dialog an.
export function openModal(contentHtml, dialogClass = "") {
    const modalBox = getElement("#mbox");
    modalBox.classList.remove("wide");
    if (dialogClass) modalBox.classList.add(dialogClass);
    modalBox.innerHTML = contentHtml;
    getElement("#modal").classList.add("show");
}

// Blendet den aktuell geöffneten Dialog aus.
export function closeModal() {
    getElement("#modal").classList.remove("show");
    getElement("#mbox").classList.remove("wide");
}

// Öffnet einen Dialog mit Löschen- und Abbrechen-Aktionen.
export function openDeleteConfirmDialog(question, onConfirm) {
    openModal(`<h3>${escapeHtml(question)}</h3><div class="row">
    <button class="btn danger" id="y">Löschen</button>
    <button class="btn sec" id="n">Abbrechen</button></div>`);
    getElement("#y").onclick = onConfirm;
    getElement("#n").onclick = closeModal;
}

// Schließt den Dialog bei einem Klick auf seinen Hintergrund.
function closeOnBackdrop(event) {
    if (event.target?.id === "modal") closeModal();
}

document.addEventListener("click", closeOnBackdrop);
