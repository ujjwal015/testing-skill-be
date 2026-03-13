const sharp = require('sharp');
const { sendResponse, errorResponse } = require('./response');
const responseMessage = require('./responseMessage');

/**
 * Remove EXIF data from image files
 * @param {Buffer} imageBuffer - The image buffer
 * @param {string} mimetype - The MIME type of the image
 * @returns {Object} - Processed image buffer and metadata
 */
const removeExifData = async (imageBuffer, mimetype) => {
  try {
    const supportedImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];

    if (!supportedImageTypes.includes(mimetype)) {
      return {
        success: true,
        buffer: imageBuffer,
        processed: false,
        message: 'Non-image file, no EXIF processing required'
      };
    }

    const processedBuffer = await sharp(imageBuffer)
      .toFormat("jpeg", { mozjpeg: true }) // You can adjust this based on mime
      // ⚠️ DO NOT include `.withMetadata()` — sharp removes it by default
      .toBuffer();

    return {
      success: true,
      buffer: processedBuffer,
      processed: true,
      message: 'EXIF data removed',
      originalSize: imageBuffer.length,
      processedSize: processedBuffer.length
    };
  } catch (error) {
    return {
      success: false,
      buffer: imageBuffer,
      processed: false,
      message: `EXIF removal failed: ${error.message}`,
      error: error.message
    };
  }
};

/**
 * Middleware function to process uploaded files and remove EXIF data
 * @param {Object} req - Express request object
 * @param {Object} res - Express response object
 * @param {Function} next - Express next function
 */
const processUploadedImages = async (req, res, next) => {
  try {
    // Process single file
    if (req.file) {
      const result = await removeExifData(req.file.buffer, req.file.mimetype);
      
      if (result.success && result.processed) {
        req.file.buffer = result.buffer;
        req.file.exifRemoved = true;
        req.file.originalSize = result.originalSize;
        req.file.processedSize = result.processedSize;
        
        console.log(`EXIF data removed from ${req.file.originalname}: ${result.originalSize} -> ${result.processedSize} bytes`);
      } else if (!result.success) {
        console.warn(`EXIF removal failed for ${req.file.originalname}: ${result.message}`);
        // Continue with original file if processing fails
        req.file.exifRemoved = false;
      }
    }
    
    // Process multiple files
    if (req.files) {
      // Handle array of files
      if (Array.isArray(req.files)) {
        for (let i = 0; i < req.files.length; i++) {
          const file = req.files[i];
          const result = await removeExifData(file.buffer, file.mimetype);
          
          if (result.success && result.processed) {
            req.files[i].buffer = result.buffer;
            req.files[i].exifRemoved = true;
            req.files[i].originalSize = result.originalSize;
            req.files[i].processedSize = result.processedSize;
            
            console.log(`EXIF data removed from ${file.originalname}: ${result.originalSize} -> ${result.processedSize} bytes`);
          } else if (!result.success) {
            console.warn(`EXIF removal failed for ${file.originalname}: ${result.message}`);
            req.files[i].exifRemoved = false;
          }
        }
      } 
      // Handle object with field names as keys
      else if (typeof req.files === 'object') {
        for (const fieldName in req.files) {
          const filesArray = req.files[fieldName];
          
          for (let i = 0; i < filesArray.length; i++) {
            const file = filesArray[i];
            const result = await removeExifData(file.buffer, file.mimetype);
            
            if (result.success && result.processed) {
              req.files[fieldName][i].buffer = result.buffer;
              req.files[fieldName][i].exifRemoved = true;
              req.files[fieldName][i].originalSize = result.originalSize;
              req.files[fieldName][i].processedSize = result.processedSize;
              
              console.log(`EXIF data removed from ${file.originalname}: ${result.originalSize} -> ${result.processedSize} bytes`);
            } else if (!result.success) {
              console.warn(`EXIF removal failed for ${file.originalname}: ${result.message}`);
              req.files[fieldName][i].exifRemoved = false;
            }
          }
        }
      }
    }
    
    next();
  } catch (error) {
    console.error('Error in processUploadedImages middleware:', error);
    // Continue with original files if middleware fails
    next();
  }
};

/**
 * Process existing image files to remove EXIF data
 * @param {Buffer} imageBuffer - The image buffer
 * @param {string} mimetype - The MIME type of the image
 * @returns {Object} - Processed image information
 */
const processExistingImage = async (imageBuffer, mimetype) => {
  return await removeExifData(imageBuffer, mimetype);
};

/**
 * Batch process multiple images to remove EXIF data
 * @param {Array} images - Array of image objects with buffer and mimetype
 * @returns {Array} - Array of processed image results
 */
const batchProcessImages = async (images) => {
  const results = [];
  
  for (const image of images) {
    const result = await removeExifData(image.buffer, image.mimetype);
    results.push({
      ...result,
      originalName: image.originalName || 'unknown'
    });
  }
  
  return results;
};

module.exports = {
  removeExifData,
  processUploadedImages,
  processExistingImage,
  batchProcessImages
}; 