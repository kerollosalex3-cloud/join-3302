import { auth, db } from "./firebase.js";
import { onValue, ref } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import {
    initializeBoardDialog,
    refreshOpenTaskSubtasks,
    showTaskDetails,
    updateSubtaskDisplay
} from "./board-dialog.js";
import { renderTasks } from "./board-render.js?v=2";
import {
    applyBoardSearchQuery,
    getActiveSearchQuery,
    initializeBoardSearch
} from "./board-search.js";
import { initializeAddTaskOverlay } from "./board-add-task-overlay.js";

let allTasks = [];

/**
 * Returns a provider for the current board tasks.
 * @returns {Object[]} Current tasks.
 */
function getTasks() {
    return allTasks;
}

/**
 * Compares task fields without their subtasks.
 * @param {Object} previousTask Previous task data.
 * @param {Object} updatedTask Updated task data.
 * @returns {boolean} Whether non-subtask fields match.
 */
function haveMatchingTaskFields(previousTask, updatedTask) {
    const { subtasks: previousSubtasks, ...previousFields } = previousTask;
    const { subtasks: updatedSubtasks, ...updatedFields } = updatedTask;
    return JSON.stringify(previousFields) === JSON.stringify(updatedFields);
}

/**
 * Compares two subtasks while ignoring completion state.
 * @param {Object} previousSubtask Previous subtask.
 * @param {Object} updatedSubtask Updated subtask.
 * @returns {boolean} Whether non-completion fields match.
 */
function haveMatchingSubtaskFields(previousSubtask, updatedSubtask) {
    const { completed: previousCompleted, ...previousFields } = previousSubtask;
    const { completed: updatedCompleted, ...updatedFields } = updatedSubtask;
    return JSON.stringify(previousFields) === JSON.stringify(updatedFields);
}

/**
 * Checks whether only subtask completion states changed.
 * @param {Object} previousTask Previous task.
 * @param {Object} updatedTask Updated task.
 * @returns {boolean} Whether this is a valid subtask-only change.
 */
function isSubtaskOnlyChange(previousTask, updatedTask) {
    if (!haveMatchingTaskFields(previousTask, updatedTask)) return false;
    const previousSubtasks = previousTask.subtasks;
    const updatedSubtasks = updatedTask.subtasks;
    if (!Array.isArray(previousSubtasks) || !Array.isArray(updatedSubtasks)) return false;
    if (previousSubtasks.length !== updatedSubtasks.length) return false;
    let completionChanged = false;
    for (let index = 0; index < updatedSubtasks.length; index += 1) {
        if (!haveMatchingSubtaskFields(previousSubtasks[index], updatedSubtasks[index])) return false;
        completionChanged ||= Boolean(previousSubtasks[index].completed) !==
            Boolean(updatedSubtasks[index].completed);
    }
    return completionChanged;
}

/**
 * Classifies one task update.
 * @param {Object} updatedTask Updated task.
 * @param {Object[]} previousTasks Previous tasks.
 * @returns {{changed: boolean, invalid: boolean, task: Object|null}} Update classification.
 */
function classifyTaskUpdate(updatedTask, previousTasks) {
    const previousTask = previousTasks.find(task => task.id === updatedTask.id);
    if (!previousTask) return { changed: false, invalid: true, task: null };
    if (JSON.stringify(previousTask) === JSON.stringify(updatedTask)) {
        return { changed: false, invalid: false, task: null };
    }
    const isValid = isSubtaskOnlyChange(previousTask, updatedTask);
    return { changed: isValid, invalid: !isValid, task: isValid ? updatedTask : null };
}

/**
 * Returns the only task with a subtask-only completion change.
 * @param {Object[]} previousTasks Previously loaded tasks.
 * @param {Object[]} updatedTasks Latest tasks.
 * @returns {Object|null} Changed task or null.
 */
function findSubtaskOnlyChange(previousTasks, updatedTasks) {
    if (previousTasks.length !== updatedTasks.length) return null;
    let changedTask = null;
    for (const updatedTask of updatedTasks) {
        const change = classifyTaskUpdate(updatedTask, previousTasks);
        if (change.invalid || (change.changed && changedTask)) return null;
        if (change.changed) changedTask = change.task;
    }
    return changedTask;
}

/**
 * Converts a Firebase snapshot into task data.
 * @param {import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js").DataSnapshot} snapshot Task snapshot.
 * @returns {Object[]} Task data.
 */
function readTasksFromSnapshot(snapshot) {
    if (!snapshot.exists()) return [];
    return Object.entries(snapshot.val()).map(([id, task]) => ({ id, ...task }));
}

/**
 * Renders a complete task update and refreshes the active search.
 */
function renderFullTaskUpdate() {
    renderTasks(allTasks, showTaskDetails);
    applyBoardSearchQuery(getActiveSearchQuery());
    refreshOpenTaskSubtasks();
}

/**
 * Applies a Firebase task snapshot.
 * @param {import("https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js").DataSnapshot} snapshot Task snapshot.
 */
function handleTasksSnapshot(snapshot) {
    const previousTasks = allTasks;
    allTasks = readTasksFromSnapshot(snapshot);
    const changedTask = findSubtaskOnlyChange(previousTasks, allTasks);
    if (changedTask) {
        updateSubtaskDisplay(changedTask);
        return;
    }
    renderFullTaskUpdate();
}

/**
 * Loads tasks from Firebase Realtime Database.
 */
function loadTasksFromFirebase() {
    onValue(ref(db, "tasks"), handleTasksSnapshot);
}

/**
 * Initializes board modules and task loading.
 */
function initializeBoard() {
    initializeBoardDialog(getTasks);
    initializeBoardSearch();
    initializeAddTaskOverlay();
    loadTasksFromFirebase();
}

/**
 * Initializes the board for authenticated users.
 * @param {import("https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js").User|null} user Current user.
 */
function handleAuthStateChanged(user) {
    if (user) {
        initializeBoard();
        return;
    }
    window.location.href = "../index.html";
}

onAuthStateChanged(auth, handleAuthStateChanged);
