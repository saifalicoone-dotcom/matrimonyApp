const express = require("express");
const router = express.Router();
const interestController = require("../controllers/interestController");
const { authenticate } = require("../middleware/auth");
const {
  sendInterestValidation,
  uuidParamValidation,
  paginationValidation,
} = require("../middleware/validationSchemas");
const validateRequest = require("../middleware/validateRequest");

/**
 * @route   POST /api/interests
 * @desc    Send interest to a user
 * @access  Protected
 */
router.post(
  "/",
  authenticate,
  sendInterestValidation,
  validateRequest,
  interestController.sendInterest
);

/**
 * @route   GET /api/interests
 * @desc    Get my interests (sent/received)
 * @access  Protected
 */
router.get(
  "/",
  authenticate,
  paginationValidation,
  validateRequest,
  interestController.getMyInterests
);

/**
 * @route   PATCH /api/interests/:interestId/accept
 * @desc    Accept an interest
 * @access  Protected
 */
router.patch(
  "/:interestId/accept",
  authenticate,
  uuidParamValidation("interestId"),
  validateRequest,
  interestController.acceptInterest
);

/**
 * @route   PATCH /api/interests/:interestId/reject
 * @desc    Reject an interest
 * @access  Protected
 */
router.patch(
  "/:interestId/reject",
  authenticate,
  uuidParamValidation("interestId"),
  validateRequest,
  interestController.rejectInterest
);

module.exports = router;

