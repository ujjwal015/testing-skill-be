require("dotenv").config()
const router = require("express").Router();
const newUserAuth = require("../middleware/adminAuth")
const uploadFile = require('../middleware/uploadFiles')
const { getTrainingPartnerName,
   createExamCenter,
   getAllExamCenter,
   examCenterStatusChange,
   updateExamCenter,
   getExamCenterById,
   removeExamCenter,
   getAllExamCenterList,
   createTrainingPartner,
   bulkUploadExamcenter,
   downloadTpTcSampleFile } = require("../controller/exam-center-controller")



router.post("/createexamcenter", newUserAuth, createExamCenter)
router.get("/gettrainingpartnername", newUserAuth, getTrainingPartnerName)
router.get("/getallexamcenters", getAllExamCenter)
router.put("/examcenterstatus/:id", newUserAuth ,examCenterStatusChange);
router.put("/updateexamcenter/:id", newUserAuth,updateExamCenter);
router.get("/getexamcenterbyid/:id",  getExamCenterById)
router.delete("/removeexamcenter/:id", newUserAuth, removeExamCenter)

router.get("/getAllExamCenterList", getAllExamCenterList)
router.post("/create-training-partner", createTrainingPartner)

router.post("/bulkupload-tp-tc", newUserAuth, uploadFile.single('uploaded_file'), bulkUploadExamcenter)
router.get("/download-sampleFile-tp-tc", newUserAuth, downloadTpTcSampleFile)

module.exports = router;