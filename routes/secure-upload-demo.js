const express = require('express');
const router = express.Router();
const { sendResponse, errorResponse } = require('../utils/response');
const responseMessage = require('../utils/responseMessage');

// Import the new secure upload handlers
const { secureImageUpload, secureDocumentUpload, secureUploadWithExifRemoval } = require('../middleware/secureFileHandler');

/**
 * Demo route for secure single image upload with EXIF removal
 */
router.post('/secure-image-single', secureImageUpload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(res, 400, 'No file uploaded', 'Please select an image file');
    }

    const fileInfo = {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      exifRemoved: req.file.exifRemoved || false,
      originalSize: req.file.originalSize,
      processedSize: req.file.processedSize,
      sizeReduction: req.file.originalSize && req.file.processedSize 
        ? req.file.originalSize - req.file.processedSize 
        : 0
    };

    return sendResponse(res, 200, 'Image uploaded successfully with EXIF data removed', fileInfo);
  } catch (error) {
    console.error('Error in secure image upload:', error);
    return errorResponse(res, 500, 'Upload failed', error.message);
  }
});

/**
 * Route to get information about EXIF removal capabilities
 */
router.get('/exif-info', (req, res) => {
  const info = {
    supportedImageTypes: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
    features: [
      'Automatic EXIF data removal from uploaded images',
      'GPS coordinates removal',
      'Camera information removal',
      'Timestamp metadata removal',
      'Device information removal',
      'File size optimization'
    ],
    securityBenefits: [
      'Prevents location tracking through GPS coordinates',
      'Protects device privacy information',
      'Removes potentially sensitive metadata',
      'Reduces file sizes',
      'Complies with privacy regulations'
    ]
  };

  return sendResponse(res, 200, 'EXIF removal information', info);
});

module.exports = router;