const Razorpay = require("razorpay");
const crypto = require("crypto");
const { PrismaClient } = require("@prisma/client");
const { getPlanDetails } = require("../services/subscriptionService");

const prisma = new PrismaClient();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

/**
 * Get Available Subscription Plans
 * GET /api/subscriptions/plans
 */
const getPlans = async (req, res, next) => {
  try {
    const plans = {
      BASIC: {
        name: "BASIC",
        price: 99,
        duration: 30,
        features: {
          interests: 30,
          shortlist: 10,
          chat: false,
          profileBoost: false,
          verifiedBadge: false,
        },
      },
      MEDIUM: {
        name: "MEDIUM",
        price: 299,
        duration: 90,
        features: {
          interests: 150,
          shortlist: 30,
          chat: true,
          chatLimit: 20,
          profileBoost: false,
          verifiedBadge: false,
        },
      },
      HIGH: {
        name: "HIGH",
        price: 999,
        duration: 120,
        features: {
          interests: "Unlimited",
          shortlist: "Unlimited",
          chat: true,
          chatLimit: "Unlimited",
          profileBoost: true,
          verifiedBadge: true,
        },
      },
    };

    res.json({
      status: "success",
      message: "Subscription plans retrieved successfully.",
      data: { plans },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get My Subscription Status
 * GET /api/subscriptions/my-subscription
 */
const getMySubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get active subscription
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId,
        isActive: true,
        endDate: {
          gte: new Date(), // Not expired
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    if (!subscription) {
      return res.json({
        status: "success",
        message: "No active subscription found.",
        data: {
          hasActiveSubscription: false,
          subscription: null,
        },
      });
    }

    const planDetails = getPlanDetails(subscription.planType);

    res.json({
      status: "success",
      message: "Subscription retrieved successfully.",
      data: {
        hasActiveSubscription: true,
        subscription: {
          id: subscription.id,
          planType: subscription.planType,
          planDetails: planDetails,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
          isActive: subscription.isActive,
          daysRemaining: Math.ceil(
            (new Date(subscription.endDate) - new Date()) / (1000 * 60 * 60 * 24)
          ),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create Subscription Order
 * POST /api/subscriptions/purchase
 */
const purchaseSubscription = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { planType } = req.body;

    // Validate plan type
    const validPlans = ["BASIC", "MEDIUM", "HIGH"];
    if (!planType || !validPlans.includes(planType)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid plan type. Must be BASIC, MEDIUM, or HIGH.",
        error: "Invalid plan type.",
      });
    }

    // Get plan details
    const planDetails = getPlanDetails(planType);
    if (!planDetails) {
      return res.status(400).json({
        status: "error",
        message: "Plan not found.",
        error: "Invalid plan type.",
      });
    }

    // Check if user already has an active subscription
    const existingSubscription = await prisma.subscription.findFirst({
      where: {
        userId,
        isActive: true,
        endDate: {
          gte: new Date(),
        },
      },
    });

    if (existingSubscription) {
      return res.status(400).json({
        status: "error",
        message: "You already have an active subscription. Please wait for it to expire or upgrade.",
        error: "Active subscription exists.",
        data: {
          currentSubscription: {
            planType: existingSubscription.planType,
            endDate: existingSubscription.endDate,
          },
        },
      });
    }

    // Calculate end date
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + planDetails.duration);

    // Convert amount to paise (Razorpay uses paise)
    const amountInPaise = Math.round(planDetails.price * 100);

    // Create Razorpay order
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `subscription_${userId}_${Date.now()}`,
      notes: {
        userId: userId,
        planType: planType,
        type: "SUBSCRIPTION",
      },
    };

    const razorpayOrder = await razorpay.orders.create(options);

    // Create pending subscription record
    const subscription = await prisma.subscription.create({
      data: {
        userId,
        planType,
        startDate,
        endDate,
        isActive: false, // Will be activated after payment verification
        amount: planDetails.price,
        paymentId: razorpayOrder.id, // Store order ID temporarily
      },
    });

    res.status(201).json({
      status: "success",
      message: "Subscription order created successfully.",
      data: {
        order: {
          id: razorpayOrder.id,
          amount: razorpayOrder.amount / 100, // Convert back to rupees
          currency: razorpayOrder.currency,
          receipt: razorpayOrder.receipt,
        },
        subscription: {
          id: subscription.id,
          planType: subscription.planType,
          planDetails: planDetails,
          startDate: subscription.startDate,
          endDate: subscription.endDate,
        },
        key: process.env.RAZORPAY_KEY_ID, // Frontend needs this for Razorpay checkout
      },
    });
  } catch (error) {
    console.error("Subscription Purchase Error:", error);
    next(error);
  }
};

/**
 * Verify Subscription Payment
 * POST /api/subscriptions/verify
 */
const verifySubscriptionPayment = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      subscriptionId,
    } = req.body;

    // Validation
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !subscriptionId) {
      return res.status(400).json({
        status: "error",
        message: "Missing required payment verification fields.",
        error: "Invalid request.",
      });
    }

    // Find subscription
    const subscription = await prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });

    if (!subscription) {
      return res.status(404).json({
        status: "error",
        message: "Subscription not found.",
        error: "Invalid subscription ID.",
      });
    }

    // Verify ownership
    if (subscription.userId !== userId) {
      return res.status(403).json({
        status: "error",
        message: "Unauthorized. This subscription does not belong to you.",
        error: "Unauthorized.",
      });
    }

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(text)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        status: "error",
        message: "Payment verification failed. Invalid signature.",
        error: "Invalid signature.",
      });
    }

    // Deactivate any existing active subscriptions
    await prisma.subscription.updateMany({
      where: {
        userId,
        isActive: true,
      },
      data: {
        isActive: false,
      },
    });

    // Activate the new subscription
    const updatedSubscription = await prisma.subscription.update({
      where: { id: subscriptionId },
      data: {
        isActive: true,
        paymentId: razorpay_payment_id, // Store payment ID
      },
    });

    const planDetails = getPlanDetails(updatedSubscription.planType);

    res.json({
      status: "success",
      message: "Subscription activated successfully.",
      data: {
        subscription: {
          id: updatedSubscription.id,
          planType: updatedSubscription.planType,
          planDetails: planDetails,
          startDate: updatedSubscription.startDate,
          endDate: updatedSubscription.endDate,
          isActive: updatedSubscription.isActive,
          daysRemaining: Math.ceil(
            (new Date(updatedSubscription.endDate) - new Date()) /
              (1000 * 60 * 60 * 24)
          ),
        },
      },
    });
  } catch (error) {
    console.error("Subscription Verification Error:", error);
    next(error);
  }
};

/**
 * Get Subscription History
 * GET /api/subscriptions/history
 */
const getSubscriptionHistory = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const totalCount = await prisma.subscription.count({
      where: { userId },
    });

    // Get subscriptions
    const subscriptions = await prisma.subscription.findMany({
      where: { userId },
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
    });

    const subscriptionsWithDetails = subscriptions.map((sub) => {
      const planDetails = getPlanDetails(sub.planType);
      return {
        id: sub.id,
        planType: sub.planType,
        planDetails: planDetails,
        startDate: sub.startDate,
        endDate: sub.endDate,
        isActive: sub.isActive,
        amount: sub.amount,
        paymentId: sub.paymentId,
        createdAt: sub.createdAt,
        daysRemaining:
          new Date(sub.endDate) > new Date()
            ? Math.ceil((new Date(sub.endDate) - new Date()) / (1000 * 60 * 60 * 24))
            : 0,
      };
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      status: "success",
      message: "Subscription history retrieved successfully.",
      data: {
        subscriptions: subscriptionsWithDetails,
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
  getPlans,
  getMySubscription,
  purchaseSubscription,
  verifySubscriptionPayment,
  getSubscriptionHistory,
};



