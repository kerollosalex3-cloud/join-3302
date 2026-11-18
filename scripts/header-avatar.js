import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { get, ref } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { auth, db, userPath } from "./firebase.js";
import { getInitials } from "../script.js";

const avatar = document.querySelector(".header-avatar");

/**
 * Resolves the name stored in the signed-in user's database profile.
 * @param {import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js").User} user Authenticated user.
 * @returns {Promise<string>} Profile name or Auth display name.
 */
async function getUserName(user) {
    try {
        const snapshot = await get(ref(db, userPath(user.uid, "name")));
        const profileName = snapshot.val();
        if (typeof profileName === "string" && profileName.trim()) return profileName.trim();
    } catch {
        return user.displayName?.trim() || "Guest";
    }

    return user.displayName?.trim() || "Guest";
}

/**
 * Updates the shared header avatar when the Firebase user changes.
 * @param {import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js").User|null} user Current Auth user.
 */
async function updateHeaderAvatar(user) {
    const name = !user ? "Guest" : user.isAnonymous ? "Guest" : await getUserName(user);
    if (user && auth.currentUser?.uid !== user.uid) return;

    const initials = !user || user.isAnonymous ? "G" : getInitials(name);
    avatar.textContent = initials;
    avatar.setAttribute("aria-label", `Signed in as ${name}`);
}

if (avatar) onAuthStateChanged(auth, updateHeaderAvatar);
