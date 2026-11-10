const contactDialog = document.getElementById('contact-dialog');
const contactForm = document.getElementById('contact-form');
const contactFields = ['name', 'email', 'phone'];
let previewContact = null;

document.getElementById('add-contact').addEventListener('click', () => openContactForm(false));
document.getElementById('edit-preview').addEventListener('click', () => openContactForm(true));
document.getElementById('close-contact').addEventListener('click', closeContactForm);
document.getElementById('cancel-contact').addEventListener('click', closeContactForm);
contactForm.addEventListener('submit', previewContactForm);
contactDialog.addEventListener('click', event => {
    if (event.target === contactDialog) closeContactForm();
});
contactDialog.addEventListener('close', () => document.body.classList.remove('contact-dialog-open'));
contactDialog.addEventListener('keydown', keepContactFormFocus);
contactForm.addEventListener('input', clearContactFieldError);

/** Opens the form with empty or previously previewed values.
 * @param {boolean} edit - Whether to edit the current preview.
 */
function openContactForm(edit) {
    contactForm.reset();
    contactFields.forEach(field => {
        setContactFieldError(field, '');
        if (edit && previewContact) contactForm.elements[field].value = previewContact[field];
    });
    document.getElementById('contact-dialog-title').textContent = edit ? 'Edit contact' : 'Add contact';
    contactDialog.showModal();
    document.body.classList.add('contact-dialog-open');
    contactForm.elements.name.focus();
}

/** Closes the contact form without saving data. */
function closeContactForm() {
    contactDialog.close();
}

/** Keeps Tab navigation inside the open contact form.
 * @param {KeyboardEvent} event - Dialog keyboard event.
 */
function keepContactFormFocus(event) {
    if (event.key !== 'Tab') return;
    const controls = contactDialog.querySelectorAll('button, input');
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
    contactForm.elements[field].setAttribute('aria-invalid', Boolean(message));
    document.getElementById(field + '-error').textContent = message;
}

/** Clears the old error while the user corrects a field.
 * @param {Event} event - Input event.
 */
function clearContactFieldError(event) {
    if (contactFields.includes(event.target.name)) setContactFieldError(event.target.name, '');
}

/** Validates the form and shows an unsaved preview.
 * @param {SubmitEvent} event - Form submit event.
 */
function previewContactForm(event) {
    event.preventDefault();
    const contact = readContactForm();
    const errors = getContactErrors(contact);
    contactFields.forEach(field => setContactFieldError(field, errors[field]));
    const firstError = contactFields.find(field => errors[field]);
    if (firstError) return contactForm.elements[firstError].focus();
    previewContact = contact;
    showContactPreview();
    closeContactForm();
    document.getElementById('edit-preview').focus();
}

/** Displays validated values as text without storing them. */
function showContactPreview() {
    contactFields.forEach(field => {
        document.getElementById('preview-' + field).textContent = previewContact[field];
    });
    const parts = previewContact.name.split(/\s+/);
    document.getElementById('preview-initials').textContent = (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
    document.getElementById('contact-preview').hidden = false;
    document.querySelector('.contacts-intro').hidden = true;
}
