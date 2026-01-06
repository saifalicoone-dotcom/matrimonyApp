const express = require("express");
const router = express.Router();
const walletController = require("../controllers/walletController");
const { authenticate } = require("../middleware/auth");
const {
  addMoneyValidation,
} = require("../middleware/validationSchemas");
const validateRequest = require("../middleware/validateRequest");

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

module.exports = router;

