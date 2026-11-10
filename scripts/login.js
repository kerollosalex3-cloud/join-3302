import {
    signInAnonymously,
    signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "./firebase.js";
import { bindPasswordVisibility, getElement, showToast } from "../script.js";

const loginForm = getElement("#login-form");
const loginButton = getElement("#login-submit");
const guestButton = getElement("#gbtn");
const emailInput = getElement("#login-email");
const passwordInput = getElement("#login-password");
const passwordToggle = getElement(".password-toggle");
const emailError = getElement("#login-email-error");
const passwordError = getElement("#login-password-error");

let signingIn = false;

bindPasswordVisibility(passwordInput, passwordToggle);

function clearLoginErrors() {
    passwordInput.removeAttribute("aria-invalid");
    passwordError.textContent = "";
}

function updateEmailValidation() {
    const invalidEmail = emailInput.value.length > 0 && !emailInput.value.includes("@");
    emailInput.setAttribute("aria-invalid", String(invalidEmail));
    emailError.textContent = invalidEmail ? "Gib eine gültige Emailadresse an." : "";
    return !invalidEmail;
}

function showLoginError() {
    emailInput.setAttribute("aria-invalid", "true");
    passwordInput.setAttribute("aria-invalid", "true");
    passwordError.textContent = "Check your email and password. Please try again.";
}

function authErrorMessage(error, action) {
    if (action === "guest") {
        if (error.code === "auth/operation-not-allowed") {
            return "Gast-Login ist in Firebase deaktiviert. Aktiviere unter Authentication > Sign-in method den Anbieter „Anonymous“.";
        }
        if (error.code === "auth/unauthorized-domain") {
            return "Diese Domain ist in Firebase nicht für die Anmeldung freigegeben.";
        }
        if (error.code === "auth/network-request-failed") {
            return "Firebase ist nicht erreichbar. Prüfe deine Internetverbindung.";
        }
        return "Gast-Login fehlgeschlagen. Prüfe die Firebase-Konfiguration und die anonyme Anmeldung.";
    }

    switch (error.code) {
        case "auth/invalid-email":
            return "Bitte gib eine gültige E-Mail-Adresse ein.";
        case "auth/user-not-found":
        case "auth/wrong-password":
        case "auth/invalid-credential":
            return "E-Mail-Adresse oder Passwort ist nicht korrekt.";
        case "auth/too-many-requests":
            return "Zu viele Versuche. Bitte warte einen Moment und versuche es erneut.";
        default:
            return "Anmeldung fehlgeschlagen. Bitte prüfe deine Zugangsdaten und die Firebase-Konfiguration.";
    }
}

function setAuthButtonsDisabled(disabled) {
    if (loginButton) loginButton.disabled = disabled;
    if (guestButton) guestButton.disabled = disabled;
}

function handleLoginFailure(error, action) {
    signingIn = false;
    setAuthButtonsDisabled(false);
    if (action === "login" && [
        "auth/invalid-email",
        "auth/user-not-found",
        "auth/wrong-password",
        "auth/invalid-credential",
    ].includes(error.code)) {
        showLoginError();
    } else {
        showToast(authErrorMessage(error, action));
    }
    console.error(`Firebase ${action} failed:`, error);
}

async function signInGuest() {
    if (signingIn) return;
    setAuthButtonsDisabled(true);
    signingIn = true;

    try {
        await signInAnonymously(auth);
        location.href = "html/summary.html";
    } catch (error) {
        handleLoginFailure(error, "guest");
    }
}

async function signIn(event) {
    event.preventDefault();

    if (!emailInput || !passwordInput) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!email.includes("@")) {
        emailInput.setAttribute("aria-invalid", "true");
        emailError.textContent = "Gib eine gültige Emailadresse an.";
        emailInput.focus();
        return;
    }

    if (!password) {
        passwordInput.setAttribute("aria-invalid", "true");
        passwordError.textContent = "Please enter your password.";
        passwordInput.focus();
        return;
    }

    clearLoginErrors();
    setAuthButtonsDisabled(true);
    signingIn = true;

    try {
        await signInWithEmailAndPassword(auth, email, password);
        location.href = "html/summary.html";
    } catch (error) {
        await handleLoginFailure(error, "login");
    }
}

if (loginForm) {
    loginForm.addEventListener("submit", signIn);
}

emailInput.addEventListener("input", updateEmailValidation);
passwordInput.addEventListener("input", clearLoginErrors);

if (guestButton) {
    guestButton.addEventListener("click", signInGuest);
}

const loginForm = document.querySelector("#login-form");
const emailInput = document.querySelector("#login-email");
const passwordInput = document.querySelector("#login-password");
const loginButton = document.querySelector("#login-submit");
const guestButton = document.querySelector("#gbtn");
const toast = document.querySelector("#toast");

let signingIn = false;

function showMessage(message) {
    toast.textContent = message;
    toast.style.display = "block";
}

function setBusy(isBusy) {
    signingIn = isBusy;
    loginButton.disabled = isBusy;
    guestButton.disabled = isBusy;
}

function showLoginError(error, isGuest = false) {
    if (isGuest && error.code === "auth/operation-not-allowed") {
        showMessage("Gast-Login ist in Firebase nicht aktiviert. Aktiviere den Anbieter „Anonymous“.");
        return;
    }

    if (isGuest && error.code === "auth/unauthorized-domain") {
        showMessage("Diese Domain ist in Firebase nicht für die Anmeldung freigegeben.");
        return;
    }

    if (isGuest && error.code === "auth/network-request-failed") {
        showMessage("Firebase ist nicht erreichbar. Prüfe deine Internetverbindung.");
        return;
    }

    if (isGuest) {
        showMessage("Gast-Login fehlgeschlagen. Prüfe die Firebase-Konfiguration.");
        console.error("Firebase guest login failed:", error);
        return;
    }

    if (error.code === "auth/invalid-email") {
        emailInput.setAttribute("aria-invalid", "true");
        document.querySelector("#login-email-error").textContent =
            "Gib eine gültige Emailadresse an.";
        return;
    }

    if (["auth/user-not-found", "auth/wrong-password", "auth/invalid-credential"].includes(error.code)) {
        emailInput.setAttribute("aria-invalid", "true");
        passwordInput.setAttribute("aria-invalid", "true");
        document.querySelector("#login-password-error").textContent =
            "Check your email and password. Please try again.";
        return;
    }

    if (error.code === "auth/operation-not-allowed") {
        showMessage("E-Mail-/Passwort-Anmeldung ist in Firebase nicht aktiviert.");
        return;
    }

    if (error.code === "auth/unauthorized-domain") {
        showMessage("Diese Domain ist in Firebase nicht für die Anmeldung freigegeben.");
        return;
    }

    if (error.code === "auth/network-request-failed") {
        showMessage("Firebase ist nicht erreichbar. Prüfe deine Internetverbindung.");
        return;
    }

    showMessage("Anmeldung fehlgeschlagen. Prüfe Firebase-Konfiguration und Zugangsdaten.");
    console.error("Firebase login failed:", error);
}

async function login(event) {
    event.preventDefault();
    if (signingIn) return;

    const email = emailInput.value.trim();
    const password = passwordInput.value;
    if (!email || !password) {
        showMessage("Bitte E-Mail-Adresse und Passwort eingeben.");
        return;
    }

    setBusy(true);
    try {
        await signInWithEmailAndPassword(auth, email, password);
        window.location.href = "html/summary.html";
    } catch (error) {
        setBusy(false);
        showLoginError(error);
    }
}

async function loginAsGuest() {
    if (signingIn) return;

    setBusy(true);
    try {
        await signInAnonymously(auth);
        window.location.href = "html/summary.html";
    } catch (error) {
        setBusy(false);
        showLoginError(error, true);
    }
}

function clearFieldError(event) {
    event.target.removeAttribute("aria-invalid");
    const error = event.target.id === "login-email"
        ? document.querySelector("#login-email-error")
        : document.querySelector("#login-password-error");
    error.textContent = "";
    toast.textContent = "";
}

loginForm.addEventListener("submit", login);
guestButton.addEventListener("click", loginAsGuest);
emailInput.addEventListener("input", clearFieldError);
passwordInput.addEventListener("input", clearFieldError);
