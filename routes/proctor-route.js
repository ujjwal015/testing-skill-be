const express = require("express");
const router = express.Router();
const uploadassesorHandler = require("../middleware/3sassesFileHandler");
const uploadFile = require('../middleware/uploadFiles');
const {
  addProctor,
  proctorList,
  deleteProctor,
  getProctor,
  updateProctor,
  proctorStatusChange,
  proctorFilterList,
  bulkUploadProctor,
  downloadProctorSampleFile
 
} = require("../controller/proctorController");

router.post(
  "/add-proctor",
  uploadassesorHandler.fields([
    { name: "cv" },
    { name: "experienceCertificate" },
    { name: "aadharCard" },
    { name: "panCard" },
    { name: "assessorPhoto"},
    { name: "agreementCertificate"},
    { name: "highSchoolCertificate"},
    {name:"intermediateCertificate"},
    {name:"diplomaCertificate"},
    {name:"undergradCertificate"},
    {name:"postgradCertificate"},
    {name:"otherCertificate"}
  ]),
  addProctor
);
router.put(
  "/update-proctor/:id",
  uploadassesorHandler.fields([
    { name: "cv" },
    { name: "sipCertificate"},
    { name: "experienceCertificate" },
    { name: "aadharCard" },
    { name: "panCard" },
    { name: "assessorPhoto"},
    { name: "agreementCertificate"},
    { name: "highSchoolCertificate"},
    {name:"intermediateCertificate"},
    {name:"diplomaCertificate"},
    {name:"undergradCertificate"},
    {name:"postgradCertificate"},
    {name:"otherCertificate"}
  ]),
  updateProctor
);
router.get("/get-proctor-List", proctorList);
router.delete("/remove-proctor/:id", deleteProctor);
router.get("/get-proctorListById/:id", getProctor);
router.put("/proctor-status/:id", proctorStatusChange);
router.get("/get-filterProctorList", proctorFilterList);

router.post("/bulk-upload-proctor", uploadFile.single('bulkFile'), bulkUploadProctor)
router.get("/proctor-bulk-sample-download", downloadProctorSampleFile)
module.exports = router;
