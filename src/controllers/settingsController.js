const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { isValidEmail, isValidPhone } = require("../utils/validation");

const prisma = new PrismaClient();

/**
 * Change Password
 * PATCH /api/users/me/password
 */
const changePassword = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { currentPassword, newPassword } = req.body;

    // Validation
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        status: "error",
        message: "Current password and new password are required.",
        error: "currentPassword and newPassword fields are mandatory.",
      });
    }

    // Validate new password length
    if (newPassword.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "New password must be at least 6 characters long.",
        error: "Password validation failed.",
      });
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found.",
        error: "User does not exist.",
      });
    }

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Current password is incorrect.",
        error: "Authentication failed.",
      });
    }

    // Hash new password
    const saltRounds = 10;
    const newPasswordHash = await bcrypt.hash(newPassword, saltRounds);

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash },
    });

    res.json({
      status: "success",
      message: "Password changed successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update Email
 * PATCH /api/users/me/email
 */
const updateEmail = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { email } = req.body;

    // Validation
    if (!email) {
      return res.status(400).json({
        status: "error",
        message: "Email is required.",
        error: "email field is mandatory.",
      });
    }

    // Validate email format
    if (!isValidEmail(email)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid email format.",
        error: "Please provide a valid email address.",
      });
    }

    // Update email
    const user = await prisma.user.update({
      where: { id: userId },
      data: { email, isEmailVerified: false }, // Reset verification status
      select: {
        id: true,
        email: true,
        isEmailVerified: true,
      },
    });

    // Update profile email if exists
    await prisma.profile.updateMany({
      where: { userId },
      data: { email },
    });

    res.json({
      status: "success",
      message: "Email updated successfully. Please verify your new email.",
      data: { user },
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        status: "error",
        message: "Email already exists.",
        error: "Email must be unique.",
      });
    }
    next(error);
  }
};

/**
 * Update Phone
 * PATCH /api/users/me/phone
 */
const updatePhone = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { phone } = req.body;

    // Validation
    if (!phone) {
      return res.status(400).json({
        status: "error",
        message: "Phone number is required.",
        error: "phone field is mandatory.",
      });
    }

    // Validate phone format
    if (!isValidPhone(phone)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid phone number format.",
        error: "Please provide a valid phone number.",
      });
    }

    // Update phone
    const user = await prisma.user.update({
      where: { id: userId },
      data: { phone, isPhoneVerified: false }, // Reset verification status
      select: {
        id: true,
        phone: true,
        isPhoneVerified: true,
      },
    });

    // Update profile phone if exists
    await prisma.profile.updateMany({
      where: { userId },
      data: { phone },
    });

    res.json({
      status: "success",
      message: "Phone number updated successfully. Please verify your new phone number.",
      data: { user },
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        status: "error",
        message: "Phone number already exists.",
        error: "Phone must be unique.",
      });
    }
    next(error);
  }
};

/**
 * Update Privacy Settings
 * PATCH /api/users/me/privacy
 */
const updatePrivacySettings = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { profileVisible, withContact } = req.body;

    // Get user's profile
    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found. Please create your profile first.",
        error: "Profile does not exist.",
      });
    }

    // Build update data
    const updateData = {};
    if (profileVisible !== undefined) {
      updateData.profileVisible = profileVisible;
    }
    if (withContact !== undefined) {
      updateData.withContact = withContact;
    }

    // Update privacy settings
    const updatedProfile = await prisma.profile.update({
      where: { userId },
      data: updateData,
      select: {
        id: true,
        userId: true,
        profileVisible: true,
        withContact: true,
      },
    });

    res.json({
      status: "success",
      message: "Privacy settings updated successfully.",
      data: { profile: updatedProfile },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Deactivate Account
 * PATCH /api/users/me/deactivate
 */
const deactivateAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Deactivate user account
    await prisma.user.update({
      where: { id: userId },
      data: { isActive: false },
    });

    res.json({
      status: "success",
      message: "Account deactivated successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Account
 * DELETE /api/users/me
 */
const deleteAccount = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { password } = req.body;

    // Validation
    if (!password) {
      return res.status(400).json({
        status: "error",
        message: "Password is required for account deletion.",
        error: "password field is mandatory.",
      });
    }

    // Get user with password hash
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, passwordHash: true },
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found.",
        error: "User does not exist.",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid password.",
        error: "Authentication failed.",
      });
    }

    // Delete user (cascade will delete profile, photos, messages, etc.)
    await prisma.user.delete({
      where: { id: userId },
    });

    res.json({
      status: "success",
      message: "Account deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Account Settings
 * GET /api/users/me/settings
 */
const getAccountSettings = async (req, res, next) => {
  try {
    const userId = req.user.id;

    // Get user data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        createdAt: true,
      },
    });

    // Get profile privacy settings
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        profileVisible: true,
        withContact: true,
      },
    });

    res.json({
      status: "success",
      message: "Account settings retrieved successfully.",
      data: {
        user,
        privacy: profile || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  changePassword,
  updateEmail,
  updatePhone,
  updatePrivacySettings,
  deactivateAccount,
  deleteAccount,
  getAccountSettings,
};

