const express = require("express");
const router = express.Router();
const BatchRoutes = require("../routes/batch-routes");
const AssignBatchRoutes = require("../routes/assignBatch-route");
const AssessorRoutes = require("../routes/assessor-route");
const countryRoute = require("../routes/country-city-routes");
const questionRoutes = require("../routes/question-route");
const accessmentRoutes = require("../routes/assesment-routes");
const questionBankRoutes = require("../routes/questionBank-route");
const uploadRoutes = require("../routes/file-upload-route");
const auth = require("../middleware/newUserAuth");
const examCenterRoutes = require("../routes/exam-center-routes");
const userDemoRoutes = require("../routes/userdemo-route");
const schemeRoutes = require("../routes/scheme-route");
const subSchemeRoutes = require("../routes/sub-scheme-routes");
const clientRoutes = require("../routes/client-routes");

const jobRoleRoutes = require("../routes/job-role-routes");

const dashboardBda = require("./bda-dashboard-route");
const userRoleRoutes = require("../routes/userRole-routes");
const userRoutes = require("../routes/user-routes");
const createQuestionPaperRoutes = require("../routes/create-question-paper-routes");
const nosRoutes = require("../routes/nos-routes");
const questionCreationRoutes = require("../routes/question-creation-route");
const proctorRoutes = require("../routes/proctor-route");
const instructionRoutes = require("../routes/instruction-route");
const operationDashboardRoutes = require("../routes/operation-dashboard-routes");
const qaVerificationRoutes = require("../routes/verification-routes");
const misResultRoutes = require("../routes/misResult-routes");

const studentPortalRoutes = require("../routes/studentPortal-routes");
const suspiciousRoutes = require("../routes/suspicious-activity-capturing-route");

const contentDeshboard=require("../routes/content-dashboard-routes");
const hrDashboard=require("../routes/hr-routes");
const adminAssessorRoutes = require("../routes/assessor-admin-routes");
const assesorAttendenceRoute = require("../routes/assesorAttendence-routes");
const qaVerificationZipDownloadRoute = require("../routes/verification-download-route");
const attendenceAdminRoute=require("../routes/attendence-admin-routes");
const ncvtAdminDashboard=require("./admin-dashboard-routes");
const skillRoutes=require("../modules/skillAssesment/Route/Routes");
router.use('/skill',skillRoutes)
router.use("/student", studentPortalRoutes); // student portal routes
router.use("/proctor", suspiciousRoutes); // suspicious activity capturing routes
//update routesssss
router.use(userRoutes,userDemoRoutes,qaVerificationZipDownloadRoute);


// const dashboardRoutes = require("../modules/dashboard/route/content-dashboard")

const dashboardManagementRoutes = require("../routes/dashboard-management-routes")
const dashboardRoutes = require("../routes/dashboard-routes")


router.use(
  auth,
  dashboardManagementRoutes,
  dashboardRoutes,
  ncvtAdminDashboard,
  adminAssessorRoutes,
  createQuestionPaperRoutes,
  contentDeshboard,
  hrDashboard,
  dashboardBda,
  countryRoute,
  misResultRoutes,
  jobRoleRoutes,
  subSchemeRoutes,
  schemeRoutes,
  schemeRoutes,
  AssessorRoutes,
  uploadRoutes,
  nosRoutes,
  questionBankRoutes,
  questionCreationRoutes,
  proctorRoutes,
  instructionRoutes,
  operationDashboardRoutes,
  attendenceAdminRoute,
  examCenterRoutes,
  BatchRoutes,
  AssignBatchRoutes,
  clientRoutes,
  questionRoutes,
  qaVerificationRoutes,
  userRoleRoutes,
  accessmentRoutes,
  assesorAttendenceRoute
);

module.exports = router;
