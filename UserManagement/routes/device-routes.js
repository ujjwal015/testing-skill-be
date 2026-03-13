require("dotenv").config()
const router = require("express").Router();
const { addDeviceDetails, DeviceList} = require("../controller/deviceManagerController");
router.get("/getDeviceDetail", DeviceList);
router.post('/saveDeviceDetails', addDeviceDetails);
module.exports = router;