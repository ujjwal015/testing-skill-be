const express = require("express");
const router = express.Router()
const { addSection,CreateQuestion,sectionList,changeStatus,QuestionList,getQuestionsBySectionId,updateSection,removeSection,getUpdateSectiondetail
   , bulkUploadQuestionsInQuestionBank, uploadImageFileThroughExcel } = require("../controller/questionController")
const uploadFile = require("../middleware/uploadFiles")

router.post("/create-section",addSection)
// router.post("/create-question", CreateQuestion);
router.post("/change-section-status",changeStatus);
router.get("/section-list",sectionList);
router.get("/question-list",QuestionList);
router.get("/question-by-section",getQuestionsBySectionId);
router.put("/update-section/:id",updateSection);
router.get("/getEditSection-list/:id",getUpdateSectiondetail);
router.delete("/remove-section/:id",removeSection);
router.post("/bulkUploadQuestionsInQuestionBank", uploadFile.single('uploaded_file'), bulkUploadQuestionsInQuestionBank)

router.post("/uploadImageFileThroughExcel", uploadFile.single('imageFile'), uploadImageFileThroughExcel)
 


module.exports = router