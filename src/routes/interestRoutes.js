const express = require("express");
const router = express.Router();
const interestController = require("../controllers/interestController");
const { authenticate } = require("../middleware/auth");

/**
 * @route   POST /api/interests
 * @desc    Send interest to a user
 * @access  Protected
 */
router.post("/", authenticate, interestController.sendInterest);

/**
 * @route   GET /api/interests
 * @desc    Get my interests (sent/received)
 * @access  Protected
 */
router.get("/", authenticate, interestController.getMyInterests);

/**
 * @route   PATCH /api/interests/:interestId/accept
 * @desc    Accept an interest
 * @access  Protected
 */
router.patch("/:interestId/accept", authenticate, interestController.acceptInterest);

/**
 * @route   PATCH /api/interests/:interestId/reject
 * @desc    Reject an interest
 * @access  Protected
 */
router.patch("/:interestId/reject", authenticate, interestController.rejectInterest);

module.exports = router;

