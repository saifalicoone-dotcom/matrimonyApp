/**
 * Validation middleware and utilities for query parameters
 */

/**
 * Validate and sanitize sort parameters
 * @param {Object} query - Request query object
 * @param {Array<String>} allowedSortFields - Allowed sort fields
 * @param {String} defaultSort - Default sort field
 * @returns {Object} { sortBy, order }
 */
const validateSort = (query, allowedSortFields = [], defaultSort = "createdAt") => {
  const sortBy = query.sortBy || defaultSort;
  const order = query.order === "asc" ? "asc" : "desc";

  // Validate sortBy against allowed fields
  const validSortBy = allowedSortFields.includes(sortBy) ? sortBy : defaultSort;

  return {
    sortBy: validSortBy,
    order,
  };
};

/**
 * Validate numeric range
 * @param {Number} value - Value to validate
 * @param {Number} min - Minimum value
 * @param {Number} max - Maximum value
 * @param {Number} defaultValue - Default value if invalid
 * @returns {Number} Validated value
 */
const validateRange = (value, min, max, defaultValue) => {
  const num = parseInt(value);
  if (isNaN(num)) return defaultValue;
  if (num < min) return min;
  if (num > max) return max;
  return num;
};

/**
 * Sanitize string input (prevent SQL injection)
 * @param {String} str - String to sanitize
 * @returns {String} Sanitized string
 */
const sanitizeString = (str) => {
  if (!str || typeof str !== "string") return "";
  return str.trim().replace(/[<>]/g, "");
};

module.exports = {
  validateSort,
  validateRange,
  sanitizeString,
};

