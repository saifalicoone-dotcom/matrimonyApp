const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const { authenticate } = require("../middleware/auth");
const {
  registerValidation,
  loginValidation,
  sendOTPValidation,
  verifyOTPValidation,
} = require("../middleware/validationSchemas");
const validateRequest = require("../middleware/validateRequest");

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post(
  "/register",
  registerValidation,
  validateRequest,
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and get JWT token
 * @access  Public
 */
router.post("/login", loginValidation, validateRequest, authController.login);

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
