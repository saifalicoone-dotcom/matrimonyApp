const { validationResult } = require("express-validator");

/**
 * Middleware to handle validation errors
 * Should be used after validation middleware
 */
const validateRequest = (req, res, next) => {
  const errors = validationResult(req);

  if (!errors.isEmpty()) {
    const errorMessages = errors.array().map((error) => ({
      field: error.path || error.param,
      message: error.msg,
      value: error.value,
    }));

    return res.status(400).json({
      status: "error",
      message: "Validation error. Please check your input.",
      error: "VALIDATION_ERROR",
      errors: errorMessages,
    });
  }

  next();
};

module.exports = validateRequest;

