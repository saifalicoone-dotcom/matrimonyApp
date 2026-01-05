const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { generateToken, generateRefreshToken } = require("../utils/jwt");

const prisma = new PrismaClient();

/**
 * User Registration
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email and password are required.",
        error: "Email and password fields are mandatory.",
      });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid email format.",
        error: "Please provide a valid email address.",
      });
    }

    // Validate password length (minimum 6 characters)
    if (password.length < 6) {
      return res.status(400).json({
        status: "error",
        message: "Password must be at least 6 characters long.",
        error: "Password validation failed.",
      });
    }

    // Validate phone format if provided
    if (phone) {
      const phoneRegex =
        /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
      if (!phoneRegex.test(phone)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid phone number format.",
          error: "Please provide a valid phone number.",
        });
      }
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        phone: phone || null,
        passwordHash,
        role: "USER",
        isEmailVerified: false,
        isPhoneVerified: false,
        isActive: true,
      },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        createdAt: true,
      },
    });

    // Generate tokens
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = generateRefreshToken({ userId: user.id });

    res.status(201).json({
      status: "success",
      message: "User registered successfully.",
      data: {
        user,
        token,
        refreshToken,
      },
    });
  } catch (error) {
    // Handle unique constraint violations (duplicate email/phone)
    if (error.code === "P2002") {
      const field = error.meta?.target?.[0] || "field";
      return res.status(409).json({
        status: "error",
        message: `User with this ${field} already exists.`,
        error: `${
          field.charAt(0).toUpperCase() + field.slice(1)
        } must be unique.`,
      });
    }

    // Pass to error handler
    next(error);
  }
};

/**
 * User Login
 * POST /api/auth/login
 * Supports login with email or phone number
 */
const login = async (req, res, next) => {
  try {
    const { email, phone, password } = req.body;

    // Validation - either email or phone required
    if ((!email && !phone) || !password) {
      return res.status(400).json({
        status: "error",
        message: "Email/phone and password are required.",
        error: "Email/phone and password fields are mandatory.",
      });
    }

    let user;

    // Find user by email or phone
    if (email) {
      user = await prisma.user.findUnique({
        where: { email },
      });
    } else if (phone) {
      user = await prisma.user.findUnique({
        where: { phone },
      });
    }

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials.",
        error: "Authentication failed.",
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({
        status: "error",
        message: "Account is inactive. Please contact support.",
        error: "Account has been deactivated.",
      });
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      return res.status(401).json({
        status: "error",
        message: "Invalid credentials.",
        error: "Authentication failed.",
      });
    }

    // Update lastActive timestamp
    await prisma.user.update({
      where: { id: user.id },
      data: { lastActive: new Date() },
    });

    // Generate tokens
    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    const refreshToken = generateRefreshToken({ userId: user.id });

    // Return user data (excluding password hash)
    const userData = {
      id: user.id,
      email: user.email,
      phone: user.phone,
      role: user.role,
      isEmailVerified: user.isEmailVerified,
      isPhoneVerified: user.isPhoneVerified,
      lastActive: user.lastActive,
    };

    res.json({
      status: "success",
      message: "Login successful.",
      data: {
        user: userData,
        token,
        refreshToken,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * User Logout
 * POST /api/auth/logout
 * Note: Since JWT is stateless, logout is primarily client-side.
 * This endpoint can be used for logging or future token blacklisting.
 */
const logout = async (req, res, next) => {
  try {
    // Since JWT is stateless, we just return success
    // In a production system with token blacklisting, you would:
    // 1. Add token to a blacklist (Redis/database)
    // 2. Check blacklist in auth middleware

    res.json({
      status: "success",
      message: "Logout successful.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh Access Token
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res, next) => {
  try {
    const { refreshToken: token } = req.body;

    if (!token) {
      return res.status(400).json({
        status: "error",
        message: "Refresh token is required.",
        error: "Refresh token field is mandatory.",
      });
    }

    const { verifyRefreshToken } = require("../utils/jwt");
    const decoded = verifyRefreshToken(token);

    // Verify user still exists and is active
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        role: true,
        isActive: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        status: "error",
        message: "Invalid refresh token.",
        error: "User not found or inactive.",
      });
    }

    // Generate new tokens
    const newToken = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role,
    });
    const newRefreshToken = generateRefreshToken({ userId: user.id });

    res.json({
      status: "success",
      message: "Token refreshed successfully.",
      data: {
        token: newToken,
        refreshToken: newRefreshToken,
      },
    });
  } catch (error) {
    return res.status(401).json({
      status: "error",
      message: error.message || "Invalid or expired refresh token.",
      error: "Token refresh failed.",
    });
  }
};

/**
 * Send OTP for phone verification
 * POST /api/auth/send-otp
 */
const sendOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;

    // Validation
    if (!phone) {
      return res.status(400).json({
        status: "error",
        message: "Phone number is required.",
        error: "Phone field is mandatory.",
      });
    }

    // Validate phone format
    const phoneRegex =
      /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({
        status: "error",
        message: "Invalid phone number format.",
        error: "Please provide a valid phone number.",
      });
    }

    const { generateAndSendOTP } = require("../utils/otp");

    // Generate and send OTP
    const otp = await generateAndSendOTP(phone);

    res.json({
      status: "success",
      message: "OTP sent successfully to your phone.",
      data: process.env.NODE_ENV === "development" ? { otp } : {}, // Only return OTP in development
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify OTP for phone verification
 * POST /api/auth/verify-otp
 */
const verifyOTP = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;

    // Validation
    if (!phone || !otp) {
      return res.status(400).json({
        status: "error",
        message: "Phone number and OTP are required.",
        error: "Phone and OTP fields are mandatory.",
      });
    }

    const { verifyOTP } = require("../utils/otp");

    // Verify OTP
    const isValid = await verifyOTP(phone, otp);

    if (!isValid) {
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired OTP.",
        error: "Please request a new OTP.",
      });
    }

    // Find user by phone and update phone verification status
    const user = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        phone: true,
        isPhoneVerified: true,
      },
    });

    if (user) {
      // Update phone verification status
      await prisma.user.update({
        where: { id: user.id },
        data: { isPhoneVerified: true },
      });

      // Update profile phone verification if exists
      await prisma.profile.updateMany({
        where: { userId: user.id },
        data: { phone: user.phone }, // Ensure profile phone matches
      });
    }

    res.json({
      status: "success",
      message: "Phone number verified successfully.",
      data: {
        phoneVerified: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  logout,
  refreshToken,
  sendOTP,
  verifyOTP,
};
