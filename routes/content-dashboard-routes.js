require("dotenv").config()
const router = require("express").Router();
const { contentDeshboard,getUpcomingAssignment} = require("../controller/content-dashboard-controller");
router.get("/get-content-dashboard",contentDeshboard);
router.post("/upcoming-assesment",getUpcomingAssignment)


module.exports = router;