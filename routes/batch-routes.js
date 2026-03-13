const express = require("express");
const router = express.Router()
const { 
        createBatch,  
        batchList,  
        changeBatchStatus,  
        DeleteBatch,  
        DeleteBatchWithOtherDetails,
        getBatchById,  
        updateBatch,   
        // getExamCenters,  
        assesmentStatsByBatchId, 
        // assessmentOptionsList, 
        // createQuestionPaper, 
        jobRoleList, 
        schemeList,  
        batchSubSchemeList,     
        proctorList, 
        assessorList,  
        questionBankList,   
        getAllExamCenter,  
        nosListByJobRole,  
        getAllInstruction ,
        nosListByJobRoleVersion,
        batchRequestList,
        assessedBatchList,
        reAssignAssesorInBatch,
        multiLanguageDecider,
        batchListForTotalBatchExport,
        getAllBatchList,
        examManagementbatchList
    } = require("../controller/batchController");

const { getUserDetails } = require("../controller/userController");
const auth = require("../middleware/adminAuth");
//batch routes
router.post("/createbatch", createBatch);
router.get("/assesmentStatsByBatchId/:id", assesmentStatsByBatchId)
router.get("/batch-list",batchList);
router.get("/batch-list-v2", examManagementbatchList);
router.get("/total-batch-list",batchListForTotalBatchExport);
router.get("/batchList",getAllBatchList);
router.put("/batch-status/:id", changeBatchStatus);
// router.get('/exam-center-list',getExamCenters)
router.delete("/remove-batch/:id", DeleteBatchWithOtherDetails);
// router.get("/assesment-option-list",assessmentOptionsList);
router.put("/updatebatch/:id",updateBatch);
router.get("/single-batch/:id",getBatchById);
// router.get("/job-role-list-batch", jobRoleList);
router.get("/scheme-list-batch", schemeList);
router.get("/sub-scheme-list-batch", batchSubSchemeList);
router.get("/proctor-list-batch", proctorList);
router.get("/assessor-list-batch", assessorList);
router.get("/question-bank-list-batch", questionBankList);
router.get("/exam-center-list-batch", getAllExamCenter);
router.get("/get-all-user-details",auth, getUserDetails);
router.get("/nos-list-by-jobRole/:id", nosListByJobRole);
router.get("/nos-list-by-jobRole-version/:id/:level", nosListByJobRoleVersion);
router.get("/choose-instruction-batch", getAllInstruction)
router.get("/job-role-list-batch",auth, jobRoleList);
// router.get("/create-questionPaper",createQuestionPaper)
router.get("/batchRequest-list", batchRequestList);
router.get("/assessedBatch-list", assessedBatchList);
router.post("/assessorReassign",reAssignAssesorInBatch)
router.get("/multi-lang-decider/:jobRoleId/:level/:version", multiLanguageDecider)

module.exports = router;