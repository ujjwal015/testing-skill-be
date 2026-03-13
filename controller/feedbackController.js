const { Paginate } = require("../utils/paginate");
const responseMessage = require("../utils/responseMessage");
const Joi = require("@hapi/joi");
const validator = require("../utils/validator");
const { getFilter } = require("../utils/custom-validators");
const { sendResponse, errorResponse } = require("../utils/response");
const moment = require("moment");
const ObjectId = require("mongoose").Types.ObjectId;
const AssessorFeedback = require("../models/assessorFeedback-model");
const TrainingPartnerFeedback = require("../models/trainingPartnerFeedback-model");
const Batch = require("../models/batch-model");
const Assessor = require("../models/AssesorModel");
const TrainingPartner = require("../models/trainingPartner-model");
const mongoose = require("mongoose");
const FeedbackPdfGenerator = require("../utils/feedbackPdfGenerator");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/envProvider");

// Token validation helper
const validateFeedbackToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return { valid: true, data: decoded };
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return { valid: false, error: 'Token has expired' };
    } else if (error.name === 'JsonWebTokenError') {
      return { valid: false, error: 'Invalid token' };
    }
    return { valid: false, error: 'Token validation failed' };
  }
};

// Validation schemas
const assessorFeedbackValidator = (data) => {
  try {
    const schema = Joi.object({
      assessorName: Joi.string().trim().required(),
      assessmentDate: Joi.string().trim().required(),
      batchId: Joi.string().trim().required(),
      jobRole: Joi.string().trim().required(),
      trainingPartnerName: Joi.string().trim().required(),
      trainingCentreAddress: Joi.string().trim().required(),
      
      assessmentCenterLocation: Joi.string().valid("Yes", "No").required(),
      spocAvailable: Joi.string().valid("Yes", "No").required(),
      spocRemarks: Joi.string().trim().allow(""),
      centreReady: Joi.string().valid("Yes", "No").required(),
      centreReadyRemarks: Joi.string().trim().allow(""),
      geoLocationShared: Joi.string().valid("Yes", "No").required(),
      candidatesPresent: Joi.string().valid("Yes", "No").required(),
      candidateIssuesCount: Joi.number().min(0).allow(""),
      
      toolsAvailable: Joi.string().valid("Yes", "No").required(),
      toolsSpecify: Joi.string().trim().allow(""),
      classroomsSuitable: Joi.string().valid("Yes", "No").required(),
      
      assessmentOnTime: Joi.string().valid("Yes", "No").required(),
      aadhaarIssues: Joi.string().valid("Yes", "No").required(),
      aadhaarDescription: Joi.string().trim().allow(""),
      theoryExamSmooth: Joi.string().valid("Yes", "No").required(),
      theoryExamComments: Joi.string().trim().allow(""),
      
      pressureMalpractice: Joi.string().valid("Yes", "No").required(),
      pressureDetails: Joi.string().trim().allow(""),
      manipulationRequest: Joi.string().valid("Yes", "No").required(),
      manipulationDetails: Joi.string().trim().allow(""),
      
      otherRemarks: Joi.string().trim().max(1000).allow("")
    });
    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
};

const trainingPartnerFeedbackValidator = (data) => {
  try {
    const schema = Joi.object({
      trainingPartnerName: Joi.string().trim().required(),
      trainingPartnerId: Joi.string().trim().required(),
      centreName: Joi.string().trim().required(),
      centreAddress: Joi.string().trim().allow(""),
      trainingCentreId: Joi.string().trim().required(),
      batchId: Joi.string().trim().allow(""),
      dateOfAssessment: Joi.string().trim().required(),
      
      assessorOnTime: Joi.string().valid("Yes", "No").required(),
      assessorDocuments: Joi.string().valid("Yes", "No").required(),
      assessorAware: Joi.string().valid("Yes", "No").required(),
      
      assessorRespectful: Joi.string().valid("Yes", "No").required(),
      assessorCooperative: Joi.string().valid("Yes", "No").required(),
      
      aadhaarVerification: Joi.string().valid("Yes", "No").required(),
      assessmentPhotos: Joi.string().valid("Yes", "No").required(),
      assessorFormalAttire: Joi.string().valid("Yes", "No").required(),
      
      assessorCommunication: Joi.string().valid("Yes", "No").required(),
      assessorDelays: Joi.string().valid("Yes", "No").required(),
      
      recommendAssessor: Joi.string().valid("Yes", "No").required(),
      incidents: Joi.string().trim().allow(""),
      overallRating: Joi.string().valid("Excellent", "Good", "Average", "Below Average", "Poor").required(),
      
    });
    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
};

// Create Assessor Feedback
module.exports.createAssessorFeedback = async (req, res) => {
  try {
    // Check if token is provided in query parameters
    const { token } = req.query;
    let assessorId;
    let tokenBatchId;

    if(!token){
      return errorResponse(res, 401, "Unauthorized", "Assessor authentication required");
    }

    if (token) {
      // Validate token
      const tokenValidation = validateFeedbackToken(token);
      if (!tokenValidation.valid) {
        return errorResponse(res, 401, "Invalid or expired token", tokenValidation.error);
      }

      const tokenData = tokenValidation.data;
      
      // Verify token type
      if (tokenData.type !== 'assessor') {
        return errorResponse(res, 403, "Invalid token type", "This token is not valid for assessor feedback");
      }

      assessorId = tokenData.assessorId;
      tokenBatchId = tokenData.batchId;
    }
    
    if (!assessorId) {
      return errorResponse(res, 401, "Unauthorized", "Assessor authentication required");
    }

    const { error } = assessorFeedbackValidator(req.body);
    if (error) return errorResponse(res, 400, error.message, error.message);

    const { batchId } = req.body;

    // If token provided, verify batch ID matches
    if (tokenBatchId && batchId !== tokenBatchId) {
      return errorResponse(res, 400, "Batch ID mismatch", "The batch ID does not match the token");
    }

    // Check if batch exists and get full details
    const batchDetails = await Batch.findOne({ batchId: batchId })
      .populate('accessorId', 'fullName email')
      .populate('jobRole', 'jobRole')
      .populate({
        path: 'examCenterId',
        populate: {
          path: 'trainingPartner',
          select: 'trainingPartner'
        }
      });

    if (!batchDetails) {
      return errorResponse(res, 400, "Batch not found", "The specified batch ID does not exist");
    }

    // Verify assessor is assigned to this batch
    if (!batchDetails.accessorId || batchDetails.accessorId._id.toString() !== assessorId.toString()) {
      return errorResponse(res, 403, "Unauthorized", "You are not authorized to submit feedback for this batch");
    }

    if(batchDetails.isAssessorSubmittedFeedback){
      return errorResponse(res, 400, "Feedback already submitted", "You have already submitted feedback for this batch");
    }

    // Check if assessor has already submitted feedback for this batch
    const existingFeedback = await AssessorFeedback.findOne({
      batchId: batchId,
      submittedBy: assessorId
    });

    if (existingFeedback) {
      return errorResponse(res, 400, "Feedback already submitted", "You have already submitted feedback for this batch");
    }

    // Auto-populate data from batch details
    const assessorName = batchDetails.accessorId.fullName || req.body.assessorName;
    const jobRole = batchDetails.jobRoleId?.jobRoleName || req.body.jobRole;
    const trainingPartnerName = batchDetails.examCenterId?.trainingPartner?.trainingPartner || req.body.trainingPartnerName;
    const trainingCentreAddress = batchDetails.examCenterId?.address || req.body.trainingCentreAddress;
    const assessmentDate = batchDetails.batchEndDate || req.body.assessmentDate;

    // Validate assessment date format
    const formattedAssessmentDate = moment(assessmentDate, "YYYY-MM-DD").toDate();
    if (!moment(formattedAssessmentDate).isValid()) {
      return errorResponse(res, 400, "Invalid assessment date format", "Assessment date must be in YYYY-MM-DD format");
    }

    const feedbackData = new AssessorFeedback({
      assessorName,
      assessmentDate: formattedAssessmentDate,
      batchId,
      jobRole,
      trainingPartnerName,
      trainingCentreAddress,
      spocAvailable: req.body.spocAvailable,
      assessmentCenterLocation:req.body.assessmentCenterLocation,
      spocRemarks: req.body.spocRemarks,
      centreReady: req.body.centreReady,
      centreReadyRemarks: req.body.centreReadyRemarks,
      geoLocationShared: req.body.geoLocationShared,
      candidatesPresent: req.body.candidatesPresent,
      candidateIssuesCount: req.body.candidateIssuesCount,
      toolsAvailable: req.body.toolsAvailable,
      toolsSpecify: req.body.toolsSpecify,
      classroomsSuitable: req.body.classroomsSuitable,
      assessmentOnTime: req.body.assessmentOnTime,
      aadhaarIssues: req.body.aadhaarIssues,
      aadhaarDescription: req.body.aadhaarDescription,
      theoryExamSmooth: req.body.theoryExamSmooth,
      theoryExamComments: req.body.theoryExamComments,
      pressureMalpractice: req.body.pressureMalpractice,
      pressureDetails: req.body.pressureDetails,
      manipulationRequest: req.body.manipulationRequest,
      manipulationDetails: req.body.manipulationDetails,
      otherRemarks: req.body.otherRemarks,
      submittedBy: assessorId,
      submittedAt: new Date()
    });


    try {
      // Save feedback within transaction
      const savedFeedback = await feedbackData.save();

      // Update batch to indicate assessor has submitted feedback
      await Batch.findByIdAndUpdate(
        batchDetails._id, 
        {
          isAssessorSubmittedFeedback: true,
          assessorFeedbackSubmittedAt: new Date()
        },
        {  new: true }
      );
 

      return sendResponse(res, 200, "Assessor feedback submitted successfully", {
        feedback: savedFeedback,
        autoFilledData: {
          assessorName,
          jobRole,
          trainingPartnerName,
          trainingCentreAddress,
          assessmentDate: formattedAssessmentDate
        }
      });

    } catch (err) {
      console.log("error", err);
      return errorResponse(res, 500, responseMessage.something_wrong, err.message);
    }

  } catch (err) {
    console.log("error", err);
    return errorResponse(res, 500, responseMessage.something_wrong, err.message);
  }
};

// Create Training Partner Feedback
module.exports.createTrainingPartnerFeedback = async (req, res) => {
  try {
    // Check if token is provided in query parameters
    const { token } = req.query;
    let tokenTrainingPartnerId;
    let tokenBatchId;

    if(!token){
      return errorResponse(res, 401, "Unauthorized", "Training partner authentication required");
    }

    if (token) {
      // Validate token
      const tokenValidation = validateFeedbackToken(token);
      if (!tokenValidation.valid) {
        return errorResponse(res, 401, "Invalid or expired token", tokenValidation.error);
      }

      const tokenData = tokenValidation.data;
      
      // Verify token type
      if (tokenData.type !== 'trainingPartner') {
        return errorResponse(res, 403, "Invalid token type", "This token is not valid for training partner feedback");
      }

      tokenTrainingPartnerId = tokenData.trainingPartnerId;
      tokenBatchId = tokenData.batchId;
    }

    const { error } = trainingPartnerFeedbackValidator(req.body);
    if (error) return errorResponse(res, 400, error.message, error.message);

    const {
      trainingPartnerName,
      trainingPartnerId,
      centreName,
      centreAddress,
      trainingCentreId,
      batchId,
      dateOfAssessment,
      assessorOnTime,
      assessorDocuments,
      assessorAware,
      assessorRespectful,
      assessorCooperative,
      aadhaarVerification,
      assessmentPhotos,
      assessorFormalAttire,
      assessorCommunication,
      assessorDelays,
      recommendAssessor,
      incidents,
      overallRating
    } = req.body;

    // If token provided, verify batch ID matches
    if (tokenBatchId && batchId !== tokenBatchId) {
      return errorResponse(res, 400, "Batch ID mismatch", "The batch ID does not match the token");
    }

    // Validate assessment date format
    const formattedAssessmentDate = moment(dateOfAssessment, "YYYY-MM-DD").toDate();
    if (!moment(formattedAssessmentDate).isValid()) {
      return errorResponse(res, 400, "Invalid assessment date format", "Assessment date must be in YYYY-MM-DD format");
    }

   
    const batch = await Batch.findOne({ batchId: batchId })
      .populate({
        path: 'examCenterId',
        populate: {
          path: 'trainingPartner'
        }
      });
      
    if (!batch) {
      return errorResponse(res, 400, "Batch not found", "The specified batch ID does not exist");
    }

    // If token provided, verify training partner ID matches
    if (tokenTrainingPartnerId && batch.examCenterId?.trainingPartner?._id.toString() !== tokenTrainingPartnerId.toString()) {
      return errorResponse(res, 403, "Unauthorized", "You are not authorized to submit feedback for this batch");
    }

    if(batch.isTrainingPartnerSubmittedFeedback){
      return errorResponse(res, 400, "Training partner feedback already submitted", "You are not authorized to submit feedback for this training partner");
    }

    const trainingPartner = await TrainingPartner.findOne({ tpId: trainingPartnerId });
    if (!trainingPartner) {
      return errorResponse(res, 400, "You are not authorized to submit feedback for this training partner");
    }


    const startTransaction = await mongoose.startSession();
    startTransaction.startTransaction();

    try {   
      const feedbackData = new TrainingPartnerFeedback({
        trainingPartnerName,
        trainingPartnerId,
        centreName,
        centreAddress,
        trainingCentreId,
        batchId,
        dateOfAssessment: formattedAssessmentDate,
        assessorOnTime,
        assessorDocuments,
        assessorAware,
        assessorRespectful,
        assessorCooperative,
        aadhaarVerification,
        assessmentPhotos,
        assessorFormalAttire,
        assessorCommunication,
        assessorDelays,
        recommendAssessor,
        incidents,
        overallRating,
    });

    await feedbackData.save();
    await Batch.findByIdAndUpdate(batch._id, { isTrainingPartnerSubmittedFeedback: true, trainingPartnerId: trainingPartner._id }, { new: true });
    await startTransaction.commitTransaction();

    return sendResponse(res, 200, "Training partner feedback submitted successfully", feedbackData);
  } catch (err) {
    await startTransaction.abortTransaction();
    throw err;
  } finally {
    await startTransaction.endSession();
  }

  } catch (err) {
    console.log("error", err);
    return errorResponse(res, 500, responseMessage.something_wrong, err.message);
  }
};

// Get Assessor Feedback List
module.exports.getAssessorFeedbackList = async (req, res) => {
  try {
    const { page, limit, skip, sortOrder } = Paginate(req);
    const { searchQuery, startDate, endDate, status } = req.query;

    let matchQuery = {};

    // search functionality
    if (searchQuery) {
      matchQuery.$or = [
        { assessorName: { $regex: searchQuery, $options: "i" } },
        { batchId: { $regex: searchQuery, $options: "i" } },
        { jobRole: { $regex: searchQuery, $options: "i" } },
        { trainingPartnerName: { $regex: searchQuery, $options: "i" } }
      ];
    }

    // date range filter
    if (startDate && endDate) {
      matchQuery.assessmentDate = {
        $gte: moment(startDate, "YYYY-MM-DD").startOf('day').toDate(),
        $lte: moment(endDate, "YYYY-MM-DD").endOf('day').toDate()
      };
    }

    // status filter
    if (status) {
      matchQuery.status = status;
    }

    const totalCount = await AssessorFeedback.countDocuments(matchQuery);

    if (totalCount === 0) {
      return sendResponse(res, 200, "No feedback found", {
        feedbackList: [],
        page,
        totalCounts: 0,
        totalPages: 0,
      });
    }

    const feedbackList = await AssessorFeedback.find(matchQuery)
      .populate({
        path: "submittedBy",
        select: "fullName email"
      })
      .populate({
        path: "reviewedBy",
        select: "fullName email"
      })
      .skip(skip)
      .limit(limit)
      .sort(sortOrder);

    const totalPages = Math.ceil(totalCount / limit);

    return sendResponse(res, 200, "Assessor feedback list retrieved successfully", {
      feedbackList,
      page,
      totalCounts: totalCount,
      totalPages,
    });

  } catch (error) {
    console.error("Error in getAssessorFeedbackList:", error);
    return errorResponse(res, 500, responseMessage.something_wrong, error.message);
  }
};

// Get Training Partner Feedback List
module.exports.getTrainingPartnerFeedbackList = async (req, res) => {
  try {
    const { page, limit, skip, sortOrder } = Paginate(req);
    const { searchQuery, startDate, endDate, status, assessorId } = req.query;

    let matchQuery = {};

    // Add search functionality
    if (searchQuery) {
      matchQuery.$or = [
        { trainingPartnerName: { $regex: searchQuery, $options: "i" } },
        { centreName: { $regex: searchQuery, $options: "i" } },
        { batchId: { $regex: searchQuery, $options: "i" } },
        { overallRating: { $regex: searchQuery, $options: "i" } }
      ];
    }

    // date range filter
    if (startDate && endDate) {
      matchQuery.dateOfAssessment = {
        $gte: moment(startDate, "YYYY-MM-DD").startOf('day').toDate(),
        $lte: moment(endDate, "YYYY-MM-DD").endOf('day').toDate()
      };
    }

    // status filter
    if (status) {
      matchQuery.status = status;
    }

    // assessor filter
    if (assessorId) {
      matchQuery.assessorId = assessorId;
    }

    const totalCount = await TrainingPartnerFeedback.countDocuments(matchQuery);

    if (totalCount === 0) {
      return sendResponse(res, 200, "No feedback found", {
        feedbackList: [],
        page,
        totalCounts: 0,
        totalPages: 0,
      });
    }

    const feedbackList = await TrainingPartnerFeedback.find(matchQuery)
      .populate({
        path: "submittedBy",
        select: "fullName email"
      })
      .populate({
        path: "reviewedBy",
        select: "fullName email"
      })
      .populate({
        path: "assessorId",
        select: "fullName assessorId"
      })
      .skip(skip)
      .limit(limit)
      .sort(sortOrder);

    const totalPages = Math.ceil(totalCount / limit);

    return sendResponse(res, 200, "Training partner feedback list retrieved successfully", {
      feedbackList,
      page,
      totalCounts: totalCount,
      totalPages,
    });

  } catch (error) {
    console.error("Error in getTrainingPartnerFeedbackList:", error);
    return errorResponse(res, 500, responseMessage.something_wrong, error.message);
  }
};

// Get Feedback by ID
module.exports.getFeedbackById = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query; // 'assessor' or 'trainingPartner'

    if (!ObjectId.isValid(id)) {
      return errorResponse(res, 400, "Invalid feedback ID", "The provided ID is not valid");
    }

    let feedback;
    if (type === 'assessor') {
      feedback = await AssessorFeedback.findById(id)
        .populate("submittedBy", "fullName email")
        .populate("reviewedBy", "fullName email");
    } else if (type === 'trainingPartner') {
      feedback = await TrainingPartnerFeedback.findById(id)
        .populate("submittedBy", "fullName email")
        .populate("reviewedBy", "fullName email")
        .populate("assessorId", "fullName assessorId");
    } else {
      return errorResponse(res, 400, "Invalid feedback type", "Type must be 'assessor' or 'trainingPartner'");
    }

    if (!feedback) {
      return errorResponse(res, 404, "Feedback not found", "No feedback found with the provided ID");
    }

    return sendResponse(res, 200, "Feedback retrieved successfully", feedback);

  } catch (error) {
    console.error("Error in getFeedbackById:", error);
    return errorResponse(res, 500, responseMessage.something_wrong, error.message);
  }
};

// Update Feedback Status (for review)
module.exports.updateFeedbackStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;
    const { status, reviewComments } = req.body;

    if (!ObjectId.isValid(id)) {
      return errorResponse(res, 400, "Invalid feedback ID", "The provided ID is not valid");
    }

    if (!["submitted", "reviewed", "archived"].includes(status)) {
      return errorResponse(res, 400, "Invalid status", "Status must be 'submitted', 'reviewed', or 'archived'");
    }

    let feedback;
    if (type === 'assessor') {
      feedback = await AssessorFeedback.findById(id);
    } else if (type === 'trainingPartner') {
      feedback = await TrainingPartnerFeedback.findById(id);
    } else {
      return errorResponse(res, 400, "Invalid feedback type", "Type must be 'assessor' or 'trainingPartner'");
    }

    if (!feedback) {
      return errorResponse(res, 404, "Feedback not found", "No feedback found with the provided ID");
    }

    feedback.status = status;
    if (reviewComments) {
      feedback.reviewComments = reviewComments;
    }
    if (status === 'reviewed') {
      feedback.reviewedBy = req.user._id;
      feedback.reviewedAt = new Date();
    }

    const updatedFeedback = await feedback.save();

    return sendResponse(res, 200, "Feedback status updated successfully", updatedFeedback);

  } catch (error) {
    console.error("Error in updateFeedbackStatus:", error);
    return errorResponse(res, 500, responseMessage.something_wrong, error.message);
  }
};

// Get Feedback Statistics
module.exports.getFeedbackStatistics = async (req, res) => {
  try {
    const { startDate, endDate, type } = req.query;

    const dateRange = {};
    if (startDate && endDate) {
      dateRange.startDate = startDate;
      dateRange.endDate = endDate;
    }

    let stats = {};

    if (type === 'assessor' || !type) {
      const assessorStats = await AssessorFeedback.getFeedbackStats(dateRange);
      stats.assessorFeedback = assessorStats;
    }

    if (type === 'trainingPartner' || !type) {
      const tpStats = await TrainingPartnerFeedback.getFeedbackTrends(dateRange);
      stats.trainingPartnerFeedback = tpStats;
    }

    return sendResponse(res, 200, "Feedback statistics retrieved successfully", stats);

  } catch (error) {
    console.error("Error in getFeedbackStatistics:", error);
    return errorResponse(res, 500, responseMessage.something_wrong, error.message);
  }
};

// Get Assessor Performance Stats
module.exports.getAssessorPerformanceStats = async (req, res) => {
  try {
    const { assessorId } = req.params;
    const { startDate, endDate } = req.query;

    if (!ObjectId.isValid(assessorId)) {
      return errorResponse(res, 400, "Invalid assessor ID", "The provided assessor ID is not valid");
    }

    const dateRange = {};
    if (startDate && endDate) {
      dateRange.startDate = startDate;
      dateRange.endDate = endDate;
    }

    const stats = await TrainingPartnerFeedback.getAssessorStats(assessorId, dateRange);

    return sendResponse(res, 200, "Assessor performance statistics retrieved successfully", stats);

  } catch (error) {
    console.error("Error in getAssessorPerformanceStats:", error);
    return errorResponse(res, 500, responseMessage.something_wrong, error.message);
  }
};

// Delete Feedback
module.exports.deleteFeedback = async (req, res) => {
  try {
    const { id } = req.params;
    const { type } = req.query;

    if (!ObjectId.isValid(id)) {
      return errorResponse(res, 400, "Invalid feedback ID", "The provided ID is not valid");
    }

    let deletedFeedback;
    if (type === 'assessor') {
      deletedFeedback = await AssessorFeedback.findByIdAndDelete(id);
    } else if (type === 'trainingPartner') {
      deletedFeedback = await TrainingPartnerFeedback.findByIdAndDelete(id);
    } else {
      return errorResponse(res, 400, "Invalid feedback type", "Type must be 'assessor' or 'trainingPartner'");
    }

    if (!deletedFeedback) {
      return errorResponse(res, 404, "Feedback not found", "No feedback found with the provided ID");
    }

    return sendResponse(res, 200, "Feedback deleted successfully", { deletedId: id });

  } catch (error) {
    console.error("Error in deleteFeedback:", error);
    return errorResponse(res, 500, responseMessage.something_wrong, error.message);
  }
};

// Download Feedback PDF by Batch ID and Type
module.exports.downloadFeedbackPdfByBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    const { type } = req.query; // 'assessor' or 'trainingPartner'

    if (!type || !['assessor', 'trainingPartner'].includes(type)) {
      return errorResponse(res, 400, "Invalid feedback type", "Type must be 'assessor' or 'trainingPartner'");
    }

    let feedback;
    let Model = type === 'assessor' ? AssessorFeedback : TrainingPartnerFeedback;
    
    feedback = await Model.findOne({ batchId: batchId }).sort({ createdAt: -1 });
    
    if (!feedback) {
      return errorResponse(res, 404, "Feedback not found", `No ${type} feedback found for batch ID: ${batchId}`);
    }

    const pdfGenerator = new FeedbackPdfGenerator();
    let pdfBuffer;
    
    if (type === 'assessor') {
      pdfBuffer = await pdfGenerator.generateAssessorFeedbackPdf(feedback);
    } else {
      pdfBuffer = await pdfGenerator.generateTrainingPartnerFeedbackPdf(feedback);
    }

    // Set appropriate headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${type === 'assessor' ? 'Assessor' : 'TrainingPartner'}_Feedback_${batchId}_${Date.now()}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);

    return res.send(pdfBuffer);

  } catch (error) {
    console.error("Error in downloadFeedbackPdfByBatch:", error);
    return errorResponse(res, 500, responseMessage.something_wrong, error.message);
  }
};



// Get batch details using token for feedback form
module.exports.getBatchDetailsFromToken = async (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return errorResponse(res, 400, "Token required", "Please provide a valid token");
    }

    // Validate token
    const tokenValidation = validateFeedbackToken(token);
    if (!tokenValidation.valid) {
      return errorResponse(res, 401, "Invalid or expired token", tokenValidation.error);
    }

    const tokenData = tokenValidation.data;
    const { batchId, type } = tokenData;

    // Get batch details
    const batchDetails = await Batch.findOne({ batchId: batchId })
      .populate("accessorId", "fullName email firstName lastName")
      .populate("jobRole", "jobRole")
      .populate({
        path: "examCenterId",
        select: "examCenterName address trainingPartner trainingCenterId",
        populate: {
          path: "trainingPartner",
          select: "trainingPartner spocName spocEmail tpId",
        },
      });

    if (!batchDetails) {
      return errorResponse(res, 404, "Batch not found", "The specified batch does not exist");
    }

    let responseData = {
      batchId: batchDetails.batchId,
      batchEndDate: batchDetails.batchEndDate,
      feedbackType: type
    };

    if (type === 'assessor') {
      // Check if assessor already submitted feedback
      const existingFeedback = await AssessorFeedback.findOne({
        batchId: batchId,
        submittedBy: tokenData.assessorId
      });

      responseData = {
        ...responseData,
        alreadySubmitted: !!existingFeedback || batchDetails.isAssessorSubmittedFeedback,
        assessorName: batchDetails.accessorId?.fullName || `${batchDetails.accessorId?.firstName} ${batchDetails.accessorId?.lastName}`.trim(),
        assessorEmail: batchDetails.accessorId?.email,
        trainingPartnerName: batchDetails.examCenterId?.trainingPartner?.trainingPartner,
        trainingCentreAddress: batchDetails.examCenterId?.address,
        assessmentDate: batchDetails.batchEndDate,
        jobRole: batchDetails.jobRole?.jobRole,
      };
    } else if (type === 'trainingPartner') {
      // Check if training partner already submitted feedback
      responseData = {
        ...responseData,
        alreadySubmitted: batchDetails.isTrainingPartnerSubmittedFeedback,
        trainingPartnerName: batchDetails.examCenterId?.trainingPartner?.trainingPartner,
        trainingPartnerId: batchDetails.examCenterId?.trainingPartner?.tpId,
        centreName: batchDetails.examCenterId?.examCenterName,
        centreAddress: batchDetails.examCenterId?.address,
        trainingCentreId: batchDetails.examCenterId,
        dateOfAssessment: batchDetails.batchEndDate,
        assessorName: batchDetails.accessorId?.fullName || `${batchDetails.accessorId?.firstName} ${batchDetails.accessorId?.lastName}`.trim()
      };
    }

    return sendResponse(res, 200, "Batch details retrieved successfully", responseData);

  } catch (err) {
    console.log("error", err);
    return errorResponse(res, 500, responseMessage.something_wrong, err.message);
  }
};

module.exports = {
  createAssessorFeedback: module.exports.createAssessorFeedback,
  createTrainingPartnerFeedback: module.exports.createTrainingPartnerFeedback,
  getAssessorFeedbackList: module.exports.getAssessorFeedbackList,
  getTrainingPartnerFeedbackList: module.exports.getTrainingPartnerFeedbackList,
  getFeedbackById: module.exports.getFeedbackById,
  updateFeedbackStatus: module.exports.updateFeedbackStatus,
  getBatchDetailsForFeedback: module.exports.getBatchDetailsForFeedback,
  downloadFeedbackPdfByBatch: module.exports.downloadFeedbackPdfByBatch,
  getBatchDetailsFromToken: module.exports.getBatchDetailsFromToken
};