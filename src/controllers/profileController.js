const { PrismaClient } = require('@prisma/client');
const { calculateAge, validateDateOfBirth, isValidEmail, isValidPhone, isValidHeight } = require('../utils/validation');
const { hasProfileBoost, hasVerifiedBadge } = require('../services/subscriptionService');
const {
  cacheUserProfile,
  getCachedUserProfile,
  invalidateUserProfileCache,
  setProfileVisibility,
  getProfileVisibility,
  clearUserRelatedCaches
} = require('../utils/cache');

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
      profileFor,
      firstName,
      lastName,
      dateOfBirth,
      gender,
      height,
      maritalStatus,
      numberOfChildren,
      email,
      phone,
      withContact,
      education,
      highestQualification,
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
      numberOfBrothers,
      numberOfSisters,
      marriedBrothers,
      marriedSisters,
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
      const validMaritalStatuses = ['NEVER_MARRIED', 'AWAITING_DIVORCE', 'DIVORCED', 'WIDOWED', 'ANNULLED'];
      if (!validMaritalStatuses.includes(maritalStatus.toUpperCase())) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid marital status.',
          error: 'MaritalStatus validation failed.',
        });
      }
    }

    // Validate profileFor enum (if provided)
    if (profileFor) {
      const validProfileFor = ['SELF', 'SON', 'DAUGHTER', 'BROTHER', 'SISTER', 'RELATIVE', 'FRIEND'];
      if (!validProfileFor.includes(profileFor.toUpperCase())) {
        return res.status(400).json({
          status: 'error',
          message: 'Invalid profileFor value.',
          error: 'ProfileFor validation failed.',
        });
      }
    }

    // Validate numberOfChildren (required for divorced/widowed/annulled/awaiting divorce)
    const requiresChildren = maritalStatus && ['DIVORCED', 'WIDOWED', 'ANNULLED', 'AWAITING_DIVORCE'].includes(maritalStatus.toUpperCase());
    if (requiresChildren && numberOfChildren === undefined) {
      return res.status(400).json({
        status: 'error',
        message: 'Number of children is required for divorced/widowed/annulled/awaiting divorce status.',
        error: 'numberOfChildren field is mandatory.',
      });
    }

    // Validate numberOfChildren (should be >= 0 if provided)
    if (numberOfChildren !== undefined && (numberOfChildren < 0 || !Number.isInteger(Number(numberOfChildren)))) {
      return res.status(400).json({
        status: 'error',
        message: 'Number of children must be a non-negative integer.',
        error: 'Invalid numberOfChildren value.',
      });
    }

    // Validate siblings numbers (should be >= 0 if provided)
    if (numberOfBrothers !== undefined && (numberOfBrothers < 0 || !Number.isInteger(Number(numberOfBrothers)))) {
      return res.status(400).json({
        status: 'error',
        message: 'Number of brothers must be a non-negative integer.',
        error: 'Invalid numberOfBrothers value.',
      });
    }

    if (numberOfSisters !== undefined && (numberOfSisters < 0 || !Number.isInteger(Number(numberOfSisters)))) {
      return res.status(400).json({
        status: 'error',
        message: 'Number of sisters must be a non-negative integer.',
        error: 'Invalid numberOfSisters value.',
      });
    }

    // Validate marriedBrothers (should be >= 0 and <= numberOfBrothers)
    if (marriedBrothers !== undefined) {
      if (marriedBrothers < 0 || !Number.isInteger(Number(marriedBrothers))) {
        return res.status(400).json({
          status: 'error',
          message: 'Number of married brothers must be a non-negative integer.',
          error: 'Invalid marriedBrothers value.',
        });
      }
      if (numberOfBrothers !== undefined && marriedBrothers > numberOfBrothers) {
        return res.status(400).json({
          status: 'error',
          message: 'Number of married brothers cannot exceed total number of brothers.',
          error: 'Invalid marriedBrothers value.',
        });
      }
    }

    // Validate marriedSisters (should be >= 0 and <= numberOfSisters)
    if (marriedSisters !== undefined) {
      if (marriedSisters < 0 || !Number.isInteger(Number(marriedSisters))) {
        return res.status(400).json({
          status: 'error',
          message: 'Number of married sisters must be a non-negative integer.',
          error: 'Invalid marriedSisters value.',
        });
      }
      if (numberOfSisters !== undefined && marriedSisters > numberOfSisters) {
        return res.status(400).json({
          status: 'error',
          message: 'Number of married sisters cannot exceed total number of sisters.',
          error: 'Invalid marriedSisters value.',
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
      profileFor: profileFor ? profileFor.toUpperCase() : 'SELF',
      firstName,
      lastName: lastName || null,
      dateOfBirth: new Date(dateOfBirth),
      age,
      gender: gender.toUpperCase(),
      height: height ? parseFloat(height) : null,
      maritalStatus: maritalStatus ? maritalStatus.toUpperCase() : 'NEVER_MARRIED',
      numberOfChildren: numberOfChildren !== undefined ? Number(numberOfChildren) : null,
      email: email || user.email,
      phone: phone || user.phone || null,
      withContact: withContact !== undefined ? withContact : false,
      education: education || null,
      highestQualification: highestQualification || null,
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
      numberOfBrothers: numberOfBrothers !== undefined ? Number(numberOfBrothers) : 0,
      numberOfSisters: numberOfSisters !== undefined ? Number(numberOfSisters) : 0,
      marriedBrothers: marriedBrothers !== undefined ? Number(marriedBrothers) : 0,
      marriedSisters: marriedSisters !== undefined ? Number(marriedSisters) : 0,
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
    
    // Try to get from cache first
    const cachedProfile = await getCachedUserProfile(userId);
    if (cachedProfile) {
      return res.json({
        status: 'success',
        message: 'Profile retrieved from cache.',
        data: { profile: cachedProfile },
        fromCache: true
      });
    }

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

    // Add subscription-based features (Profile Boost & Verified Badge)
    const profileBoost = await hasProfileBoost(userId);
    const verifiedBadge = await hasVerifiedBadge(userId);

    // Add to profile data
    const profileData = {
      ...profile,
      subscriptionFeatures: {
        profileBoost: profileBoost,
        verifiedBadge: verifiedBadge,
      },
    };
    
    // Cache the profile for future requests
    await cacheUserProfile(userId, profileData);

    res.json({
      status: 'success',
      message: 'Profile retrieved successfully.',
      data: { profile: profileData },
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
          { userId: userId, blockedUserId: viewerId },
          { userId: viewerId, blockedUserId: userId },
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
    
    // Try to get from cache first
    const cachedProfile = await getCachedUserProfile(userId);
    if (cachedProfile) {
      // Still need to check visibility and permissions for each viewer
      // Check profile visibility
      if (!cachedProfile.profileVisible && cachedProfile.userId !== viewerId) {
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
      
      const shouldHideContact = !cachedProfile.withContact || viewer.role !== 'PREMIUM';
      
      // Remove sensitive fields if needed
      const profileData = { ...cachedProfile };
      if (shouldHideContact && cachedProfile.userId !== viewerId) {
        delete profileData.email;
        delete profileData.phone;
      }
      
      return res.json({
        status: 'success',
        message: 'Profile retrieved from cache.',
        data: { profile: profileData },
        fromCache: true
      });
    }

    const profile = await prisma.profile.findUnique({
      where: { userId: userId },
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

    // Add subscription-based features (Profile Boost & Verified Badge)
    const profileBoost = await hasProfileBoost(userId);
    const verifiedBadge = await hasVerifiedBadge(userId);

    // Add to profile data
    profileData.subscriptionFeatures = {
      profileBoost: profileBoost,
      verifiedBadge: verifiedBadge,
    };
    
    // Cache the profile for future requests
    await cacheUserProfile(userId, profileData);

    res.json({
      status: 'success',
      message: 'Profile retrieved successfully.',
      data: { profile: profileData },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get Contact Details of a User
 * GET /api/users/:id/contact
 */
const getContactDetails = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { id: targetUserId } = req.params;

    // Validation
    if (!targetUserId) {
      return res.status(400).json({
        status: "error",
        message: "User ID is required.",
        error: "Invalid user ID.",
      });
    }

    // Cannot view own contact (use profile endpoint instead)
    if (targetUserId === userId) {
      return res.status(400).json({
        status: "error",
        message: "Cannot view your own contact details.",
        error: "Invalid request.",
      });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      return res.status(404).json({
        status: "error",
        message: "User not found or inactive.",
        error: "User does not exist.",
      });
    }

    // Check if interest was sent and contact was unlocked
    const interest = await prisma.interest.findFirst({
      where: {
        fromUserId: userId,
        toUserId: targetUserId,
        contactUnlocked: true,
      },
    });

    if (!interest) {
      return res.status(403).json({
        status: "error",
        message: "Contact details are locked. Send interest to unlock contact.",
        error: "FORBIDDEN",
      });
    }

    // Get profile with contact details
    const profile = await prisma.profile.findUnique({
      where: { userId: targetUserId },
      select: {
        email: true,
        phone: true,
        firstName: true,
        lastName: true,
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
      message: "Contact details retrieved successfully.",
      data: {
        contact: {
          email: profile.email,
          phone: profile.phone,
          name: `${profile.firstName} ${profile.lastName || ""}`.trim(),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createOrUpdateProfile,
  getMyProfile,
  getUserProfile,
  getContactDetails,
};

