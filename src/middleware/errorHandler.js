/**
 * Centralized Error Handling Middleware
 * Provides consistent error responses across the application
 */

/**
 * Custom Error Class for Application Errors
 */
class AppError extends Error {
  constructor(message, statusCode = 500, errorCode = null) {
    super(message);
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Error Handler Middleware
 * Formats errors and sends appropriate responses
 */
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || err.status || 500;
  let message = err.message || "Internal server error";
  let errorCode = err.errorCode || null;
  let stack = null;

  // Handle known error types
  if (err.name === "ValidationError" || err.name === "PrismaClientValidationError") {
    statusCode = 400;
    message = "Validation error. Please check your input.";
    errorCode = "VALIDATION_ERROR";
  } else if (err.name === "UnauthorizedError" || err.name === "JsonWebTokenError") {
    statusCode = 401;
    message = "Authentication failed. Please provide a valid token.";
    errorCode = "AUTH_ERROR";
  } else if (err.name === "TokenExpiredError") {
    statusCode = 401;
    message = "Token expired. Please login again.";
    errorCode = "TOKEN_EXPIRED";
  } else if (err.code === "P2002") {
    // Prisma unique constraint violation
    statusCode = 409;
    message = "Duplicate entry. This record already exists.";
    errorCode = "DUPLICATE_ENTRY";
  } else if (err.code === "P2025") {
    // Prisma record not found
    statusCode = 404;
    message = "Record not found.";
    errorCode = "NOT_FOUND";
  } else if (err.code === "P2003") {
    // Prisma foreign key constraint violation
    statusCode = 400;
    message = "Invalid reference. Related record does not exist.";
    errorCode = "INVALID_REFERENCE";
  }

  // Include stack trace in development
  if (process.env.NODE_ENV === "development") {
    stack = err.stack;
  }

  // Log error
  console.error("Error:", {
    message: err.message,
    statusCode,
    errorCode,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
  });

  // Send error response
  res.status(statusCode).json({
    status: "error",
    message,
    error: errorCode || "Internal server error",
    ...(stack && { stack }),
  });
};

/**
 * 404 Not Found Handler
 */
const notFoundHandler = (req, res, next) => {
  const error = new AppError(
    `Route ${req.originalUrl} not found.`,
    404,
    "ROUTE_NOT_FOUND"
  );
  next(error);
};

/**
 * Async Error Wrapper
 * Wraps async route handlers to catch errors
 */
const asyncHandler = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  errorHandler,
  notFoundHandler,
  asyncHandler,
};
