require("dotenv").config()
const express = require('express')
const router = express.Router()

const {totalJobroleCount,
    totalBlueprintCount,
    totalQuestionbankCount,
    totalPrimaryLangQuestionCount,
    totalActiveClientsCount,
    totalClientsCount,
    totalActiveLeadsCount,
    totalAssessorCount,
    totalProctorCount,
    activeAssessorCount,
    totalBatchCount,
    activeBatchCount,
    scheduleBatchList,
    assessorLocationDashboard,
    AssessmentHistory,
    schemeAnalytics,
    clientWiseAssessment,
    assessedBatchCounts,
    liveBatchCount,
    resultPercentageStats,
    assessmentAanalytics,
    liveBatchesCount,
    assignedApplicantCount,
    BatchList,
    assignedAssessorDashboard,
    clientDashboard,
    liveBatchLogs,
    monitoringAssessmentList,
    assessorCompletedPercentage,
    assessorListHrDashboard,
    assessorEmploymentType,
    batchStatistics,
    getAllClientsByLocation,
    getSectorWiseOverview,
    scheduleList,
    dailyWorkProgress,
    questionAnalytics,
    languageAnalytics,
    jobRoleOccurrence,
    teamMembers,
    clientWithJobRole,
    getAllClientList,
    assessorAttendanceTimeSpent,
    resultAnalyticsList,
    clientOverView,
    batchVerificationStats,
    resultUpload,
    clientWiseBatch,
    nosResult,
    clientBasedAssessors,
    attendenceRequestCount,
    batchActivity,
    totalAssignedAssessorCount,
    upComingBatchCount,
    statewiseExamCentreAndBatchStats,
    statewiseMasterAssessorStats,
    masterAssessorCount
    } = require("../controller/dashbaord-controller")

// Content dashboard routes
router.get("/get-content-dashboard-totalJobrole",totalJobroleCount);
router.get("/get-content-dashboard-totalBlueprint",totalBlueprintCount);
router.get("/get-content-dashboard-totalQuestionbank",totalQuestionbankCount);
router.get("/get-content-dashboard-totalPrimaryLangQuestion",totalPrimaryLangQuestionCount);

// Business dashboard routes 
router.get("/get-business-dashboard-totalActiveClients",totalActiveClientsCount);
router.get("/get-business-dashboard-totalClients",totalClientsCount);
router.get("/get-business-dashboard-totalActiveLeads",totalActiveLeadsCount);//schema do not have clientId

//Hr dashboard routes
router.get("/get-dashboard-totalAssessor",totalAssessorCount);
router.get("/get-dashboard-totalProctor",totalProctorCount);
router.get("/get-dashboard-activeAssessor",activeAssessorCount);

router.get('/get-assessmentAnalytics-details',assessmentAanalytics);
//QA dashboard routes
router.get("/get-dashboard-totalBatch",totalBatchCount);
router.get("/get-dashboard-activeBatch",activeBatchCount);
router.get("/get-dashboard-batchVerificationStats", batchVerificationStats);

//new API for upcoming batches
router.get("/get-dashboard-upcomingBatch",upComingBatchCount);

//operation dashboard graph
router.get("/get-scheduledBatch-details", scheduleBatchList)//upcoming batches
router.get("/get-assessorLocation-details",assessorLocationDashboard); 
router.get("/get-assessmentHistory-details", AssessmentHistory) 
router.get("/get-schemeAnalytics-details", schemeAnalytics)
router.get("/client-wise-assessment", clientWiseAssessment)

//MIS Dashboard
router.get("/get-dashboard-totalAssessedBatch", assessedBatchCounts)
router.get("/get-dashboard-totalLiveBatch", liveBatchCount)

router.get("/get-resultPercentageStats", resultPercentageStats)//Assigned applicants//Applicant Analysis 

router.get('/get-result-upload-count', resultUpload)
router.get('/get-client-wise-batch', clientWiseBatch)
router.get('/get-nos-result', nosResult)


//operation Dshboard widgets
router.get("/get-dashboard-liveBatches", liveBatchesCount) //live streaming count
router.get("/get-dashboard-assignedApplicant", assignedApplicantCount)

//operation dashboard Table
router.get("/get-batchList-details", BatchList)
router.get("/get-assignedAssessor-details", assignedAssessorDashboard)
router.get("/get-clientList-details", clientDashboard)
router.get("/get-liveBatchLog-details",  liveBatchLogs)

router.get("/get-realTime-monitoringList", monitoringAssessmentList);

router.get("/getAssessor-profilePercentage/:id",assessorCompletedPercentage);

router.get("/getAssessorList-dashboard",assessorListHrDashboard);

router.get("/get-assessor-employmentType",assessorEmploymentType);

router.get("/get-assessor-batchStatistics",batchStatistics);

router.get("/get-clients-byLocation",getAllClientsByLocation);

router.get("/get-sectorWise-overview",getSectorWiseOverview);

router.get("/get-schedule-meetingList",scheduleList);

router.get("/get-daily-workProgress",dailyWorkProgress);

router.get("/get-client-based-assessor",clientBasedAssessors);

//conten-dashboard
router.get('/question-analytics', questionAnalytics)
router.get('/language-analytics', languageAnalytics)
router.get('/jobrole-occurrence', jobRoleOccurrence)
router.get('/team-members', teamMembers)
router.get('/client-with-job-role', clientWithJobRole)
router.get('/get-allClientList-dashboard',getAllClientList)

router.get('/get-assessorAttendance-timeSpent',assessorAttendanceTimeSpent)

router.get('/get-result-analyticsCount',resultAnalyticsList)
router.get('/get-clientOverview', clientOverView)

router.get('/assesor-attendanceRegularize-requestListCount',attendenceRequestCount);

router.get('/get-batchActivity',batchActivity)


router.get("/get-dashboard-totalAssignedAssessor",totalAssignedAssessorCount);

router.get("/get-dashboard-examCentre-batch-byState", statewiseExamCentreAndBatchStats)

router.get("/get-masterAssessor-byState",statewiseMasterAssessorStats)

router.get("/get-masterAssessor-totalCount", masterAssessorCount)

module.exports = router 