/**
 * Validation utilities for profile and other data
 */

/**
 * Calculate age from date of birth
 * @param {Date} dateOfBirth - Date of birth
 * @returns {Number} Age
 */
const calculateAge = (dateOfBirth) => {
  const today = new Date();
  const birthDate = new Date(dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Validate email format
 * @param {String} email - Email to validate
 * @returns {Boolean} Is valid
 */
const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

/**
 * Validate phone format
 * @param {String} phone - Phone to validate
 * @returns {Boolean} Is valid
 */
const isValidPhone = (phone) => {
  const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
  return phoneRegex.test(phone);
};

/**
 * Validate date of birth (must be 18+ years old)
 * @param {Date} dateOfBirth - Date of birth
 * @returns {Object} { valid: Boolean, age: Number, error: String }
 */
const validateDateOfBirth = (dateOfBirth) => {
  const age = calculateAge(dateOfBirth);
  
  if (age < 18) {
    return {
      valid: false,
      age,
      error: 'User must be at least 18 years old.',
    };
  }
  
  if (age > 100) {
    return {
      valid: false,
      age,
      error: 'Invalid date of birth.',
    };
  }
  
  return {
    valid: true,
    age,
    error: null,
  };
};

/**
 * Validate height (in cm, reasonable range: 100-250 cm)
 * @param {Number} height - Height in cm
 * @returns {Boolean} Is valid
 */
const isValidHeight = (height) => {
  return height >= 100 && height <= 250;
};

/**
 * Validate password strength
 * @param {String} password - Password to validate
 * @returns {Object} { valid: Boolean, errors: Array<String> }
 */
const validatePassword = (password) => {
  const errors = [];

  if (!password || password.length < 6) {
    errors.push("Password must be at least 6 characters long.");
  }

  if (password.length > 128) {
    errors.push("Password must be less than 128 characters.");
  }

  return {
    valid: errors.length === 0,
    errors,
  };
};

/**
 * Sanitize string input
 * @param {String} str - String to sanitize
 * @returns {String} Sanitized string
 */
const sanitizeString = (str) => {
  if (!str || typeof str !== "string") return "";
  return str.trim().replace(/[<>]/g, "");
};

/**
 * Validate age range
 * @param {Number} age - Age to validate
 * @param {Number} min - Minimum age (default: 18)
 * @param {Number} max - Maximum age (default: 100)
 * @returns {Boolean} Is valid
 */
const isValidAge = (age, min = 18, max = 100) => {
  const num = parseInt(age);
  return !isNaN(num) && num >= min && num <= max;
};

module.exports = {
  calculateAge,
  isValidEmail,
  isValidPhone,
  validateDateOfBirth,
  isValidHeight,
  validatePassword,
  sanitizeString,
  isValidAge,
};

