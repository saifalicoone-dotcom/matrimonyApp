const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Send Message
 * POST /api/messages
 */
const sendMessage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { toUserId, content } = req.body;

    // Validation
    if (!toUserId || !content) {
      return res.status(400).json({
        status: "error",
        message: "Target user ID and message content are required.",
        error: "toUserId and content fields are mandatory.",
      });
    }

    // Cannot send message to self
    if (toUserId === userId) {
      return res.status(400).json({
        status: "error",
        message: "Cannot send message to yourself.",
        error: "Invalid target user.",
      });
    }

    // Check if target user exists
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

    // Check if blocked
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
        message: "Cannot send message. User is blocked.",
        error: "Blocked user.",
      });
    }

    // Check chat access based on interest rules
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // Check if user A (sender) sent interest to user B (recipient) and it's pending/accepted
    const outgoingInterest = await prisma.interest.findFirst({
      where: {
        fromUserId: userId,
        toUserId: toUserId,
      },
    });

    // Check if user B (recipient) sent interest to user A (sender) and accepted it
    const incomingInterest = await prisma.interest.findFirst({
      where: {
        fromUserId: toUserId,
        toUserId: userId,
        status: "ACCEPTED",
      },
    });

    // Chat access rules:
    // 1. User A can chat with User B if User A sent interest (regardless of acceptance status)
    // 2. User B can chat with User A only if User B accepted User A's interest
    const canSendMessage = outgoingInterest || user.role !== "USER" || incomingInterest;

    if (!canSendMessage) {
      return res.status(403).json({
        status: "error",
        message:
          "You need to send interest first to enable chat access. Upgrade to Premium for unlimited messaging.",
        error: "Chat access required for free users.",
      });
    }

    // Create message
    const message = await prisma.message.create({
      data: {
        fromUserId: userId,
        toUserId: toUserId,
        content: content.trim(),
        isRead: false,
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

    // Create notification for recipient
    try {
      await prisma.notification.create({
        data: {
          userId: toUserId,
          type: "message",
          title: "New Message",
          message: `You have received a new message.`,
          relatedUserId: userId,
        },
      });
    } catch (notifError) {
      console.error("Notification creation error:", notifError);
    }

    res.status(201).json({
      status: "success",
      message: "Message sent successfully.",
      data: { message },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Conversations (List of users you've messaged or received messages from)
 * GET /api/messages/conversations
 */
const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get distinct user IDs from messages (sent or received)
    const sentMessages = await prisma.message.findMany({
      where: { fromUserId: userId },
      select: { toUserId: true },
      distinct: ["toUserId"],
    });

    const receivedMessages = await prisma.message.findMany({
      where: { toUserId: userId },
      select: { fromUserId: true },
      distinct: ["fromUserId"],
    });

    // Combine and get unique user IDs
    const conversationUserIds = [
      ...new Set([
        ...sentMessages.map((m) => m.toUserId),
        ...receivedMessages.map((m) => m.fromUserId),
      ]),
    ];

    const totalCount = conversationUserIds.length;
    const paginatedUserIds = conversationUserIds.slice(skip, skip + limitNum);

    // Get latest message for each conversation
    const conversations = await Promise.all(
      paginatedUserIds.map(async (otherUserId) => {
        // Check chat access for each conversation
        const outgoingInterest = await prisma.interest.findFirst({
          where: {
            fromUserId: userId,
            toUserId: otherUserId,
          },
        });

        const incomingInterest = await prisma.interest.findFirst({
          where: {
            fromUserId: otherUserId,
            toUserId: userId,
            status: "ACCEPTED",
          },
        });

        const user = await prisma.user.findUnique({
          where: { id: userId },
          select: { role: true },
        });

        const canAccessConversation = outgoingInterest || user.role !== "USER" || incomingInterest;

        const latestMessage = await prisma.message.findFirst({
          where: {
            OR: [
              { fromUserId: userId, toUserId: otherUserId },
              { fromUserId: otherUserId, toUserId: userId },
            ],
          },
          orderBy: { createdAt: "desc" },
        });

        const unreadCount = await prisma.message.count({
          where: {
            fromUserId: otherUserId,
            toUserId: userId,
            isRead: false,
          },
        });

        const otherUser = await prisma.user.findUnique({
          where: { id: otherUserId },
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
        });

        return {
          user: otherUser,
          latestMessage,
          unreadCount,
          canAccessChat: canAccessConversation,  // Include chat access status
        };
      })
    );

    // Sort by latest message timestamp
    conversations.sort((a, b) => {
      if (!a.latestMessage) return 1;
      if (!b.latestMessage) return -1;
      return (
        new Date(b.latestMessage.createdAt) -
        new Date(a.latestMessage.createdAt)
      );
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      status: "success",
      message: "Conversations retrieved successfully.",
      data: {
        conversations,
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
 * Get Messages with a Specific User
 * GET /api/messages/:userId
 */
const getMessages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { userId: otherUserId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    // Check if blocked
    const isBlocked = await prisma.blockList.findFirst({
      where: {
        OR: [
          { userId, blockedUserId: otherUserId },
          { userId: otherUserId, blockedUserId: userId },
        ],
      },
    });

    if (isBlocked) {
      return res.status(403).json({
        status: "error",
        message: "Cannot view messages. User is blocked.",
        error: "Blocked user.",
      });
    }

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const totalCount = await prisma.message.count({
      where: {
        OR: [
          { fromUserId: userId, toUserId: otherUserId },
          { fromUserId: otherUserId, toUserId: userId },
        ],
      },
    });

    // Check chat access based on interest rules before fetching messages
    // Check if user A (sender) sent interest to user B (recipient) and it's pending/accepted
    const outgoingInterest = await prisma.interest.findFirst({
      where: {
        fromUserId: userId,
        toUserId: otherUserId,
      },
    });

    // Check if user B (recipient) sent interest to user A (sender) and accepted it
    const incomingInterest = await prisma.interest.findFirst({
      where: {
        fromUserId: otherUserId,
        toUserId: userId,
        status: "ACCEPTED",
      },
    });

    // Get user role to check if premium
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    // Chat access rules:
    // 1. User A can view chat with User B if User A sent interest (regardless of acceptance status)
    // 2. User B can view chat with User A only if User B accepted User A's interest
    const canViewMessages = outgoingInterest || user.role !== "USER" || incomingInterest;

    if (!canViewMessages) {
      return res.status(403).json({
        status: "error",
        message: "You need to send interest first to access chat history. Upgrade to Premium for unlimited messaging.",
        error: "Chat access required for free users.",
      });
    }

    // Get messages
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { fromUserId: userId, toUserId: otherUserId },
          { fromUserId: otherUserId, toUserId: userId },
        ],
      },
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
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

    // Mark messages as read (messages sent to current user)
    await prisma.message.updateMany({
      where: {
        fromUserId: otherUserId,
        toUserId: userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    // Reverse to show oldest first
    messages.reverse();

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      status: "success",
      message: "Messages retrieved successfully.",
      data: {
        messages,
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
  sendMessage,
  getConversations,
  getMessages,
};
