const express=require('express');
const router=express.Router();
const {assesorList,
       attendenceRequest,
       attendenceRequestList,
       regularizeDoc,
       attendenceRequestDetailFindById,
       assessorAssignToBatchList,
       assessorAttendenceList}=require('../controller/assesorAttendence-controller')

router.get('/assesor-list',assesorList);
router.get('/assesor-attendance-list',assessorAttendenceList);
router.put('/assesor-attendanceRegularize-requestApprove/:id',attendenceRequest);
router.get('/assesor-attendanceRegularize-detailById/:id',attendenceRequestDetailFindById); 
router.get('/assesor-attendanceRegularize-requestList',attendenceRequestList);
router.get('/assesor-attendanceRequest-doc',regularizeDoc);                  
//router.post('/attendance-regularize',uploadFile.single('captureImage'),regularizeAttendence);
router.get("/get-assessorAssignToBatchList", assessorAssignToBatchList);
module.exports=router;