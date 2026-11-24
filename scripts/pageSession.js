import { auth } from './firebase.js';
import { signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

/**
 * Connects a logout link to Firebase.
 * @param {HTMLElement} link - Logout link.
 * @param {HTMLElement} status - Message shown if logout fails.
 */
export function bindLogout(link, status) {
    link.addEventListener('click', async event => {
        event.preventDefault();
        try {
            await signOut(auth);
        } catch {
            status.textContent = 'Could not log out. Please try again.';
        }
    });
}
