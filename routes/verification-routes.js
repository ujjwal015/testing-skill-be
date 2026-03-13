const express = require("express");
const router = express.Router();
const {
  uploadVerificationAssessment,
  verificationAssessmentList,
  downloadVerificationAssessment,
  uploadVerificationCheckFile,
  getCheckFile,
  uploadVerificationGroupFile,
  getgroupFile,
  uploadVerificationAadharFile,
  getAadharFile,
  uploadAnnexureFile,
  getAnnexureFile,
  uploadVerificationAttendenceFile,
  getAttendenceFile,
  uploadVerificationToolsFile,
  getToolFile,
  uploadVerificationTheoryFile,
  getTheoryFile,
  uploadVerificationPracticalFile,
  getPracticalFile,
  uploadVerificationVivaFile,
  getVivaFile,
  addRemark,
  getRemark,
  //createZipForBatch,
  deleteCheckFileByKey,
  deleteGroupFile,
  deleteTheoryFileByKey,
  deletePracticalFileByKey,
  deleteVivaFileByKey,
  deleteAadharFileByKey,
  deleteAnnexureFileByKey,
  deleteAttendenceFileByKey,
  deleteToolFileByKey,
  getFilteredAssessments,
  assessorNameList,
  uploadVerificationExamcenterFile,
  getExamcenterFile,
  deleteExamcenterFileByKey,
  uploadVerificationTpFile,
  getTpFile,
  deleteTpFileByKey,
  uploadVerificationOtherFile,
  getOtherFile,
  deleteOtherFileByKey,
  uploadVerificationVivaPracticalMarksheet,
  getVivaPracticalMarksheetFile,
  deleteVivaPracticalMarksheetFileByKey,
  checkFileStatusChange,
  deleteVerificationFile,
  getVerificationFiles,
  qaSendReminder,
  getTimeStampId,
  qaGetReminder,
  deleteTimeStampEntry,
  getUploadededFilesCount,
  //deleteRemarkById
} = require("../controller/qa-verificationController");
const uploadFile = require("../middleware/uploadFiles");
//const adminAuth = require('../middleware/adminAuth')
const uploadassesorHandler = require("../middleware/3sassesFileHandler");
const uploadFileHandler = require("../middleware/uploadVideo-file");

router.delete("/deleteVerificationFile", deleteVerificationFile);

router.post(
  "/bulkupload-verificationAssessment",
  uploadFile.single("uploaded_file"),
  uploadVerificationAssessment
);
router.get("/download-verification-samplefile", downloadVerificationAssessment);
router.get("/get-verificationAssementList", verificationAssessmentList);
router.get("/get-filteredVerificationList", getFilteredAssessments);
router.get("/getfilter-AssessorNameList", assessorNameList);

router.post(
  "/upload-checkFile",
  uploadassesorHandler.fields([
    { name: "checkInPhoto" },
    { name: "checkOutPhoto" },
  ]),
  uploadVerificationCheckFile
);

router.get("/get-checkFile/:id", getCheckFile);
// router.get("/get-checkFile", getCheckFile);
router.delete("/remove-checkFile/:id", deleteCheckFileByKey);
router.post(
  "/upload-groupFile",
  uploadassesorHandler.fields([{ name: "groupPhoto" }]),
  uploadVerificationGroupFile
);

router.get("/get-groupFile/:id", getgroupFile);
router.delete("/remove-groupFile/:id", deleteGroupFile);
router.post(
  "/upload-aadharFile",
  uploadassesorHandler.fields([{ name: "aadharPhoto" }]),
  uploadVerificationAadharFile
);

router.get("/get-aadharFile/:id", getAadharFile);
router.delete("/remove-aadharFile/:id", deleteAadharFileByKey);

router.post(
  "/upload-theoryFile",
  uploadFileHandler.fields([{ name: "theoryPhoto" }, { name: "theoryVideo" }]),
  uploadVerificationTheoryFile
);

router.get("/get-theoryFile/:id", getTheoryFile);
router.delete("/remove-theoryFile/:id", deleteTheoryFileByKey);
router.post(
  "/upload-practicalFile",
  uploadFileHandler.fields([
    { name: "practicalPhoto" },
    { name: "practicalVideo" },
  ]),
  uploadVerificationPracticalFile
);
router.get("/get-practicalFile/:id", getPracticalFile);
router.delete("/remove-practicalFile/:id", deletePracticalFileByKey);
router.post(
  "/upload-vivaFile",
  uploadFileHandler.fields([{ name: "vivaPhoto" }, { name: "vivaVideo" }]),
  uploadVerificationVivaFile
);

router.get("/get-vivaFile/:id", getVivaFile);
router.delete("/remove-vivaFile/:id", deleteVivaFileByKey);

router.post(
  "/upload-annexureFile",
  uploadassesorHandler.fields([{ name: "annexureN" }, { name: "annexureM" }]),
  uploadAnnexureFile
);

router.get("/get-annexureFile/:id", getAnnexureFile);
router.delete("/remove-annexureFile/:id", deleteAnnexureFileByKey);
router.post(
  "/upload-attendenceFile",
  uploadassesorHandler.fields([{ name: "attendenceSheet" }]),
  uploadVerificationAttendenceFile
);

router.get("/get-attendenceFile/:id", getAttendenceFile);
router.delete("/remove-attendenceFile/:id", deleteAttendenceFileByKey);

router.post(
  "/upload-toolsFile",
  uploadassesorHandler.fields([{ name: "toolPhoto" }]),
  uploadVerificationToolsFile
);

router.get("/get-toolFile/:id", getToolFile);
router.delete("/remove-toolFile/:id", deleteToolFileByKey);
router.post("/add-remark", addRemark);

router.get("/get-remark/:id", getRemark);
//router.get("/get-qaFileList/:id", createZipForBatch);

router.post(
  "/upload-examcenterFile",
  uploadFileHandler.fields([
    { name: "examcenterPhoto" },
    { name: "examcenterVideo" },
  ]),
  uploadVerificationExamcenterFile
);

router.get("/get-examcenterFile/:id", getExamcenterFile);
router.delete("/remove-examcenterFile/:id", deleteExamcenterFileByKey);

router.post(
  "/upload-tpFile",
  uploadassesorHandler.fields([{ name: "tpPhoto" }]),
  uploadVerificationTpFile
);

router.get("/get-tpFile/:id", getTpFile);
router.delete("/remove-tpFile/:id", deleteTpFileByKey);

router.post(
  "/upload-otherFile",
  uploadassesorHandler.fields([{ name: "otherFile" }]),
  uploadVerificationOtherFile
);

router.get("/get-otherFile/:id", getOtherFile);
router.delete("/remove-otherFile/:id", deleteOtherFileByKey);

//viva,practical marksheet
router.post(
  "/upload-Marksheet",
  uploadFileHandler.fields([
    { name: "vivaMarksheet" },
    { name: "practicalMarksheet" },
  ]),
  uploadVerificationVivaPracticalMarksheet
);

router.get("/get-vivaPracticalMarksheet/:id", getVivaPracticalMarksheetFile);
router.delete(
  "/remove-vivaPracticalMarksheet/:id",
  deleteVivaPracticalMarksheetFileByKey
);
router.put("/change-checkFileStatus", checkFileStatusChange);

router.get("/getVerificationFiles", getVerificationFiles);

router.get("/getTimeStampId", getTimeStampId);

router.post("/qaSendReminder", qaSendReminder);
router.get("/qaGetReminder/:id", qaGetReminder);

router.delete("/deleteTimeStamp/:id", deleteTimeStampEntry);

router.get("/getUploadedFilesCount", getUploadededFilesCount);

module.exports = router;
