// router.put("/userdemo-statusChange/:id", userDemoStatusChange);
const express = require("express");
const { userDemoStatusChange } = require("../controller/user-demo");
const router = express.Router();

// define your routes here
router.put("/userdemo-statusChange/:id", userDemoStatusChange);

module.exports = router;
