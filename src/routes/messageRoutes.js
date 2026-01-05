const express = require("express");
const router = express.Router();
const messageController = require("../controllers/messageController");
const { authenticate } = require("../middleware/auth");
const { sendMessageValidation } = require("../middleware/validationSchemas");
const validateRequest = require("../middleware/validateRequest");

/**
 * @route   POST /api/messages
 * @desc    Send a message
 * @access  Protected
 */
router.post(
  "/",
  authenticate,
  sendMessageValidation,
  validateRequest,
  messageController.sendMessage
);

/**
 * @route   GET /api/messages/conversations
 * @desc    Get all conversations
 * @access  Protected
 */
router.get("/conversations", authenticate, messageController.getConversations);

/**
 * @route   GET /api/messages/:userId
 * @desc    Get messages with a specific user
 * @access  Protected
 */
router.get("/:userId", authenticate, messageController.getMessages);

module.exports = router;

