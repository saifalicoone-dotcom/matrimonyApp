const multer = require("multer");
const path = require("path");

// Configure multer for memory storage (to upload directly to R2)
const storage = multer.memoryStorage();

// File filter - only allow images
const fileFilter = (req, file, cb) => {
  // Check file type
  const allowedMimeTypes = [
    "image/jpeg",
    "image/jpg",
    "image/png",
    "image/webp",
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Invalid file type. Only JPEG, PNG, and WebP images are allowed."
      ),
      false
    );
  }
};

// Multer configuration
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max file size
  },
});

/**
 * Middleware for single photo upload
 */
const uploadSinglePhoto = upload.single("photo");

/**
 * Middleware for multiple photo upload
 */
const uploadMultiplePhotos = upload.array("photos", 10); // Max 10 photos

/**
 * Error handler for multer errors
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        status: "error",
        message: "File size exceeds 5MB limit.",
        error: "File too large.",
      });
    }
    if (err.code === "LIMIT_FILE_COUNT") {
      return res.status(400).json({
        status: "error",
        message: "Too many files uploaded.",
        error: "Maximum 10 files allowed.",
      });
    }
    return res.status(400).json({
      status: "error",
      message: err.message || "File upload error.",
      error: "Upload failed.",
    });
  }

  if (err) {
    return res.status(400).json({
      status: "error",
      message: err.message || "File upload error.",
      error: "Invalid file.",
    });
  }

  next();
};

module.exports = {
  uploadSinglePhoto,
  uploadMultiplePhotos,
  handleUploadError,
};
