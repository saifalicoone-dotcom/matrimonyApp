const { PrismaClient } = require('@prisma/client');
const { calculateAge, validateDateOfBirth, isValidEmail, isValidPhone, isValidHeight } = require('../utils/validation');

const prisma = new PrismaClient();

/**
 * Create or Update Profile
 * POST /api/users/me/profile
 * PUT /api/users/me/profile
 */
const createOrUpdateProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      firstName,
      lastName,
      dateOfBirth,
      gender,
      height,
      maritalStatus,
      email,
      phone,
      withContact,
      education,
      occupation,
      income,
      country,
      state,
      city,
      address,
      religion,
      caste,
      subCaste,
      community,
      motherTongue,
      familyType,
      fatherOccupation,
      motherOccupation,
      siblings,
      diet,
      smoking,
      drinking,
      aboutMe,
      partnerPreferences,
      profileVisible,
    } = req.body;

    // Validation - Required fields
    if (!firstName) {
      return res.status(400).json({
        status: 'error',
        message: 'First name is required.',
        error: 'firstName field is mandatory.',
      });
    }

    if (!dateOfBirth) {
      return res.status(400).json({
        status: 'error',
        message: 'Date of birth is required.',
        error: 'dateOfBirth field is mandatory.',
      });
    }

    if (!gender) {
      return res.status(400).json({
        status: 'error',
        message: 'Gender is required.',
        error: 'gender field is mandatory.',
      });
    }

    // Validate email format
    if (email && !isValidEmail(email)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid email format.',
        error: 'Please provide a valid email address.',
      });
    }

    // Validate phone format
    if (phone && !isValidPhone(phone)) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid phone number format.',
        error: 'Please provide a valid phone number.',
      });
    }

    // Validate date of birth (must be 18+)
    const dobValidation = validateDateOfBirth(new Date(dateOfBirth));
    if (!dobValidation.valid) {
      return res.status(400).json({
        status: 'error',
        message: dobValidation.error,
        error: 'Age validation failed.',
      });
    }

    const age = dobValidation.age;

    // Validate height (if provided)
    if (height && !isValidHeight(height)) {
      return res.status(400).json({
        status: 'error',
        message: 'Height must be between 100 and 250 cm.',
        error: 'Invalid height value.',
      });
    }

    // Validate gender enum
    const validGenders = ['MALE', 'FEMALE', 'OTHER'];
    if (!validGenders.includes(gender.toUpperCase())) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid gender. Must be MALE, FEMALE, or OTHER.',
        error: 'Gender validation failed.',
      });
    }

    // Validate marital status enum
    if (maritalStatus) {
      const validMaritalStatuses = ['NEVER_MARRIED', 'DIVORCED', 'WIDOWED', 'ANNULLED'];
      if (!validMaritalStatuses.includes(maritalStatus.toUpperCase())) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid marital status.',
          error: 'MaritalStatus validation failed.',
        });
      }
    }

    // Validate diet enum (if provided)
    if (diet) {
      const validDiets = ['VEGETARIAN', 'VEGAN', 'NON_VEGETARIAN', 'JAIN', 'EGGETARIAN'];
      if (!validDiets.includes(diet.toUpperCase())) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid diet type.',
          error: 'Diet validation failed.',
        });
      }
    }

    // Get user's email/phone for profile (fallback to user table values)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true, phone: true },
    });

    // Prepare profile data
    const profileData = {
      userId,
      firstName,
      lastName: lastName || null,
      dateOfBirth: new Date(dateOfBirth),
      age,
      gender: gender.toUpperCase(),
      height: height ? parseFloat(height) : null,
      maritalStatus: maritalStatus ? maritalStatus.toUpperCase() : 'NEVER_MARRIED',
      email: email || user.email,
      phone: phone || user.phone || null,
      withContact: withContact !== undefined ? withContact : false,
      education: education || null,
      occupation: occupation || null,
      income: income || null,
      country: country || null,
      state: state || null,
      city: city || null,
      address: address || null,
      religion: religion || null,
      caste: caste || null,
      subCaste: subCaste || null,
      community: community || null,
      motherTongue: motherTongue || null,
      familyType: familyType || null,
      fatherOccupation: fatherOccupation || null,
      motherOccupation: motherOccupation || null,
      siblings: siblings || null,
      diet: diet ? diet.toUpperCase() : null,
      smoking: smoking !== undefined ? smoking : false,
      drinking: drinking !== undefined ? drinking : false,
      aboutMe: aboutMe || null,
      partnerPreferences: partnerPreferences || null,
      profileVisible: profileVisible !== undefined ? profileVisible : true,
    };

    // Check if profile exists
    const existingProfile = await prisma.profile.findUnique({
      where: { userId },
    });

    let profile;
    if (existingProfile) {
      // Update existing profile
      profile = await prisma.profile.update({
        where: { userId },
        data: profileData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });
    } else {
      // Create new profile
      profile = await prisma.profile.create({
        data: profileData,
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: true,
            },
          },
        },
      });
    }

    res.json({
      status: 'success',
      message: existingProfile ? 'Profile updated successfully.' : 'Profile created successfully.',
      data: { profile },
    });
  } catch (error) {
    // Handle Prisma validation errors
    if (error.code === 'P2002') {
      return res.status(409).json({
        status: 'error',
        message: 'Profile already exists for this user.',
        error: 'Unique constraint violation.',
      });
    }

    next(error);
  }
};

/**
 * Get My Profile
 * GET /api/users/me/profile
 */
const getMyProfile = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const profile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            isEmailVerified: true,
            isPhoneVerified: true,
          },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({
        status: 'error',
        message: 'Profile not found. Please create your profile first.',
        error: 'Profile does not exist.',
      });
    }

    res.json({
      status: 'success',
      message: 'Profile retrieved successfully.',
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get User Profile by ID
 * GET /api/users/:userId/profile
 */
const getUserProfile = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user.id;

    // Check if user is blocked or blocking
    const isBlocked = await prisma.blockList.findFirst({
      where: {
        OR: [
          { userId: parseInt(userId), blockedUserId: viewerId },
          { userId: viewerId, blockedUserId: parseInt(userId) },
        ],
      },
    });

    if (isBlocked) {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied.',
        error: 'Profile not accessible.',
      });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: parseInt(userId) },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
          },
        },
      },
    });

    if (!profile) {
      return res.status(404).json({
        status: 'error',
        message: 'Profile not found.',
        error: 'Profile does not exist.',
      });
    }

    // Check profile visibility
    if (!profile.profileVisible && profile.userId !== viewerId) {
      return res.status(403).json({
        status: 'error',
        message: 'Profile is private.',
        error: 'Access denied.',
      });
    }

    // Hide contact info if withContact is false or viewer is not PREMIUM
    const viewer = await prisma.user.findUnique({
      where: { id: viewerId },
      select: { role: true },
    });

    const shouldHideContact = !profile.withContact || viewer.role !== 'PREMIUM';

    // Remove sensitive fields if needed
    const profileData = { ...profile };
    if (shouldHideContact && profile.userId !== viewerId) {
      delete profileData.email;
      delete profileData.phone;
    }

    res.json({
      status: 'success',
      message: 'Profile retrieved successfully.',
      data: { profile: profileData },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrUpdateProfile,
  getMyProfile,
  getUserProfile,
};

