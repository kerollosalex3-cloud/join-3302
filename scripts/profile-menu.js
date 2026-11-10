const profileMenu = document.querySelector('#profile-menu');
const profileMenuTrigger = document.querySelector('.header-avatar-trigger');

/**
 * Updates the profile menu visibility and accessibility state.
 * @param {boolean} isOpen Whether the menu should be open.
 */
function setProfileMenuOpen(isOpen) {
    profileMenu.classList.toggle('is-open', isOpen);
    profileMenu.setAttribute('aria-hidden', String(!isOpen));
    profileMenu.inert = !isOpen;
    profileMenuTrigger.setAttribute('aria-expanded', String(isOpen));
}

/**
 * Toggles the profile menu when its trigger is activated.
 */
function toggleProfileMenu() {
    setProfileMenuOpen(profileMenuTrigger.getAttribute('aria-expanded') !== 'true');
}

/**
 * Closes the menu when the user clicks outside its wrapper.
 * @param {MouseEvent} event Document click event.
 */
function closeProfileMenuOnOutsideClick(event) {
    if (!event.target.closest('.profile-menu-wrapper')) {
        setProfileMenuOpen(false);
    }
}

/**
 * Closes the menu and restores focus when Escape is pressed.
 * @param {KeyboardEvent} event Document keydown event.
 */
function closeProfileMenuOnEscape(event) {
    if (event.key === 'Escape') {
        setProfileMenuOpen(false);
        profileMenuTrigger.focus();
    }
}

profileMenuTrigger.addEventListener('click', toggleProfileMenu);
document.addEventListener('click', closeProfileMenuOnOutsideClick);
document.addEventListener('keydown', closeProfileMenuOnEscape);
