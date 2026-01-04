const express = require("express");
const router = express.Router();
const settingsController = require("../controllers/settingsController");
const { authenticate } = require("../middleware/auth");

/**
 * @route   DELETE /api/users/me
 * @desc    Delete account
 * @access  Protected
 */
router.delete("/", authenticate, settingsController.deleteAccount);

module.exports = router;

