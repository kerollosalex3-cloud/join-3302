import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyB-lIp7mVC69O1bMplnbULnycCFwgZt00k",
    authDomain: "join-584c8.firebaseapp.com",
    databaseURL: "https://join-584c8-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "join-584c8",
    storageBucket: "join-584c8.firebasestorage.app",
    messagingSenderId: "25424665774",
    appId: "1:25424665774:web:fba2e7379dfb1837f0613f",
    measurementId: "G-6MN6NCKMXT"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getDatabase(app);

/**
 * Builds a database path for a user's profile or a nested profile value.
 * @param {string} uid Firebase Authentication user ID.
 * @param {string} [nestedPath] Optional path below the user's profile.
 * @returns {string} Realtime Database path.
 */
export function userPath(uid, nestedPath = "") {
    return nestedPath ? `users/${uid}/${nestedPath}` : `users/${uid}`;
}

/**
 * Escapes HTML-sensitive characters in plain text.
 * @param {string} [value] Text to escape.
 * @returns {string} Safe HTML text.
 */
export function escapeHtml(value = "") {
    return String(value).replace(/[&<>"']/g, escapeHtmlCharacter);
}

/**
 * Converts one HTML-sensitive character to its entity representation.
 * @param {string} character Character matched by the HTML-sensitive pattern.
 * @returns {string} HTML entity or unchanged character.
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