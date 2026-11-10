import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { get, ref } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { auth, db, userPath } from "./firebase.js";

const greetingName = document.querySelector("#greeting-name");
const avatarInitials = document.querySelector(".header-avatar-initials");
const mobileAvatarInitials = document.querySelector(".summary-mobile-avatar");
const avatarTrigger = document.querySelector(".header-avatar-trigger");

/**
 * Gets a display name for the signed-in user.
 * @param {import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js").User} user Firebase Auth user.
 * @returns {string} User's display name or a fallback.
 */
function getUserName(user) {
    if (user.isAnonymous) return "Guest";

    return user.displayName?.trim() || "Name unavailable";
}

/**
 * Reads the user's name from their Realtime Database profile.
 * @param {import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js").User} user Firebase Auth user.
 * @returns {Promise<string>} Name stored at the user's database record.
 */
async function getDatabaseUserName(user) {
    const snapshot = await get(ref(db, userPath(user.uid)));
    const databaseName = snapshot.child("name").val();

    if (typeof databaseName !== "string" || !databaseName.trim()) {
        throw new Error(`No name found for Firebase user ${user.uid}.`);
    }

    return databaseName.trim();
}

/**
 * Creates initials from the first and last name components.
 * @param {string} name Full name.
 * @returns {string} User initials.
 */
function getInitials(name) {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length > 1) {
        return `${parts[0][0]}${parts[parts.length - 1][0]}`.toLocaleUpperCase();
    }

    return parts[0]?.slice(0, 2).toLocaleUpperCase() || "G";
}

/**
 * Updates the greeting and avatar whenever Firebase auth state changes.
 * @param {import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js").User|null} user Signed-in user.
 * @returns {Promise<void>} Resolves after the profile display has been updated.
 */
async function updateSignedInUserDisplay(user) {
    const name = await resolveSignedInUserName(user);
    if (user && auth.currentUser?.uid !== user.uid) return;
    const initials = !user || user.isAnonymous ? "G" : getInitials(name);
    renderUserDisplay(name, initials);
}

/**
 * Resolves the best available name for the current authentication state.
 * @param {import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js").User|null} user Signed-in user.
 * @returns {Promise<string>} Resolved profile name.
 */
async function resolveSignedInUserName(user) {
    if (!user || user.isAnonymous) return "Guest";
    try {
        return await getDatabaseUserName(user);
    } catch {
        return getUserName(user);
    }
}

/**
 * Renders the same user identity in the greeting and desktop/mobile avatars.
 * @param {string} name Resolved user name.
 * @param {string} initials Initials derived from the name.
 */
function renderUserDisplay(name, initials) {
    greetingName.textContent = name;
    avatarInitials.textContent = initials;
    mobileAvatarInitials.textContent = initials;
    avatarTrigger.setAttribute("aria-label", `Open profile menu for ${name}`);
}

onAuthStateChanged(auth, updateSignedInUserDisplay);
