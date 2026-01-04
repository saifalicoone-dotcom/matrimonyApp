const { PrismaClient } = require('@prisma/client');
const { uploadToS3, deleteFromS3 } = require('../utils/s3');

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
        status: 'error',
        message: 'No file uploaded.',
        error: 'Photo file is required.',
      });
    }

    const { buffer, mimetype } = req.file;

    // Upload to S3
    let photoUrl;
    try {
      photoUrl = await uploadToS3(buffer, mimetype, 'photos');
    } catch (error) {
      return res.status(500).json({
        status: 'error',
        message: 'Failed to upload photo to storage.',
        error: error.message,
      });
    }

    // Check if this is the first photo for this user
    const existingPhotos = await prisma.photo.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
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
      status: 'success',
      message: 'Photo uploaded successfully.',
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
      orderBy: [{ isPrimary: 'desc' }, { order: 'asc' }],
    });

    res.json({
      status: 'success',
      message: 'Photos retrieved successfully.',
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
        id: parseInt(photoId),
        userId,
      },
    });

    if (!photo) {
      return res.status(404).json({
        status: 'error',
        message: 'Photo not found.',
        error: 'Photo does not exist or does not belong to you.',
      });
    }

    // Delete from S3
    try {
      await deleteFromS3(photo.url);
    } catch (error) {
      console.error('S3 Delete Error:', error);
      // Continue with database deletion even if S3 delete fails
    }

    // Delete from database
    await prisma.photo.delete({
      where: { id: photo.id },
    });

    // If this was the primary photo, set the first remaining photo as primary
    if (photo.isPrimary) {
      const remainingPhotos = await prisma.photo.findMany({
        where: { userId },
        orderBy: { order: 'asc' },
      });

      if (remainingPhotos.length > 0) {
        await prisma.photo.update({
          where: { id: remainingPhotos[0].id },
          data: { isPrimary: true },
        });
      }
    }

    res.json({
      status: 'success',
      message: 'Photo deleted successfully.',
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
        id: parseInt(photoId),
        userId,
      },
    });

    if (!photo) {
      return res.status(404).json({
        status: 'error',
        message: 'Photo not found.',
        error: 'Photo does not exist or does not belong to you.',
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
      status: 'success',
      message: 'Primary photo updated successfully.',
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
        status: 'error',
        message: 'photoIds must be an array.',
        error: 'Invalid request format.',
      });
    }

    // Verify all photos belong to the user
    const photos = await prisma.photo.findMany({
      where: {
        id: { in: photoIds.map(id => parseInt(id)) },
        userId,
      },
    });

    if (photos.length !== photoIds.length) {
      return res.status(400).json({
        status: 'error',
        message: 'Some photos not found or do not belong to you.',
        error: 'Invalid photo IDs.',
      });
    }

    // Update order for each photo
    const updatePromises = photoIds.map((photoId, index) => {
      return prisma.photo.update({
        where: { id: parseInt(photoId) },
        data: { order: index },
      });
    });

    await Promise.all(updatePromises);

    // Get updated photos
    const updatedPhotos = await prisma.photo.findMany({
      where: { userId },
      orderBy: { order: 'asc' },
    });

    res.json({
      status: 'success',
      message: 'Photos reordered successfully.',
      data: { photos: updatedPhotos },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadPhoto,
  getMyPhotos,
  deletePhoto,
  setPrimaryPhoto,
  reorderPhotos,
};

