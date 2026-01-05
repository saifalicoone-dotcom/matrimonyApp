const express = require('express');
const router = express.Router();
const searchController = require('../controllers/searchController');
const { authenticate } = require('../middleware/auth');
const { paginationValidation } = require('../middleware/validationSchemas');
const validateRequest = require('../middleware/validateRequest');

/**
 * @route   GET /api/search/users
 * @desc    Search users with advanced filters
 * @access  Protected
 */
router.get(
  '/users',
  authenticate,
  paginationValidation,
  validateRequest,
  searchController.searchUsers
);

module.exports = router;

