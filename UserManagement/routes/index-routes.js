const express = require("express");
const router = express.Router()

const userProfileRoute = require("../routes/userProfile-routes");
const deviceRoute = require("../routes/device-routes");

const auth = require("../middleware/auth");
    

router.use(auth, userProfileRoute,deviceRoute);
          

module.exports = router;