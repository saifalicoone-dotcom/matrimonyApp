const express = require("express");
const router = express.Router();
const blockController = require("../controllers/blockController");
const { authenticate } = require("../middleware/auth");
const { blockUserValidation } = require("../middleware/validationSchemas");
const validateRequest = require("../middleware/validateRequest");

/**
 * @route   POST /api/users/me/blocks
 * @desc    Block a user
 * @access  Protected
 */
router.post(
  "/",
  authenticate,
  blockUserValidation,
  validateRequest,
  blockController.blockUser
);

/**
 * @route   GET /api/users/me/blocks
 * @desc    Get blocked users list
 * @access  Protected
 */
router.get("/", authenticate, blockController.getBlockedUsers);

/**
 * @route   DELETE /api/users/me/blocks/:blockedUserId
 * @desc    Unblock a user
 * @access  Protected
 */
router.delete("/:blockedUserId", authenticate, blockController.unblockUser);

module.exports = router;

