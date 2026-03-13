const mongoose = require("mongoose");
const QAVerificationCacheInvalidation = require("../utils/qaVerificationCacheInvalidation");

const assessmentSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      //required: true,
      required: false,
    },
    // batchId: {
    //   type: String,
    //   required: true,
    // },
    isFileUploaded: {
      type: Boolean,
      default: false,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
    },
    assesorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "assessor",
    },
    assessorName: {
      type: String,
      required: false,
    },
    checkInTime: {
      type: String,
      required: false,
    },
    checkOutTime: {
      type: String,
      required: false,
    },
    examCenterPhotoTime: {
      type: String,
      required: false,
    },
    examCenterVideoTime: {
      type: String,
      required: false,
    },
    groupPhotoTime: {
      type: String,
      required: false,
    },
    theoryPhotoTime: {
      type: String,
      required: false,
    },
    theoryVideoTime: {
      type: String,
      required: false,
    },
    practicalPhotoTime: {
      type: String,
      required: false,
    },
    practicalVideoTime: {
      type: String,
      required: false,
    },
    vivaPhotoTime: {
      type: String,
      required: false,
    },
    vivaVideoTime: {
      type: String,
      required: false,
    },
    aadharHolding: {
      type: String,
      required: false,
    },
    annexureM: {
      type: String,
      required: false,
    },
    annexureN: {
      type: String,
      required: false,
    },
    assessmentPlan: {
      type: String,
      required: false,
    },
    attendanceSheet: {
      type: String,
      required: false,
    },
    summarySheet: {
      type: String,
      required: false,
    },
    tpUndertaking: {
      type: String,
      required: false,
    },
    //   certificatesFile: String,
    //   sendToMIS: String,
    questionPaper: {
      type: String,
      required: false,
    },
    toolListTime: {
      type: String,
      required: false,
    },
    toolPhotoTime: {
      type: String,
      required: false,
    },
    tpFeedback: {
      type: String,
      required: false,
    },
    audit: {
      type: String,
      required: false,
    },
    remarks: {
      type: String,
      required: false,
    },
    zipUrl: {
      type: String,
    },
    zipKey: {
      type: String,
    },
    zipCreatedAt: {
      type: Date,
    },
    //   nameOfQualityTeamMember: String,
    //   additionalRemarks: String, // If needed, add more fields based on your requirements
  },
  { timestamps: true }
);

// Cache invalidation middleware
assessmentSchema.post('save', async function(doc) {
  try {
    await QAVerificationCacheInvalidation.invalidateAll();
    
    if (doc.assesorId) {
      await QAVerificationCacheInvalidation.invalidateAssessorCache(doc.assesorId.toString());
    }
    
    if (doc.batchId) {
      await QAVerificationCacheInvalidation.invalidateBatchCache(doc.batchId.toString());
    }
    
    if (doc.date) {
      await QAVerificationCacheInvalidation.invalidateDateCache(doc.date);
    }
    
    await QAVerificationCacheInvalidation.invalidateVerificationListCache();
  } catch (error) {
    console.error('Cache invalidation error on save:', error.message);
  }
});

assessmentSchema.post('findOneAndUpdate', async function(doc) {
  try {
    if (doc) {
      await QAVerificationCacheInvalidation.invalidateAll();
      
      if (doc.assesorId) {
        await QAVerificationCacheInvalidation.invalidateAssessorCache(doc.assesorId.toString());
      }
      
      if (doc.batchId) {
        await QAVerificationCacheInvalidation.invalidateBatchCache(doc.batchId.toString());
      }
      
      if (doc.date) {
        await QAVerificationCacheInvalidation.invalidateDateCache(doc.date);
      }
      
      await QAVerificationCacheInvalidation.invalidateVerificationListCache();
    }
  } catch (error) {
    console.error('Cache invalidation error on update:', error.message);
  }
});

assessmentSchema.post('findOneAndDelete', async function(doc) {
  try {
    if (doc) {
      await QAVerificationCacheInvalidation.invalidateAll();
      
      if (doc.assesorId) {
        await QAVerificationCacheInvalidation.invalidateAssessorCache(doc.assesorId.toString());
      }
      
      if (doc.batchId) {
        await QAVerificationCacheInvalidation.invalidateBatchCache(doc.batchId.toString());
      }
      
      if (doc.date) {
        await QAVerificationCacheInvalidation.invalidateDateCache(doc.date);
      }
      
      await QAVerificationCacheInvalidation.invalidateVerificationListCache();
    }
  } catch (error) {
    console.error('Cache invalidation error on delete:', error.message);
  }
});

assessmentSchema.post('insertMany', async function(docs) {
  try {
    await QAVerificationCacheInvalidation.invalidateAll();
    await QAVerificationCacheInvalidation.invalidateVerificationListCache();
    
    // Invalidate specific caches for each document
    for (const doc of docs) {
      if (doc.assesorId) {
        await QAVerificationCacheInvalidation.invalidateAssessorCache(doc.assesorId.toString());
      }
      
      if (doc.batchId) {
        await QAVerificationCacheInvalidation.invalidateBatchCache(doc.batchId.toString());
      }
      
      if (doc.date) {
        await QAVerificationCacheInvalidation.invalidateDateCache(doc.date);
      }
    }
  } catch (error) {
    console.error('Cache invalidation error on insertMany:', error.message);
  }
});

const qaVerificationModel = mongoose.model(
  "qaVerification-Assessment",
  assessmentSchema
);

assessmentSchema.index({ date: 1 }, { name: "idx_qa_date", background: true });
assessmentSchema.index({ batchId: 1 }, { name: "idx_qa_batch_id", background: true });
assessmentSchema.index({ assesorId: 1 }, { name: "idx_qa_assessor_id", background: true });
assessmentSchema.index({ createdAt: -1 }, { name: "idx_qa_created_at", background: true });

module.exports = qaVerificationModel;
