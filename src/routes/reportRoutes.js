const express = require("express");
const router = express.Router();
const reportController = require("../controllers/reportController");
const { authenticate } = require("../middleware/auth");
const { requireAdmin } = require("../middleware/adminAuth");
const {
  createReportValidation,
  reviewReportValidation,
  uuidParamValidation,
  paginationValidation,
} = require("../middleware/validationSchemas");
const validateRequest = require("../middleware/validateRequest");

/**
 * @route   POST /api/reports
 * @desc    Create a report
 * @access  Protected
 */
router.post(
  "/",
  authenticate,
  createReportValidation,
  validateRequest,
  reportController.createReport
);

/**
 * @route   GET /api/reports/my-reports
 * @desc    Get my submitted reports
 * @access  Protected
 */
router.get(
  "/my-reports",
  authenticate,
  paginationValidation,
  validateRequest,
  reportController.getMyReports
);

/**
 * @route   GET /api/reports/admin
 * @desc    Get all reports (Admin only)
 * @access  Protected (Admin)
 */
router.get(
  "/admin",
  authenticate,
  requireAdmin,
  paginationValidation,
  validateRequest,
  reportController.getAllReports
);

/**
 * @route   GET /api/reports/:reportId
 * @desc    Get report by ID (Admin only)
 * @access  Protected (Admin)
 */
router.get(
  "/:reportId",
  authenticate,
  requireAdmin,
  uuidParamValidation("reportId"),
  validateRequest,
  reportController.getReportById
);

/**
 * @route   PATCH /api/reports/:reportId/review
 * @desc    Review report and take action (Admin only)
 * @access  Protected (Admin)
 */
router.patch(
  "/:reportId/review",
  authenticate,
  requireAdmin,
  uuidParamValidation("reportId"),
  reviewReportValidation,
  validateRequest,
  reportController.reviewReport
);

module.exports = router;

