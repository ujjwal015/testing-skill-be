const mongoose = require("mongoose");

const assessorFeedbackSchema = new mongoose.Schema(
  {
    // Assessment Details
    assessorName: {
      type: String,
      required: true,
      trim: true
    },
    assessmentDate: {
      type: Date,
      required: true
    },
    batchId: {
      type: String,
      required: true,
      trim: true
    },
    jobRole: {
      type: String,
      required: true,
      trim: true
    },
    trainingPartnerName: {
      type: String,
      required: true,
      trim: true
    },
    trainingCentreAddress: {
      type: String,
      required: true,
      trim: true
    },
    
    // Centre Coordination & Readiness
    spocAvailable: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    assessmentCenterLocation: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    spocRemarks: {
      type: String,
      trim: true
    },
    centreReady: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    centreReadyRemarks: {
      type: String,
      trim: true
    },
    geoLocationShared: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    candidatesPresent: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    candidateIssuesCount: {
      type: Number,
      min: 0
    },
    
    // Infrastructure & Logistics
    toolsAvailable: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    toolsSpecify: {
      type: String,
      trim: true
    },
    classroomsSuitable: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    
    // Assessment Conduct
    assessmentOnTime: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    aadhaarIssues: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    aadhaarDescription: {
      type: String,
      trim: true
    },
    theoryExamSmooth: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    theoryExamComments: {
      type: String,
      trim: true
    },
    
    // Training Provider Conduct
    pressureMalpractice: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    pressureDetails: {
      type: String,
      trim: true
    },
    manipulationRequest: {
      type: String,
      required: true,
      enum: ["Yes", "No"]
    },
    manipulationDetails: {
      type: String,
      trim: true
    },
    
    // Other Remarks
    otherRemarks: {
      type: String,
      trim: true,
      maxlength: 1000
    },
    submittedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "assessor",
      required: false
    },
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
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for better query performance
assessorFeedbackSchema.index({ assessmentDate: -1 });
assessorFeedbackSchema.index({ submittedBy: 1 });
assessorFeedbackSchema.index({ batchIds: 1 });
assessorFeedbackSchema.index({ status: 1 });

// Compound index to prevent duplicate submissions
assessorFeedbackSchema.index({ batchId: 1, submittedBy: 1 }, { unique: true });

// Virtual for formatted assessment date
assessorFeedbackSchema.virtual('formattedAssessmentDate').get(function() {
  return this.assessmentDate ? this.assessmentDate.toLocaleDateString() : null;
});

// Pre-save middleware to handle conditional fields
assessorFeedbackSchema.pre('save', function(next) {
  // Clear remarks if SPOC was available
  if (this.spocAvailable === 'Yes') {
    this.spocRemarks = undefined;
  }
  
  // Clear remarks if centre was ready
  if (this.centreReady === 'Yes') {
    this.centreReadyRemarks = undefined;
  }
  
  // Clear candidate issues count if candidates were present
  if (this.candidatesPresent === 'Yes') {
    this.candidateIssuesCount = undefined;
  }
  
  // Clear tools specification if tools were available
  if (this.toolsAvailable === 'Yes') {
    this.toolsSpecify = undefined;
  }
  
  // Clear Aadhaar description if no issues
  if (this.aadhaarIssues === 'No') {
    this.aadhaarDescription = undefined;
  }
  
  // Clear theory exam comments if exam was smooth
  if (this.theoryExamSmooth === 'Yes') {
    this.theoryExamComments = undefined;
  }
  
  // Clear pressure details if no pressure/malpractice
  if (this.pressureMalpractice === 'No') {
    this.pressureDetails = undefined;
  }
  
  // Clear manipulation details if no manipulation request
  if (this.manipulationRequest === 'No') {
    this.manipulationDetails = undefined;
  }
  
  next();
});

// Static method to get feedback statistics
assessorFeedbackSchema.statics.getFeedbackStats = async function(dateRange = {}) {
  const matchQuery = {};
  
  if (dateRange.startDate && dateRange.endDate) {
    matchQuery.assessmentDate = {
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
        avgSpocAvailable: {
          $avg: { $cond: [{ $eq: ["$spocAvailable", "Yes"] }, 1, 0] }
        },
        avgCentreReady: {
          $avg: { $cond: [{ $eq: ["$centreReady", "Yes"] }, 1, 0] }
        },
        avgToolsAvailable: {
          $avg: { $cond: [{ $eq: ["$toolsAvailable", "Yes"] }, 1, 0] }
        },
        avgAssessmentOnTime: {
          $avg: { $cond: [{ $eq: ["$assessmentOnTime", "Yes"] }, 1, 0] }
        },
        pressureMalpracticeCount: {
          $sum: { $cond: [{ $eq: ["$pressureMalpractice", "Yes"] }, 1, 0] }
        },
        manipulationRequestCount: {
          $sum: { $cond: [{ $eq: ["$manipulationRequest", "Yes"] }, 1, 0] }
        }
      }
    }
  ]);
  
  return stats[0] || {};
};

module.exports = mongoose.model("AssessorFeedback", assessorFeedbackSchema); 