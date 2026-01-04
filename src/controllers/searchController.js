const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

/**
 * Search Users with Advanced Filters
 * GET /api/search/users
 */
const searchUsers = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const {
      // Pagination
      page = 1,
      limit = 20,

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
      sortBy = "createdAt", // createdAt, lastActive, age
      order = "desc", // asc, desc
    } = req.query;

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
    if (ageMin || ageMax) {
      const today = new Date();
      if (ageMin) {
        const maxBirthDate = new Date(
          today.getFullYear() - parseInt(ageMin),
          today.getMonth(),
          today.getDate()
        );
        where.dateOfBirth = { ...where.dateOfBirth, lte: maxBirthDate };
      }
      if (ageMax) {
        const minBirthDate = new Date(
          today.getFullYear() - parseInt(ageMax) - 1,
          today.getMonth(),
          today.getDate()
        );
        where.dateOfBirth = { ...where.dateOfBirth, gte: minBirthDate };
      }
    }

    // Gender filter
    if (gender) {
      where.gender = gender.toUpperCase();
    }

    // Height filter
    if (heightMin || heightMax) {
      where.height = {};
      if (heightMin) {
        where.height.gte = parseFloat(heightMin);
      }
      if (heightMax) {
        where.height.lte = parseFloat(heightMax);
      }
    }

    // Marital status filter
    if (maritalStatus) {
      where.maritalStatus = maritalStatus.toUpperCase();
    }

    // Location filters
    if (country) {
      where.country = { contains: country, mode: "insensitive" };
    }
    if (state) {
      where.state = { contains: state, mode: "insensitive" };
    }
    if (city) {
      where.city = { contains: city, mode: "insensitive" };
    }

    // Cultural background filters
    if (religion) {
      where.religion = { contains: religion, mode: "insensitive" };
    }
    if (caste) {
      where.caste = { contains: caste, mode: "insensitive" };
    }
    if (subCaste) {
      where.subCaste = { contains: subCaste, mode: "insensitive" };
    }
    if (community) {
      where.community = { contains: community, mode: "insensitive" };
    }
    if (motherTongue) {
      where.motherTongue = { contains: motherTongue, mode: "insensitive" };
    }

    // Education filter
    if (education) {
      where.education = { contains: education, mode: "insensitive" };
    }

    // Occupation filter
    if (occupation) {
      where.occupation = { contains: occupation, mode: "insensitive" };
    }

    // Income filter
    if (income) {
      where.income = { contains: income, mode: "insensitive" };
    }

    // Lifestyle filters
    if (diet) {
      where.diet = diet.toUpperCase();
    }
    if (smoking !== undefined) {
      where.smoking = smoking === "true";
    }
    if (drinking !== undefined) {
      where.drinking = drinking === "true";
    }

    // Build orderBy clause
    const orderBy = {};
    if (sortBy === "lastActive") {
      orderBy.user = { lastActive: order };
    } else if (sortBy === "age") {
      orderBy.age = order;
    } else {
      orderBy.createdAt = order;
    }

    // Calculate pagination
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
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

    res.json({
      status: "success",
      message: "Search results retrieved successfully.",
      data: {
        profiles: profilesData,
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
 * Get Match Recommendations
 * GET /api/recommendations
 */
const getRecommendations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20 } = req.query;

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

    res.json({
      status: "success",
      message: "Recommendations retrieved successfully.",
      data: {
        profiles: profilesData,
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

module.exports = {
  searchUsers,
  getRecommendations,
};
