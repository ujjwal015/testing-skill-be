const express = require("express");
const router = express.Router();
const fileUploader = require('../middleware/3sfileHandler.js')
const uploadFile=require('../middleware/uploadFiles.js')
const {createQuestion,questionList,updateQuestion,
    getUpdateQuestionBankdetail,removeQuestion,
    questionStatus,bulkUploadQuestionsInQB,
    bulkUploadVivaqb,downloadTheoryQuestionSampleFile,
    uploadQuestionOption,getQuestionOptions,
    deleteOptionImage,
    getQuestionsByQuestionBankId,
    downloadVivaQuestionSampleFile,
    downloadPracticalQuestionSampleFile,
    updateVivaQuestion,
    removeVivaQuestion,
    updatePracticalQuestion,
    removePracticalQuestion,
    getVivaQuestionById,
    getPracticalQuestionById,



    moreLangBulkUploadQuestionTheory,
    downloadMoreLangExcelFile,
    downloadExcelFileMoreLangPracticalViva,
    moreLangBulkUploadQuestionPracticalViva,

    qbStatus,

} = require("../controller/question-creation-controller.js") //,bulkUploadqb
//const { addSection,CreateQuestion,sectionList,changeStatus,QuestionList,getQuestionsBySectionId,updateSection,removeSection,updateQuestion,removeQuestion,getUpdateSectiondetail,getUpdateQuestiondetail} = require("../controller/questionController")

//router.post("/create-section",addSection)
router.post("/create-question", createQuestion);
// router.post("/change-section-status",changeStatus)
router.get("/question-bank-list",questionList);
// router.get("/question-list",QuestionList);
// router.get("/question-by-section",getQuestionsBySectionId);
// router.put("/update-section/:id",updateSection);
// router.get("/getEditSection-list/:id",getUpdateSectiondetail);
// router.delete("/remove-section/:id",removeSection)
router.get("/getQuestion-detail/:id",getUpdateQuestionBankdetail);
router.get("/getVivaQuestion-detailById/:id",getVivaQuestionById);
router.get("/getPracticalQuestion-detailById/:id",getPracticalQuestionById);
router.put("/update-question-details/:id",updateQuestion);
router.put("/update-Vivaquestion-details/:id",updateVivaQuestion);
router.delete("/remove-Vivaquestion/:id",removeVivaQuestion);
router.put("/update-Practicalquestion-details/:id",updatePracticalQuestion);
router.delete("/remove-Practicalquestion/:id",removePracticalQuestion);
router.delete("/remove-questionbank/:id",removeQuestion); 
router.post("/change-question-status",questionStatus);
router.post("/bulkuploadqb",uploadFile.single('uploaded_file'), bulkUploadQuestionsInQB);
router.post("/bulkupload-vivaqb",uploadFile.single('uploaded_file'), bulkUploadVivaqb);
router.get('/download-question-samplefile',downloadTheoryQuestionSampleFile);
router.get('/download-viva-questionSamplefile',downloadVivaQuestionSampleFile);
router.get('/download-practical-questionSamplefile',downloadPracticalQuestionSampleFile);
// router.put("/update-vivaQuestion-details/:id",updateVivaQuestion);

router.post("/upload-questionOptions",fileUploader.single('option_img'),uploadQuestionOption);
router.get("/get-questionOption",getQuestionOptions);
router.delete("/remove-question/:id",deleteOptionImage);
router.get("/getQuestionBy-questionbankId/:id",getQuestionsByQuestionBankId);


router.post("/moreLangBulkUploadQuestionTheory",uploadFile.single('uploaded_file'),
 moreLangBulkUploadQuestionTheory);

router.get("/downloadMoreLangExcelFile/:id", downloadMoreLangExcelFile)


router.get("/downloadExcelFileMoreLangPracticalViva/:id/:section", downloadExcelFileMoreLangPracticalViva)

router.post("/moreLangBulkUploadQuestionPracticalViva/:section",uploadFile.single('uploaded_file'),
moreLangBulkUploadQuestionPracticalViva);

router.get("/qbStatus/:id", qbStatus)


module.exports = router