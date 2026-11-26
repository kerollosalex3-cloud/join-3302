import {
    signInAnonymously,
    signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "./firebase.js";
import { getContactFieldError } from "./contactValidation.js";
import { bindPasswordVisibility, getElement, setFieldError, showToast } from "../script.js";

const loginForm = getElement("#login-form");
const loginButton = getElement("#login-submit");
const guestButton = getElement("#gbtn");
const emailInput = getElement("#login-email");
const passwordInput = getElement("#login-password");
const passwordToggle = getElement(".password-toggle");
const emailError = getElement("#login-email-error");
const passwordError = getElement("#login-password-error");

let signingIn = false;
let credentialErrorShown = false;

bindPasswordVisibility(passwordInput, passwordToggle);

/** Clears field errors when the user corrects their credentials. */
function clearLoginErrors() {
    setFieldError(emailInput, emailError, "");
    setFieldError(passwordInput, passwordError, "");
    credentialErrorShown = false;
}

/**
 * Validates the email and displays its error message.
 * @returns {boolean} Whether the email is valid.
 */
function validateEmail() {
    const message = getContactFieldError("email", emailInput.value);
    setFieldError(emailInput, emailError, message);
    return !message;
}

/**
 * Validates the password field.
 * @returns {boolean} Whether a password has been entered.
 */
function validatePassword() {
    const message = passwordInput.value ? "" : "Please enter your password.";
    setFieldError(passwordInput, passwordError, message);
    return !message;
}

/**
 * Validates both fields and focuses the first invalid field.
 * @returns {boolean} Whether the login form is valid.
 */
function validateLogin() {
    clearLoginErrors();
    const emailValid = validateEmail();
    const passwordValid = validatePassword();
    if (!emailValid) emailInput.focus();
    else if (!passwordValid) passwordInput.focus();
    return emailValid && passwordValid;
}

/** Clears email errors while the user edits the field. */
function handleEmailInput() {
    if (credentialErrorShown) clearLoginErrors();
    else setFieldError(emailInput, emailError, "");
}

/** Clears password errors while the user edits the field. */
function handlePasswordInput() {
    if (credentialErrorShown) clearLoginErrors();
    else setFieldError(passwordInput, passwordError, "");
}

/** Checks the field when the user leaves it. */
function handleFieldBlur(event) {
    if (credentialErrorShown) return;
    if (event.target === emailInput) validateEmail();
    else validatePassword();
}

/** Displays the existing generic message for invalid login credentials. */
function showLoginError() {
    credentialErrorShown = true;
    setFieldError(emailInput, emailError, "");
    emailInput.setAttribute("aria-invalid", "true");
    setFieldError(passwordInput, passwordError, "Check your email and password. Please try again.");
}

/**
 * Returns an error message for a failed guest login.
 * @param {string} code Firebase error code.
 * @returns {string} Message to display.
 */
function guestErrorMessage(code) {
    switch (code) {
        case "auth/operation-not-allowed":
            return "Guest login is disabled in Firebase. Enable the Anonymous provider under Authentication > Sign-in method.";
        case "auth/unauthorized-domain":
            return "This domain is not authorized for sign-in in Firebase.";
        case "auth/network-request-failed":
            return "Cannot reach Firebase. Please check your internet connection.";
        default:
            return "Guest login failed. Please check the Firebase configuration and anonymous sign-in.";
    }
}

/**
 * Returns an error message for a failed email login.
 * @param {string} code Firebase error code.
 * @returns {string} Message to display.
 */
function loginErrorMessage(code) {
    if (code === "auth/too-many-requests") {
        return "Too many attempts. Please wait a moment and try again.";
    }
    return "Login failed. Please check your credentials and the Firebase configuration.";
}

/**
 * Enables or disables both authentication buttons.
 * @param {boolean} disabled Whether the buttons are disabled.
 */
function setAuthButtonsDisabled(disabled) {
    loginButton.disabled = disabled;
    guestButton.disabled = disabled;
}

/** Marks an authentication request as in progress. */
function beginSignIn() {
    signingIn = true;
    setAuthButtonsDisabled(true);
}

/**
 * Restores the form and reports a failed authentication request.
 * @param {{code?: string}} error Firebase error.
 * @param {"login"|"guest"} action Authentication method.
 */
function handleLoginFailure(error, action) {
    signingIn = false;
    setAuthButtonsDisabled(false);
    const credentialErrors = ["auth/invalid-email", "auth/user-not-found", "auth/wrong-password", "auth/invalid-credential"];
    if (action === "login" && credentialErrors.includes(error.code)) return showLoginError();
    showToast(action === "guest" ? guestErrorMessage(error.code) : loginErrorMessage(error.code));
}

/** Signs in as a guest and reports authentication errors. */
async function signInGuest() {
    if (signingIn) return;
    beginSignIn();
    try {
        await signInAnonymously(auth);
        location.href = "html/summary.html";
    } catch (error) {
        handleLoginFailure(error, "guest");
    }
}

/**
 * Signs in with email and password after validating the form.
 * @param {SubmitEvent} event Form submit event.
 */
async function signIn(event) {
    event.preventDefault();
    if (signingIn || !validateLogin()) return;
    beginSignIn();
    try {
        await signInWithEmailAndPassword(auth, emailInput.value.trim(), passwordInput.value);
        location.href = "html/summary.html";
    } catch (error) {
        handleLoginFailure(error, "login");
    }
}

loginForm.addEventListener("submit", signIn);
emailInput.addEventListener("input", handleEmailInput);
passwordInput.addEventListener("input", handlePasswordInput);
emailInput.addEventListener("blur", handleFieldBlur);
passwordInput.addEventListener("blur", handleFieldBlur);
guestButton.addEventListener("click", signInGuest);
