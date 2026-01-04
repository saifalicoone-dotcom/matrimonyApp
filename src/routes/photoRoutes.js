const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const { authenticate } = require('../middleware/auth');
const { uploadSinglePhoto, handleUploadError } = require('../middleware/upload');

/**
 * @route   POST /api/users/me/photos
 * @desc    Upload a photo
 * @access  Protected
 */
router.post('/', authenticate, uploadSinglePhoto, handleUploadError, photoController.uploadPhoto);

/**
 * @route   GET /api/users/me/photos
 * @desc    Get my photos
 * @access  Protected
 */
router.get('/', authenticate, photoController.getMyPhotos);

/**
 * @route   DELETE /api/users/me/photos/:photoId
 * @desc    Delete a photo
 * @access  Protected
 */
router.delete('/:photoId', authenticate, photoController.deletePhoto);

/**
 * @route   PATCH /api/users/me/photos/:photoId/primary
 * @desc    Set photo as primary
 * @access  Protected
 */
router.patch('/:photoId/primary', authenticate, photoController.setPrimaryPhoto);

/**
 * @route   PATCH /api/users/me/photos/reorder
 * @desc    Reorder photos
 * @access  Protected
 */
router.patch('/reorder', authenticate, photoController.reorderPhotos);

module.exports = router;

