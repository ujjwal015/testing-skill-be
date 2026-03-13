const express = require("express");
const router = express.Router();

const uploadFile = require("../middleware/uploadFiles");

const {
  updateCandidate,
  increaseExamTime,
  bulkUploadCandidate,
  getCandiateByBatch,
  candidatePasswordReset,
  getRawPassword,
  downloadCandidateBulkUploadFile,
  getCandidateById,
  refreshWrongLoginAttempt,
  candidateListExport,
  candidateListExportPDF,
  changeCandidateStatus,
  getSchemabyBatch,
  deleteCandidate,
  manualCandidateLogout,
  reassignCandidate,
  getLoginToken,
  changeCandidateMultipleStatus,
  deleteMultipleCandidate,
  changeCandidateFaceRecognitionStatus,
  assignCandidateBatchList,
  exportAssignCandidateBatchList,
} = require("../controller/assignBatch-controller");

// added these three routes

router.put("/updateCandidate/:id", updateCandidate);
router.put("/increaseExamTime/:id", increaseExamTime);
router.post(
  "/uploadBulkCandidate/:id/:type",
  uploadFile.single("uploadCandidate"),
  bulkUploadCandidate
);
router.get("/getCandiateByBatch/:id", getCandiateByBatch);
router.put("/refresh-wrongLogin-attempt/:id", refreshWrongLoginAttempt);
router.put("/candidatePasswordReset/:id", candidatePasswordReset);
router.get("/getCandidateById/:id", getCandidateById);
router.get("/getRawPassword/:id", getRawPassword);
router.get(
  "/download-candidate-bulk-upload-file/:type",
  downloadCandidateBulkUploadFile
);
router.post("/candidateListExport/:batchId", candidateListExport);
router.post("/candidateListExportPDF/:batchId", candidateListExportPDF);
router.put("/changeCandidateStatus/:id", changeCandidateStatus);
router.put("/changeMultipleCandidateStatus", changeCandidateMultipleStatus);
router.get("/getSchemebyBatch/:batchId", getSchemabyBatch);
router.delete("/deleteCandidate/:id", deleteCandidate);
router.delete("/deleteMultipleCandidate", deleteMultipleCandidate);
router.put("/manualCandidateLogout/:id", manualCandidateLogout);
router.put("/reassignCandidate/:candidateId", reassignCandidate);
router.put(
  "/disableFaceRecognition/:candidateId",
  changeCandidateFaceRecognitionStatus
);
router.get("/get-asignCandidate-batch-list", assignCandidateBatchList);

router.get(
  "/get-asignCandidate-allExport-list",
  exportAssignCandidateBatchList
);

module.exports = router;
