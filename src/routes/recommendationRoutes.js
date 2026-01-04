const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/recommendations
 * @desc    Get match recommendations based on user profile
 * @access  Protected
 */
router.get('/', authenticate, searchController.getRecommendations);

module.exports = router;

