import {
    createUserWithEmailAndPassword,
    updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, update } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { auth, db, userPath } from "./firebase.js";
import { bindPasswordVisibility, getElement, showToast } from "../script.js";

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
const emailError = getElement("#register-email-error");
const passwordError = getElement("#register-password-error");
const confirmError = getElement("#register-password-confirm-error");
const privacyError = getElement("#register-privacy-error");

bindPasswordVisibility(passwordInput, passwordInput.closest(".input-with-icon").querySelector(".password-toggle"));
bindPasswordVisibility(confirmInput, confirmInput.closest(".input-with-icon").querySelector(".password-toggle"));

function setFieldError(input, errorElement, message) {
    input.setAttribute("aria-invalid", String(Boolean(message)));
    errorElement.textContent = message;
}

function updateSubmitState() {
    const nameOk = nameInput.value.trim().length > 0;
    const emailHasAt = emailInput.value.trim().includes("@");
    const emailOk = emailHasAt && emailInput.validity.valid;
    const passwordOk = passwordInput.value.length >= 6;
    const hasConfirmation = confirmInput.value.length > 0;
    const passwordMatch = passwordInput.value === confirmInput.value && hasConfirmation;
    const privacyOk = privacyInput.checked;
    setFieldError(
        emailInput,
        emailError,
        emailInput.value.length === 0 || emailOk
            ? ""
            : "Gib eine gültige Emailadresse an.",
    );
    setFieldError(
        confirmInput,
        confirmError,
        hasConfirmation && !passwordMatch
            ? "Your passwords don't match. Please try again."
            : "",
    );
    setFieldError(
        privacyInput,
        privacyError,
        !privacyOk && nameOk && emailOk && passwordOk && passwordMatch
            ? "Bitte akzeptiere die Datenschutzerklärung."
            : "",
    );
    submitButton.disabled = !privacyOk;
}

async function saveUserProfile(uid, name, email) {
    await update(ref(db, userPath(uid)), {
        name,
        email,
    });
}

async function register(event) {
    event.preventDefault();

    const name = nameInput.value.trim();
    const email = emailInput.value.trim();
    const password = passwordInput.value;

    if (!name) {
        showToast("Bitte gib deinen Namen ein.");
        nameInput.focus();
        return;
    }

    if (!email || !emailInput.validity.valid) {
        setFieldError(
            emailInput,
            emailError,
            "Gib eine gültige Emailadresse an.",
        );
        emailInput.focus();
        return;
    }

    if (password.length < 6) {
        setFieldError(passwordInput, passwordError, "Password must be at least 6 characters.");
        showToast("Das Passwort muss mindestens 6 Zeichen lang sein.");
        passwordInput.focus();
        return;
    }

    if (password !== confirmInput.value) {
        setFieldError(confirmInput, confirmError, "Your passwords don't match. Please try again.");
        confirmInput.focus();
        return;
    }

    if (!privacyInput.checked) {
        setFieldError(privacyInput, privacyError, "Bitte akzeptiere die Datenschutzerklärung.");
        privacyInput.focus();
        return;
    }

    submitButton.disabled = true;

    let credential;
    try {
        credential = await createUserWithEmailAndPassword(auth, email, password);
    } catch (error) {
        updateSubmitState();
        showRegistrationError(error);
        return;
    }

    let profileWarning = "";
    try {
        await updateProfile(credential.user, { displayName: name });
    } catch {
        profileWarning = "Der Profilname konnte nicht in Firebase Authentication gespeichert werden.";
    }

    let databaseWriteFailed = false;
    try {
        await saveUserProfile(credential.user.uid, name, email);
    } catch (error) {
        databaseWriteFailed = true;
        const reason = error.code || "unknown";
        profileWarning = `Auth-Konto erstellt, Datenbankeintrag fehlgeschlagen (${reason}). Prüfe die Realtime-Database-Regeln für users/${credential.user.uid}.`;
    }

    if (profileWarning) {
        showToast(profileWarning);
        if (!databaseWriteFailed) {
            window.setTimeout(() => {
                location.href = "summary.html";
            }, 2500);
        }
        return;
    }

    location.href = "summary.html";
}

function showRegistrationError(error) {
    switch (error.code) {
        case "auth/email-already-in-use":
            setFieldError(emailInput, emailError, "Diese E-Mail-Adresse wird bereits verwendet.");
            break;
        case "auth/invalid-email":
            setFieldError(emailInput, emailError, "Gib eine gültige Emailadresse an.");
            break;
        case "auth/weak-password":
            setFieldError(passwordInput, passwordError, "Das Passwort muss mindestens 6 Zeichen lang sein.");
            break;
        case "auth/operation-not-allowed":
            showToast("E-Mail-/Passwort-Registrierung ist in Firebase nicht aktiviert.");
            break;
        case "auth/network-request-failed":
            showToast("Firebase ist nicht erreichbar. Prüfe deine Internetverbindung.");
            break;
        default:
            showToast("Registrierung fehlgeschlagen. Bitte prüfe deine Eingaben und die Firebase-Konfiguration.");
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