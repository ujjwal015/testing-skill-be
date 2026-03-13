const multer = require("multer");
const { processUploadedImages } = require('../utils/imageProcessor');

const storage = multer.memoryStorage();
const uploadHandler = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "video/mp4",
      "video/webm",
    ]; // Allowed MIME types

    if (!allowedMimes.includes(file.mimetype)) {
      return cb(
        new Error(
          "Invalid file type. Only JPEG, PNG, WEBP, GIF images and MP4/WEBM videos are allowed."
        )
      );
    }
    // File size filter (max 50MB for video content)
    const maxSize = 50 * 1024 * 1024; // 50MB in bytes
    if (file.size > maxSize) {
      return cb(
        new Error("File size exceeds the maximum allowed limit (50MB).")
      );
    } else {
      cb(null, true);
    }
  },
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  }
});

// Enhanced upload handler with EXIF removal for images
const secureUploadHandler = {
  single: (fieldName) => [uploadHandler.single(fieldName), processUploadedImages],
  array: (fieldName, maxCount) => [uploadHandler.array(fieldName, maxCount), processUploadedImages],
  fields: (fields) => [uploadHandler.fields(fields), processUploadedImages]
};

// Export both for backward compatibility and new secure functionality
module.exports = uploadHandler;
module.exports.secure = secureUploadHandler;
