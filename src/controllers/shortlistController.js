const { PrismaClient } = require("@prisma/client");
const { canAddToShortlist } = require("../services/subscriptionService");

const prisma = new PrismaClient();

/**
 * Add Profile to Shortlist
 * POST /api/shortlist
 */
const addToShortlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { shortlistedUserId } = req.body;

    // Validation
    if (!shortlistedUserId) {
      return res.status(400).json({
        status: "error",
        message: "User ID is required.",
        error: "shortlistedUserId field is mandatory.",
      });
    }

    // Cannot shortlist self
    if (shortlistedUserId === userId) {
      return res.status(400).json({
        status: "error",
        message: "Cannot shortlist yourself.",
        error: "Invalid target user.",
      });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: shortlistedUserId },
      select: { id: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      return res.status(404).json({
        status: "error",
        message: "User not found or inactive.",
        error: "User does not exist.",
      });
    }

    // Check if already shortlisted
    const existingShortlist = await prisma.shortlist.findFirst({
      where: {
        userId,
        shortlistedUserId,
      },
    });

    if (existingShortlist) {
      return res.status(409).json({
        status: "error",
        message: "Profile is already in your shortlist.",
        error: "Duplicate shortlist entry.",
      });
    }

    // Check if blocked
    const isBlocked = await prisma.blockList.findFirst({
      where: {
        OR: [
          { userId: shortlistedUserId, blockedUserId: userId },
          { userId, blockedUserId: shortlistedUserId },
        ],
      },
    });

    if (isBlocked) {
      return res.status(403).json({
        status: "error",
        message: "Cannot shortlist. User is blocked.",
        error: "Blocked user.",
      });
    }

    // Check subscription limit for shortlist
    const shortlistCheck = await canAddToShortlist(userId);
    if (!shortlistCheck.canAdd) {
      return res.status(403).json({
        status: "error",
        message: shortlistCheck.reason,
        error: "SHORTLIST_LIMIT_REACHED",
        data: {
          planType: shortlistCheck.planType,
          limit: shortlistCheck.limit,
          used: shortlistCheck.used,
        },
      });
    }

    // Create shortlist entry
    const shortlist = await prisma.shortlist.create({
      data: {
        userId,
        shortlistedUserId,
      },
      include: {
        shortlistedUser: {
          select: {
            id: true,
            email: true,
            photos: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
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

    res.status(201).json({
      status: "success",
      message: "Profile added to shortlist successfully.",
      data: { shortlist },
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        status: "error",
        message: "Profile is already in your shortlist.",
        error: "Duplicate shortlist entry.",
      });
    }
    next(error);
  }
};

/**
 * Remove Profile from Shortlist
 * DELETE /api/shortlist/:shortlistedUserId
 */
const removeFromShortlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { shortlistedUserId } = req.params;

    // Find shortlist entry
    const shortlist = await prisma.shortlist.findFirst({
      where: {
        userId,
        shortlistedUserId,
      },
    });

    if (!shortlist) {
      return res.status(404).json({
        status: "error",
        message: "Profile is not in your shortlist.",
        error: "Shortlist entry does not exist.",
      });
    }

    // Delete shortlist entry
    await prisma.shortlist.delete({
      where: { id: shortlist.id },
    });

    res.json({
      status: "success",
      message: "Profile removed from shortlist successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get My Shortlisted Profiles
 * GET /api/shortlist
 */
const getMyShortlist = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const totalCount = await prisma.shortlist.count({
      where: { userId },
    });

    // Get shortlisted profiles
    const shortlists = await prisma.shortlist.findMany({
      where: { userId },
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      include: {
        shortlistedUser: {
          select: {
            id: true,
            email: true,
            photos: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
            profile: {
              select: {
                firstName: true,
                lastName: true,
                age: true,
                gender: true,
                height: true,
                maritalStatus: true,
                education: true,
                occupation: true,
                city: true,
                state: true,
                country: true,
                religion: true,
                caste: true,
              },
            },
          },
        },
      },
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      status: "success",
      message: "Shortlisted profiles retrieved successfully.",
      data: {
        shortlists,
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
 * Check if Profile is Shortlisted
 * GET /api/shortlist/:shortlistedUserId/check
 */
const checkShortlistStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { shortlistedUserId } = req.params;

    // Check if shortlisted
    const shortlist = await prisma.shortlist.findFirst({
      where: {
        userId,
        shortlistedUserId,
      },
    });

    res.json({
      status: "success",
      message: "Shortlist status retrieved successfully.",
      data: {
        isShortlisted: !!shortlist,
        shortlistedAt: shortlist?.createdAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  addToShortlist,
  removeFromShortlist,
  getMyShortlist,
  checkShortlistStatus,
};


