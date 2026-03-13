const express = require("express");
const router = express.Router();
const feedbackController = require("../controller/feedbackController");
const newUserAuth = require("../middleware/newUserAuth");

// Get batch details using token for feedback form (no auth required as token is the auth)
router.get("/batch-details-from-token", feedbackController.getBatchDetailsFromToken);

// Assessor Feedback Routes
router.post("/assessor",  feedbackController.createAssessorFeedback);
router.get("/assessor", newUserAuth, feedbackController.getAssessorFeedbackList);

// Training Partner Feedback Routes
router.post("/training-partner",  feedbackController.createTrainingPartnerFeedback);
router.get("/training-partner", newUserAuth, feedbackController.getTrainingPartnerFeedbackList);

// PDF Download Routes
// Assesor or Training Partner Feedback PDF Download
router.get("/:batchId", newUserAuth, feedbackController.downloadFeedbackPdfByBatch);

// Common Feedback Routes
router.get("/:id", newUserAuth, feedbackController.getFeedbackById);

module.exports = router; 