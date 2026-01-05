const express = require("express");
const router = express.Router();
const shortlistController = require("../controllers/shortlistController");
const { authenticate } = require("../middleware/auth");
const {
  shortlistValidation,
  uuidParamValidation,
  paginationValidation,
} = require("../middleware/validationSchemas");
const validateRequest = require("../middleware/validateRequest");

/**
 * @route   POST /api/shortlist
 * @desc    Add profile to shortlist
 * @access  Protected
 */
router.post(
  "/",
  authenticate,
  shortlistValidation,
  validateRequest,
  shortlistController.addToShortlist
);

/**
 * @route   GET /api/shortlist
 * @desc    Get my shortlisted profiles
 * @access  Protected
 */
router.get(
  "/",
  authenticate,
  paginationValidation,
  validateRequest,
  shortlistController.getMyShortlist
);

/**
 * @route   DELETE /api/shortlist/:shortlistedUserId
 * @desc    Remove profile from shortlist
 * @access  Protected
 */
router.delete(
  "/:shortlistedUserId",
  authenticate,
  uuidParamValidation("shortlistedUserId"),
  validateRequest,
  shortlistController.removeFromShortlist
);

/**
 * @route   GET /api/shortlist/:shortlistedUserId/check
 * @desc    Check if profile is shortlisted
 * @access  Protected
 */
router.get(
  "/:shortlistedUserId/check",
  authenticate,
  uuidParamValidation("shortlistedUserId"),
  validateRequest,
  shortlistController.checkShortlistStatus
);

module.exports = router;

