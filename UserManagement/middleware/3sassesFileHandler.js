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
      "application/pdf",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", // For older Excel formats
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // For newer Excel formats
    ]; // Allowed MIME types
    
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(
        new Error(
          "Invalid file type. Only JPEG, PNG, GIF, WEBP, PDF, DOC, DOCX and Excel files are allowed."
        )
      );
    }
    // File size filter (max 10MB for documents)
    const maxSize = 10 * 1024 * 1024; // 10MB in bytes
    if (file.size > maxSize) {
      return cb(
        new Error("File size exceeds the maximum allowed limit (10MB).")
      );
    } else {
      cb(null, true);
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
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
