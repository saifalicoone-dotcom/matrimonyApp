const express = require("express");
const router = express.Router();
const faceVerificationController = require("../controllers/faceVerificationController");
const { authenticate } = require("../middleware/auth");

/**
 * @route   POST /api/users/me/face-verification/store
 * @desc    Store face encoding from profile photo
 * @access  Protected
 */
router.post("/store", authenticate, faceVerificationController.storeFaceEncoding);

/**
 * @route   POST /api/users/me/face-verification/verify
 * @desc    Verify face with live capture
 * @access  Protected
 */
router.post("/verify", authenticate, faceVerificationController.verifyFace);

/**
 * @route   GET /api/users/me/face-verification/status
 * @desc    Get face verification status
 * @access  Protected
 */
router.get("/status", authenticate, faceVerificationController.getFaceVerificationStatus);

/**
 * @route   DELETE /api/users/me/face-verification/reset
 * @desc    Reset face verification
 * @access  Protected
 */
router.delete("/reset", authenticate, faceVerificationController.resetFaceVerification);

module.exports = router;

