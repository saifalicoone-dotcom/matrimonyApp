const express = require("express");
const router = express.Router();
const subscriptionController = require("../controllers/subscriptionController");
const { authenticate } = require("../middleware/auth");
const {
  purchaseSubscriptionValidation,
  verifySubscriptionValidation,
  paginationValidation,
} = require("../middleware/validationSchemas");
const validateRequest = require("../middleware/validateRequest");

/**
 * @route   GET /api/subscriptions/plans
 * @desc    Get available subscription plans
 * @access  Public (or Protected - you can change this)
 */
router.get("/plans", subscriptionController.getPlans);

/**
 * @route   GET /api/subscriptions/my-subscription
 * @desc    Get current active subscription
 * @access  Protected
 */
router.get("/my-subscription", authenticate, subscriptionController.getMySubscription);

/**
 * @route   POST /api/subscriptions/purchase
 * @desc    Create subscription order (buy subscription)
 * @access  Protected
 */
router.post(
  "/purchase",
  authenticate,
  purchaseSubscriptionValidation,
  validateRequest,
  subscriptionController.purchaseSubscription
);

/**
 * @route   POST /api/subscriptions/verify
 * @desc    Verify subscription payment and activate subscription
 * @access  Protected
 */
router.post(
  "/verify",
  authenticate,
  verifySubscriptionValidation,
  validateRequest,
  subscriptionController.verifySubscriptionPayment
);

/**
 * @route   GET /api/subscriptions/history
 * @desc    Get subscription history
 * @access  Protected
 */
router.get(
  "/history",
  authenticate,
  paginationValidation,
  validateRequest,
  subscriptionController.getSubscriptionHistory
);

module.exports = router;

