const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Get Notifications
 * GET /api/users/me/notifications
 */
const getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, isRead } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build where clause
    const where = { userId };
    if (isRead !== undefined) {
      where.isRead = isRead === "true";
    }

    // Get total count
    const totalCount = await prisma.notification.count({ where });

    // Get notifications
    const notifications = await prisma.notification.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            email: true,
          },
        },
      },
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      status: "success",
      message: "Notifications retrieved successfully.",
      data: {
        notifications,
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
 * Get Unread Notifications Count
 * GET /api/users/me/notifications/unread-count
 */
const getUnreadCount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get unread count
    const unreadCount = await prisma.notification.count({
      where: {
        userId,
        isRead: false,
      },
    });

    res.json({
      status: "success",
      message: "Unread count retrieved successfully.",
      data: { unreadCount },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark Notification as Read
 * PATCH /api/users/me/notifications/:notificationId/read
 */
const markAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    // Find notification
    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(notificationId) },
    });

    if (!notification) {
      return res.status(404).json({
        status: "error",
        message: "Notification not found.",
        error: "Notification does not exist.",
      });
    }

    // Check if notification belongs to user
    if (notification.userId !== userId) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. This notification does not belong to you.",
        error: "Unauthorized action.",
      });
    }

    // Update notification
    const updatedNotification = await prisma.notification.update({
      where: { id: notification.id },
      data: { isRead: true },
    });

    res.json({
      status: "success",
      message: "Notification marked as read.",
      data: { notification: updatedNotification },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark All Notifications as Read
 * PATCH /api/users/me/notifications/mark-all-read
 */
const markAllAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Update all unread notifications
    const result = await prisma.notification.updateMany({
      where: {
        userId,
        isRead: false,
      },
      data: { isRead: true },
    });

    res.json({
      status: "success",
      message: `Marked ${result.count} notifications as read.`,
      data: { count: result.count },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Notification
 * DELETE /api/users/me/notifications/:notificationId
 */
const deleteNotification = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { notificationId } = req.params;

    // Find notification
    const notification = await prisma.notification.findUnique({
      where: { id: parseInt(notificationId) },
    });

    if (!notification) {
      return res.status(404).json({
        status: "error",
        message: "Notification not found.",
        error: "Notification does not exist.",
      });
    }

    // Check if notification belongs to user
    if (notification.userId !== userId) {
      return res.status(403).json({
        status: "error",
        message: "Access denied. This notification does not belong to you.",
        error: "Unauthorized action.",
      });
    }

    // Delete notification
    await prisma.notification.delete({
      where: { id: notification.id },
    });

    res.json({
      status: "success",
      message: "Notification deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
};

