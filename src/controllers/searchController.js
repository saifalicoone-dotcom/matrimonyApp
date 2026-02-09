const { PrismaClient } = require("@prisma/client");
const {
  cacheProfileList,
  getCachedProfileList,
  cacheRecommendations,
  getCachedRecommendations,
} = require('../utils/cache');
const { generateParamsHash } = require('../middleware/cacheMiddleware');

const prisma = new PrismaClient();

/**
 * Search Users with Advanced Filters
 * GET /api/search/users
 */
const searchUsers = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Sanitize and validate request parameters
    const {
      // Pagination
      page,
      limit,

      // Personal Information Filters
      ageMin,
      ageMax,
      gender,
      heightMin,
      heightMax,
      maritalStatus,

      // Location Filters
      country,
      state,
      city,

      // Cultural Background Filters
      religion,
      caste,
      subCaste,
      community,
      motherTongue,

      // Education & Career Filters
      education,
      occupation,
      income,

      // Lifestyle Filters
      diet,
      smoking,
      drinking,

      // Sorting
      sortBy, // createdAt, lastActive, age
      order, // asc, desc
    } = req.query;
    
    // Validate and sanitize values
    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const sanitizedSortBy = ['createdAt', 'lastActive', 'age'].includes(sortBy) ? sortBy : 'createdAt';
    const sanitizedOrder = order && order.toLowerCase() === 'asc' ? 'asc' : 'desc';
    
    // Sanitize filters with proper validation
    const sanitizedAgeMin = ageMin != null && !isNaN(ageMin) && !isNaN(parseInt(ageMin)) ? parseInt(ageMin) : null;
    const sanitizedAgeMax = ageMax != null && !isNaN(ageMax) && !isNaN(parseInt(ageMax)) ? parseInt(ageMax) : null;
    const sanitizedGender = gender && typeof gender === 'string' ? gender.trim().toUpperCase() : null;
    const sanitizedHeightMin = heightMin != null && !isNaN(heightMin) && !isNaN(parseFloat(heightMin)) ? parseFloat(heightMin) : null;
    const sanitizedHeightMax = heightMax != null && !isNaN(heightMax) && !isNaN(parseFloat(heightMax)) ? parseFloat(heightMax) : null;
    const sanitizedMaritalStatus = maritalStatus && typeof maritalStatus === 'string' ? maritalStatus.trim().toUpperCase() : null;
    const sanitizedCountry = country && typeof country === 'string' ? country.trim() : null;
    const sanitizedState = state && typeof state === 'string' ? state.trim() : null;
    const sanitizedCity = city && typeof city === 'string' ? city.trim() : null;
    const sanitizedReligion = religion && typeof religion === 'string' ? religion.trim() : null;
    const sanitizedCaste = caste && typeof caste === 'string' ? caste.trim() : null;
    const sanitizedSubCaste = subCaste && typeof subCaste === 'string' ? subCaste.trim() : null;
    const sanitizedCommunity = community && typeof community === 'string' ? community.trim() : null;
    const sanitizedMotherTongue = motherTongue && typeof motherTongue === 'string' ? motherTongue.trim() : null;
    const sanitizedEducation = education && typeof education === 'string' ? education.trim() : null;
    const sanitizedOccupation = occupation && typeof occupation === 'string' ? occupation.trim() : null;
    const sanitizedIncome = income && typeof income === 'string' ? income.trim() : null;
    const sanitizedDiet = diet && typeof diet === 'string' ? diet.trim().toUpperCase() : null;
    const sanitizedSmoking = smoking != null ? (smoking === 'true' || smoking === '1' || smoking === true) : undefined;
    const sanitizedDrinking = drinking != null ? (drinking === 'true' || drinking === '1' || drinking === true) : undefined;
    
    // Create a hash of the parameters for caching
    const paramsHash = generateParamsHash({
      userId,
      page: pageNum,
      limit: limitNum,
      ageMin: sanitizedAgeMin,
      ageMax: sanitizedAgeMax,
      gender: sanitizedGender,
      heightMin: sanitizedHeightMin,
      heightMax: sanitizedHeightMax,
      maritalStatus: sanitizedMaritalStatus,
      country: sanitizedCountry,
      state: sanitizedState,
      city: sanitizedCity,
      religion: sanitizedReligion,
      caste: sanitizedCaste,
      subCaste: sanitizedSubCaste,
      community: sanitizedCommunity,
      motherTongue: sanitizedMotherTongue,
      education: sanitizedEducation,
      occupation: sanitizedOccupation,
      income: sanitizedIncome,
      diet: sanitizedDiet,
      smoking: sanitizedSmoking,
      drinking: sanitizedDrinking,
      sortBy: sanitizedSortBy,
      order: sanitizedOrder
    });
    
    // Try to get from cache first
    const cachedResults = await getCachedProfileList(paramsHash);
    if (cachedResults) {
      return res.json({
        status: "success",
        message: "Search results retrieved from cache.",
        data: cachedResults,
        fromCache: true
      });
    }

    // Get blocked users list
    const blockedUsers = await prisma.blockList.findMany({
      where: {
        OR: [
          { userId }, // Users I blocked
          { blockedUserId: userId }, // Users who blocked me
        ],
      },
      select: {
        userId: true,
        blockedUserId: true,
      },
    });

    const blockedUserIds = new Set();
    blockedUsers.forEach((block) => {
      if (block.userId === userId) {
        blockedUserIds.add(block.blockedUserId);
      } else {
        blockedUserIds.add(block.userId);
      }
    });

    // Build where clause for filters
    const where = {
      userId: {
        not: userId, // Exclude current user
        notIn: Array.from(blockedUserIds), // Exclude blocked users
      },
      profileVisible: true, // Only visible profiles
      user: {
        isActive: true, // Only active users
      },
    };

    // Age filter (calculated from dateOfBirth)
    if (sanitizedAgeMin != null || sanitizedAgeMax != null) {
      const today = new Date();
      if (sanitizedAgeMin != null) {
        const maxBirthDate = new Date(
          today.getFullYear() - sanitizedAgeMin,
          today.getMonth(),
          today.getDate()
        );
        where.dateOfBirth = { ...where.dateOfBirth, lte: maxBirthDate };
      }
      if (sanitizedAgeMax != null) {
        const minBirthDate = new Date(
          today.getFullYear() - sanitizedAgeMax - 1,
          today.getMonth(),
          today.getDate()
        );
        where.dateOfBirth = { ...where.dateOfBirth, gte: minBirthDate };
      }
    }

    // Gender filter
    if (sanitizedGender) {
      where.gender = sanitizedGender;
    }

    // Height filter
    if (sanitizedHeightMin != null || sanitizedHeightMax != null) {
      where.height = {};
      if (sanitizedHeightMin != null) {
        where.height.gte = sanitizedHeightMin;
      }
      if (sanitizedHeightMax != null) {
        where.height.lte = sanitizedHeightMax;
      }
    }

    // Marital status filter
    if (sanitizedMaritalStatus) {
      where.maritalStatus = sanitizedMaritalStatus;
    }

    // Location filters
    if (sanitizedCountry) {
      where.country = { contains: sanitizedCountry, mode: "insensitive" };
    }
    if (sanitizedState) {
      where.state = { contains: sanitizedState, mode: "insensitive" };
    }
    if (sanitizedCity) {
      where.city = { contains: sanitizedCity, mode: "insensitive" };
    }

    // Cultural background filters
    if (sanitizedReligion) {
      where.religion = { contains: sanitizedReligion, mode: "insensitive" };
    }
    if (sanitizedCaste) {
      where.caste = { contains: sanitizedCaste, mode: "insensitive" };
    }
    if (sanitizedSubCaste) {
      where.subCaste = { contains: sanitizedSubCaste, mode: "insensitive" };
    }
    if (sanitizedCommunity) {
      where.community = { contains: sanitizedCommunity, mode: "insensitive" };
    }
    if (sanitizedMotherTongue) {
      where.motherTongue = { contains: sanitizedMotherTongue, mode: "insensitive" };
    }

    // Education filter
    if (sanitizedEducation) {
      where.education = { contains: sanitizedEducation, mode: "insensitive" };
    }

    // Occupation filter
    if (sanitizedOccupation) {
      where.occupation = { contains: sanitizedOccupation, mode: "insensitive" };
    }

    // Income filter
    if (sanitizedIncome) {
      where.income = { contains: sanitizedIncome, mode: "insensitive" };
    }

    // Lifestyle filters
    if (sanitizedDiet) {
      where.diet = sanitizedDiet;
    }
    if (sanitizedSmoking !== undefined) {
      where.smoking = sanitizedSmoking;
    }
    if (sanitizedDrinking !== undefined) {
      where.drinking = sanitizedDrinking;
    }

    // Build orderBy clause
    const orderBy = {};
    if (sanitizedSortBy === "lastActive") {
      orderBy.user = { lastActive: sanitizedOrder };
    } else if (sanitizedSortBy === "age") {
      orderBy.age = sanitizedOrder;
    } else {
      orderBy.createdAt = sanitizedOrder;
    }

    // Calculate pagination (pageNum and limitNum already defined above)
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const totalCount = await prisma.profile.count({ where });

    // Get profiles
    const profiles = await prisma.profile.findMany({
      where,
      skip,
      take: limitNum,
      orderBy,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            lastActive: true,
          },
        },
      },
    });

    // Hide contact info based on withContact and viewer role
    const viewer = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const profilesData = profiles.map((profile) => {
      const profileData = { ...profile };

      // Hide contact info if needed
      if (!profile.withContact || viewer.role !== "PREMIUM") {
        delete profileData.email;
        delete profileData.phone;
      }

      return profileData;
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limitNum);
    
    // Prepare data for caching
    const responseData = {
      profiles: profilesData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
    
    // Cache the results
    await cacheProfileList(paramsHash, responseData);

    res.json({
      status: "success",
      message: "Search results retrieved successfully.",
      data: responseData,
    });
  } catch (error) {
    console.error('SearchUsers Error:', error);
    
    // Log more detailed error information
    if (error.code || error.message) {
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });
    }
    
    // Send appropriate error response
    if (error.code === 'P2002') {
      // Prisma unique constraint violation
      return res.status(409).json({
        status: 'error',
        message: 'Conflict: Duplicate entry detected.',
        error: error.message,
      });
    } else if (error.code && error.code.startsWith('P')) {
      // Other Prisma errors
      return res.status(400).json({
        status: 'error',
        message: 'Database query error occurred.',
        error: error.message,
      });
    } else {
      // Generic error
      return res.status(500).json({
        status: 'error',
        message: 'An internal server error occurred during search.',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
};

/**
 * Get Match Recommendations
 * GET /api/recommendations
 */
const getRecommendations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;
    
    // Try to get from cache first
    const cachedResults = await getCachedRecommendations(userId);
    if (cachedResults) {
      return res.json({
        status: "success",
        message: "Recommendations retrieved from cache.",
        data: cachedResults,
        fromCache: true
      });
    }

    // Get user's profile
    const userProfile = await prisma.profile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            role: true,
            lastActive: true,
          },
        },
      },
    });

    if (!userProfile) {
      return res.status(404).json({
        status: "error",
        message: "Profile not found. Please create your profile first.",
        error: "Profile does not exist.",
      });
    }

    // Get blocked users list
    const blockedUsers = await prisma.blockList.findMany({
      where: {
        OR: [{ userId }, { blockedUserId: userId }],
      },
      select: {
        userId: true,
        blockedUserId: true,
      },
    });

    const blockedUserIds = new Set();
    blockedUsers.forEach((block) => {
      if (block.userId === userId) {
        blockedUserIds.add(block.blockedUserId);
      } else {
        blockedUserIds.add(block.userId);
      }
    });

    // Get users already shortlisted or sent interest
    const shortlistedUsers = await prisma.shortlist.findMany({
      where: { userId },
      select: { shortlistedUserId: true },
    });

    const interestedUsers = await prisma.interest.findMany({
      where: { fromUserId: userId },
      select: { toUserId: true },
    });

    const excludedUserIds = new Set([
      userId,
      ...Array.from(blockedUserIds),
      ...shortlistedUsers.map((s) => s.shortlistedUserId),
      ...interestedUsers.map((i) => i.toUserId),
    ]);

    // Build recommendation query
    const where = {
      userId: {
        not: userId,
        notIn: Array.from(excludedUserIds),
      },
      profileVisible: true,
      user: {
        isActive: true,
      },
    };

    // Gender preference (opposite gender typically)
    if (userProfile.gender === "MALE") {
      where.gender = { in: ["FEMALE", "OTHER"] };
    } else if (userProfile.gender === "FEMALE") {
      where.gender = { in: ["MALE", "OTHER"] };
    }

    // Age preference (within reasonable range)
    if (userProfile.age) {
      const ageRange = 5; // ±5 years
      const today = new Date();
      const maxBirthDate = new Date(
        today.getFullYear() - (userProfile.age - ageRange),
        today.getMonth(),
        today.getDate()
      );
      const minBirthDate = new Date(
        today.getFullYear() - (userProfile.age + ageRange) - 1,
        today.getMonth(),
        today.getDate()
      );
      where.dateOfBirth = {
        gte: minBirthDate,
        lte: maxBirthDate,
      };
    }

    // Location preference (same country/state if specified)
    if (userProfile.country) {
      where.country = userProfile.country;
    }
    if (userProfile.state) {
      where.state = userProfile.state;
    }

    // Cultural background preference (same religion/caste if specified)
    if (userProfile.religion) {
      where.religion = userProfile.religion;
    }
    if (userProfile.caste) {
      where.caste = userProfile.caste;
    }

    // Education preference (similar or higher education level)
    if (userProfile.education) {
      where.education = {
        contains: userProfile.education,
        mode: "insensitive",
      };
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get total count
    const totalCount = await prisma.profile.count({ where });

    // Get recommended profiles (ordered by relevance: lastActive, then createdAt)
    const profiles = await prisma.profile.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: [{ user: { lastActive: "desc" } }, { createdAt: "desc" }],
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: true,
            lastActive: true,
          },
        },
      },
    });

    // Hide contact info based on withContact and viewer role
    const viewer = await prisma.user.findUnique({
      where: { id: userId },
      select: { role: true },
    });

    const profilesData = profiles.map((profile) => {
      const profileData = { ...profile };

      // Hide contact info if needed
      if (!profile.withContact || viewer.role !== "PREMIUM") {
        delete profileData.email;
        delete profileData.phone;
      }

      return profileData;
    });

    // Calculate total pages
    const totalPages = Math.ceil(totalCount / limitNum);
    
    // Prepare data for caching
    const responseData = {
      profiles: profilesData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total: totalCount,
        totalPages,
        hasNextPage: pageNum < totalPages,
        hasPrevPage: pageNum > 1,
      },
    };
    
    // Cache the recommendations
    await cacheRecommendations(userId, responseData);

    res.json({
      status: "success",
      message: "Recommendations retrieved successfully.",
      data: responseData,
    });
  } catch (error) {
    console.error('GetRecommendations Error:', error);
    
    // Log more detailed error information
    if (error.code || error.message) {
      console.error('Error details:', {
        code: error.code,
        message: error.message,
        stack: error.stack,
      });
    }
    
    // Send appropriate error response
    if (error.code === 'P2002') {
      // Prisma unique constraint violation
      return res.status(409).json({
        status: 'error',
        message: 'Conflict: Duplicate entry detected.',
        error: error.message,
      });
    } else if (error.code && error.code.startsWith('P')) {
      // Other Prisma errors
      return res.status(400).json({
        status: 'error',
        message: 'Database query error occurred.',
        error: error.message,
      });
    } else {
      // Generic error
      return res.status(500).json({
        status: 'error',
        message: 'An internal server error occurred during recommendations.',
        error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error',
      });
    }
  }
};

module.exports = {
  searchUsers,
  getRecommendations,
};
