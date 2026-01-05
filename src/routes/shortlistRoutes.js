const express = require("express");
const router = express.Router();
const shortlistController = require("../controllers/shortlistController");
const { authenticate } = require("../middleware/auth");

/**
 * @route   POST /api/shortlist
 * @desc    Add profile to shortlist
 * @access  Protected
 */
router.post("/", authenticate, shortlistController.addToShortlist);

/**
 * @route   GET /api/shortlist
 * @desc    Get my shortlisted profiles
 * @access  Protected
 */
router.get("/", authenticate, shortlistController.getMyShortlist);

/**
 * @route   DELETE /api/shortlist/:shortlistedUserId
 * @desc    Remove profile from shortlist
 * @access  Protected
 */
router.delete("/:shortlistedUserId", authenticate, shortlistController.removeFromShortlist);

/**
 * @route   GET /api/shortlist/:shortlistedUserId/check
 * @desc    Check if profile is shortlisted
 * @access  Protected
 */
router.get("/:shortlistedUserId/check", authenticate, shortlistController.checkShortlistStatus);

module.exports = router;

