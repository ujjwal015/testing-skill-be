const express = require("express");
const router = express.Router()
const { tour, updateTour } = require("../controller/user")

router.get("/tour/:id", tour);
router.get("/skip-tour/:id",tour);
router.put("/update-tour/:id",updateTour);
module.exports = router;