const express = require('express');
const router = express.Router();
const photoController = require('../controllers/photoController');
const { authenticate } = require('../middleware/auth');
const { uploadSinglePhoto, handleUploadError } = require('../middleware/upload');
const {
  photoPrivacyValidation,
  uuidParamValidation,
  paginationValidation,
} = require('../middleware/validationSchemas');
const validateRequest = require('../middleware/validateRequest');

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
router.delete(
  '/:photoId',
  authenticate,
  uuidParamValidation('photoId'),
  validateRequest,
  photoController.deletePhoto
);

/**
 * @route   PATCH /api/users/me/photos/:photoId/primary
 * @desc    Set photo as primary
 * @access  Protected
 */
router.patch(
  '/:photoId/primary',
  authenticate,
  uuidParamValidation('photoId'),
  validateRequest,
  photoController.setPrimaryPhoto
);

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
router.patch(
  '/:photoId/privacy',
  authenticate,
  photoPrivacyValidation,
  validateRequest,
  photoController.togglePhotoPrivacy
);

/**
 * @route   GET /api/users/me/photos/access-requests
 * @desc    Get photo access requests (sent/received)
 * @access  Protected
 */
router.get(
  '/access-requests',
  authenticate,
  paginationValidation,
  validateRequest,
  photoController.getPhotoAccessRequests
);

/**
 * @route   PATCH /api/users/me/photos/access-requests/:requestId/accept
 * @desc    Accept photo access request
 * @access  Protected
 */
router.patch(
  '/access-requests/:requestId/accept',
  authenticate,
  uuidParamValidation('requestId'),
  validateRequest,
  photoController.acceptPhotoAccessRequest
);

/**
 * @route   PATCH /api/users/me/photos/access-requests/:requestId/reject
 * @desc    Reject photo access request
 * @access  Protected
 */
router.patch(
  '/access-requests/:requestId/reject',
  authenticate,
  uuidParamValidation('requestId'),
  validateRequest,
  photoController.rejectPhotoAccessRequest
);

module.exports = router;

