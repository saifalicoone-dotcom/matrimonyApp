const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

/**
 * Generate a 6-digit OTP
 * @returns {String} 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Save OTP to database
 * @param {String} phone - Phone number
 * @param {String} otp - OTP code
 * @param {Number} expiryMinutes - Expiry time in minutes (default: 10)
 * @returns {Promise<Object>} OTP record
 */
const saveOTP = async (phone, otp, expiryMinutes = 10) => {
  // Delete old unused OTPs for this phone
  await prisma.otp.deleteMany({
    where: {
      phone,
      isUsed: false,
    },
  });

  // Create new OTP
  const expiresAt = new Date();
  expiresAt.setMinutes(expiresAt.getMinutes() + expiryMinutes);

  const otpRecord = await prisma.otp.create({
    data: {
      phone,
      otp,
      expiresAt,
      isUsed: false,
    },
  });

  return otpRecord;
};

/**
 * Verify OTP
 * @param {String} phone - Phone number
 * @param {String} otp - OTP code
 * @returns {Promise<Boolean>} True if OTP is valid, false otherwise
 */
const verifyOTP = async (phone, otp) => {
  const otpRecord = await prisma.otp.findFirst({
    where: {
      phone,
      otp,
      isUsed: false,
      expiresAt: {
        gte: new Date(),
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  if (!otpRecord) {
    return false;
  }

  // Mark OTP as used
  await prisma.otp.update({
    where: { id: otpRecord.id },
    data: { isUsed: true },
  });

  return true;
};

/**
 * Send OTP via SMS
 * @param {String} phone - Phone number
 * @param {String} otp - OTP code
 * @returns {Promise<Boolean>} True if SMS sent successfully
 */
const sendOTP = async (phone, otp) => {
  try {
    // TODO: Integrate with SMS service (Twilio, AWS SNS, etc.)
    // For now, we'll just log the OTP (for development/testing)

    const smsService = process.env.SMS_SERVICE || "console"; // "twilio", "aws-sns", "console"

    if (smsService === "console") {
      // Development mode: Just log the OTP
      console.log(`📱 SMS OTP for ${phone}: ${otp}`);
      return true;
    } else if (smsService === "twilio") {
      // Twilio integration (requires twilio package)
      const accountSid = process.env.TWILIO_ACCOUNT_SID;
      const authToken = process.env.TWILIO_AUTH_TOKEN;
      const fromNumber = process.env.TWILIO_PHONE_NUMBER;

      if (!accountSid || !authToken || !fromNumber) {
        throw new Error("Twilio credentials not configured");
      }

      const twilio = require("twilio")(accountSid, authToken);

      const message = await twilio.messages.create({
        body: `Your OTP for verification is: ${otp}. Valid for 10 minutes.`,
        from: fromNumber,
        to: phone,
      });

      return !!message.sid;
    } else if (smsService === "aws-sns") {
      // AWS SNS integration
      const { SNSClient, PublishCommand } = require("@aws-sdk/client-sns");
      const snsClient = new SNSClient({
        region: process.env.AWS_REGION || "us-east-1",
        credentials: {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        },
      });

      const command = new PublishCommand({
        PhoneNumber: phone,
        Message: `Your OTP for verification is: ${otp}. Valid for 10 minutes.`,
      });

      await snsClient.send(command);
      return true;
    }

    return false;
  } catch (error) {
    console.error("SMS Send Error:", error);
    throw new Error("Failed to send OTP SMS");
  }
};

/**
 * Generate and send OTP
 * @param {String} phone - Phone number
 * @returns {Promise<String>} OTP code (for testing, remove in production)
 */
const generateAndSendOTP = async (phone) => {
  const otp = generateOTP();
  await saveOTP(phone, otp);

  // Send OTP via SMS
  await sendOTP(phone, otp);

  // Return OTP for testing (remove in production)
  if (process.env.NODE_ENV === "development") {
    return otp;
  }

  return null;
};

module.exports = {
  generateOTP,
  saveOTP,
  verifyOTP,
  sendOTP,
  generateAndSendOTP,
};
