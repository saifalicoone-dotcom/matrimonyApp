const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/users/:userId/profile
 * @desc    Get user profile by ID
 * @access  Protected
 */
router.get('/:userId/profile', authenticate, profileController.getUserProfile);

module.exports = router;

