const multer = require('multer')
const { processUploadedImages } = require('../utils/imageProcessor')

const storage = multer.memoryStorage()
const uploadHandler = multer({ 
        storage:storage,
        fileFilter: (req, file, cb) => {
            // File type filter
            const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']; // Allowed MIME types
            if (!allowedMimes.includes(file.mimetype)) {
              return cb(new Error('Invalid file type. Only JPEG, PNG, GIF and WEBP images are allowed.'));
            }
            
            // File size filter (max 5MB)
            const maxSize = 5 * 1024 * 1024; // 5MB in bytes
            if(file.size > maxSize) {
              return cb(new Error('File size exceeds the maximum allowed limit (5MB).'));
            }
            else{ 
                cb(null, true); 
            }
           
          },
        limits: {
            fileSize: 5 * 1024 * 1024 // 5MB
        }
})

// Enhanced upload handler with EXIF removal
const secureUploadHandler = {
    single: (fieldName) => [uploadHandler.single(fieldName), processUploadedImages],
    array: (fieldName, maxCount) => [uploadHandler.array(fieldName, maxCount), processUploadedImages],
    fields: (fields) => [uploadHandler.fields(fields), processUploadedImages]
}

// Export both for backward compatibility and new secure functionality
module.exports = uploadHandler
module.exports.secure = secureUploadHandler



