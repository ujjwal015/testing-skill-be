const express = require("express");
const router = express.Router()
const { 
        assessedBatchAdminList,
        liveBatchAdminList,
        jobroleAdminDashboard,
        onBoardAssessorAdminDashboard,
        clientJobroleDashboard,
        assessorDashboard,
        assessmentDashboard,
        sectorAssessmentList,
        scheduleBatchList,
        liveBatchList
    } = require("../controller/admin-dashboard-controller");

router.get("/assessedBatch-adminDashboard", assessedBatchAdminList);
router.get("/liveBatch-adminDashboard",liveBatchAdminList)
router.get("/jobrole-adminDashboard",jobroleAdminDashboard);
router.get("/assessorOnboard-adminDashboard",onBoardAssessorAdminDashboard);

router.get("/clientJobrole-adminDashboard",clientJobroleDashboard)
router.get("/get-assessor-dashboard",assessorDashboard);
router.get('/get-assessmentAnalytics-details',assessmentDashboard);
router.get("/get-sectorAssessment",sectorAssessmentList);
router.get("/get-schedule-batchList",scheduleBatchList);
router.get("/get-liveBatch-logList",liveBatchList)

module.exports = router;