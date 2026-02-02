const express = require("express");
const { body } = require("express-validator");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const {
  sendOTPValidation,
  verifyOTPValidation,
} = require("../middleware/validationSchemas");
const validateRequest = require("../middleware/validateRequest");

/**
 * @route   POST /api/auth/register-otp
 * @desc    Initiate OTP-based registration
 * @access  Public
 */
router.post(
  "/register-otp",
  sendOTPValidation, // Reusing sendOTP validation since it validates phone
  validateRequest,
  authController.registerWithOTP
);

/**
 * @route   POST /api/auth/complete-registration
 * @desc    Complete registration with OTP
 * @access  Public
 */
router.post(
  "/complete-registration",
  [
    body("phone")
      .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
      .withMessage("Please provide a valid phone number"),
    body("otp")
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP must be 6 digits")
      .isNumeric()
      .withMessage("OTP must contain only numbers"),
    body("email")
      .optional()
      .isEmail()
      .withMessage("Please provide a valid email address")
      .normalizeEmail(),
  ],
  validateRequest,
  authController.completeRegistration
);

/**
 * @route   POST /api/auth/login-otp
 * @desc    Initiate OTP-based login
 * @access  Public
 */
router.post(
  "/login-otp",
  [
    body("phone")
      .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
      .withMessage("Please provide a valid phone number"),
  ],
  validateRequest,
  authController.loginWithOTP
);

/**
 * @route   POST /api/auth/complete-login
 * @desc    Complete login with OTP
 * @access  Public
 */
router.post(
  "/complete-login",
  [
    body("phone")
      .matches(/^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/)
      .withMessage("Please provide a valid phone number"),
    body("otp")
      .isLength({ min: 6, max: 6 })
      .withMessage("OTP must be 6 digits")
      .isNumeric()
      .withMessage("OTP must contain only numbers"),
  ],
  validateRequest,
  authController.completeLogin
);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user (client-side token removal)
 * @access  Protected
 */
router.post("/logout", authenticate, authController.logout);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public
 */
router.post("/refresh", authController.refreshToken);

/**
 * @route   POST /api/auth/send-otp
 * @desc    Send OTP for phone verification
 * @access  Public
 */
router.post(
  "/send-otp",
  sendOTPValidation,
  validateRequest,
  authController.sendOTP
);

/**
 * @route   POST /api/auth/verify-otp
 * @desc    Verify OTP for phone verification
 * @access  Public
 */
router.post(
  "/verify-otp",
  verifyOTPValidation,
  validateRequest,
  authController.verifyOTP
);

module.exports = router;
