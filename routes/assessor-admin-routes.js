require("dotenv").config()
const router = require("express").Router();
const uploadHandler=require("../middleware/3sfileHandler");
const uploadassesorHandler = require("../middleware/3sassesFileHandler");
const adminAuth = require("../middleware/adminAuth");
const {//getAssesor,
    //onboardedAssessorList,
    updateAssessorPersonalDetail,
    updateAssessorExperience,
    addAssessorExperience,
    updateAssessorEducation,
    updateAssessorAgreement,
    updateAssessorBankDetails,
    updateAssessorProfile,
    addAssessorEducation,
    addAssessorJobrole,
    getAssessorExperience,
    getAssessorPersonalDetailById,
    deleteAssessorExperienceById,
    deleteAssessorBankById,
    deleteAssessorEducation,
    getAssessorJobrole,
    getAssessorEducation,
    deleteAssessorPersonalDetailById,
    addAssessorPersonalDetail,
    deleteAssessorJobroleById,
    updateAssessorJobrole,
    deleteAssessorAgreement,
    addAssessorAgreement,
    getAssessorAgreement,
    getAssessorBankDetails,
    getAssessorProfileById,
    addAssessorBasicDetails,
    updateAssessorBasicDetails,
    assessorAdminList,
    checkAssessorFileStatusChange,
    assessorAdminVerifiedList,
    assessorStatus,
    removeAssessor,
    bulkUploadAssessor,
    dowloadAssessorSampleFile,
    updateAssessorCommunicationStatus,
    getAssesorPassword,
    unlockAssessorAdminAccount,
    unlockOtpLockout,
    getOtpSecurityStatus,
    downloadAssessorCV,
    masterExportCVs
    } = require("../controller/assessor-adminController");
    const uploadFile = require('../middleware/uploadFiles')
router.put(
  "/update-assessorPersonalDetail",
  uploadassesorHandler.fields([
    { name: "card" },
  ]),
  updateAssessorPersonalDetail
);
  //add personalDetails
  router.post(
    "/add-assessorPersonalDetail/:id",
    uploadassesorHandler.fields([
      { name: "card" }
    ]),
    addAssessorPersonalDetail
  );
  router.put(
    "/update-assessorExperience",
    uploadassesorHandler.fields([
      { name: "experienceCertificate" },
    ]),
    updateAssessorExperience
  );

  
  router.put(
    "/update-assessorEducation",
    uploadassesorHandler.fields([
      { name:"educationCertificate"}
    ]),
    updateAssessorEducation
  ); 
  
  router.put(
    "/update-assessorBankDetails/:id",
   updateAssessorBankDetails
  );

  router.put(
    "/update-assessorProfile/:id",
    uploadassesorHandler.fields([
      { name: "assessorPhoto"}
    ]),
    updateAssessorProfile
  );

  router.post(
    "/add-assessorExperience/:id",
    uploadassesorHandler.fields([
      { name: "experienceCertificate" },
    ]),
    addAssessorExperience
  );

  router.get("/getAssesor-experienceList/:id",getAssessorExperience);

  router.post(
    "/add-assessorEducation/:id",
    uploadassesorHandler.fields([
      { name: "educationCertificate"}
    ]),
    addAssessorEducation
  );

  router.get("/getAssesor-educationList/:id",getAssessorEducation);

  router.post(
    "/add-assessorJobrole/:id",
    uploadassesorHandler.fields([
      { name: "jobRoleCertificate"}
    ]),
    addAssessorJobrole
  );
  router.get("/getAssesor-jobRoleDetailList/:id",getAssessorJobrole);
  router.put(
    "/update-assessorJobrole",
    uploadassesorHandler.fields([
      { name: "jobRoleCertificate"}
    ]),
    updateAssessorJobrole
  );
  router.get("/getAssesor-personalDetailList/:id",getAssessorPersonalDetailById);
  
  router.delete("/deleteAssesor-experienceList",deleteAssessorExperienceById);//personalDetailList
   
  router.delete("/deleteAssesor-bankDetail/:id",deleteAssessorBankById);
  router.delete("/deleteAssesor-educationDetail",deleteAssessorEducation);
  router.delete("/deleteAssesor-personalDetailList",deleteAssessorPersonalDetailById);//personalDetailList
  
  router.delete("/deleteAssesor-jobRoleList",deleteAssessorJobroleById);

  router.delete("/deleteAssesor-agreementList",deleteAssessorAgreement);

  router.post(
    "/add-assessorAgreement/:id",
    uploadassesorHandler.fields([
      { name: "agreementCertificate"}
    ]),
    addAssessorAgreement
  );

  router.put(
    "/update-assessorAgreement",
    uploadassesorHandler.fields([
      { name: "agreementCertificate"}
    ]),
    updateAssessorAgreement
  );

  router.get("/getAssesor-agreementList/:id",getAssessorAgreement);
  router.get("/getAssesor-BankDetailList/:id",getAssessorBankDetails);
  
  router.get("/getAssesor-profileList/:id",getAssessorProfileById);

  router.post(
    "/add-assessorBasicDetails",
    uploadassesorHandler.fields([
      { name: "assessorPhoto"}
    ]),
    addAssessorBasicDetails
  );

  router.put(
    "/update-assessorBasicDetails/:id",
    uploadassesorHandler.fields([
      { name: "assessorPhoto"}
    ]),
    updateAssessorBasicDetails
  );

  router.get("/get-assessorAdminList", assessorAdminList);
  router.put("/change-checkAssessorFileStatus", checkAssessorFileStatusChange);//checkAssesorFileStatusChange?
  router.get("/get-assessorAdminVerifiedList", assessorAdminVerifiedList);                        //assessorAdminVerifiedList
  router.put("/assessor-status/:id", assessorStatus);
  router.delete("/remove-assessor/:id", removeAssessor);

router.get("/assessor-bulk-sample-download", dowloadAssessorSampleFile)
router.post("/bulk-upload-assessor", uploadFile.single('bulkFile'), bulkUploadAssessor)
  
router.put("/update-assessor-communication-status/:assessorId", updateAssessorCommunicationStatus);

router.get("/get-password/:assessorId", getAssesorPassword);

router.put("/assessor-unlock-account/:id", adminAuth, unlockAssessorAdminAccount);

// OTP Security Admin Routes
router.post("/unlock-otp-lockout/:assessorId", adminAuth, unlockOtpLockout);
router.get("/otp-security-status/:assessorId", adminAuth, getOtpSecurityStatus);

// Download CV by Assessor ID
router.get("/download-assessor-cv/:assessorId", downloadAssessorCV);

// Master Export CVs as ZIP
router.get("/master-export-assessors-cvs", masterExportCVs);

module.exports = router;