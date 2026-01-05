const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController');
const photoController = require('../controllers/photoController');
const { authenticate } = require('../middleware/auth');
const { uuidParamValidation } = require('../middleware/validationSchemas');
const validateRequest = require('../middleware/validateRequest');

/**
 * @route   GET /api/users/:userId/profile
 * @desc    Get user profile by ID
 * @access  Protected
 */
router.get(
  '/:userId/profile',
  authenticate,
  uuidParamValidation('userId'),
  validateRequest,
  profileController.getUserProfile
);

/**
 * @route   GET /api/users/:userId/photos
 * @desc    Get user photos (with privacy check)
 * @access  Protected
 */
router.get(
  '/:userId/photos',
  authenticate,
  uuidParamValidation('userId'),
  validateRequest,
  photoController.getUserPhotos
);

/**
 * @route   POST /api/users/:userId/photos/request-access
 * @desc    Request access to private photos
 * @access  Protected
 */
router.post(
  '/:userId/photos/request-access',
  authenticate,
  uuidParamValidation('userId'),
  validateRequest,
  photoController.requestPhotoAccess
);

module.exports = router;

