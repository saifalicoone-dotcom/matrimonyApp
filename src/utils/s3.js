const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

// Initialize S3 Client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET_NAME || '';

/**
 * Upload file to S3
 * @param {Buffer} fileBuffer - File buffer
 * @param {String} mimetype - File MIME type
 * @param {String} folder - Folder path in bucket (e.g., 'photos', 'documents')
 * @returns {Promise<String>} S3 URL of uploaded file
 */
const uploadToS3 = async (fileBuffer, mimetype, folder = 'photos') => {
  try {
    // Generate unique filename
    const fileExtension = mimetype.split('/')[1]; // e.g., 'jpeg', 'png'
    const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

    // Upload parameters
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimetype,
      ACL: 'public-read', // Make file publicly accessible
    };

    // Upload to S3
    const command = new PutObjectCommand(uploadParams);
    await s3Client.send(command);

    // Return public URL
    const publicUrl = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${fileName}`;
    return publicUrl;
  } catch (error) {
    console.error('S3 Upload Error:', error);
    throw new Error('Failed to upload file to S3');
  }
};

/**
 * Delete file from S3
 * @param {String} fileUrl - S3 URL of the file
 * @returns {Promise<Boolean>} Success status
 */
const deleteFromS3 = async (fileUrl) => {
  try {
    // Extract key from URL
    // URL format: https://bucket-name.s3.region.amazonaws.com/folder/filename.ext
    const urlParts = fileUrl.split('.com/');
    if (urlParts.length < 2) {
      throw new Error('Invalid S3 URL');
    }
    const key = urlParts[1];

    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await s3Client.send(command);
    return true;
  } catch (error) {
    console.error('S3 Delete Error:', error);
    throw new Error('Failed to delete file from S3');
  }
};

module.exports = {
  uploadToS3,
  deleteFromS3,
  s3Client,
};

