const express = require("express");
const router = express.Router();
const {  
    createZipForBatch,
    createAuditDataZip, 
    downloadAttendance,
    downloadResultSheet,
    downloadExcelOnlineByBatchWithMarksAudit,
    downloadOMRSheet
  } = require("../controller/qa-verificationController");


router.get("/get-qaFileList/:id", createZipForBatch);
router.get("/get-audit-data/:id", createAuditDataZip);   /// id is batchId
router.get("/download-attendance-pdf/:id", downloadAttendance);  /// id is batchId
router.get("/download-result-pdf/:id", downloadResultSheet);  /// id is batchId
router.get(
  "/downloadExcelOnlineByBatchWithMarksAudit/:batchId",
  downloadExcelOnlineByBatchWithMarksAudit
);
router.get("/download-omr/:id", downloadOMRSheet);  /// id is batchId

module.exports = router;
