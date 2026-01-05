const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const { authenticate } = require("../middleware/auth");
const {
  changePasswordValidation,
  updateEmailValidation,
  updatePhoneValidation,
} = require("../middleware/validationSchemas");
const validateRequest = require("../middleware/validateRequest");

/**
 * @route   GET /api/users/me/settings
 * @desc    Get account settings
 * @access  Protected
 */
router.get("/", authenticate, settingsController.getAccountSettings);

/**
 * @route   PATCH /api/users/me/password
 * @desc    Change password
 * @access  Protected
 */
router.patch("/password", authenticate, settingsController.changePassword);

/**
 * @route   PATCH /api/users/me/email
 * @desc    Update email
 * @access  Protected
 */
router.patch("/email", authenticate, settingsController.updateEmail);

/**
 * @route   PATCH /api/users/me/phone
 * @desc    Update phone
 * @access  Protected
 */
router.patch("/phone", authenticate, settingsController.updatePhone);

/**
 * @route   PATCH /api/users/me/privacy
 * @desc    Update privacy settings
 * @access  Protected
 */
router.patch("/privacy", authenticate, settingsController.updatePrivacySettings);

/**
 * @route   PATCH /api/users/me/deactivate
 * @desc    Deactivate account
 * @access  Protected
 */
router.patch("/deactivate", authenticate, settingsController.deactivateAccount);

module.exports = router;

