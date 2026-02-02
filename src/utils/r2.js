const {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { v4: uuidv4 } = require("uuid");

// Initialize R2 Client (S3-compatible)
const r2Client = new S3Client({
  region: "auto", // R2 uses 'auto' as region
  endpoint:
    process.env.R2_ENDPOINT ||
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || "",
  },
});

const BUCKET_NAME = process.env.R2_BUCKET_NAME || "";
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL || ""; // Custom domain or public bucket URL

/**
 * Upload file to Cloudflare R2
 * @param {Buffer} fileBuffer - File buffer
 * @param {String} mimetype - File MIME type
 * @param {String} folder - Folder path in bucket (e.g., 'photos', 'documents')
 * @returns {Promise<String>} R2 URL of uploaded file
 */
const uploadToR2 = async (fileBuffer, mimetype, folder = "photos") => {
  try {
    // Generate unique filename
    const fileExtension = mimetype.split("/")[1]; // e.g., 'jpeg', 'png'
    const fileName = `${folder}/${uuidv4()}.${fileExtension}`;

    // Upload parameters
    const uploadParams = {
      Bucket: BUCKET_NAME,
      Key: fileName,
      Body: fileBuffer,
      ContentType: mimetype,
    };

    // Upload to R2
    const command = new PutObjectCommand(uploadParams);
    await r2Client.send(command);

    // Return public URL
    // If custom domain is set, use it; otherwise construct R2 URL
    let publicUrl;
    if (R2_PUBLIC_URL) {
      // Custom domain: https://your-domain.com/folder/filename.ext
      publicUrl = `${R2_PUBLIC_URL.replace(/\/$/, "")}/${fileName}`;
    } else {
      // R2 public bucket URL: https://<bucket>.<account-id>.r2.cloudflarestorage.com/folder/filename.ext
      publicUrl = `https://${BUCKET_NAME}.${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${fileName}`;
    }

    return publicUrl;
  } catch (error) {
    console.error("R2 Upload Error:", error);
    throw new Error("Failed to upload file to R2");
  }
};

/**
 * Delete file from Cloudflare R2
 * @param {String} fileUrl - R2 URL of the file
 * @returns {Promise<Boolean>} Success status
 */
const deleteFromR2 = async (fileUrl) => {
  try {
    // Extract key from URL
    // URL format can be:
    // 1. Custom domain: https://your-domain.com/folder/filename.ext
    // 2. R2 URL: https://bucket.account-id.r2.cloudflarestorage.com/folder/filename.ext

    let key;
    if (R2_PUBLIC_URL && fileUrl.includes(R2_PUBLIC_URL)) {
      // Custom domain URL
      key = fileUrl.replace(R2_PUBLIC_URL.replace(/\/$/, "") + "/", "");
    } else {
      // R2 URL: extract after .com/
      const urlParts = fileUrl.split(".cloudflarestorage.com/");
      if (urlParts.length < 2) {
        // Try alternative format
        const urlParts2 = fileUrl.split(".com/");
        if (urlParts2.length < 2) {
          throw new Error("Invalid R2 URL");
        }
        key = urlParts2[1];
      } else {
        key = urlParts[1];
      }
    }

    const deleteParams = {
      Bucket: BUCKET_NAME,
      Key: key,
    };

    const command = new DeleteObjectCommand(deleteParams);
    await r2Client.send(command);
    return true;
  } catch (error) {
    console.error("R2 Delete Error:", error);
    throw new Error("Failed to delete file from R2");
  }
};

module.exports = {
  uploadToR2,
  deleteFromR2,
  r2Client,
};



