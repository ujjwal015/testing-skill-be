const express = require("express");
const router = express.Router()
const AuthPermission=require("../middleware/adminAuth");
const { addSubScheme,subSchemeList,changeStatus,updateSubScheme,removeSubScheme,getUpdateSubSchemedetail } = require("../controller/subSchemeController")

router.post("/add-sub-scheme", addSubScheme);
router.get("/sub-scheme-list",subSchemeList);
router.put("/update-sub-scheme/:id",updateSubScheme);
router.delete("/delete-sub-scheme/:id",removeSubScheme);
router.get("/get-single-sub-scheme/:id",getUpdateSubSchemedetail);
router.post("/change-sub-scheme-status",changeStatus);
module.exports = router;