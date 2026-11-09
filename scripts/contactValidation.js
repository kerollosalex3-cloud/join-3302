/**
 * Checks one contact field.
 * @param {string} field - Name, email or phone field.
 * @param {string} value - Entered value.
 * @returns {string} An error message or an empty string.
 */
function getContactFieldError(field, value) {
    const text = value.trim();
    if (!text) return 'This field is required.';
    if (field === 'name' && text.length > 120) return 'Please use no more than 120 characters.';
    if (field === 'email' && (text.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(text))) return 'Please enter a valid email address.';
    const digits = text.replace(/\D/g, '');
    if (field === 'phone' && (!/^\+?[\d\s()-]+$/.test(text) || digits.length < 7 || digits.length > 15)) return 'Please enter a valid phone number.';
    return '';
}

/**
 * Checks the contact form values.
 * @param {{name: string, email: string, phone: string}} contact - Form values.
 * @returns {{name: string, email: string, phone: string}} Field errors.
 */
function getContactErrors(contact) {
    return {
        name: getContactFieldError('name', contact.name),
        email: getContactFieldError('email', contact.email),
        phone: getContactFieldError('phone', contact.phone)
    };
}
