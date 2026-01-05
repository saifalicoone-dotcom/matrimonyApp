const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const photoController = require('../controllers/photoController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/users/:userId/profile
 * @desc    Get user profile by ID
 * @access  Protected
 */
router.get('/:userId/profile', authenticate, profileController.getUserProfile);

/**
 * @route   GET /api/users/:userId/photos
 * @desc    Get user photos (with privacy check)
 * @access  Protected
 */
router.get('/:userId/photos', authenticate, photoController.getUserPhotos);

/**
 * @route   POST /api/users/:userId/photos/request-access
 * @desc    Request access to private photos
 * @access  Protected
 */
router.post('/:userId/photos/request-access', authenticate, photoController.requestPhotoAccess);

module.exports = router;

