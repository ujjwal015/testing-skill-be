require("dotenv").config()
const router = require("express").Router();
const { hrDashboard} = require("../controller/hr-dashboard-controller");
router.get("/get-hr-dashboard",hrDashboard);



module.exports = router;