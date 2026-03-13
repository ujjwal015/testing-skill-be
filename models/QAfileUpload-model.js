const mongoose = require("mongoose");
const QAVerificationCacheInvalidation = require("../utils/qaVerificationCacheInvalidation");

const qafileSchema = new mongoose.Schema(
  {
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
    },
    QAverificationTimeStampId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "qaVerification-Assessment",
    },
    assesorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "assessor",
    },
    date: {
      type: String,
    },
    checkInPhoto: {
      images: [
        {
          imgKey: {
            type: String,
            required: false,
          },
          imgFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          imgName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
    },
    checkOutPhoto: {
      images: [
        {
          imgKey: {
            type: String,
            required: false,
          },
          imgFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          imgName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
    },
    groupPhoto: {
      images: [
        {
          imgKey: {
            type: String,
            required: false,
          },
          imgFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          imgName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
    },

    theoryPhoto: {
      images: [
        {
          imgKey: {
            type: String,
            required: false,
          },
          imgFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          imgName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
    },
    theoryVideo: {
      videos: [
        {
          videoKey: {
            type: String,
            required: false,
          },
          videoFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          videoName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
    },
    practicalPhoto: {
      images: [
        {
          imgKey: {
            type: String,
            required: false,
          },
          imgFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          imgName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
    },
    practicalVideo: {
      videos: [
        {
          videoKey: {
            type: String,
            required: false,
          },
          videoFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          videoName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
    },
    vivaPhoto: {
      images: [
        {
          imgKey: {
            type: String,
            required: false,
          },
          imgFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          imgName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
    },
    vivaVideo: {
      videos: [
        {
          videoKey: {
            type: String,
            required: false,
          },
          videoFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          videoName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
    },
    aadharPhoto: {
      images: [
        {
          imgKey: {
            type: String,
            required: false,
          },
          imgFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          imgName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
    },
    annexureNPhoto: {
      images: [
        {
          imgKey: {
            type: String,
            required: false,
          },
          imgFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          imgName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
    },
    annexureMPhoto: {
      images: [
        {
          imgKey: {
            type: String,
            required: false,
          },
          imgFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          imgName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
    },
    attendenceSheet: {
      images: [
        {
          imgKey: {
            type: String,
            required: false,
          },
          imgFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          imgName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
    },
    toolPhoto: {
      images: [
        {
          imgKey: {
            type: String,
            required: false,
          },
          imgFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          imgName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
    },
    //added examcenter,tpDeclaration,others
    examcenterPhoto: {
      images: [
        {
          imgKey: {
            type: String,
            required: false,
          },
          imgFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          imgName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
    },
    examcenterVideo: {
      videos: [
        {
          videoKey: {
            type: String,
            required: false,
          },
          videoFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          videoName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
    },

    tpPhoto: {
      images: [
        {
          imgKey: {
            type: String,
            required: false,
          },
          imgFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          imgName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
    },
    otherFile: {
      images: [
        {
          imgKey: {
            type: String,
            required: false,
          },
          imgFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          imgName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
    },
    //marksheet of viva and practical
    vivaMarksheet: {
      images: [
        {
          imgKey: {
            type: String,
            required: false,
          },
          imgFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          imgName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
    },
    practicalMarksheet: {
      images: [
        {
          imgKey: {
            type: String,
            required: false,
          },
          imgFlag: {
            type: Boolean,
            required: false,
            default: false,
          },
          imgName: {
            type: String,
            required: false,
          },
          adminUploaded: {
            type: Boolean,
          },
          status: {
            type: String,
            enum: ["accepted", "rejected", "noAction"],
          },
        },
      ],
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
  },
  { timestamps: true }
);
// Cache invalidation middleware for QA file uploads
qafileSchema.post('save', async function(doc) {
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
    console.error('QA file cache invalidation error on save:', error.message);
  }
});

qafileSchema.post('findOneAndUpdate', async function(doc) {
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
    console.error('QA file cache invalidation error on update:', error.message);
  }
});

qafileSchema.post('findOneAndDelete', async function(doc) {
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
    console.error('QA file cache invalidation error on delete:', error.message);
  }
});

const qafileModel = mongoose.model("qaVerification-file", qafileSchema);

qafileSchema.index({ batchId: 1 }, { name: "idx_qafiles_batch", background: true });
qafileSchema.index({ QAverificationTimeStampId: 1 }, { name: "idx_qafiles_timestamp", background: true });
qafileSchema.index({ assesorId: 1 }, { name: "idx_qafiles_assesor", background: true });
qafileSchema.index({ date: 1 }, { name: "idx_qafiles_date", background: true });


module.exports = qafileModel;
