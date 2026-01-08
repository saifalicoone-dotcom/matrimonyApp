const { PrismaClient } = require("@prisma/client");
const { uploadToR2, deleteFromR2 } = require("../utils/r2");

const prisma = new PrismaClient();

/**
 * Upload Photo
 * POST /api/users/me/photos
 */
const uploadPhoto = async (req, res, next) => {
  try {
    const userId = req.user.id;

    if (!req.file) {
      return res.status(400).json({
        status: "error",
        message: "No file uploaded.",
        error: "Photo file is required.",
      });
    }

    const { buffer, mimetype } = req.file;

    // Upload to R2
    let photoUrl;
    try {
      photoUrl = await uploadToR2(buffer, mimetype, "photos");
    } catch (error) {
      return res.status(500).json({
        status: "error",
        message: "Failed to upload photo to storage.",
        error: error.message,
      });
    }

    // Check if this is the first photo for this user
    const existingPhotos = await prisma.photo.findMany({
      where: { userId },
      orderBy: { createdAt: "asc" },
    });

    const isPrimary = existingPhotos.length === 0;
    const order = existingPhotos.length;

    // Create photo record
    const photo = await prisma.photo.create({
      data: {
        userId,
        url: photoUrl,
        isPrimary,
        order,
      },
    });

    res.status(201).json({
      status: "success",
      message: "Photo uploaded successfully.",
      data: { photo },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get My Photos
 * GET /api/users/me/photos
 */
const getMyPhotos = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const photos = await prisma.photo.findMany({
      where: { userId },
      orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
    });

    res.json({
      status: "success",
      message: "Photos retrieved successfully.",
      data: { photos },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete Photo
 * DELETE /api/users/me/photos/:photoId
 */
const deletePhoto = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { photoId } = req.params;

    // Find photo
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        userId,
      },
    });

    if (!photo) {
      return res.status(404).json({
        status: "error",
        message: "Photo not found.",
        error: "Photo does not exist or does not belong to you.",
      });
    }

    // Delete from R2
    try {
      await deleteFromR2(photo.url);
    } catch (error) {
      console.error("R2 Delete Error:", error);
      // Continue with database deletion even if R2 delete fails
    }

    // Delete from database
    await prisma.photo.delete({
      where: { id: photo.id },
    });

    // If this was the primary photo, set the first remaining photo as primary
    if (photo.isPrimary) {
      const remainingPhotos = await prisma.photo.findMany({
        where: { userId },
        orderBy: { order: "asc" },
      });

      if (remainingPhotos.length > 0) {
        await prisma.photo.update({
          where: { id: remainingPhotos[0].id },
          data: { isPrimary: true },
        });
      }
    }

    res.json({
      status: "success",
      message: "Photo deleted successfully.",
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Set Primary Photo
 * PATCH /api/users/me/photos/:photoId/primary
 */
const setPrimaryPhoto = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { photoId } = req.params;

    // Find photo
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        userId,
      },
    });

    if (!photo) {
      return res.status(404).json({
        status: "error",
        message: "Photo not found.",
        error: "Photo does not exist or does not belong to you.",
      });
    }

    // Update all photos to set isPrimary to false
    await prisma.photo.updateMany({
      where: { userId },
      data: { isPrimary: false },
    });

    // Set this photo as primary
    const updatedPhoto = await prisma.photo.update({
      where: { id: photo.id },
      data: { isPrimary: true },
    });

    res.json({
      status: "success",
      message: "Primary photo updated successfully.",
      data: { photo: updatedPhoto },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reorder Photos
 * PATCH /api/users/me/photos/reorder
 */
const reorderPhotos = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { photoIds } = req.body; // Array of photo IDs in new order

    if (!Array.isArray(photoIds)) {
      return res.status(400).json({
        status: "error",
        message: "photoIds must be an array.",
        error: "Invalid request format.",
      });
    }

    // Verify all photos belong to the user
    const photos = await prisma.photo.findMany({
      where: {
        id: { in: photoIds },
        userId,
      },
    });

    if (photos.length !== photoIds.length) {
      return res.status(400).json({
        status: "error",
        message: "Some photos not found or do not belong to you.",
        error: "Invalid photo IDs.",
      });
    }

    // Update order for each photo
    const updatePromises = photoIds.map((photoId, index) => {
      return prisma.photo.update({
        where: { id: photoId },
        data: { order: index },
      });
    });

    await Promise.all(updatePromises);

    // Get updated photos
    const updatedPhotos = await prisma.photo.findMany({
      where: { userId },
      orderBy: { order: "asc" },
    });

    res.json({
      status: "success",
      message: "Photos reordered successfully.",
      data: { photos: updatedPhotos },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle Photo Privacy
 * PATCH /api/users/me/photos/:photoId/privacy
 */
const togglePhotoPrivacy = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { photoId } = req.params;

    // Find photo
    const photo = await prisma.photo.findFirst({
      where: {
        id: photoId,
        userId,
      },
    });

    if (!photo) {
      return res.status(404).json({
        status: "error",
        message: "Photo not found.",
        error: "Photo does not exist or does not belong to you.",
      });
    }

    // Toggle privacy
    const updatedPhoto = await prisma.photo.update({
      where: { id: photo.id },
      data: { isPrivate: !photo.isPrivate },
    });

    res.json({
      status: "success",
      message: `Photo privacy ${
        updatedPhoto.isPrivate ? "enabled" : "disabled"
      } successfully.`,
      data: { photo: updatedPhoto },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get User Photos (with privacy check)
 * GET /api/users/:userId/photos
 */
const getUserPhotos = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const viewerId = req.user.id;

    // Cannot view own photos through this endpoint (use /api/users/me/photos)
    if (userId === viewerId) {
      return res.status(400).json({
        status: "error",
        message: "Use /api/users/me/photos to view your own photos.",
        error: "Invalid endpoint for own photos.",
      });
    }

    // Check if user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      return res.status(404).json({
        status: "error",
        message: "User not found or inactive.",
        error: "User does not exist.",
      });
    }

    // Check if blocked
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
        status: "error",
        message: "Cannot view photos. User is blocked.",
        error: "Blocked user.",
      });
    }

    // Get all photos
    const photos = await prisma.photo.findMany({
      where: { userId },
      orderBy: [{ isPrimary: "desc" }, { order: "asc" }],
    });

    // Check if user has any private photos
    const hasPrivatePhotos = photos.some((photo) => photo.isPrivate);

    if (hasPrivatePhotos) {
      // Check access request status
      const accessRequest = await prisma.photoAccessRequest.findFirst({
        where: {
          requesterId: viewerId,
          ownerId: userId,
        },
        orderBy: { createdAt: "desc" },
      });

      // If access is ACCEPTED, return all photos
      if (accessRequest && accessRequest.status === "ACCEPTED") {
        return res.json({
          status: "success",
          message: "Photos retrieved successfully.",
          data: {
            photos,
            hasPrivatePhotos: true,
            accessGranted: true,
            requestStatus: "ACCEPTED",
          },
        });
      }

      // Return only public photos with request status
      const publicPhotos = photos.filter((photo) => !photo.isPrivate);
      
      let requestStatus = "NONE";
      if (accessRequest) {
        requestStatus = accessRequest.status; // PENDING or REJECTED
      }

      return res.json({
        status: "success",
        message: requestStatus === "PENDING" 
          ? "Some photos are private. Your access request is pending." 
          : "Some photos are private. Request access to view them.",
        data: {
          photos: publicPhotos,
          hasPrivatePhotos: true,
          accessGranted: false,
          requestStatus: requestStatus, // NONE, PENDING, REJECTED, ACCEPTED
          canRequestAccess: requestStatus !== "PENDING", // Show button only if not pending
        },
      });
    }

    // No private photos, return all
    res.json({
      status: "success",
      message: "Photos retrieved successfully.",
      data: {
        photos,
        hasPrivatePhotos: false,
        accessGranted: true,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Request Access to Private Photos
 * POST /api/users/:userId/photos/request-access
 */
const requestPhotoAccess = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const requesterId = req.user.id;

    // Cannot request access to own photos
    if (userId === requesterId) {
      return res.status(400).json({
        status: "error",
        message: "Cannot request access to your own photos.",
        error: "Invalid request.",
      });
    }

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, isActive: true },
    });

    if (!targetUser || !targetUser.isActive) {
      return res.status(404).json({
        status: "error",
        message: "User not found or inactive.",
        error: "User does not exist.",
      });
    }

    // Check if user has private photos
    const privatePhotosCount = await prisma.photo.count({
      where: {
        userId,
        isPrivate: true,
      },
    });

    if (privatePhotosCount === 0) {
      return res.status(400).json({
        status: "error",
        message: "User does not have any private photos.",
        error: "No private photos to request access for.",
      });
    }

    // Check if request already exists
    const existingRequest = await prisma.photoAccessRequest.findFirst({
      where: {
        requesterId,
        ownerId: userId,
      },
    });

    if (existingRequest) {
      if (existingRequest.status === "PENDING") {
        return res.status(409).json({
          status: "error",
          message: "Access request already pending.",
          error: "Duplicate request.",
        });
      } else if (existingRequest.status === "ACCEPTED") {
        return res.status(409).json({
          status: "error",
          message: "You already have access to these photos.",
          error: "Access already granted.",
        });
      } else {
        // REJECTED - allow new request
        const newRequest = await prisma.photoAccessRequest.update({
          where: { id: existingRequest.id },
          data: {
            status: "PENDING",
            updatedAt: new Date(),
          },
        });

        // Create notification for photo owner
        try {
          await prisma.notification.create({
            data: {
              userId,
              type: "photo_access_request",
              title: "Photo Access Request",
              message: `Someone requested access to your private photos.`,
              relatedUserId: requesterId,
            },
          });
        } catch (notifError) {
          console.error("Notification creation error:", notifError);
        }

        return res.status(201).json({
          status: "success",
          message: "Access request sent successfully.",
          data: { request: newRequest },
        });
      }
    }

    // Create new request
    const request = await prisma.photoAccessRequest.create({
      data: {
        requesterId,
        ownerId: userId,
        status: "PENDING",
      },
    });

    // Create notification for photo owner
    try {
      await prisma.notification.create({
        data: {
          userId,
          type: "photo_access_request",
          title: "Photo Access Request",
          message: `Someone requested access to your private photos.`,
          relatedUserId: requesterId,
        },
      });
    } catch (notifError) {
      console.error("Notification creation error:", notifError);
    }

    res.status(201).json({
      status: "success",
      message: "Access request sent successfully.",
      data: { request },
    });
  } catch (error) {
    if (error.code === "P2002") {
      return res.status(409).json({
        status: "error",
        message: "Access request already exists.",
        error: "Duplicate request.",
      });
    }
    next(error);
  }
};

/**
 * Get Photo Access Requests
 * GET /api/users/me/photos/access-requests
 */
const getPhotoAccessRequests = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { type = "all", page = 1, limit = 20 } = req.query; // type: 'sent', 'received', 'all'

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    let where = {};
    if (type === "sent") {
      where = { requesterId: userId };
    } else if (type === "received") {
      where = { ownerId: userId };
    } else {
      where = {
        OR: [{ requesterId: userId }, { ownerId: userId }],
      };
    }

    // Get total count
    const totalCount = await prisma.photoAccessRequest.count({ where });

    // Get requests
    const requests = await prisma.photoAccessRequest.findMany({
      where,
      skip,
      take: limitNum,
      orderBy: { createdAt: "desc" },
      include: {
        requester: {
          select: {
            id: true,
            email: true,
            photos: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
        owner: {
          select: {
            id: true,
            email: true,
            photos: {
              where: { isPrimary: true },
              take: 1,
              select: { url: true },
            },
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const totalPages = Math.ceil(totalCount / limitNum);

    res.json({
      status: "success",
      message: "Access requests retrieved successfully.",
      data: {
        requests,
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
 * Accept Photo Access Request
 * PATCH /api/users/me/photos/access-requests/:requestId/accept
 */
const acceptPhotoAccessRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    // Find request
    const request = await prisma.photoAccessRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({
        status: "error",
        message: "Access request not found.",
        error: "Request does not exist.",
      });
    }

    // Check if user is the owner
    if (request.ownerId !== userId) {
      return res.status(403).json({
        status: "error",
        message: "You can only accept requests for your own photos.",
        error: "Unauthorized action.",
      });
    }

    // Check if already processed
    if (request.status !== "PENDING") {
      return res.status(400).json({
        status: "error",
        message: `Request is already ${request.status.toLowerCase()}.`,
        error: "Request already processed.",
      });
    }

    // Update request status
    const updatedRequest = await prisma.photoAccessRequest.update({
      where: { id: request.id },
      data: { status: "ACCEPTED" },
      include: {
        requester: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Create notification for requester
    try {
      await prisma.notification.create({
        data: {
          userId: request.requesterId,
          type: "photo_access_accepted",
          title: "Photo Access Granted",
          message: `Your request to view private photos has been accepted.`,
          relatedUserId: userId,
        },
      });
    } catch (notifError) {
      console.error("Notification creation error:", notifError);
    }

    res.json({
      status: "success",
      message: "Access request accepted successfully.",
      data: { request: updatedRequest },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Reject Photo Access Request
 * PATCH /api/users/me/photos/access-requests/:requestId/reject
 */
const rejectPhotoAccessRequest = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { requestId } = req.params;

    // Find request
    const request = await prisma.photoAccessRequest.findUnique({
      where: { id: requestId },
    });

    if (!request) {
      return res.status(404).json({
        status: "error",
        message: "Access request not found.",
        error: "Request does not exist.",
      });
    }

    // Check if user is the owner
    if (request.ownerId !== userId) {
      return res.status(403).json({
        status: "error",
        message: "You can only reject requests for your own photos.",
        error: "Unauthorized action.",
      });
    }

    // Check if already processed
    if (request.status !== "PENDING") {
      return res.status(400).json({
        status: "error",
        message: `Request is already ${request.status.toLowerCase()}.`,
        error: "Request already processed.",
      });
    }

    // Update request status
    const updatedRequest = await prisma.photoAccessRequest.update({
      where: { id: request.id },
      data: { status: "REJECTED" },
      include: {
        requester: {
          select: {
            id: true,
            email: true,
            profile: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    // Create notification for requester
    try {
      await prisma.notification.create({
        data: {
          userId: request.requesterId,
          type: "photo_access_rejected",
          title: "Photo Access Denied",
          message: `Your request to view private photos has been declined.`,
          relatedUserId: userId,
        },
      });
    } catch (notifError) {
      console.error("Notification creation error:", notifError);
    }

    res.json({
      status: "success",
      message: "Access request rejected successfully.",
      data: { request: updatedRequest },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadPhoto,
  getMyPhotos,
  getUserPhotos,
  deletePhoto,
  setPrimaryPhoto,
  reorderPhotos,
  togglePhotoPrivacy,
  requestPhotoAccess,
  getPhotoAccessRequests,
  acceptPhotoAccessRequest,
  rejectPhotoAccessRequest,
};
