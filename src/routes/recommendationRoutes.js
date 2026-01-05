const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authenticate } = require('../middleware/auth');
const { paginationValidation } = require('../middleware/validationSchemas');
const validateRequest = require('../middleware/validateRequest');

/**
 * @route   GET /api/recommendations
 * @desc    Get match recommendations based on user profile
 * @access  Protected
 */
router.get(
  '/',
  authenticate,
  paginationValidation,
  validateRequest,
  searchController.getRecommendations
);

module.exports = router;

