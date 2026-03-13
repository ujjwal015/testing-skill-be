 const multer = require("multer");
const storage = multer.memoryStorage();
const uploadHandler = multer({
  storage: storage,
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/msword",
      "video/mp4", // Allow .mp4 video files
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel", // For older Excel formats
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // For newer Excel formats
    ]; // Allowed MIME types

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only JPEG, PNG, PDF, DOC, DOCX, GIF images, and MP4 videos are allowed."));
    }
  },
});

module.exports = uploadHandler;
