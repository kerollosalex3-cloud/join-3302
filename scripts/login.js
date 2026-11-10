import {
    signInAnonymously,
    signInWithEmailAndPassword,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { auth } from "./firebase.js";

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
