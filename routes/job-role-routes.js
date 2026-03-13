const express = require("express");
const router = express.Router()
const AuthPermission=require("../middleware/adminAuth");
const {  addJobRole,
         RoleList,
         jobRoleList,
         updateJobRole,
         changeStatus ,
         removeJobRole,
         getUpdatejobRoledetail,
         getAllClientsList
        } = require("../controller/jobRole-controller")

router.post("/add-jobRole", addJobRole);
router.get("/jobRole-list",jobRoleList);
router.put("/update-jobRole/:id",updateJobRole);
router.delete("/delete-jobRole/:id",removeJobRole);
router.get("/get-single-jobRole/:id",getUpdatejobRoledetail)
router.post("/change-jobRole-status",changeStatus)
router.get("/getAllClientsList", getAllClientsList)
router.get('/decide-render',AuthPermission,RoleList)
module.exports = router;