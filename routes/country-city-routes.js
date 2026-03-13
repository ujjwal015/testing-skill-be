require("dotenv").config()
const router = require("express").Router();
const { getStateByCountry, getAllCitiesByState,getDistrictByState} = require("../controller/country-city-controller");
router.post('/getStates', getStateByCountry);
router.post('/getcities', getAllCitiesByState);
router.get("/get-district-by-state/:id",getDistrictByState);
module.exports = router;