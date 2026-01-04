const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   POST /api/users/me/profile
 * @desc    Create user profile
 * @access  Protected
 */
router.post('/', authenticate, profileController.createOrUpdateProfile);

/**
 * @route   PUT /api/users/me/profile
 * @desc    Update user profile
 * @access  Protected
 */
router.put('/', authenticate, profileController.createOrUpdateProfile);

/**
 * @route   GET /api/users/me/profile
 * @desc    Get my profile
 * @access  Protected
 */
router.get('/', authenticate, profileController.getMyProfile);

module.exports = router;

