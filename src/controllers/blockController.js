const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Block User
 * POST /api/users/me/blocks
 */
const blockUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { blockedUserId } = req.body;

    // Validation
    if (!blockedUserId) {
      return res.status(400).json({
        status: "error",
        message: "Target user ID is required.",
        error: "blockedUserId field is mandatory.",
      });
    }

    // Cannot block self
    if (blockedUserId === userId) {
      return res.status(400).json({
        status: "error",
        message: "Cannot block yourself.",
        error: "Invalid target user.",
      });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: blockedUserId },
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
    const existingBlock = await prisma.blockList.findFirst({
      where: {
        userId,
        blockedUserId: blockedUserId,
      },
    });

    if (existingBlock) {
      return res.status(409).json({
        status: "error",
        message: "User is already blocked.",
        error: "Duplicate block.",
      });
    }

    // Create block
    const block = await prisma.blockList.create({
      data: {
        userId,
        blockedUserId: blockedUserId,
      },
      include: {
        blockedUser: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    res.status(201).json({
      status: "success",
      message: "User blocked successfully.",
      data: { block },
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        status: "error",
        message: "User is already blocked.",
        error: "Duplicate block.",
      });
    }
    next(error);
  }
};

/**
 * Unblock User
 * DELETE /api/users/me/blocks/:blockedUserId
 */
const unblockUser = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { blockedUserId } = req.params;

    // Find block
    const block = await prisma.blockList.findFirst({
      where: {
        userId,
        blockedUserId: blockedUserId,
      },
    });

    if (!block) {
      return res.status(404).json({
        status: "error",
        message: "User is not blocked.",
        error: "Block does not exist.",
      });
    }

    // Delete block
    await prisma.blockList.delete({
      where: { id: block.id },
    });

    res.json({
      status: "success",
      message: "User unblocked successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Blocked Users List
 * GET /api/users/me/blocks
 */
const getBlockedUsers = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const totalCount = await prisma.blockList.count({
      where: { userId },
    });

    // Get blocked users
    const blocks = await prisma.blockList.findMany({
      where: { userId },
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      include: {
        blockedUser: {
          select: {
            id: true,
            email: true,
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
      message: "Blocked users retrieved successfully.",
      data: {
        blocks,
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
  blockUser,
  unblockUser,
  getBlockedUsers,
};

