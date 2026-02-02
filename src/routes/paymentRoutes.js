const express = require("express");
const router = express.Router();
const paymentController = require("../controllers/paymentController");
const { authenticate } = require("../middleware/auth");
const {
  createOrderValidation,
  verifyPaymentValidation,
  uuidParamValidation,
} = require("../middleware/validationSchemas");
const validateRequest = require("../middleware/validateRequest");

/**
 * @route   POST /api/payments/create-order
 * @desc    Create Razorpay payment order
 * @access  Protected
 */
router.post(
  "/create-order",
  authenticate,
  createOrderValidation,
  validateRequest,
  paymentController.createOrder
);

/**
 * @route   POST /api/payments/verify
 * @desc    Verify payment and update wallet
 * @access  Protected
 */
router.post(
  "/verify",
  authenticate,
  verifyPaymentValidation,
  validateRequest,
  paymentController.verifyPayment
);

/**
 * @route   POST /api/payments/webhook
 * @desc    Razorpay webhook handler (no auth required - uses signature verification)
 * @access  Public (but secured with webhook signature)
 */
router.post(
  "/webhook",
  express.raw({ type: "application/json" }), // Raw body for webhook signature verification
  paymentController.handleWebhook
);

/**
 * @route   GET /api/payments/status/:transactionId
 * @desc    Get payment status
 * @access  Protected
 */
router.get(
  "/status/:transactionId",
  authenticate,
  uuidParamValidation("transactionId"),
  validateRequest,
  paymentController.getPaymentStatus
);

module.exports = router;



