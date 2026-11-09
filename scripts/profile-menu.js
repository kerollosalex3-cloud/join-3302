const profileMenu = document.querySelector('#profile-menu');
const profileMenuTrigger = document.querySelector('.header-avatar-trigger');

function setProfileMenuOpen(isOpen) {
    profileMenu.classList.toggle('is-open', isOpen);
    profileMenu.setAttribute('aria-hidden', String(!isOpen));
    profileMenu.inert = !isOpen;
    profileMenuTrigger.setAttribute('aria-expanded', String(isOpen));
}

profileMenuTrigger.addEventListener('click', () => {
    setProfileMenuOpen(profileMenuTrigger.getAttribute('aria-expanded') !== 'true');
});

document.addEventListener('click', (event) => {
    if (!event.target.closest('.profile-menu-wrapper')) {
        setProfileMenuOpen(false);
    }
});

document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        setProfileMenuOpen(false);
        profileMenuTrigger.focus();
    }
});
