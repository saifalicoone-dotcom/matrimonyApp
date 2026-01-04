/**
 * Request Validation Middleware
 * Validates request data before processing
 */

const { AppError } = require("./errorHandler");

/**
 * Validate required fields
 * @param {Array<String>} fields - Required field names
 * @param {String} location - Request location ('body', 'query', 'params')
 */
const validateRequired = (fields, location = "body") => {
  return (req, res, next) => {
    const data = req[location];
    const missing = fields.filter((field) => !data || data[field] === undefined || data[field] === null || data[field] === "");

    if (missing.length > 0) {
      return res.status(400).json({
        status: "error",
        message: `Missing required fields: ${missing.join(", ")}.`,
        error: "VALIDATION_ERROR",
        missingFields: missing,
      });
    }

    next();
  };
};

/**
 * Validate email format
 */
const validateEmail = (field = "email", location = "body") => {
  return (req, res, next) => {
    const data = req[location];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (data && data[field] && !emailRegex.test(data[field])) {
      return res.status(400).json({
        status: "error",
        message: `Invalid email format for field: ${field}.`,
        error: "VALIDATION_ERROR",
        field,
      });
    }

    next();
  };
};

/**
 * Validate phone format
 */
const validatePhone = (field = "phone", location = "body") => {
  return (req, res, next) => {
    const data = req[location];
    const phoneRegex = /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;

    if (data && data[field] && !phoneRegex.test(data[field])) {
      return res.status(400).json({
        status: "error",
        message: `Invalid phone format for field: ${field}.`,
        error: "VALIDATION_ERROR",
        field,
      });
    }

    next();
  };
};

/**
 * Validate numeric range
 */
const validateRange = (field, min, max, location = "body") => {
  return (req, res, next) => {
    const data = req[location];
    const value = data && data[field];

    if (value !== undefined && value !== null) {
      const num = parseInt(value);
      if (isNaN(num) || num < min || num > max) {
        return res.status(400).json({
          status: "error",
          message: `Field ${field} must be a number between ${min} and ${max}.`,
          error: "VALIDATION_ERROR",
          field,
          min,
          max,
        });
      }
    }

    next();
  };
};

/**
 * Validate string length
 */
const validateLength = (field, minLength, maxLength, location = "body") => {
  return (req, res, next) => {
    const data = req[location];
    const value = data && data[field];

    if (value !== undefined && value !== null) {
      const str = String(value);
      if (str.length < minLength || str.length > maxLength) {
        return res.status(400).json({
          status: "error",
          message: `Field ${field} must be between ${minLength} and ${maxLength} characters.`,
          error: "VALIDATION_ERROR",
          field,
          minLength,
          maxLength,
        });
      }
    }

    next();
  };
};

/**
 * Validate enum values
 */
const validateEnum = (field, allowedValues, location = "body") => {
  return (req, res, next) => {
    const data = req[location];
    const value = data && data[field];

    if (value !== undefined && value !== null && !allowedValues.includes(value)) {
      return res.status(400).json({
        status: "error",
        message: `Field ${field} must be one of: ${allowedValues.join(", ")}.`,
        error: "VALIDATION_ERROR",
        field,
        allowedValues,
      });
    }

    next();
  };
};

/**
 * Validate array
 */
const validateArray = (field, minLength = 0, maxLength = null, location = "body") => {
  return (req, res, next) => {
    const data = req[location];
    const value = data && data[field];

    if (value !== undefined && value !== null) {
      if (!Array.isArray(value)) {
        return res.status(400).json({
          status: "error",
          message: `Field ${field} must be an array.`,
          error: "VALIDATION_ERROR",
          field,
        });
      }

      if (value.length < minLength) {
        return res.status(400).json({
          status: "error",
          message: `Field ${field} must have at least ${minLength} items.`,
          error: "VALIDATION_ERROR",
          field,
          minLength,
        });
      }

      if (maxLength !== null && value.length > maxLength) {
        return res.status(400).json({
          status: "error",
          message: `Field ${field} must have at most ${maxLength} items.`,
          error: "VALIDATION_ERROR",
          field,
          maxLength,
        });
      }
    }

    next();
  };
};

/**
 * Validate date
 */
const validateDate = (field, location = "body") => {
  return (req, res, next) => {
    const data = req[location];
    const value = data && data[field];

    if (value !== undefined && value !== null) {
      const date = new Date(value);
      if (isNaN(date.getTime())) {
        return res.status(400).json({
          status: "error",
          message: `Field ${field} must be a valid date.`,
          error: "VALIDATION_ERROR",
          field,
        });
      }
    }

    next();
  };
};

module.exports = {
  validateRequired,
  validateEmail,
  validatePhone,
  validateRange,
  validateLength,
  validateEnum,
  validateArray,
  validateDate,
};
