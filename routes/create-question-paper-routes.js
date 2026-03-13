const express = require("express");
const router = express.Router()
const {createQuestionPaper } = require("../controller/create-question-paper-controller")

router.get("/create-questionPaper",createQuestionPaper)
module.exports = router;
