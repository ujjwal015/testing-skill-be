const express = require("express");
const router = express.Router();
const uploadHandler = require("../middleware/suspisiousFileHandler");
const uploadProctoFileHandler = require("../middleware/proctorLogFileHandler");
const suspiciousActivityController = require("../controller/suspicious-activity-capturing-controller");

// Import secure upload handlers for EXIF removal
const { secureUploadWithExifRemoval } = require("../middleware/secureFileHandler");

// Route to handle image uploads with EXIF removal
router.post(
  "/suspicous-activity-image-capturing/:candidateId",
  uploadHandler.secure.single("image"),
  suspiciousActivityController.uploadImage
);

// Legacy route (deprecated - use above for better security)
router.post(
  "/legacy/suspicous-activity-image-capturing/:candidateId",
  uploadHandler.single("image"),
  suspiciousActivityController.uploadImage
);

router.get(
  "/suspicous-activity-image-capturing/:candidateId",
  suspiciousActivityController.getSuspiciousImageByCandidateId
);

// Route to handle video uploads
router.post(
  "/activity-video-capturing/:candidateId",
  uploadHandler.single("video"),
  suspiciousActivityController.uploadVideo
);

router.get(
  "/activity-video-capturing/:candidateId",
  suspiciousActivityController.getSuspiciousVideoByCandidateId
);

//Route to upload and download file
router.get(
  "/activity-capturing-candidate-file-dowload/:candidateId",
  suspiciousActivityController.createZipForCandidate
);

router.get(
  "/activity-capturing-batch-file-dowload/:batchId",
  suspiciousActivityController.createZipForBatch
);

router.post(
  "/activity-practical-upload-image/:candidateId/:batchId",
  uploadProctoFileHandler.secure.array("image"),
  suspiciousActivityController.uploadPracticalImage
);

router.post(
  "/activity-practical-upload-video/:candidateId/:batchId",
  uploadProctoFileHandler.array("video"),
  suspiciousActivityController.uploadPracticalVideo
);


router.post(
  "/activity-viva-upload-image/:candidateId/:batchId",
  uploadProctoFileHandler.secure.array("image"),
  suspiciousActivityController.uploadVivaImage
);

router.post(
  "/activity-viva-upload-video/:candidateId/:batchId",
  uploadProctoFileHandler.array("video"),
  suspiciousActivityController.uploadVivaVideo
);

router.post(
  "/activity-theory-upload-image/:candidateId",
  uploadHandler.secure.array("image"),
  suspiciousActivityController.uploadTheoryFile
);

router.post(
  "/activity-theory-upload-video/:candidateId",
  uploadHandler.array("video"),
  suspiciousActivityController.uploadTheoryVideoFile
);

module.exports = router;
