const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");
const { authenticate } = require("../middleware/auth");
const {
  addMoneyValidation,
} = require("../middleware/validationSchemas");
const validateRequest = require("../middleware/validateRequest");
const { paginationValidation, uuidParamValidation } = require("../middleware/validationSchemas");

/**
 * @route   GET /api/wallet
 * @desc    Get wallet balance
 * @access  Protected
 */
router.get(
  "/",
  authenticate,
  walletController.getWallet
);

/**
 * @route   POST /api/wallet/add-money
 * @desc    Add money to wallet (mock payment)
 * @access  Protected
 */
router.post(
  "/add-money",
  authenticate,
  addMoneyValidation,
  validateRequest,
  walletController.addMoney
);

/**
 * @route   GET /api/wallet/transactions
 * @desc    Get wallet transaction history
 * @access  Protected
 */
router.get(
  "/transactions",
  authenticate,
  paginationValidation,
  validateRequest,
  walletController.getTransactionHistory
);

/**
 * @route   GET /api/wallet/transactions/:transactionId
 * @desc    Get transaction receipt
 * @access  Protected
 */
router.get(
  "/transactions/:transactionId",
  authenticate,
  uuidParamValidation("transactionId"),
  validateRequest,
  walletController.getTransactionReceipt
);

module.exports = router;



