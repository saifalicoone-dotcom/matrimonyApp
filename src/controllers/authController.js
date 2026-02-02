const bcrypt = require("bcrypt");
const { PrismaClient } = require("@prisma/client");
const { generateToken, generateRefreshToken } = require("../utils/jwt");
const { generateAndSendOTP, verifyOTP: verifyOTPUtil } = require("../utils/otp");
const { checkRateLimit, isPhoneBlocked, blockPhone, unblockPhone } = require("../utils/rateLimiter");

const prisma = new PrismaClient();

/**
 * OTP-based User Registration
 * POST /api/auth/register-otp
 */
const registerWithOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;

    // Validation
    if (!phone) {
      return res.status(400).json({
        status: "error",
        message: "Phone number is required.",
        error: "Phone field is mandatory for registration.",
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

    // Check if phone is blocked
    const isBlocked = await isPhoneBlocked(phone);
    if (isBlocked) {
      return res.status(429).json({
        status: "error",
        message: "Too many failed attempts. Please try again later.",
        error: "Phone number is temporarily blocked.",
      });
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(phone, 'register-otp', 5, 300); // 5 attempts per 5 minutes
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        status: "error",
        message: `Too many OTP requests. Please try again after ${Math.ceil((rateLimitResult.resetTime - Math.floor(Date.now() / 1000)) / 60)} minutes.`,
        error: "Rate limit exceeded.",
      });
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return res.status(409).json({
        status: "error",
        message: "User with this phone number already exists.",
        error: "Phone number must be unique.",
      });
    }

    // Generate and send OTP for registration
    const otp = await generateAndSendOTP(phone, 'registration');

    res.json({
      status: "success",
      message: "OTP sent successfully for registration.",
      data: {
        phone,
        ...(process.env.NODE_ENV === "development" ? { otp } : {}), // Only return OTP in development
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete Registration with OTP
 * POST /api/auth/complete-registration
 */
const completeRegistration = async (req, res, next) => {
  try {
    const { phone, otp, email } = req.body;

    // Validation
    if (!phone || !otp) {
      return res.status(400).json({
        status: "error",
        message: "Phone number and OTP are required.",
        error: "Phone and OTP fields are mandatory.",
      });
    }

    // Check if phone is blocked
    const isBlocked = await isPhoneBlocked(phone);
    if (isBlocked) {
      return res.status(429).json({
        status: "error",
        message: "Too many failed attempts. Please try again later.",
        error: "Phone number is temporarily blocked.",
      });
    }

    // Verify OTP for registration
    const isValid = await verifyOTPUtil(phone, otp, 'registration');

    if (!isValid) {
      // Increment failed attempts counter
      const rateLimitResult = await checkRateLimit(phone, 'failed-register-otp', 5, 3600); // 5 failed attempts per hour
      if (!rateLimitResult.allowed) {
        // Block phone for 1 hour if too many failed attempts
        await blockPhone(phone, 3600);
      }
      
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired OTP.",
        error: "Please request a new OTP.",
      });
    }

    // Reset failed attempts counter on successful OTP verification
    await unblockPhone(phone);

    // Validate email if provided
    if (email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({
          status: "error",
          message: "Invalid email format.",
          error: "Please provide a valid email address.",
        });
      }
    }

    // Check if user already exists (double-check after OTP verification)
    const existingUser = await prisma.user.findUnique({
      where: { phone },
    });

    if (existingUser) {
      return res.status(409).json({
        status: "error",
        message: "User with this phone number already exists.",
        error: "Phone number must be unique.",
      });
    }

    // Create user with phone verified
    const user = await prisma.user.create({
      data: {
        email: email || null,
        phone,
        passwordHash: null, // No password for OTP-based registration
        role: "USER",
        isEmailVerified: !!email,
        isPhoneVerified: true,
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
    // Handle unique constraint violations (duplicate email)
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
 * OTP-based User Login
 * POST /api/auth/login-otp
 */
const loginWithOTP = async (req, res, next) => {
  try {
    const { phone } = req.body;

    // Validation
    if (!phone) {
      return res.status(400).json({
        status: "error",
        message: "Phone number is required.",
        error: "Phone field is mandatory for login.",
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

    // Check if phone is blocked
    const isBlocked = await isPhoneBlocked(phone);
    if (isBlocked) {
      return res.status(429).json({
        status: "error",
        message: "Too many failed attempts. Please try again later.",
        error: "Phone number is temporarily blocked.",
      });
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(phone, 'login-otp', 5, 300); // 5 attempts per 5 minutes
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        status: "error",
        message: `Too many OTP requests. Please try again after ${Math.ceil((rateLimitResult.resetTime - Math.floor(Date.now() / 1000)) / 60)} minutes.`,
        error: "Rate limit exceeded.",
      });
    }

    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
      },
    });

    if (!user) {
      return res.status(404).json({
        status: "error",
        message: "User not found. Please register first.",
        error: "Account does not exist.",
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

    // Generate and send OTP for login
    const otp = await generateAndSendOTP(phone, 'login');

    res.json({
      status: "success",
      message: "OTP sent successfully for login.",
      data: {
        userId: user.id,
        phone: user.phone,
        ...(process.env.NODE_ENV === "development" ? { otp } : {}), // Only return OTP in development
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Complete Login with OTP
 * POST /api/auth/complete-login
 */
const completeLogin = async (req, res, next) => {
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

    // Check if phone is blocked
    const isBlocked = await isPhoneBlocked(phone);
    if (isBlocked) {
      return res.status(429).json({
        status: "error",
        message: "Too many failed attempts. Please try again later.",
        error: "Phone number is temporarily blocked.",
      });
    }

    // Verify OTP for login
    const isValid = await verifyOTPUtil(phone, otp, 'login');

    if (!isValid) {
      // Increment failed attempts counter
      const rateLimitResult = await checkRateLimit(phone, 'failed-login-otp', 5, 3600); // 5 failed attempts per hour
      if (!rateLimitResult.allowed) {
        // Block phone for 1 hour if too many failed attempts
        await blockPhone(phone, 3600);
      }
      
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired OTP.",
        error: "Please request a new OTP.",
      });
    }

    // Reset failed attempts counter on successful OTP verification
    await unblockPhone(phone);

    // Find user by phone
    const user = await prisma.user.findUnique({
      where: { phone },
      select: {
        id: true,
        email: true,
        phone: true,
        role: true,
        isEmailVerified: true,
        isPhoneVerified: true,
        isActive: true,
        lastActive: true,
      },
    });

    if (!user) {
      return res.status(401).json({
        status: "error",
        message: "User not found.",
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

    // Return user data
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

    // Check if phone is blocked
    const isBlocked = await isPhoneBlocked(phone);
    if (isBlocked) {
      return res.status(429).json({
        status: "error",
        message: "Too many failed attempts. Please try again later.",
        error: "Phone number is temporarily blocked.",
      });
    }

    // Check rate limit
    const rateLimitResult = await checkRateLimit(phone, 'send-otp', 5, 300); // 5 attempts per 5 minutes
    if (!rateLimitResult.allowed) {
      return res.status(429).json({
        status: "error",
        message: `Too many OTP requests. Please try again after ${Math.ceil((rateLimitResult.resetTime - Math.floor(Date.now() / 1000)) / 60)} minutes.`,
        error: "Rate limit exceeded.",
      });
    }

    const { generateAndSendOTP } = require("../utils/otp");

    // Generate and send OTP
    const otp = await generateAndSendOTP(phone, 'verification');

    res.json({
      status: "success",
      message: "OTP sent successfully to your phone.",
      data: process.env.NODE_ENV === "development" ? { otp } : {}, // Only return OTP in development
    });
  } catch (error) {
    next(error);
  }
};

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

    // Check if phone is blocked
    const isBlocked = await isPhoneBlocked(phone);
    if (isBlocked) {
      return res.status(429).json({
        status: "error",
        message: "Too many failed attempts. Please try again later.",
        error: "Phone number is temporarily blocked.",
      });
    }

    // Verify OTP
    const isValid = await verifyOTPUtil(phone, otp, 'verification');

    if (!isValid) {
      // Increment failed attempts counter
      const rateLimitResult = await checkRateLimit(phone, 'failed-verify-otp', 5, 3600); // 5 failed attempts per hour
      if (!rateLimitResult.allowed) {
        // Block phone for 1 hour if too many failed attempts
        await blockPhone(phone, 3600);
      }
      
      return res.status(400).json({
        status: "error",
        message: "Invalid or expired OTP.",
        error: "Please request a new OTP.",
      });
    }

    // Reset failed attempts counter on successful OTP verification
    await unblockPhone(phone);

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
  registerWithOTP,
  completeRegistration,
  loginWithOTP,
  completeLogin,
  logout,
  refreshToken,
  sendOTP,
  verifyOTP,
};
