const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

// Subscription Plans Configuration
const SUBSCRIPTION_PLANS = {
  BASIC: {
    name: "BASIC",
    price: 99,
    duration: 30, // days
    interests: 30,
    shortlist: 10,
    chat: false, // NOT allowed
    chatLimit: 0,
    profileBoost: false,
    verifiedBadge: false,
  },
  MEDIUM: {
    name: "MEDIUM",
    price: 299,
    duration: 90, // days
    interests: 150,
    shortlist: 30, // Fixed: 30 (not 50)
    chat: true, // Allowed
    chatLimit: 20, // 20 unique users
    profileBoost: false,
    verifiedBadge: false,
  },
  HIGH: {
    name: "HIGH",
    price: 999,
    duration: 120, // days
    interests: -1, // Unlimited
    shortlist: -1, // Unlimited
    chat: true, // Allowed
    chatLimit: -1, // Unlimited
    profileBoost: true,
    verifiedBadge: true,
  },
};

/**
 * Get active subscription for user
 */
const getActiveSubscription = async (userId) => {
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

  return subscription;
};

/**
 * Get subscription plan details
 */
const getPlanDetails = (planType) => {
  return SUBSCRIPTION_PLANS[planType] || null;
};

/**
 * Check if user can chat
 */
const canUserChat = async (userId) => {
  const subscription = await getActiveSubscription(userId);

  if (!subscription) {
    return {
      canChat: false,
      reason: "No active subscription",
      planType: null,
    };
  }

  const planDetails = getPlanDetails(subscription.planType);

  if (!planDetails || !planDetails.chat) {
    return {
      canChat: false,
      reason: "Your plan does not include chat feature",
      planType: subscription.planType,
    };
  }

  return {
    canChat: true,
    planType: subscription.planType,
    chatLimit: planDetails.chatLimit,
  };
};

/**
 * Check if user can chat with specific user (for MEDIUM plan limit)
 */
const canChatWithUser = async (userId, targetUserId) => {
  const chatCheck = await canUserChat(userId);

  if (!chatCheck.canChat) {
    return chatCheck;
  }

  // HIGH plan - unlimited
  if (chatCheck.chatLimit === -1) {
    return {
      canChat: true,
      planType: chatCheck.planType,
      chatLimit: -1,
    };
  }

  // MEDIUM plan - check 20 user limit
  if (chatCheck.chatLimit === 20) {
    // Check if already chatting with this user
    const existingChat = await prisma.chatUser.findUnique({
      where: {
        userId_chatUserId: {
          userId: userId,
          chatUserId: targetUserId,
        },
      },
    });

    if (existingChat) {
      return {
        canChat: true,
        planType: chatCheck.planType,
        chatLimit: 20,
      };
    }

    // Check total unique users count
    const uniqueChatUsersCount = await prisma.chatUser.count({
      where: {
        userId: userId,
      },
    });

    if (uniqueChatUsersCount >= 20) {
      return {
        canChat: false,
        reason: "You have reached the chat limit (20 users) for MEDIUM plan. Upgrade to HIGH plan for unlimited chat.",
        planType: chatCheck.planType,
        chatLimit: 20,
        currentCount: uniqueChatUsersCount,
      };
    }

    // Create chat user entry
    await prisma.chatUser.create({
      data: {
        userId: userId,
        chatUserId: targetUserId,
      },
    });

    return {
      canChat: true,
      planType: chatCheck.planType,
      chatLimit: 20,
    };
  }

  return chatCheck;
};

/**
 * Get subscription limits for user
 */
const getSubscriptionLimits = async (userId) => {
  const subscription = await getActiveSubscription(userId);

  if (!subscription) {
    return {
      hasSubscription: false,
      planType: null,
      limits: null,
    };
  }

  const planDetails = getPlanDetails(subscription.planType);

  return {
    hasSubscription: true,
    planType: subscription.planType,
    limits: planDetails,
    subscription: {
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      isActive: subscription.isActive,
    },
  };
};

/**
 * Check if user can send interest (based on subscription limit)
 */
const canSendInterest = async (userId) => {
  const subscription = await getActiveSubscription(userId);

  if (!subscription) {
    return {
      canSend: false,
      reason: "No active subscription. Please subscribe to send interests.",
      planType: null,
      limit: 0,
      used: 0,
    };
  }

  const planDetails = getPlanDetails(subscription.planType);

  // HIGH plan - unlimited
  if (planDetails.interests === -1) {
    return {
      canSend: true,
      planType: subscription.planType,
      limit: -1, // Unlimited
      used: 0,
    };
  }

  // Count interests sent during subscription period
  const interestsCount = await prisma.interest.count({
    where: {
      fromUserId: userId,
      createdAt: {
        gte: subscription.startDate,
      },
    },
  });

  if (interestsCount >= planDetails.interests) {
    return {
      canSend: false,
      reason: `You have reached your interest limit (${planDetails.interests}) for ${subscription.planType} plan. Upgrade to HIGH plan for unlimited interests.`,
      planType: subscription.planType,
      limit: planDetails.interests,
      used: interestsCount,
    };
  }

  return {
    canSend: true,
    planType: subscription.planType,
    limit: planDetails.interests,
    used: interestsCount,
    remaining: planDetails.interests - interestsCount,
  };
};

/**
 * Check if user can add to shortlist (based on subscription limit)
 */
const canAddToShortlist = async (userId) => {
  const subscription = await getActiveSubscription(userId);

  if (!subscription) {
    return {
      canAdd: false,
      reason: "No active subscription. Please subscribe to use shortlist feature.",
      planType: null,
      limit: 0,
      used: 0,
    };
  }

  const planDetails = getPlanDetails(subscription.planType);

  // HIGH plan - unlimited
  if (planDetails.shortlist === -1) {
    return {
      canAdd: true,
      planType: subscription.planType,
      limit: -1, // Unlimited
      used: 0,
    };
  }

  // Count shortlist entries
  const shortlistCount = await prisma.shortlist.count({
    where: {
      userId: userId,
    },
  });

  if (shortlistCount >= planDetails.shortlist) {
    return {
      canAdd: false,
      reason: `You have reached your shortlist limit (${planDetails.shortlist}) for ${subscription.planType} plan. Upgrade to HIGH plan for unlimited shortlist.`,
      planType: subscription.planType,
      limit: planDetails.shortlist,
      used: shortlistCount,
    };
  }

  return {
    canAdd: true,
    planType: subscription.planType,
    limit: planDetails.shortlist,
    used: shortlistCount,
    remaining: planDetails.shortlist - shortlistCount,
  };
};

/**
 * Check if user has profile boost
 */
const hasProfileBoost = async (userId) => {
  const subscription = await getActiveSubscription(userId);
  if (!subscription) return false;

  const planDetails = getPlanDetails(subscription.planType);
  return planDetails.profileBoost || false;
};

/**
 * Check if user has verified badge
 */
const hasVerifiedBadge = async (userId) => {
  const subscription = await getActiveSubscription(userId);
  if (!subscription) return false;

  const planDetails = getPlanDetails(subscription.planType);
  return planDetails.verifiedBadge || false;
};

module.exports = {
  SUBSCRIPTION_PLANS,
  getActiveSubscription,
  getPlanDetails,
  canUserChat,
  canChatWithUser,
  getSubscriptionLimits,
  canSendInterest,
  canAddToShortlist,
  hasProfileBoost,
  hasVerifiedBadge,
};

