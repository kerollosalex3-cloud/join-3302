import {
    createUserWithEmailAndPassword,
    signOut,
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

const confirmationField = { input: confirmInput, error: confirmError, getError: getConfirmationError };
const registrationFields = [
    { input: nameInput, error: nameError, getError: getNameError },
    { input: emailInput, error: emailError, getError: getEmailError },
    { input: passwordInput, error: passwordError, getError: getPasswordError },
    confirmationField,
    { input: privacyInput, error: privacyError, getError: getConsentError },
];
let registering = false;

bindPasswordVisibility(passwordInput, passwordInput.closest(".input-with-icon").querySelector(".password-toggle"));
bindPasswordVisibility(confirmInput, confirmInput.closest(".input-with-icon").querySelector(".password-toggle"));

/**
 * Checks the registration name.
 * @returns {string} The name error, if any.
 */
function getNameError() {
    const name = nameInput.value.trim();
    if (!name) return "Please enter your name.";
    return /\p{L}.*\p{L}/u.test(name) ? "" : "Please enter at least 2 letters.";
}

/**
 * Checks the email address.
 * @returns {string} The email error, if any.
 */
function getEmailError() {
    return emailInput.value.trim() && emailInput.validity.valid ? "" : "Please enter a valid email address.";
}

/**
 * Checks the minimum password length.
 * @returns {string} The password error, if any.
 */
function getPasswordError() {
    return passwordInput.value.length >= 6 ? "" : "Password must be at least 6 characters.";
}

/**
 * Checks the password confirmation.
 * @returns {string} The confirmation error, if any.
 */
function getConfirmationError() {
    if (!confirmInput.value) return "Please confirm your password.";
    return confirmInput.value === passwordInput.value ? "" : "Your passwords don't match. Please try again.";
}

/**
 * Checks privacy policy consent.
 * @returns {string} The consent error, if any.
 */
function getConsentError() {
    return privacyInput.checked ? "" : "Please accept the privacy policy.";
}

/**
 * Updates the validation message for one field.
 * @param {{input: HTMLInputElement, error: HTMLElement, getError: Function}} field Registration field.
 * @returns {boolean} Whether the field is valid.
 */
function validateRegistrationField({ input, error, getError }) {
    const message = getError();
    setFieldError(input, error, message);
    return !message;
}

/** Enables registration when all required fields are filled. */
function updateSubmitState() {
    submitButton.disabled = registering || !nameInput.value.trim() ||
        !emailInput.value.trim() || !passwordInput.value || !confirmInput.value || !privacyInput.checked;
}

/**
 * Binds input and blur behavior for one registration field.
 * @param {{input: HTMLInputElement, error: HTMLElement, getError: Function}} field Registration field.
 */
function bindRegistrationField(field) {
    field.input.addEventListener("input", () => {
        setFieldError(field.input, field.error, "");
        updateSubmitState();
    });
    field.input.addEventListener("change", updateSubmitState);
    field.input.addEventListener("blur", () => validateRegistrationField(field));
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
 * Creates an authentication account and reports failures.
 * @param {string} email Email address.
 * @param {string} password Password.
 * @returns {Promise<object|null>} Firebase credential or null after an error.
 */
async function createRegistrationAccount(email, password) {
    try {
        return await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
        registering = false;
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

/** Redirects to the login page after registration. */
function redirectAfterRegistration() {
    location.href = "../index.html?skipIntro=1";
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
    try {
        await signOut(auth);
    } catch {
        showToast("Account created, but the session could not be closed. Please log out before signing in again.");
        return;
    }
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
    if (registering) return;

    const invalidFields = registrationFields.filter(field => !validateRegistrationField(field));
    if (invalidFields.length) {
        invalidFields[0].input.focus();
        return;
    }

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;
    registering = true;
    updateSubmitState();
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

registrationFields.forEach(bindRegistrationField);
passwordInput.addEventListener("blur", () => {
    if (confirmInput.value) validateRegistrationField(confirmationField);
});
updateSubmitState();
registerForm.addEventListener("submit", register);
