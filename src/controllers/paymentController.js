const Razorpay = require("razorpay");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Initialize Razorpay
// const razorpay = new Razorpay({
//   key_id: process.env.RAZORPAY_KEY_ID,
//   key_secret: process.env.RAZORPAY_KEY_SECRET,
// });

/**
 * Create Payment Order
 * POST /api/payments/create-order
 */
const createOrder = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { amount } = req.body;

    // Validation
    if (!amount || amount <= 0) {
      return res.status(400).json({
        status: "error",
        message: "Amount must be greater than 0.",
        error: "Invalid amount.",
      });
    }

    // Minimum amount check (Razorpay minimum is ₹1)
    if (amount < 1) {
      return res.status(400).json({
        status: "error",
        message: "Minimum amount is ₹1.",
        error: "Invalid amount.",
      });
    }

    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 0,
        },
      });
    }

    // Convert amount to paise (Razorpay uses paise)
    const amountInPaise = Math.round(amount * 100);

    // Create Razorpay order
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `wallet_${wallet.id}_${Date.now()}`,
      notes: {
        userId: userId,
        walletId: wallet.id,
        type: "WALLET_TOPUP",
      },
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Create pending transaction record
    const transaction = await prisma.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "CREDIT",
        amount: amount,
        balanceAfter: wallet.balance, // Balance remains same until payment success
        description: `Payment initiated for ₹${amount}`,
        referenceType: "PAYMENT",
        razorpayOrderId: razorpayOrder.id,
        paymentStatus: "PENDING",
      },
    });

    res.status(201).json({
      status: "success",
      message: "Payment order created successfully.",
      data: {
        order: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount / 100, // Convert back to rupees
          currency: razorpayOrder.currency,
          receipt: razorpayOrder.receipt,
        },
        key: process.env.RAZORPAY_KEY_ID, // Frontend needs this for Razorpay checkout
        transactionId: transaction.id,
      },
    });
  } catch (error) {
    console.error("Razorpay Order Creation Error:", error);
    next(error);
  }
};

/**
 * Verify Payment and Update Wallet
 * POST /api/payments/verify
 */
const verifyPayment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transactionId } = req.body;

    // Validation
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        status: "error",
        message: "Payment verification data is required.",
        error: "Missing payment details.",
      });
    }

    // Find transaction
    const transaction = await prisma.walletTransaction.findUnique({
      where: { id: transactionId },
      include: {
        wallet: {
          include: {
            user: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({
        status: "error",
        message: "Transaction not found.",
        error: "Invalid transaction ID.",
      });
    }

    // Verify transaction belongs to user
    if (transaction.wallet.user.id !== userId) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized access.",
        error: "Transaction does not belong to user.",
      });
    }

    // Verify Razorpay signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      // Update transaction as failed
      await prisma.walletTransaction.update({
        where: { id: transaction.id },
        data: {
          paymentStatus: "FAILED",
          description: `Payment verification failed for ₹${transaction.amount}`,
        },
      });

      return res.status(400).json({
        status: "error",
        message: "Payment verification failed. Invalid signature.",
        error: "PAYMENT_VERIFICATION_FAILED",
      });
    }

    // Payment verified successfully - Update wallet using transaction
    const result = await prisma.$transaction(async (tx) => {
      // Get current wallet balance
      const wallet = await tx.wallet.findUnique({
        where: { id: transaction.walletId },
      });

      // Calculate new balance
      const newBalance = wallet.balance + transaction.amount;

      // Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      // Update transaction with payment details
      const updatedTransaction = await tx.walletTransaction.update({
        where: { id: transaction.id },
        data: {
          razorpayPaymentId: razorpay_payment_id,
          razorpaySignature: razorpay_signature,
          paymentStatus: "SUCCESS",
          balanceAfter: newBalance,
          description: `Payment successful - Added ₹${transaction.amount} to wallet`,
        },
      });

      return {
        wallet: updatedWallet,
        transaction: updatedTransaction,
      };
    });

    res.json({
      status: "success",
      message: "Payment verified and wallet updated successfully.",
      data: {
        wallet: {
          id: result.wallet.id,
          balance: result.wallet.balance,
        },
        transaction: {
          id: result.transaction.id,
          amount: result.transaction.amount,
          status: result.transaction.paymentStatus,
        },
      },
    });
  } catch (error) {
    console.error("Payment Verification Error:", error);
    next(error);
  }
};

/**
 * Razorpay Webhook Handler
 * POST /api/payments/webhook
 */
const handleWebhook = async (req, res, next) => {
  try {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

    if (!webhookSecret) {
      console.error("Razorpay webhook secret not configured");
      return res.status(500).json({
        status: "error",
        message: "Webhook secret not configured.",
      });
    }

    const razorpaySignature = req.headers["x-razorpay-signature"];

    if (!razorpaySignature) {
      return res.status(400).json({
        status: "error",
        message: "Missing Razorpay signature.",
      });
    }

    // Parse body (it comes as raw buffer from express.raw middleware)
    let body;
    try {
      body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    } catch (parseError) {
      return res.status(400).json({
        status: "error",
        message: "Invalid JSON body.",
      });
    }

    // Verify webhook signature
    const text = JSON.stringify(body);
    const generatedSignature = crypto
      .createHmac("sha256", webhookSecret)
      .update(text)
      .digest("hex");

    if (generatedSignature !== razorpaySignature) {
      return res.status(400).json({
        status: "error",
        message: "Invalid webhook signature.",
      });
    }

    const event = body.event;
    const payment = body.payload?.payment?.entity;

    // Handle payment success event
    if (event === "payment.captured" && payment) {
      const razorpayOrderId = payment.order_id;
      const razorpayPaymentId = payment.id;

      // Find transaction by order ID
      const transaction = await prisma.walletTransaction.findFirst({
        where: {
          razorpayOrderId: razorpayOrderId,
          paymentStatus: "PENDING",
        },
        include: {
          wallet: true,
        },
      });

      if (transaction) {
        // Update wallet and transaction
        await prisma.$transaction(async (tx) => {
          const newBalance = transaction.wallet.balance + transaction.amount;

          await tx.wallet.update({
            where: { id: transaction.wallet.id },
            data: { balance: newBalance },
          });

          await tx.walletTransaction.update({
            where: { id: transaction.id },
            data: {
              razorpayPaymentId: razorpayPaymentId,
              paymentStatus: "SUCCESS",
              balanceAfter: newBalance,
              description: `Payment successful via webhook - Added ₹${transaction.amount} to wallet`,
            },
          });
        });
      }
    }

    // Handle payment failure event
    if (event === "payment.failed" && payment) {
      const razorpayOrderId = payment.order_id;

      const transaction = await prisma.walletTransaction.findFirst({
        where: {
          razorpayOrderId: razorpayOrderId,
          paymentStatus: "PENDING",
        },
      });

      if (transaction) {
        await prisma.walletTransaction.update({
          where: { id: transaction.id },
          data: {
            paymentStatus: "FAILED",
            description: `Payment failed - ₹${transaction.amount}`,
          },
        });
      }
    }

    res.json({
      status: "success",
      message: "Webhook processed successfully.",
    });
  } catch (error) {
    console.error("Webhook Processing Error:", error);
    next(error);
  }
};

/**
 * Get Payment Status
 * GET /api/payments/status/:transactionId
 */
const getPaymentStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { transactionId } = req.params;

    const transaction = await prisma.walletTransaction.findUnique({
      where: { id: transactionId },
      include: {
        wallet: {
          include: {
            user: {
              select: { id: true },
            },
          },
        },
      },
    });

    if (!transaction) {
      return res.status(404).json({
        status: "error",
        message: "Transaction not found.",
        error: "Invalid transaction ID.",
      });
    }

    // Verify transaction belongs to user
    if (transaction.wallet.user.id !== userId) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized access.",
        error: "Transaction does not belong to user.",
      });
    }

    res.json({
      status: "success",
      message: "Payment status retrieved successfully.",
      data: {
        transaction: {
          id: transaction.id,
          amount: transaction.amount,
          status: transaction.paymentStatus,
          razorpayOrderId: transaction.razorpayOrderId,
          createdAt: transaction.createdAt,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  handleWebhook,
  getPaymentStatus,
};

