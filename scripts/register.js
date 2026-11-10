import {
    createUserWithEmailAndPassword,
    updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { ref, set } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
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

async function saveUserProfile(uid, name) {
    await set(ref(db, userPath(uid, "profile")), {
        name,
        createdAt: Date.now(),
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

    try {
        const credential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(credential.user, { displayName: name });
        await saveUserProfile(credential.user.uid, name);
        location.href = "summary.html";
    } catch (error) {
        updateSubmitState();
        switch (error.code) {
            case "auth/email-already-in-use":
                setFieldError(emailInput, emailError, "This email is already in use.");
                break;
            case "auth/invalid-email":
                setFieldError(emailInput, emailError, "Gib eine gültige Emailadresse an.");
                break;
            case "auth/weak-password":
                setFieldError(passwordInput, passwordError, "Password must be at least 6 characters.");
                break;
            default:
                showToast("Registrierung fehlgeschlagen. Bitte prüfe deine Eingaben.");
        }
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