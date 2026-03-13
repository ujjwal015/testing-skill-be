const express = require("express");
const router = express.Router();
// const uploadFile = require("../middleware/uploadFiles");
// const upload = require("../middleware/uploadFiles");
// const uploadHandler = require("../middleware/3sfileHandler");
const uploadFile = require('../middleware/uploadFiles')
const uploadassesorHandler = require("../middleware/3sassesFileHandler");
const {
  addAssesor,
  assessorList,
  deleteAssessor,
  //getAssessor,
  updateAssessor,
  assessorStatusChange,
  uploadfile,
  getfile,
  getassessorfile,
  getAssessorById,
  assessorFilterList,

 
} = require("../controller/assessorController");

router.post("/upload-file", uploadassesorHandler.single('sipCertificate'), uploadfile);
router.post(
  "/add-assessor",
  uploadassesorHandler.fields([
    { name: "cv" },
    { name: "sipCertificate"},
    { name: "educationCertificate" },
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
    {name:"otherCertificate"},
    {name:"tpDeclaration"},
    {name:"examcenter"},

  ]),
  addAssesor
);

router.put(
  "/update-assessor/:id",
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
  updateAssessor
);
router.get("/get-assessorList", assessorList);
router.delete("/remove-admin-assessor/:id", deleteAssessor);
router.get("/get-assessorListById/:id", getAssessorById);
router.put("/assessor-adminstatus/:id", assessorStatusChange);
router.get("/get-sipList", getfile);
router.get("/get-assessorFileUrl", getassessorfile);
router.get("/get-filterAssessorList", assessorFilterList);




module.exports = router;


