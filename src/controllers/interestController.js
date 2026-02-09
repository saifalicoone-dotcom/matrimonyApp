const { PrismaClient } = require("@prisma/client");
const { deductMoney, INTEREST_FEE } = require("./walletController");
const { canSendInterest } = require("../services/subscriptionService");

const prisma = new PrismaClient();

/**
 * Send Interest to a User
 * POST /api/interests
 */
const sendInterest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { toUserId } = req.body;

    // Validation
    if (!toUserId) {
      return res.status(400).json({
        status: "error",
        message: "Target user ID is required.",
        error: "toUserId field is mandatory.",
      });
    }

    // Cannot send interest to self
    if (toUserId === userId) {
      return res.status(400).json({
        status: "error",
        message: "Cannot send interest to yourself.",
        error: "Invalid target user.",
      });
    }

    // Check if target user exists and is active
    const targetUser = await prisma.user.findUnique({
      where: { id: toUserId },
      select: { id: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      return res.status(404).json({
        status: "error",
        message: "Target user not found or inactive.",
        error: "User does not exist or is inactive.",
      });
    }

    // Check if already blocked
    const isBlocked = await prisma.blockList.findFirst({
      where: {
        OR: [
          { userId, blockedUserId: toUserId },
          { userId: toUserId, blockedUserId: userId },
        ],
      },
    });

    if (isBlocked) {
      return res.status(403).json({
        status: "error",
        message: "Cannot send interest. User is blocked.",
        error: "Blocked user.",
      });
    }

    // Check if interest already exists
    const existingInterest = await prisma.interest.findFirst({
      where: {
        fromUserId: userId,
        toUserId: toUserId,
      },
    });

    if (existingInterest) {
      return res.status(409).json({
        status: "error",
        message: "Interest already sent to this user.",
        error: "Duplicate interest.",
      });
    }

    // Check subscription status for interest sending
    const interestCheck = await canSendInterest(userId);
    
    let paymentMethod = null;
    let walletResult = null;
    let contactUnlocked = false;
    let subscriptionInfo = null;

    // Subscription-based interest sending
    if (interestCheck.canSend && interestCheck.planType) {
      // User has active subscription with available limit
      paymentMethod = "subscription";
      contactUnlocked = true;
      subscriptionInfo = {
        planType: interestCheck.planType,
        limit: interestCheck.limit,
        used: interestCheck.used,
        remaining: interestCheck.remaining || (interestCheck.limit === -1 ? -1 : interestCheck.limit - interestCheck.used)
      };
      
      // For HIGH plan (unlimited), we don't need to track usage
      // For other plans, we'll track the usage in the response
    } 
    // Pay-per-interest scenario
    else {
      paymentMethod = "pay_per_interest";
      
      // Check wallet balance for ₹5 payment
      try {
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

        // Check if balance is sufficient
        if (wallet.balance < INTEREST_FEE) {
          return res.status(402).json({
            status: "error",
            message: "Insufficient wallet balance. Please add ₹5 to send interest.",
            error: "INSUFFICIENT_BALANCE",
            data: {
              required: INTEREST_FEE,
              current: wallet.balance,
              paymentMethod: "pay_per_interest"
            },
          });
        }

        // Deduct money using database transaction
        walletResult = await deductMoney(
          userId,
          INTEREST_FEE,
          `Deducted ₹${INTEREST_FEE} for sending interest (Pay-per-interest)`,
          null, // Will be set after interest creation
          "INTEREST"
        );

        contactUnlocked = true;
      } catch (error) {
        if (error.message === "INSUFFICIENT_BALANCE") {
          return res.status(402).json({
            status: "error",
            message: "Insufficient wallet balance. Please add ₹5 to send interest.",
            error: "INSUFFICIENT_BALANCE",
            data: {
              required: INTEREST_FEE,
              paymentMethod: "pay_per_interest"
            },
          });
        }
        throw error;
      }
    }

    // Create interest with contact unlocked status
    const interest = await prisma.$transaction(async (tx) => {
      const newInterest = await tx.interest.create({
        data: {
          fromUserId: userId,
          toUserId: toUserId,
          status: "PENDING",
          contactUnlocked: contactUnlocked,
        },
        include: {
          fromUser: {
            select: {
              id: true,
            },
          },
          toUser: {
            select: {
              id: true,
            },
          },
        },
      });

      // Update transaction reference if wallet deduction was successful
      if (walletResult && walletResult.transaction) {
        await tx.walletTransaction.update({
          where: { id: walletResult.transaction.id },
          data: { referenceId: newInterest.id },
        });
      }

      return newInterest;
    });

    // Create notification for target user
    try {
      await prisma.notification.create({
        data: {
          userId: toUserId,
          type: "interest",
          title: "New Interest Received",
          message: `You have received an interest from a user.`,
          relatedUserId: userId,
        },
      });
    } catch (notifError) {
      console.error("Notification creation error:", notifError);
      // Continue even if notification fails
    }

    // Prepare response data based on payment method
    const responseData = {
      interest: {
        ...interest,
        paymentMethod: paymentMethod,
        subscriptionInfo: subscriptionInfo
      },
      // User A (sender) can chat immediately after sending interest
      chatEnabledForSender: true,
      // User B (recipient) cannot chat initially - chat is locked until they accept
      chatLockedForRecipient: true
    };

    // Add wallet information if payment was made
    if (paymentMethod === "pay_per_interest" && walletResult) {
      const updatedWallet = await prisma.wallet.findUnique({
        where: { userId },
        select: { balance: true },
      });
      
      responseData.wallet = {
        balance: updatedWallet.balance,
        deducted: INTEREST_FEE,
        paymentMethod: "pay_per_interest"
      };
    }
    // Add subscription information if subscription was used
    else if (paymentMethod === "subscription" && subscriptionInfo) {
      responseData.subscription = subscriptionInfo;
    }

    // Success message based on payment method
    let successMessage = "Interest sent successfully.";
    if (contactUnlocked) {
      successMessage += " You can now chat with the user.";
    }

    res.status(201).json({
      status: "success",
      message: successMessage,
      data: responseData
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        status: "error",
        message: "Interest already exists.",
        error: "Duplicate interest.",
      });
    }
    next(error);
  }
};

/**
 * Accept Interest
 * PATCH /api/interests/:interestId/accept
 */
const acceptInterest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { interestId } = req.params;

    // Find interest
    const interest = await prisma.interest.findUnique({
      where: { id: interestId },
      include: {
        fromUser: {
          select: {
            id: true,
          },
        },
        toUser: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!interest) {
      return res.status(404).json({
        status: "error",
        message: "Interest not found.",
        error: "Interest does not exist.",
      });
    }

    // Check if user is the recipient
    if (interest.toUserId !== userId) {
      return res.status(403).json({
        status: "error",
        message: "You can only accept interests sent to you.",
        error: "Unauthorized action.",
      });
    }

    // Check if already accepted/rejected
    if (interest.status !== "PENDING") {
      return res.status(400).json({
        status: "error",
        message: `Interest has already been ${interest.status.toLowerCase()}.`,
        error: "Invalid status change.",
      });
    }

    // Check subscription status for accepting user (User B)
    const interestCheck = await canSendInterest(userId);
    
    let paymentMethod = null;
    let walletResult = null;
    let subscriptionInfo = null;

    // For accepting interest, check if user has subscription OR needs to pay
    if (interestCheck.canSend && interestCheck.planType) {
      // User has active subscription with available limit
      paymentMethod = "subscription";
      subscriptionInfo = {
        planType: interestCheck.planType,
        limit: interestCheck.limit,
        used: interestCheck.used,
        remaining: interestCheck.remaining || (interestCheck.limit === -1 ? -1 : interestCheck.limit - interestCheck.used)
      };
    } else {
      // User needs to pay ₹5 to unlock chat
      paymentMethod = "pay_per_interest";
      
      try {
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

        // Check if balance is sufficient
        if (wallet.balance < INTEREST_FEE) {
          return res.status(402).json({
            status: "error",
            message: "Insufficient wallet balance. Please add ₹5 to unlock chat.",
            error: "INSUFFICIENT_BALANCE",
            data: {
              required: INTEREST_FEE,
              current: wallet.balance,
              paymentMethod: "pay_per_interest"
            },
          });
        }

        // Deduct money using database transaction
        walletResult = await deductMoney(
          userId,
          INTEREST_FEE,
          `Deducted ₹${INTEREST_FEE} for unlocking chat (Accept interest)`,
          null, // Will be set after interest update
          "CHAT_UNLOCK"
        );
      } catch (error) {
        if (error.message === "INSUFFICIENT_BALANCE") {
          return res.status(402).json({
            status: "error",
            message: "Insufficient wallet balance. Please add ₹5 to unlock chat.",
            error: "INSUFFICIENT_BALANCE",
            data: {
              required: INTEREST_FEE,
              paymentMethod: "pay_per_interest"
            },
          });
        }
        throw error;
      }
    }

    // Update interest status
    const updatedInterest = await prisma.$transaction(async (tx) => {
      const result = await tx.interest.update({
        where: { id: interest.id },
        data: { 
          status: "ACCEPTED",
          // Also unlock contact for the recipient after acceptance
          contactUnlocked: true 
        },
        include: {
          fromUser: {
            select: {
              id: true,
            },
          },
          toUser: {
            select: {
              id: true,
            },
          },
        },
      });

      // Update transaction reference if wallet deduction was successful
      if (walletResult && walletResult.transaction) {
        await tx.walletTransaction.update({
          where: { id: walletResult.transaction.id },
          data: { referenceId: result.id },
        });
      }

      return result;
    });

    // Create notification for sender
    try {
      await prisma.notification.create({
        data: {
          userId: interest.fromUserId,
          type: "interest",
          title: "Interest Accepted",
          message: `Your interest has been accepted.`,
          relatedUserId: userId,
        },
      });
    } catch (notifError) {
      console.error("Notification creation error:", notifError);
    }

    // Prepare response data
    const responseData = {
      interest: updatedInterest,
      chatEnabled: true,  // User B can now chat after accepting
      paymentMethod: paymentMethod
    };

    // Add wallet information if payment was made
    if (paymentMethod === "pay_per_interest" && walletResult) {
      const updatedWallet = await prisma.wallet.findUnique({
        where: { userId },
        select: { balance: true },
      });
      
      responseData.wallet = {
        balance: updatedWallet.balance,
        deducted: INTEREST_FEE,
        paymentMethod: "pay_per_interest"
      };
    }
    // Add subscription information if subscription was used
    else if (paymentMethod === "subscription" && subscriptionInfo) {
      responseData.subscription = subscriptionInfo;
    }

    res.json({
      status: "success",
      message: "Interest accepted successfully. Chat unlocked.",
      data: responseData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject Interest
 * PATCH /api/interests/:interestId/reject
 */
const rejectInterest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { interestId } = req.params;

    // Find interest
    const interest = await prisma.interest.findUnique({
      where: { id: interestId },
    });

    if (!interest) {
      return res.status(404).json({
        status: "error",
        message: "Interest not found.",
        error: "Interest does not exist.",
      });
    }

    // Check if user is the recipient
    if (interest.toUserId !== userId) {
      return res.status(403).json({
        status: "error",
        message: "You can only reject interests sent to you.",
        error: "Unauthorized action.",
      });
    }

    // Check if already accepted/rejected
    if (interest.status !== "PENDING") {
      return res.status(400).json({
        status: "error",
        message: `Interest has already been ${interest.status.toLowerCase()}.`,
        error: "Invalid status change.",
      });
    }

    // Update interest status
    const updatedInterest = await prisma.interest.update({
      where: { id: interest.id },
      data: { status: "REJECTED" },
      include: {
        fromUser: {
          select: {
            id: true,
          },
        },
        toUser: {
          select: {
            id: true,
          },
        },
      },
    });

    res.json({
      status: "success",
      message: "Interest rejected successfully. Chat remains locked.",
      data: { 
        interest: updatedInterest,
        chatLocked: true  // Chat remains locked for User B after rejection
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get My Interests (Sent and Received)
 * GET /api/interests
 */
const getMyInterests = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type = "all", page = 1, limit = 20 } = req.query; // type: 'sent', 'received', 'all'

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let where = {};
    if (type === "sent") {
      where = { fromUserId: userId };
    } else if (type === "received") {
      where = { toUserId: userId };
    } else {
      where = {
        OR: [{ fromUserId: userId }, { toUserId: userId }],
      };
    }

    // Get total count
    const totalCount = await prisma.interest.count({ where });

    // Get interests
    const interests = await prisma.interest.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      include: {
        fromUser: {
          select: {
            id: true,
            photos: {
              where: { isPrimary: true },
              select: { url: true },
              take: 1,
            },
            profile: {
              select: {
                firstName: true,
                lastName: true,
                age: true,
                gender: true,
              },
            },
          },
        },
        toUser: {
          select: {
            id: true,
            photos: {
              where: { isPrimary: true },
              select: { url: true },
              take: 1,
            },
            profile: {
              select: {
                firstName: true,
                lastName: true,
                age: true,
                gender: true,
              },
            },
          },
        },
      },
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      status: "success",
      message: "Interests retrieved successfully.",
      data: {
        interests,
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

module.exports = {
  sendInterest,
  acceptInterest,
  rejectInterest,
  getMyInterests,
};
