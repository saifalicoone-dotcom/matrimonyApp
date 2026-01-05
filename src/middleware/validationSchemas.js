const { body, param, query } = require("express-validator");

/**
 * Validation schemas for different endpoints
 */

// Auth validations
const registerValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("password")
    .isLength({ min: 6 })
    .withMessage("Password must be at least 6 characters long"),
  body("phone")
    .optional()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage("Please provide a valid phone number"),
];

const loginValidation = [
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("phone")
    .optional()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage("Please provide a valid phone number"),
  body("password")
    .notEmpty()
    .withMessage("Password is required"),
];

// Profile validations
const profileValidation = [
  body("firstName")
    .trim()
    .notEmpty()
    .withMessage("First name is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("First name must be between 2 and 50 characters"),
  body("lastName")
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage("Last name must be less than 50 characters"),
  body("dateOfBirth")
    .notEmpty()
    .withMessage("Date of birth is required")
    .isISO8601()
    .withMessage("Date of birth must be a valid date"),
  body("gender")
    .notEmpty()
    .withMessage("Gender is required")
    .isIn(["MALE", "FEMALE", "OTHER"])
    .withMessage("Gender must be MALE, FEMALE, or OTHER"),
  body("height")
    .optional()
    .isFloat({ min: 100, max: 250 })
    .withMessage("Height must be between 100 and 250 cm"),
  body("email")
    .optional()
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
  body("phone")
    .optional()
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage("Please provide a valid phone number"),
  body("age")
    .optional()
    .isInt({ min: 18, max: 100 })
    .withMessage("Age must be between 18 and 100"),
  body("numberOfChildren")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Number of children must be a non-negative integer"),
  body("numberOfBrothers")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Number of brothers must be a non-negative integer"),
  body("numberOfSisters")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Number of sisters must be a non-negative integer"),
  body("marriedBrothers")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Married brothers count must be a non-negative integer"),
  body("marriedSisters")
    .optional()
    .isInt({ min: 0 })
    .withMessage("Married sisters count must be a non-negative integer"),
];

// Interest validations
const sendInterestValidation = [
  body("toUserId")
    .notEmpty()
    .withMessage("Target user ID is required")
    .isUUID()
    .withMessage("Invalid user ID format"),
];

// Message validations
const sendMessageValidation = [
  body("toUserId")
    .notEmpty()
    .withMessage("Target user ID is required")
    .isUUID()
    .withMessage("Invalid user ID format"),
  body("content")
    .trim()
    .notEmpty()
    .withMessage("Message content is required")
    .isLength({ min: 1, max: 5000 })
    .withMessage("Message must be between 1 and 5000 characters"),
];

// Shortlist validations
const shortlistValidation = [
  body("shortlistedUserId")
    .notEmpty()
    .withMessage("User ID is required")
    .isUUID()
    .withMessage("Invalid user ID format"),
];

// Block validations
const blockUserValidation = [
  body("blockedUserId")
    .notEmpty()
    .withMessage("User ID is required")
    .isUUID()
    .withMessage("Invalid user ID format"),
];

// Photo validations
const photoPrivacyValidation = [
  param("photoId")
    .isUUID()
    .withMessage("Invalid photo ID format"),
];

// Face verification validations
const storeFaceEncodingValidation = [
  body("faceEncoding")
    .isArray()
    .withMessage("Face encoding must be an array")
    .custom((value) => {
      if (value.length < 128 || value.length > 512) {
        throw new Error("Face encoding must contain 128-512 values");
      }
      if (!value.every((v) => typeof v === "number")) {
        throw new Error("Face encoding must contain only numbers");
      }
      return true;
    }),
  body("photoId")
    .optional()
    .isUUID()
    .withMessage("Invalid photo ID format"),
];

const verifyFaceValidation = [
  body("faceEncoding")
    .isArray()
    .withMessage("Face encoding must be an array")
    .custom((value) => {
      if (value.length < 128 || value.length > 512) {
        throw new Error("Face encoding must contain 128-512 values");
      }
      if (!value.every((v) => typeof v === "number")) {
        throw new Error("Face encoding must contain only numbers");
      }
      return true;
    }),
];

// Settings validations
const changePasswordValidation = [
  body("currentPassword")
    .notEmpty()
    .withMessage("Current password is required"),
  body("newPassword")
    .isLength({ min: 6 })
    .withMessage("New password must be at least 6 characters long"),
];

const updateEmailValidation = [
  body("email")
    .isEmail()
    .withMessage("Please provide a valid email address")
    .normalizeEmail(),
];

const updatePhoneValidation = [
  body("phone")
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage("Please provide a valid phone number"),
];

// OTP validations
const sendOTPValidation = [
  body("phone")
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage("Please provide a valid phone number"),
];

const verifyOTPValidation = [
  body("phone")
    .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
    .withMessage("Please provide a valid phone number"),
  body("otp")
    .isLength({ min: 6, max: 6 })
    .withMessage("OTP must be 6 digits")
    .isNumeric()
    .withMessage("OTP must contain only numbers"),
];

// Pagination validations
const paginationValidation = [
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer"),
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100"),
];

// UUID param validation
const uuidParamValidation = (paramName = "id") => [
  param(paramName)
    .isUUID()
    .withMessage(`Invalid ${paramName} format`),
];

module.exports = {
  registerValidation,
  loginValidation,
  profileValidation,
  sendInterestValidation,
  sendMessageValidation,
  shortlistValidation,
  blockUserValidation,
  photoPrivacyValidation,
  storeFaceEncodingValidation,
  verifyFaceValidation,
  changePasswordValidation,
  updateEmailValidation,
  updatePhoneValidation,
  sendOTPValidation,
  verifyOTPValidation,
  paginationValidation,
  uuidParamValidation,
};

