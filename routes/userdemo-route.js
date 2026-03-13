require("dotenv").config()
const router = require("express").Router();
const adminAuth = require("../middleware/adminAuth");
const { registerdemoUser, userdemoList, getdemoUser, updateDemouser, sendOTP, verifyOTP, getFilterdemoList, userDemoStatusChange, remark, remarkList, removeUserdemo, organisationNameList, deleteAllList, sendAssessorOTP, loginByAssessorOTP, createAssessorloginProfile, unlockDemoUserAccount} = require("../controller/user-demo");
router.post("/registerdemouser",registerdemoUser);
router.get("/getdemouser", adminAuth,userdemoList);
router.get("/getdemouserById/:id", adminAuth, getdemoUser);
router.put("/updateUserById/:id", adminAuth, updateDemouser);
router.put("/demo-users-status/:id", adminAuth, userDemoStatusChange);
router.get("/getdemoList", adminAuth, getFilterdemoList);
router.put('/createRemark', adminAuth, remark);
router.get('/remarkList', adminAuth, remarkList);
router.delete("/remove-userdemoById/:id", adminAuth, removeUserdemo);
router.get("/getorganisation-name", adminAuth, organisationNameList);
router.delete("/remove-allUserdemoList", adminAuth, deleteAllList);
router.post("/sendOTP",sendOTP);
router.post("/verifyOTP",verifyOTP);

router.post("/send-assesorOTP",sendAssessorOTP);
router.post("/loginBy-assesorOTP",loginByAssessorOTP);
router.post("/register-assesor",createAssessorloginProfile);
router.put("/demo-user-unlock-account/:id", adminAuth, unlockDemoUserAccount);

module.exports = router;