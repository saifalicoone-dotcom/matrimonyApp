/**
 * Pagination middleware and utilities
 */

/**
 * Parse pagination query parameters
 * @param {Object} query - Request query object
 * @returns {Object} { page, limit, skip, pageNum, limitNum }
 */
const parsePagination = (query) => {
  const page = parseInt(query.page) || 1;
  const limit = parseInt(query.limit) || 20;

  // Validate page and limit
  const pageNum = page > 0 ? page : 1;
  const limitNum = limit > 0 && limit <= 100 ? limit : 20; // Max 100 per page

  const skip = (pageNum - 1) * limitNum;

  return {
    page: pageNum,
    limit: limitNum,
    skip,
    pageNum,
    limitNum,
  };
};

/**
 * Create pagination response metadata
 * @param {Number} page - Current page
 * @param {Number} limit - Items per page
 * @param {Number} total - Total items
 * @returns {Object} Pagination metadata
 */
const createPaginationMeta = (page, limit, total) => {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

module.exports = {
  parsePagination,
  createPaginationMeta,
};

