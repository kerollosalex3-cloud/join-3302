import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { get, onValue, ref } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { auth, db, userPath } from "./firebase.js";
import { getInitials } from "../script.js";

const greetingName = document.querySelector("#greeting-name");
const avatarInitials = document.querySelector(".header-avatar-initials");
const avatarTrigger = document.querySelector(".header-avatar-trigger");
const deadlineElement = document.querySelector("#summary-next-deadline");
const greetingElement = document.querySelector("#summary-greeting");
const metricElements = Object.fromEntries(
    [...document.querySelectorAll("[data-summary]")]
        .map(card => [card.dataset.summary, card.querySelector("strong")])
);

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
    avatarTrigger.setAttribute("aria-label", `Open profile menu for ${name}`);
}

/**
 * Reads task objects from a Firebase snapshot.
 * @param {import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js").DataSnapshot} snapshot Task snapshot.
 * @returns {Object[]} Task objects.
 */
function readTasks(snapshot) {
    return snapshot.exists() ? Object.values(snapshot.val()) : [];
}

/**
 * Counts tasks matching a board status.
 * @param {Object[]} tasks All tasks.
 * @param {string} status Board status.
 * @returns {number} Matching task count.
 */
function countStatus(tasks, status) {
    return tasks.filter(task => (task.status || "todo") === status).length;
}

/**
 * Calculates the next valid deadline.
 * @param {Object[]} tasks All tasks.
 * @returns {string|null} Earliest future or current due date.
 */
function findNextDeadline(tasks) {
    const now = new Date();
    const today = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0")
    ].join("-");
    const dates = tasks
        .filter(task => task.status !== "done" && /^\d{4}-\d{2}-\d{2}$/.test(task.dueDate))
        .map(task => task.dueDate)
        .filter(date => date >= today)
        .sort();
    return dates[0] || null;
}

/**
 * Formats an ISO due date for the summary.
 * @param {string|null} date Due date.
 * @returns {string} Localized date or fallback.
 */
function formatDeadline(date) {
    if (!date) return "No upcoming deadline";
    return new Intl.DateTimeFormat("en", {
        month: "long",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC"
    }).format(new Date(`${date}T00:00:00Z`));
}

/**
 * Builds all summary counters.
 * @param {Object[]} tasks All tasks.
 * @returns {Object<string, number>} Summary values.
 */
function getSummaryCounts(tasks) {
    return {
        all: tasks.length,
        todo: countStatus(tasks, "todo"),
        "in-progress": countStatus(tasks, "in-progress"),
        "await-feedback": countStatus(tasks, "await-feedback"),
        done: countStatus(tasks, "done"),
        urgent: tasks.filter(task =>
            task.priority === "urgent" && task.status !== "done").length
    };
}

/**
 * Updates all visible summary counters.
 * @param {Object[]} tasks All tasks.
 */
function renderTaskSummary(tasks) {
    const counts = getSummaryCounts(tasks);
    for (const [key, value] of Object.entries(counts)) {
        if (metricElements[key]) metricElements[key].textContent = String(value);
    }
    deadlineElement.textContent = formatDeadline(findNextDeadline(tasks));
}

/**
 * Updates the task metrics after every Firebase change.
 * @param {import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js").DataSnapshot} snapshot Task snapshot.
 */
function handleTasksSnapshot(snapshot) {
    renderTaskSummary(readTasks(snapshot));
}

/**
 * Returns a greeting for the current local time.
 * @returns {string} Time-based greeting.
 */
function getGreeting() {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning,";
    if (hour < 18) return "Good afternoon,";
    return "Good evening,";
}

/**
 * Starts live summary loading after authentication.
 */
function initializeSummary() {
    greetingElement.textContent = getGreeting();
    onValue(ref(db, "tasks"), handleTasksSnapshot);
}

/**
 * Protects the summary page and initializes authenticated content.
 * @param {import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js").User|null} user Current user.
 */
function handleAuthStateChanged(user) {
    if (!user) {
        window.location.href = "../index.html";
        return;
    }
    updateSignedInUserDisplay(user);
    initializeSummary();
}

onAuthStateChanged(auth, handleAuthStateChanged);
