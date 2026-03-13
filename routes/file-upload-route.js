const express = require("express");
const router = express.Router()
const { bulkUpload,dowloadfile,uploadImage,deleteImage } = require("../controller/questionController")
const uploadFile=require('../middleware/uploadFiles')
router.post("/bulkupload",uploadFile.single('uploaded_file'), bulkUpload);
router.delete('/deleteImage/:id',deleteImage)
router.post("/images",uploadFile.single('image'),uploadImage)
router.get("/downloadFile",dowloadfile);




module.exports = router