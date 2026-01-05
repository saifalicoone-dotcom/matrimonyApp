const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const { authenticate } = require('../middleware/auth');
const { profileValidation } = require('../middleware/validationSchemas');
const validateRequest = require('../middleware/validateRequest');

/**
 * @route   POST /api/users/me/profile
 * @desc    Create user profile
 * @access  Protected
 */
router.post(
  '/',
  authenticate,
  profileValidation,
  validateRequest,
  profileController.createOrUpdateProfile
);

/**
 * @route   PUT /api/users/me/profile
 * @desc    Update user profile
 * @access  Protected
 */
router.put(
  '/',
  authenticate,
  profileValidation,
  validateRequest,
  profileController.createOrUpdateProfile
);

/**
 * @route   GET /api/users/me/profile
 * @desc    Get my profile
 * @access  Protected
 */
router.get('/', authenticate, profileController.getMyProfile);

module.exports = router;

