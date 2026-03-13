require("dotenv").config()
const router = require("express").Router();
const { registerScheme, schemeList, getScheme, updateScheme, removeScheme, changeStatus} = require("../controller/schemeManagement");
router.post("/registerScheme",registerScheme);
router.get("/getScheme",schemeList);
router.get("/getSchemeById/:id",getScheme);
router.put("/updateSchemeById/:id",updateScheme);
router.delete('/removeSchemeById/:id',removeScheme);
router.post('/changeScheme-status',changeStatus)

module.exports = router;