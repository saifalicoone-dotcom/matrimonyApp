const { PrismaClient } = require("@prisma/client");

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

module.exports = {
  getWallet,
  addMoney,
  deductMoney,
  INTEREST_FEE,
};

