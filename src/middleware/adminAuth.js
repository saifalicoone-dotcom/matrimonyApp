/**
 * Admin Authentication Middleware
 * Checks if user has ADMIN role
 */
const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user with role
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "User not found.",
        error: "Unauthorized.",
      });
    }

    // Check if user is admin
    if (user.role !== "ADMIN") {
      return res.status(403).json({
        status: "error",
        message: "Access denied. Admin privileges required.",
        error: "FORBIDDEN",
      });
    }

    // Add admin info to request
    req.admin = {
      id: user.id,
      role: user.role,
    };

    next();
  } catch (error) {
    next(error);
  }
};

module.exports = { requireAdmin };

