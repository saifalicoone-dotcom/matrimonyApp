const { PrismaClient } = require("@prisma/client");
const { authenticate } = require("../middleware/auth");

const prisma = new PrismaClient();

// Interest fee amount (in INR)
const INTEREST_FEE = 5;

/**
 * Get Wallet Balance
 * GET /api/wallet
 */
const getWallet = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get or create wallet
    let wallet = await prisma.wallet.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: "desc" },
          take: 10, // Last 10 transactions
        },
      },
    });

    // Create wallet if it doesn't exist
    if (!wallet) {
      wallet = await prisma.wallet.create({
        data: {
          userId,
          balance: 0,
        },
        include: {
          transactions: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });
    }

    res.json({
      status: "success",
      message: "Wallet retrieved successfully.",
      data: {
        wallet: {
          id: wallet.id,
          balance: wallet.balance,
          recentTransactions: wallet.transactions,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Add Money to Wallet (Mock Payment - DEPRECATED)
 * Use /api/payments/create-order instead for real payments
 * POST /api/wallet/add-money
 */
const addMoney = async (req, res, next) => {
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

    // Use database transaction for atomicity
    const result = await prisma.$transaction(async (tx) => {
      // Get or create wallet
      let wallet = await tx.wallet.findUnique({
        where: { userId },
      });

      if (!wallet) {
        wallet = await tx.wallet.create({
          data: {
            userId,
            balance: 0,
          },
        });
      }

      // Calculate new balance
      const newBalance = wallet.balance + amount;

      // Update wallet balance
      const updatedWallet = await tx.wallet.update({
        where: { id: wallet.id },
        data: { balance: newBalance },
      });

      // Create transaction record
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet.id,
          type: "CREDIT",
          amount: amount,
          balanceAfter: newBalance,
          description: `Added ₹${amount} to wallet (Mock Payment)`,
          referenceType: "ADD_MONEY",
          paymentStatus: "SUCCESS", // Mock payment is always successful
        },
      });

      return {
        wallet: updatedWallet,
        transaction,
      };
    });

    res.status(201).json({
      status: "success",
      message: "Money added to wallet successfully (Mock Payment).",
      data: {
        wallet: {
          id: result.wallet.id,
          balance: result.wallet.balance,
        },
        transaction: result.transaction,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deduct Money from Wallet (Internal function)
 * Used by interest controller
 */
const deductMoney = async (userId, amount, description, referenceId, referenceType) => {
  return await prisma.$transaction(async (tx) => {
    // Get wallet
    const wallet = await tx.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    // Check if balance is sufficient
    if (wallet.balance < amount) {
      throw new Error("INSUFFICIENT_BALANCE");
    }

    // Calculate new balance
    const newBalance = wallet.balance - amount;

    // Ensure balance never goes negative (double check)
    if (newBalance < 0) {
      throw new Error("INSUFFICIENT_BALANCE");
    }

    // Update wallet balance
    const updatedWallet = await tx.wallet.update({
      where: { id: wallet.id },
      data: { balance: newBalance },
    });

    // Create transaction record
    const transaction = await tx.walletTransaction.create({
      data: {
        walletId: wallet.id,
        type: "DEBIT",
        amount: amount,
        balanceAfter: newBalance,
        description: description || `Deducted ₹${amount} from wallet`,
        referenceId: referenceId,
        referenceType: referenceType,
      },
    });

    return {
      wallet: updatedWallet,
      transaction,
    };
  });
};

/**
 * Get Wallet Transaction History
 * GET /api/wallet/transactions
 */
const getTransactionHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, type = null } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get wallet first
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return res.status(404).json({
        status: "error",
        message: "Wallet not found.",
        error: "Wallet does not exist.",
      });
    }

    // Build where clause
    let where = { walletId: wallet.id };
    if (type && ["CREDIT", "DEBIT"].includes(type.toUpperCase())) {
      where.type = type.toUpperCase();
    }

    // Get total count
    const totalCount = await prisma.walletTransaction.count({ where });

    // Get transactions
    const transactions = await prisma.walletTransaction.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      status: "success",
      message: "Transaction history retrieved successfully.",
      data: {
        transactions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: totalCount,
          totalPages,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Transaction Receipt
 * GET /api/wallet/transactions/:transactionId
 */
const getTransactionReceipt = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { transactionId } = req.params;

    // Get wallet
    const wallet = await prisma.wallet.findUnique({
      where: { userId },
    });

    if (!wallet) {
      return res.status(404).json({
        status: "error",
        message: "Wallet not found.",
        error: "Wallet does not exist.",
      });
    }

    // Get transaction
    const transaction = await prisma.walletTransaction.findUnique({
      where: { id: transactionId },
    });

    if (!transaction) {
      return res.status(404).json({
        status: "error",
        message: "Transaction not found.",
        error: "Invalid transaction ID.",
      });
    }

    // Verify transaction belongs to user
    if (transaction.walletId !== wallet.id) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized access.",
        error: "Transaction does not belong to user.",
      });
    }

    res.json({
      status: "success",
      message: "Transaction receipt retrieved successfully.",
      data: { transaction },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getWallet,
  addMoney,
  deductMoney,
  getTransactionHistory,
  getTransactionReceipt,
  INTEREST_FEE,
};

