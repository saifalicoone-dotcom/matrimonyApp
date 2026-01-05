const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notificationController");
const { authenticate } = require("../middleware/auth");
const { uuidParamValidation, paginationValidation } = require("../middleware/validationSchemas");
const validateRequest = require("../middleware/validateRequest");

/**
 * @route   GET /api/users/me/notifications
 * @desc    Get notifications
 * @access  Protected
 */
router.get(
  "/",
  authenticate,
  paginationValidation,
  validateRequest,
  notificationController.getNotifications
);

/**
 * @route   GET /api/users/me/notifications/unread-count
 * @desc    Get unread notifications count
 * @access  Protected
 */
router.get(
  "/unread-count",
  authenticate,
  notificationController.getUnreadCount
);

/**
 * @route   PATCH /api/users/me/notifications/:notificationId/read
 * @desc    Mark notification as read
 * @access  Protected
 */
router.patch(
  "/:notificationId/read",
  authenticate,
  uuidParamValidation("notificationId"),
  validateRequest,
  notificationController.markAsRead
);

/**
 * @route   PATCH /api/users/me/notifications/mark-all-read
 * @desc    Mark all notifications as read
 * @access  Protected
 */
router.patch(
  "/mark-all-read",
  authenticate,
  notificationController.markAllAsRead
);

/**
 * @route   DELETE /api/users/me/notifications/:notificationId
 * @desc    Delete notification
 * @access  Protected
 */
router.delete(
  "/:notificationId",
  authenticate,
  uuidParamValidation("notificationId"),
  validateRequest,
  notificationController.deleteNotification
);

module.exports = router;
