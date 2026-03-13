const express = require("express");
const router = express.Router()
const { clockIn } = require("../controller/attendence-admin-controller")

router.post("/clock-in", clockIn);

module.exports = router;