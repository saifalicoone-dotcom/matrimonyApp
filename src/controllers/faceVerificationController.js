const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Calculate Euclidean distance between two face encodings
 * @param {Array} encoding1 - First face encoding array
 * @param {Array} encoding2 - Second face encoding array
 * @returns {Number} Distance between encodings
 */
function calculateEuclideanDistance(encoding1, encoding2) {
  if (!encoding1 || !encoding2) {
    return Infinity;
  }

  if (encoding1.length !== encoding2.length) {
    return Infinity;
  }

  let sum = 0;
  for (let i = 0; i < encoding1.length; i++) {
    const diff = encoding1[i] - encoding2[i];
    sum += diff * diff;
  }

  return Math.sqrt(sum);
}

/**
 * Store Face Encoding from Profile Photo
 * POST /api/users/me/face-verification/store
 */
const storeFaceEncoding = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { faceEncoding, photoId } = req.body;

    // Validation
    if (!faceEncoding) {
      return res.status(400).json({
        status: "error",
        message: "Face encoding is required.",
        error: "faceEncoding field is mandatory.",
      });
    }

    if (!Array.isArray(faceEncoding)) {
      return res.status(400).json({
        status: "error",
        message: "Face encoding must be an array.",
        error: "Invalid face encoding format.",
      });
    }

    // Validate encoding length (typically 128 or 512 for face-api.js)
    if (faceEncoding.length < 128 || faceEncoding.length > 512) {
      return res.status(400).json({
        status: "error",
        message: "Invalid face encoding length. Expected 128-512 values.",
        error: "Face encoding format validation failed.",
      });
    }

    // If photoId is provided, verify photo belongs to user
    if (photoId) {
      const photo = await prisma.photo.findFirst({
        where: {
          id: photoId,
          userId,
        },
      });

      if (!photo) {
        return res.status(404).json({
          status: "error",
          message: "Photo not found or does not belong to you.",
          error: "Invalid photo ID.",
        });
      }
    }

    // Get or create profile
    let profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found. Please create your profile first.",
        error: "Profile does not exist.",
      });
    }

    // Update profile with face encoding
    profile = await prisma.profile.update({
      where: { userId },
      data: {
        faceEncoding: faceEncoding,
        faceVerified: false, // Reset verification when new encoding is stored
        faceVerificationDate: null,
      },
    });

    res.json({
      status: "success",
      message:
        "Face encoding stored successfully. Please verify your face to complete verification.",
      data: {
        faceEncodingStored: true,
        faceVerified: profile.faceVerified,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify Face with Live Capture
 * POST /api/users/me/face-verification/verify
 */
const verifyFace = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { faceEncoding } = req.body;

    // Validation
    if (!faceEncoding) {
      return res.status(400).json({
        status: "error",
        message: "Face encoding is required.",
        error: "faceEncoding field is mandatory.",
      });
    }

    if (!Array.isArray(faceEncoding)) {
      return res.status(400).json({
        status: "error",
        message: "Face encoding must be an array.",
        error: "Invalid face encoding format.",
      });
    }

    // Get profile with stored face encoding
    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        id: true,
        faceEncoding: true,
        faceVerified: true,
      },
    });

    if (!profile) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found. Please create your profile first.",
        error: "Profile does not exist.",
      });
    }

    if (!profile.faceEncoding) {
      return res.status(400).json({
        status: "error",
        message:
          "No face encoding stored. Please upload a photo and store face encoding first.",
        error: "Face encoding not found.",
      });
    }

    // Compare face encodings
    const storedEncoding = profile.faceEncoding;
    const distance = calculateEuclideanDistance(storedEncoding, faceEncoding);

    // Threshold for face matching (0.6 is standard for face-api.js)
    // Lower distance = more similar faces
    const threshold = 0.6;
    const isMatch = distance < threshold;
    const similarity = Math.max(
      0,
      Math.min(100, (1 - distance / threshold) * 100)
    );

    if (isMatch) {
      // Update profile as verified
      await prisma.profile.update({
        where: { userId },
        data: {
          faceVerified: true,
          faceVerificationDate: new Date(),
          isVerified: true, // Also set general verification status
        },
      });

      res.json({
        status: "success",
        message: "Face verification successful! Your profile is now verified.",
        data: {
          verified: true,
          distance: distance.toFixed(4),
          similarity: similarity.toFixed(2),
          faceVerified: true,
        },
      });
    } else {
      res.status(400).json({
        status: "error",
        message: "Face verification failed. Faces do not match.",
        error: "Face mismatch detected.",
        data: {
          verified: false,
          distance: distance.toFixed(4),
          similarity: similarity.toFixed(2),
          threshold: threshold,
          suggestion:
            "Please ensure good lighting and face the camera directly.",
        },
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Get Face Verification Status
 * GET /api/users/me/face-verification/status
 */
const getFaceVerificationStatus = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const profile = await prisma.profile.findUnique({
      where: { userId },
      select: {
        faceEncoding: true,
        faceVerified: true,
        faceVerificationDate: true,
        isVerified: true,
      },
    });

    if (!profile) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found.",
        error: "Profile does not exist.",
      });
    }

    res.json({
      status: "success",
      message: "Face verification status retrieved successfully.",
      data: {
        hasFaceEncoding: !!profile.faceEncoding,
        faceVerified: profile.faceVerified || false,
        isVerified: profile.isVerified || false,
        faceVerificationDate: profile.faceVerificationDate,
        nextStep: profile.faceEncoding
          ? profile.faceVerified
            ? "Face already verified"
            : "Please verify your face with live capture"
          : "Please upload a photo and store face encoding",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reset Face Verification
 * DELETE /api/users/me/face-verification/reset
 */
const resetFaceVerification = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const profile = await prisma.profile.findUnique({
      where: { userId },
    });

    if (!profile) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found.",
        error: "Profile does not exist.",
      });
    }

    // Reset face verification (keep encoding, reset verification status)
    await prisma.profile.update({
      where: { userId },
      data: {
        faceVerified: false,
        faceVerificationDate: null,
        // Optionally reset isVerified if it was only based on face verification
        // isVerified: false,
      },
    });

    res.json({
      status: "success",
      message: "Face verification reset successfully. You can verify again.",
      data: {
        faceEncodingStored: !!profile.faceEncoding,
        faceVerified: false,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  storeFaceEncoding,
  verifyFace,
  getFaceVerificationStatus,
  resetFaceVerification,
  calculateEuclideanDistance, // Export for testing
};
