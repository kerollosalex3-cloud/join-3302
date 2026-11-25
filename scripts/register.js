import {
    createUserWithEmailAndPassword,
    updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { auth, db, userPath } from "./firebase.js";
import {
    bindPasswordVisibility,
    getElement,
    setFieldError,
    showToast
} from "../script.js";

const registerForm = getElement("#register-form");
if (!registerForm) {
    throw new Error("Register form not found");
}

const nameInput = getElement("#register-name");
const emailInput = getElement("#register-email");
const passwordInput = getElement("#register-password");
const confirmInput = getElement("#register-password-confirm");
const privacyInput = getElement("#register-privacy");
const submitButton = getElement("#register-submit");
const nameError = getElement("#register-name-error");
const emailError = getElement("#register-email-error");
const passwordError = getElement("#register-password-error");
const confirmError = getElement("#register-password-confirm-error");
const privacyError = getElement("#register-privacy-error");

bindPasswordVisibility(passwordInput, passwordInput.closest(".input-with-icon").querySelector(".password-toggle"));
bindPasswordVisibility(confirmInput, confirmInput.closest(".input-with-icon").querySelector(".password-toggle"));

/**
 * Reads the current registration form validity.
 * @returns {{nameOk: boolean, emailOk: boolean, passwordMatch: boolean, privacyOk: boolean, passwordOk: boolean, hasConfirmation: boolean}} Form state.
 */
function getRegistrationState() {
    const nameOk = nameInput.value.trim().length > 0;
    const emailHasAt = emailInput.value.trim().includes("@");
    const emailOk = emailHasAt && emailInput.validity.valid;
    const passwordOk = passwordInput.value.length >= 6;
    const hasConfirmation = confirmInput.value.length > 0;
    const passwordMatch = passwordInput.value === confirmInput.value && hasConfirmation;
    const privacyOk = privacyInput.checked;
    return { nameOk, emailOk, passwordOk, hasConfirmation, passwordMatch, privacyOk };
}

/**
 * Refreshes registration errors without submitting the form.
 * @param {object} state Current form validity.
 */
function updateRegistrationErrors(state) {
    if (state.nameOk) setFieldError(nameInput, nameError, "");
    setFieldError(emailInput, emailError, emailInput.value.length === 0 || state.emailOk
        ? "" : "Please enter a valid email address.");
    setFieldError(confirmInput, confirmError, state.hasConfirmation && !state.passwordMatch
        ? "Your passwords don't match. Please try again." : "");
    setFieldError(privacyInput, privacyError,
        !state.privacyOk && state.nameOk && state.emailOk && state.passwordOk && state.passwordMatch
            ? "Please accept the privacy policy." : "");
}

/** Updates field messages and the registration button. */
function updateSubmitState() {
    const state = getRegistrationState();
    updateRegistrationErrors(state);
    submitButton.disabled = !state.privacyOk;
}

/**
 * Saves the registered user's database profile.
 * @param {string} uid Firebase user ID.
 * @param {string} name Display name.
 * @param {string} email Email address.
 * @returns {Promise<void>} Resolves after saving.
 */
async function saveUserProfile(uid, name, email) {
    await update(ref(db, userPath(uid)), {
        name,
        email,
    });
}

/**
 * Validates the registration name.
 * @param {string} name Trimmed name.
 * @returns {boolean} Whether the name is valid.
 */
function validateRegistrationName(name) {
    if (!name) {
        setFieldError(nameInput, nameError, "Please enter your name.");
        nameInput.focus();
        return false;
    }
    return true;
}

/**
 * Validates the registration email.
 * @param {string} email Trimmed email.
 * @returns {boolean} Whether the email is valid.
 */
function validateRegistrationEmail(email) {
    if (!email || !emailInput.validity.valid) {
        setFieldError(emailInput, emailError, "Please enter a valid email address.");
        emailInput.focus();
        return false;
    }
    return true;
}

/**
 * Validates the registration password and its confirmation.
 * @param {string} password Entered password.
 * @returns {boolean} Whether both passwords are valid.
 */
function validateRegistrationPassword(password) {
    if (password.length < 6) {
        setFieldError(passwordInput, passwordError, "Password must be at least 6 characters.");
        showToast("Password must be at least 6 characters.");
        passwordInput.focus();
        return false;
    }
    if (password !== confirmInput.value) {
        setFieldError(confirmInput, confirmError, "Your passwords don't match. Please try again.");
        confirmInput.focus();
        return false;
    }
    return true;
}

/**
 * Checks whether the privacy policy was accepted.
 * @returns {boolean} Whether consent was given.
 */
function validateRegistrationConsent() {
    if (!privacyInput.checked) {
        setFieldError(privacyInput, privacyError, "Please accept the privacy policy.");
        privacyInput.focus();
        return false;
    }
    return true;
}

/**
 * Creates an authentication account and reports failures.
 * @param {string} email Email address.
 * @param {string} password Password.
 * @returns {Promise<object|null>} Firebase credential or null after an error.
 */
async function createRegistrationAccount(email, password) {
    try {
        return await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
        updateSubmitState();
        showRegistrationError(error);
        return null;
    }
}

/**
 * Saves the authentication display name.
 * @param {object} user Firebase user.
 * @param {string} name Display name.
 * @returns {Promise<string>} Warning or an empty string.
 */
async function saveRegistrationDisplayName(user, name) {
    try {
        await updateProfile(user, { displayName: name });
        return "";
    } catch {
        return "The profile name could not be saved in Firebase Authentication.";
    }
}

/**
 * Saves the database profile and returns any warning.
 * @param {string} uid Firebase user ID.
 * @param {string} name Display name.
 * @param {string} email Email address.
 * @returns {Promise<string>} Warning or an empty string.
 */
async function saveRegistrationDatabaseProfile(uid, name, email) {
    try {
        await saveUserProfile(uid, name, email);
        return "";
    } catch (error) {
        const reason = error.code || "unknown";
        return `Auth account created, but the database entry failed (${reason}). Check the Realtime Database rules for users/${uid}.`;
    }
}

/** Redirects to the summary after registration. */
function redirectAfterRegistration() {
    location.href = "summary.html";
}

/**
 * Saves both profiles and reports the registration result.
 * @param {object} user Firebase user.
 * @param {string} name Display name.
 * @param {string} email Email address.
 * @returns {Promise<void>} Resolves after profile updates.
 */
async function finishRegistration(user, name, email) {
    const authWarning = await saveRegistrationDisplayName(user, name);
    const databaseWarning = await saveRegistrationDatabaseProfile(user.uid, name, email);
    showToast(databaseWarning || authWarning || "You Signed Up successfully");
    if (!databaseWarning) window.setTimeout(redirectAfterRegistration, 2500);
}

/**
 * Validates the form and registers the user.
 * @param {SubmitEvent} event Registration form submission.
 * @returns {Promise<void>} Resolves after the registration attempt.
 */
async function register(event) {
    event.preventDefault();
    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!validateRegistrationName(name) || !validateRegistrationEmail(email) ||
        !validateRegistrationPassword(password) || !validateRegistrationConsent()) return;
    submitButton.disabled = true;
    const credential = await createRegistrationAccount(email, password);
    if (credential) await finishRegistration(credential.user, name, email);
}

/**
 * Displays the appropriate Firebase registration error.
 * @param {{code: string}} error Firebase error.
 */
function showRegistrationError(error) {
    switch (error.code) {
        case "auth/email-already-in-use": return setFieldError(emailInput, emailError, "This email address is already in use.");
        case "auth/invalid-email": return setFieldError(emailInput, emailError, "Please enter a valid email address.");
        case "auth/weak-password": return setFieldError(passwordInput, passwordError, "Password must be at least 6 characters.");
        case "auth/operation-not-allowed": return showToast("Email/password registration is not enabled in Firebase.");
        case "auth/network-request-failed": return showToast("Cannot reach Firebase. Please check your internet connection.");
        default: return showToast("Registration failed. Please check your details and the Firebase configuration.");
    }
}

[nameInput, emailInput, passwordInput, confirmInput, privacyInput].forEach((field) => {
    field.addEventListener("input", updateSubmitState);
    field.addEventListener("change", updateSubmitState);
});

emailInput.addEventListener("input", updateSubmitState);
passwordInput.addEventListener("input", () => setFieldError(passwordInput, passwordError, ""));
updateSubmitState();
registerForm.addEventListener("submit", register);