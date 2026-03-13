const mongoose = require("mongoose");

const trainingPartnerFeedbackSchema = new mongoose.Schema(
  {
    // Basic Details
    trainingPartnerName: {
      type: String,
      required: true,
      trim: true
    },
    trainingPartnerId: {
      type: String,
      required: true,
      trim: true
    },
    centreName: {
      type: String,
      required: true,
      trim: true
    },
    centreAddress: {
      type: String,
      trim: true
    },
    trainingCentreId: {
      type: String,
      required: true,
      trim: true
    },
    batchId: {
      type: String,
      trim: true
    },
    dateOfAssessment: {
      type: Date,
      required: true
    },
    
    // Assessor's Readiness
    assessorOnTime: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    assessorDocuments: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    assessorAware: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    
    // Assessor's Professional Behavior
    assessorRespectful: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    assessorCooperative: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    
    // Assessor's Adherence to Guidelines
    aadhaarVerification: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    assessmentPhotos: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    assessorFormalAttire: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    
    // Communication & Coordination
    assessorCommunication: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    assessorDelays: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    
    // Final Feedback
    recommendAssessor: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    incidents: {
      type: String,
      trim: true
    },
    overallRating: {
      type: String,
      required: true,
      enum: ["Excellent", "Good", "Average", "Below Average", "Poor"]
    },

    // Metadata
    submittedAt: {
      type: Date,
      default: Date.now
    },
    status: {
      type: String,
      enum: ["submitted", "reviewed", "archived"],
      default: "submitted"
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User"
    },
    reviewedAt: {
      type: Date
    },
    reviewComments: {
      type: String,
      trim: true
    },
    
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
trainingPartnerFeedbackSchema.index({ dateOfAssessment: -1 });
trainingPartnerFeedbackSchema.index({ submittedBy: 1 });
trainingPartnerFeedbackSchema.index({ assessorId: 1 });
trainingPartnerFeedbackSchema.index({ trainingPartnerId_ref: 1 });
trainingPartnerFeedbackSchema.index({ status: 1 });
trainingPartnerFeedbackSchema.index({ overallRating: 1 });

// Virtual for formatted assessment date
trainingPartnerFeedbackSchema.virtual('formattedAssessmentDate').get(function() {
  return this.dateOfAssessment ? this.dateOfAssessment.toLocaleDateString() : null;
});

// Virtual for rating score (for calculations)
trainingPartnerFeedbackSchema.virtual('ratingScore').get(function() {
  const ratingMap = {
    'Excellent': 5,
    'Good': 4,
    'Average': 3,
    'Below Average': 2,
    'Poor': 1
  };
  return ratingMap[this.overallRating] || 0;
});

// Static method to get assessor performance statistics
trainingPartnerFeedbackSchema.statics.getAssessorStats = async function(assessorId, dateRange = {}) {
  const matchQuery = { assessorId };
  
  if (dateRange.startDate && dateRange.endDate) {
    matchQuery.dateOfAssessment = {
      $gte: new Date(dateRange.startDate),
      $lte: new Date(dateRange.endDate)
    };
  }
  
  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalFeedbacks: { $sum: 1 },
        avgOnTime: {
          $avg: { $cond: [{ $eq: ["$assessorOnTime", "Yes"] }, 1, 0] }
        },
        avgDocuments: {
          $avg: { $cond: [{ $eq: ["$assessorDocuments", "Yes"] }, 1, 0] }
        },
        avgAware: {
          $avg: { $cond: [{ $eq: ["$assessorAware", "Yes"] }, 1, 0] }
        },
        avgRespectful: {
          $avg: { $cond: [{ $eq: ["$assessorRespectful", "Yes"] }, 1, 0] }
        },
        avgCooperative: {
          $avg: { $cond: [{ $eq: ["$assessorCooperative", "Yes"] }, 1, 0] }
        },
        avgAadhaarVerification: {
          $avg: { $cond: [{ $eq: ["$aadhaarVerification", "Yes"] }, 1, 0] }
        },
        avgPhotos: {
          $avg: { $cond: [{ $eq: ["$assessmentPhotos", "Yes"] }, 1, 0] }
        },
        avgFormalAttire: {
          $avg: { $cond: [{ $eq: ["$assessorFormalAttire", "Yes"] }, 1, 0] }
        },
        avgCommunication: {
          $avg: { $cond: [{ $eq: ["$assessorCommunication", "Yes"] }, 1, 0] }
        },
        avgDelays: {
          $avg: { $cond: [{ $eq: ["$assessorDelays", "Yes"] }, 1, 0] }
        },
        recommendationRate: {
          $avg: { $cond: [{ $eq: ["$recommendAssessor", "Yes"] }, 1, 0] }
        },
        avgRatingScore: {
          $avg: {
            $switch: {
              branches: [
                { case: { $eq: ["$overallRating", "Excellent"] }, then: 5 },
                { case: { $eq: ["$overallRating", "Good"] }, then: 4 },
                { case: { $eq: ["$overallRating", "Average"] }, then: 3 },
                { case: { $eq: ["$overallRating", "Below Average"] }, then: 2 },
                { case: { $eq: ["$overallRating", "Poor"] }, then: 1 }
              ],
              default: 0
            }
          }
        },
        ratingDistribution: {
          $push: "$overallRating"
        }
      }
    }
  ]);
  
  return stats[0] || {};
};

// Static method to get training partner feedback statistics
trainingPartnerFeedbackSchema.statics.getTrainingPartnerStats = async function(trainingPartnerId, dateRange = {}) {
  const matchQuery = { trainingPartnerId_ref: trainingPartnerId };
  
  if (dateRange.startDate && dateRange.endDate) {
    matchQuery.dateOfAssessment = {
      $gte: new Date(dateRange.startDate),
      $lte: new Date(dateRange.endDate)
    };
  }
  
  const stats = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: null,
        totalFeedbacks: { $sum: 1 },
        avgAssessorPerformance: {
          $avg: {
            $switch: {
              branches: [
                { case: { $eq: ["$overallRating", "Excellent"] }, then: 5 },
                { case: { $eq: ["$overallRating", "Good"] }, then: 4 },
                { case: { $eq: ["$overallRating", "Average"] }, then: 3 },
                { case: { $eq: ["$overallRating", "Below Average"] }, then: 2 },
                { case: { $eq: ["$overallRating", "Poor"] }, then: 1 }
              ],
              default: 0
            }
          }
        },
        incidentReports: {
          $sum: { $cond: [{ $ne: ["$incidents", ""] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || {};
};

// Static method to get overall feedback trends
trainingPartnerFeedbackSchema.statics.getFeedbackTrends = async function(dateRange = {}) {
  const matchQuery = {};
  
  if (dateRange.startDate && dateRange.endDate) {
    matchQuery.dateOfAssessment = {
      $gte: new Date(dateRange.startDate),
      $lte: new Date(dateRange.endDate)
    };
  }
  
  const trends = await this.aggregate([
    { $match: matchQuery },
    {
      $group: {
        _id: {
          year: { $year: "$dateOfAssessment" },
          month: { $month: "$dateOfAssessment" }
        },
        totalFeedbacks: { $sum: 1 },
        avgRating: {
          $avg: {
            $switch: {
              branches: [
                { case: { $eq: ["$overallRating", "Excellent"] }, then: 5 },
                { case: { $eq: ["$overallRating", "Good"] }, then: 4 },
                { case: { $eq: ["$overallRating", "Average"] }, then: 3 },
                { case: { $eq: ["$overallRating", "Below Average"] }, then: 2 },
                { case: { $eq: ["$overallRating", "Poor"] }, then: 1 }
              ],
              default: 0
            }
          }
        },
        recommendationRate: {
          $avg: { $cond: [{ $eq: ["$recommendAssessor", "Yes"] }, 1, 0] }
        }
      }
    },
    { $sort: { "_id.year": 1, "_id.month": 1 } }
  ]);
  
  return trends;
};

module.exports = mongoose.model("TrainingPartnerFeedback", trainingPartnerFeedbackSchema); 