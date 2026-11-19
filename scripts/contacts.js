import { auth, db } from './firebase.js';
import { push, ref } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';
import { isBackdropClick, setFieldError } from "../script.js";
import { getContactErrors } from "./contactValidation.js";

const contactDialog = document.getElementById('contact-dialog');
const contactForm = document.getElementById('contact-form');
const contactFields = ['name', 'email', 'phone'];
const contactSubmit = contactForm.querySelector('button[type="submit"]');
const contactFormNote = document.getElementById('contact-form-note');
const contactStatus = document.getElementById('contact-status');

document.getElementById('add-contact').addEventListener('click', openContactForm);
document.getElementById('close-contact').addEventListener('click', closeContactForm);
document.getElementById('cancel-contact').addEventListener('click', closeContactForm);
contactForm.addEventListener('submit', saveContact);
contactDialog.addEventListener('click', event => {
    if (isBackdropClick(event, contactDialog)) closeContactForm();
});
contactDialog.addEventListener('cancel', event => {
    if (contactSubmit.disabled) event.preventDefault();
});
contactDialog.addEventListener('close', () => document.body.classList.remove('contact-dialog-open'));
contactDialog.addEventListener('keydown', keepContactFormFocus);
contactForm.addEventListener('input', clearContactFieldError);

/** Opens a fresh contact form. */
function openContactForm() {
    contactForm.reset();
    contactFormNote.textContent = '';
    contactStatus.textContent = '';
    contactFields.forEach(field => setContactFieldError(field, ''));
    contactDialog.showModal();
    document.body.classList.add('contact-dialog-open');
    contactForm.elements.name.focus();
}

/** Closes the contact form without saving data. */
function closeContactForm() {
    if (!contactSubmit.disabled) contactDialog.close();
}

/** Keeps Tab navigation inside the open contact form.
 * @param {KeyboardEvent} event - Dialog keyboard event.
 */
function keepContactFormFocus(event) {
    if (event.key !== 'Tab') return;
    const controls = contactDialog.querySelectorAll('button:not(:disabled), input');
    const first = controls[0];
    const last = controls[controls.length - 1];
    if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
    } else if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
    }
}

/** Reads trimmed contact input values.
 * @returns {{name: string, email: string, phone: string}} Contact values.
 */
function readContactForm() {
    return {
        name: contactForm.elements.name.value.trim(),
        email: contactForm.elements.email.value.trim(),
        phone: contactForm.elements.phone.value.trim()
    };
}

/** Shows a validation message below one input.
 * @param {string} field - Input name.
 * @param {string} message - Error text, empty when valid.
 */
function setContactFieldError(field, message) {
    setFieldError(
        contactForm.elements[field],
        document.getElementById(`${field}-error`),
        message
    );
}

/** Clears the old error while the user corrects a field.
 * @param {Event} event - Input event.
 */
function clearContactFieldError(event) {
    if (contactFields.includes(event.target.name)) setContactFieldError(event.target.name, '');
}

/**
 * Checks the form before saving a contact.
 * @param {SubmitEvent} event - Form submit event.
 */
async function saveContact(event) {
    event.preventDefault();
    if (contactSubmit.disabled) return;
    const contact = readContactForm();
    const errors = getContactErrors(contact);
    contactFields.forEach(field => setContactFieldError(field, errors[field]));
    const firstError = contactFields.find(field => errors[field]);
    if (firstError) return contactForm.elements[firstError].focus();
    await writeNewContact(contact);
}

/**
 * Saves the contact and keeps the form open on failure.
 * @param {{name: string, email: string, phone: string}} contact - Valid contact values.
 */
async function writeNewContact(contact) {
    setContactSaving(true);
    try {
        await auth.authStateReady();
        if (!auth.currentUser) throw new Error('Sign in before adding a contact.');
        await push(ref(db, 'contacts'), contact);
    } catch {
        contactFormNote.textContent = 'Could not save the contact. Check your connection or sign in again.';
        return;
    } finally {
        setContactSaving(false);
    }
    closeContactForm();
    contactStatus.textContent = 'Contact saved.';
}

/**
 * Prevents changes and repeat submissions while saving.
 * @param {boolean} saving - Whether a save is pending.
 */
function setContactSaving(saving) {
    contactSubmit.disabled = saving;
    contactFields.forEach(field => {
        contactForm.elements[field].readOnly = saving;
    });
    if (saving) contactFormNote.textContent = 'Saving contact…';
}
