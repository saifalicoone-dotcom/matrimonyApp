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

/**
 * @route   PATCH /api/users/me/photos/:photoId/privacy
 * @desc    Toggle photo privacy
 * @access  Protected
 */
router.patch('/:photoId/privacy', authenticate, photoController.togglePhotoPrivacy);

/**
 * @route   GET /api/users/me/photos/access-requests
 * @desc    Get photo access requests (sent/received)
 * @access  Protected
 */
router.get('/access-requests', authenticate, photoController.getPhotoAccessRequests);

/**
 * @route   PATCH /api/users/me/photos/access-requests/:requestId/accept
 * @desc    Accept photo access request
 * @access  Protected
 */
router.patch('/access-requests/:requestId/accept', authenticate, photoController.acceptPhotoAccessRequest);

/**
 * @route   PATCH /api/users/me/photos/access-requests/:requestId/reject
 * @desc    Reject photo access request
 * @access  Protected
 */
router.patch('/access-requests/:requestId/reject', authenticate, photoController.rejectPhotoAccessRequest);

module.exports = router;

