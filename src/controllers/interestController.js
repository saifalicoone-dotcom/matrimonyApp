const { PrismaClient } = require("@prisma/client");

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

    const targetUserId = parseInt(toUserId);

    // Cannot send interest to self
    if (targetUserId === userId) {
      return res.status(400).json({
        status: "error",
        message: "Cannot send interest to yourself.",
        error: "Invalid target user.",
      });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
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
          { userId, blockedUserId: targetUserId },
          { userId: targetUserId, blockedUserId: userId },
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
        toUserId: targetUserId,
      },
    });

    if (existingInterest) {
      return res.status(409).json({
        status: "error",
        message: "Interest already sent to this user.",
        error: "Duplicate interest.",
      });
    }

    // Create interest
    const interest = await prisma.interest.create({
      data: {
        fromUserId: userId,
        toUserId: targetUserId,
        status: "PENDING",
      },
      include: {
        fromUser: {
          select: {
            id: true,
            email: true,
          },
        },
        toUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    // Create notification for target user
    try {
      await prisma.notification.create({
        data: {
          userId: targetUserId,
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

    res.status(201).json({
      status: "success",
      message: "Interest sent successfully.",
      data: { interest },
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
      where: { id: parseInt(interestId) },
      include: {
        fromUser: {
          select: {
            id: true,
            email: true,
          },
        },
        toUser: {
          select: {
            id: true,
            email: true,
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

    // Update interest status
    const updatedInterest = await prisma.interest.update({
      where: { id: interest.id },
      data: { status: "ACCEPTED" },
      include: {
        fromUser: {
          select: {
            id: true,
            email: true,
          },
        },
        toUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
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

    res.json({
      status: "success",
      message: "Interest accepted successfully. You can now chat.",
      data: { interest: updatedInterest },
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
      where: { id: parseInt(interestId) },
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
            email: true,
          },
        },
        toUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    res.json({
      status: "success",
      message: "Interest rejected successfully.",
      data: { interest: updatedInterest },
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
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                age: true,
                gender: true,
                photos: {
                  where: { isPrimary: true },
                  select: { url: true },
                  take: 1,
                },
              },
            },
          },
        },
        toUser: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                age: true,
                gender: true,
                photos: {
                  where: { isPrimary: true },
                  select: { url: true },
                  take: 1,
                },
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

