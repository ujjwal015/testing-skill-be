const multer = require('multer');
const { processUploadedImages } = require('../utils/imageProcessor');

// Memory storage for processing files in memory
const storage = multer.memoryStorage();

/**
 * Create a secure file upload handler with EXIF removal
 * @param {Object} options - Configuration options
 * @param {Array} options.allowedMimes - Array of allowed MIME types
 * @param {number} options.maxSize - Maximum file size in bytes
 * @param {boolean} options.removeExif - Whether to remove EXIF data (default: true)
 * @returns {Object} - Multer upload handler with EXIF processing
 */
const createSecureUploadHandler = (options = {}) => {
  const {
    allowedMimes = [
      'image/jpeg',
      'image/jpg', 
      'image/png',
      'image/gif',
      'image/webp'
    ],
    maxSize = 5 * 1024 * 1024, // 5MB default
    removeExif = true
  } = options;

  const uploadHandler = multer({
    storage: storage,
    fileFilter: (req, file, cb) => {
      // File type validation
      if (!allowedMimes.includes(file.mimetype)) {
        const allowedTypes = allowedMimes.join(', ');
        return cb(new Error(`Invalid file type. Only ${allowedTypes} files are allowed.`));
      }
      
      // File size validation (basic check, actual size checked by multer limits)
      cb(null, true);
    },
    limits: {
      fileSize: maxSize,
      files: 10 // Maximum number of files
    }
  });

  // Return middleware chain that includes EXIF removal
  if (removeExif) {
    return {
      single: (fieldName) => [uploadHandler.single(fieldName), processUploadedImages],
      array: (fieldName, maxCount) => [uploadHandler.array(fieldName, maxCount), processUploadedImages],
      fields: (fields) => [uploadHandler.fields(fields), processUploadedImages],
      any: () => [uploadHandler.any(), processUploadedImages],
      none: () => uploadHandler.none()
    };
  } else {
    return uploadHandler;
  }
};

// Pre-configured handlers for common use cases
const secureImageUpload = createSecureUploadHandler({
  allowedMimes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  maxSize: 5 * 1024 * 1024, // 5MB
  removeExif: true
});

const secureDocumentUpload = createSecureUploadHandler({
  allowedMimes: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ],
  maxSize: 10 * 1024 * 1024, // 10MB
  removeExif: true
});

const secureVideoUpload = createSecureUploadHandler({
  allowedMimes: [
    'image/jpeg',
    'image/jpg', 
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm'
  ],
  maxSize: 50 * 1024 * 1024, // 50MB
  removeExif: true
});

// Legacy compatibility - secure version of existing handlers
const secureUploadHandler = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    
    if (!allowedMimes.includes(file.mimetype)) {
      return cb(new Error('Invalid file type. Only JPEG, JPG, PNG, GIF and WEBP images are allowed.'));
    }
    
    cb(null, true);
  },
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB
  }
});

// Middleware function to be used directly in routes
const secureUploadWithExifRemoval = {
  single: (fieldName) => [secureUploadHandler.single(fieldName), processUploadedImages],
  array: (fieldName, maxCount) => [secureUploadHandler.array(fieldName, maxCount), processUploadedImages],
  fields: (fields) => [secureUploadHandler.fields(fields), processUploadedImages]
};

module.exports = {
  createSecureUploadHandler,
  secureImageUpload,
  secureDocumentUpload,
  secureVideoUpload,
  secureUploadWithExifRemoval,
  secureUploadHandler
}; 