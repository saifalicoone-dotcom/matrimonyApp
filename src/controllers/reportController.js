const { PrismaClient } = require("@prisma/client");
const { deductMoney } = require("./walletController");

const prisma = new PrismaClient();

// Interest fee (for refund calculation)
const INTEREST_FEE = 5;

/**
 * Create Report
 * POST /api/reports
 */
const createReport = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { reportedUserId, type, reason } = req.body;

    // Validation
    if (!reportedUserId || !type) {
      return res.status(400).json({
        status: "error",
        message: "Reported user ID and report type are required.",
        error: "Missing required fields.",
      });
    }

    // Cannot report self
    if (reportedUserId === userId) {
      return res.status(400).json({
        status: "error",
        message: "Cannot report yourself.",
        error: "Invalid request.",
      });
    }

    // Check if reported user exists
    const reportedUser = await prisma.user.findUnique({
      where: { id: reportedUserId },
      select: { id: true, isActive: true },
    });

    if (!reportedUser) {
      return res.status(404).json({
        status: "error",
        message: "Reported user not found.",
        error: "User does not exist.",
      });
    }

    // Check if report already exists for this type
    const existingReport = await prisma.report.findUnique({
      where: {
        reporterId_reportedUserId_type: {
          reporterId: userId,
          reportedUserId: reportedUserId,
          type: type,
        },
      },
    });

    if (existingReport) {
      return res.status(409).json({
        status: "error",
        message: "You have already reported this user for this reason.",
        error: "Duplicate report.",
      });
    }

    // Create report
    const report = await prisma.report.create({
      data: {
        reporterId: userId,
        reportedUserId: reportedUserId,
        type: type,
        reason: reason || null,
        status: "PENDING",
      },
      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        reportedUser: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    res.status(201).json({
      status: "success",
      message: "Report submitted successfully. Admin will review it.",
      data: { report },
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        status: "error",
        message: "Report already exists.",
        error: "Duplicate report.",
      });
    }
    next(error);
  }
};

/**
 * Get My Reports (Submitted by me)
 * GET /api/reports/my-reports
 */
const getMyReports = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { status, page = 1, limit = 20 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let where = { reporterId: userId };
    if (status) {
      where.status = status;
    }

    // Get total count
    const totalCount = await prisma.report.count({ where });

    // Get reports
    const reports = await prisma.report.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      include: {
        reportedUser: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                age: true,
              },
            },
          },
        },
      },
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      status: "success",
      message: "Reports retrieved successfully.",
      data: {
        reports,
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
 * Get All Reports (Admin Only)
 * GET /api/reports/admin
 */
const getAllReports = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 50 } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let where = {};
    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }

    // Get total count
    const totalCount = await prisma.report.count({ where });

    // Get reports
    const reports = await prisma.report.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        reportedUser: {
          select: {
            id: true,
            email: true,
            isActive: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                age: true,
              },
            },
          },
        },
      },
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      status: "success",
      message: "Reports retrieved successfully.",
      data: {
        reports,
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
 * Get Report by ID (Admin Only)
 * GET /api/reports/:reportId
 */
const getReportById = async (req, res, next) => {
  try {
    const { reportId } = req.params;

    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reporter: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                age: true,
              },
            },
          },
        },
        reportedUser: {
          select: {
            id: true,
            email: true,
            isActive: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
                age: true,
                maritalStatus: true,
              },
            },
          },
        },
      },
    });

    if (!report) {
      return res.status(404).json({
        status: "error",
        message: "Report not found.",
        error: "Report does not exist.",
      });
    }

    res.json({
      status: "success",
      message: "Report retrieved successfully.",
      data: { report },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Report Status and Take Action (Admin Only)
 * PATCH /api/reports/:reportId/review
 */
const reviewReport = async (req, res, next) => {
  try {
    const adminId = req.user.id;
    const { reportId } = req.params;
    const { status, adminNotes, adminAction } = req.body;

    // Validation
    if (!status) {
      return res.status(400).json({
        status: "error",
        message: "Status is required.",
        error: "Missing required field.",
      });
    }

    // Get report
    const report = await prisma.report.findUnique({
      where: { id: reportId },
      include: {
        reportedUser: {
          select: {
            id: true,
            isActive: true,
          },
        },
      },
    });

    if (!report) {
      return res.status(404).json({
        status: "error",
        message: "Report not found.",
        error: "Report does not exist.",
      });
    }

    // Use transaction for atomic operations
    const result = await prisma.$transaction(async (tx) => {
      let refundProcessed = false;
      let refundAmount = null;

      // Handle refund for ALREADY_MARRIED reports
      if (
        report.type === "ALREADY_MARRIED" &&
        adminAction === "REFUND" &&
        status === "APPROVED"
      ) {
        // Find all interests sent to reported user in last 24 hours
        const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);

        const recentInterests = await tx.interest.findMany({
          where: {
            toUserId: report.reportedUserId,
            contactUnlocked: true,
            createdAt: {
              gte: twentyFourHoursAgo,
            },
          },
          include: {
            fromUser: {
              select: {
                id: true,
                wallet: {
                  select: {
                    id: true,
                    balance: true,
                  },
                },
              },
            },
          },
        });

        // Refund ₹5 to each user who sent interest
        for (const interest of recentInterests) {
          if (interest.fromUser.wallet) {
            try {
              const newBalance = interest.fromUser.wallet.balance + INTEREST_FEE;

              // Update wallet
              await tx.wallet.update({
                where: { id: interest.fromUser.wallet.id },
                data: { balance: newBalance },
              });

              // Create refund transaction
              await tx.walletTransaction.create({
                data: {
                  walletId: interest.fromUser.wallet.id,
                  type: "CREDIT",
                  amount: INTEREST_FEE,
                  balanceAfter: newBalance,
                  description: `Refund of ₹${INTEREST_FEE} - Reported user already married`,
                  referenceId: interest.id,
                  referenceType: "REFUND",
                  paymentStatus: "SUCCESS",
                },
              });

              refundProcessed = true;
              refundAmount = (refundAmount || 0) + INTEREST_FEE;
            } catch (refundError) {
              console.error("Refund error for user:", interest.fromUser.id, refundError);
              // Continue with other refunds even if one fails
            }
          }
        }
      }

      // Handle profile deactivation/removal
      if (
        (report.type === "FAKE_PROFILE" || report.type === "SPAM") &&
        (adminAction === "DEACTIVATE" || adminAction === "REMOVE") &&
        status === "APPROVED"
      ) {
        if (adminAction === "DEACTIVATE") {
          await tx.user.update({
            where: { id: report.reportedUserId },
            data: { isActive: false },
          });
        } else if (adminAction === "REMOVE") {
          // Soft delete - deactivate and hide profile
          await tx.user.update({
            where: { id: report.reportedUserId },
            data: { isActive: false },
          });

          await tx.profile.updateMany({
            where: { userId: report.reportedUserId },
            data: { profileVisible: false },
          });
        }
      }

      // Update report
      const updatedReport = await tx.report.update({
        where: { id: reportId },
        data: {
          status: status,
          adminNotes: adminNotes || null,
          adminAction: adminAction || null,
          refundAmount: refundAmount,
          refundedAt: refundProcessed ? new Date() : null,
          reviewedBy: adminId,
          reviewedAt: new Date(),
          resolvedAt: status === "RESOLVED" || status === "APPROVED" ? new Date() : null,
        },
        include: {
          reporter: {
            select: {
              id: true,
              email: true,
            },
          },
          reportedUser: {
            select: {
              id: true,
              email: true,
              isActive: true,
            },
          },
        },
      });

      return {
        report: updatedReport,
        refundProcessed,
        refundAmount,
      };
    });

    res.json({
      status: "success",
      message: "Report reviewed and action taken successfully.",
      data: {
        report: result.report,
        refundProcessed: result.refundProcessed,
        refundAmount: result.refundAmount,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReport,
  getMyReports,
  getAllReports,
  getReportById,
  reviewReport,
};



