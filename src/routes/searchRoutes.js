const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authenticate } = require('../middleware/auth');

/**
 * @route   GET /api/search/users
 * @desc    Search users with advanced filters
 * @access  Protected
 */
router.get('/users', authenticate, searchController.searchUsers);

module.exports = router;

