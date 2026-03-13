const express = require("express");
const router = express.Router();
const { addAssesment,addSelectedQuestions,accesmentList,getQuestionsByAssesmentId,setAssessmentTest,removeSingleAssessment,removeQuestion,finalCreateAssessment,updateAccesment,getAssesment, getQuestionsBySetId, previewAssessmentList} = require("../controller/createAssesmentController")

// router.post("/create-assesment",addAssesment);
router.post("/select-assesment-question",addSelectedQuestions);
router.get("/assesment-list",accesmentList);
router.get("/preview-assesment-list",previewAssessmentList);
router.get("/preview-assessment",getQuestionsByAssesmentId)
router.post("/assessment-test/:id",setAssessmentTest);
router.delete("/delete-assessment/:id",removeSingleAssessment);
router.put("/remove-question-assessment",removeQuestion);
router.post("/final-assessment-create",finalCreateAssessment);
router.put("/update-assessment/:id",updateAccesment);
router.get("/get-assesmentListById/:id",getAssesment);
router.get("/get-set-by-id/:setId", getQuestionsBySetId);

module.exports = router