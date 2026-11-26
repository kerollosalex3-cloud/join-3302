document.addEventListener("pointerdown", () => {
    document.documentElement.setAttribute("data-pointer-focus", "");
}, true);

document.addEventListener("keydown", event => {
    if (!event.metaKey && !event.ctrlKey && !event.altKey) {
        document.documentElement.removeAttribute("data-pointer-focus");
    }
}, true);
