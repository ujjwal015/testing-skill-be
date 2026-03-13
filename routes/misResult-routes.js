const express = require("express");
const router = express.Router();

const uploadFile = require("../middleware/uploadFiles");

const {
  misWidgetStats,
  resultPercentageStats,
  batchByMonth,
  resultBatchList,
  getCandiateResultByBatch,
  singleCandidateResult,
  getCandiateNosWiseResultByBatch,
  uploadVivaPracticalResultUpload,
  offlineResultUpload,
  resultBatchListOffline,
  getCandiateResultByBatchOffline,
  singleCandidateResultOffline,
  downloadExcelOfflineByBatch,
  downloadExcelOnlineByBatch,
  candidateActivityByBatch,
  candidateActivityByCandiate,
  onlineResultUpload,
  singleCandidateResultOnline,
  singleQuestion,
  saveSingleQuestion,
  downloadExcelOnlineByBatchWithMarks,
  downloadExcelOfflineByBatchWithMarks,
  resultPercentageStatsNcvtDashboard,
  adminFirstConsole,
  failedCandidateList,
  getAssessmentFeedback,
  downloadExcelOnlineWithCorrectOption,
  downloadBatchResultsAsZip,
  downloadAttendanceSheet,
  downloadExcelOnlineBatch,
  onlineResultBatchList,
  getCandidateListWithQuestion,
  uploadOfflineOMR,
  offlinePortalStats,
  offlineOMRSheetZipDownload

} = require("../controller/mis-result-controller");

router.get("/misWidgetStats/:clientId", misWidgetStats);
router.get("/resultPercentageStats/:clientId", resultPercentageStats);
router.get("/batchByMonth/:clientId", batchByMonth);
router.get("/resultBatchList", resultBatchList);
router.get("/online-result-batchList", onlineResultBatchList);
router.get("/resultBatchListOffline", resultBatchListOffline);
router.get("/getCandiateResultByBatch/:batchId", getCandiateResultByBatch);
router.get("/downloadExcelOnlineBatch/:batchId", downloadExcelOnlineBatch);
router.get(
  "/getCandiateResultByBatchOffline/:batchId",
  getCandiateResultByBatchOffline
);
router.get(
  "/singleCandidateResult/:batchId/:candidateId",
  singleCandidateResult
);
router.get(
  "/singleCandidateResultOffline/:batchId/:candidateId",
  singleCandidateResultOffline
);
router.get(
  "/getCandiateNosWiseResultByBatch/:batchId",
  getCandiateNosWiseResultByBatch
);

router.post(
  "/offlineResultUpload",
  uploadFile.single("result"),
  offlineResultUpload
);
router.post(
  "/onlineResultUpload",
  uploadFile.single("result"),
  onlineResultUpload
);
router.get(
  "/downloadExcelOfflineByBatch/:batchId",
  downloadExcelOfflineByBatch
);
router.get("/downloadExcelOnlineByBatch/:batchId", downloadExcelOnlineByBatch);

router.get(
  "/downloadExcelOnlineByBatchWithMarks/:batchId",
  downloadExcelOnlineByBatchWithMarks
);
router.get(
  "/downloadExcelOfflineByBatchWithMarks/:batchId",
  downloadExcelOfflineByBatchWithMarks
);

router.get(
  "/singleCandidateResultOnline/:batchId/:candidateId",
  singleCandidateResultOnline
);

router.get("/candidateActivityByBatch/:batchId", candidateActivityByBatch);
router.get(
  "/candidateActivityByCandiate/:batchId/:id",
  candidateActivityByCandiate
);

router.get("/singleQuestion/:id/:candidateId/:questionId", singleQuestion);
router.put(
  "/saveSingleQuestion/:id/:candidateId/:questionId",
  saveSingleQuestion
);

router.get(
  "/resultPercentageStats-ncvtDashboard",
  resultPercentageStatsNcvtDashboard
);

router.get("/candidate-list-failed/:batchId", failedCandidateList);
router.post("/admin-first-console", adminFirstConsole);

router.get("/getFeedback/:id/:candidateId", getAssessmentFeedback);

router.get(
  "/download-excel-single-with-correct-option/:batchId/:candidateId",
  downloadExcelOnlineWithCorrectOption
);
router.get(
  "/download-excel-batch-with-correct-option/:batchId",
  downloadBatchResultsAsZip
);
router.get("/download-attendance-sheet/:batchId", downloadAttendanceSheet);


//OMR functionality code
router.get('/getCandidateListWithQuestion/:batchId', getCandidateListWithQuestion)
router.post('/uploadOfflineOMR/:batchId', uploadOfflineOMR)
router.get('/offlinePortalStats/:candidateId', offlinePortalStats)
router.get('/offlineOMRSheetZipDownload/:batchId', offlineOMRSheetZipDownload)


module.exports = router;
