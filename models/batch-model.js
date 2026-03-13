const mongoose = require("mongoose");

const batchSchema = mongoose.Schema(
  {
    batchId: {
      type: String,
      required: true,
    },
    batchSize: {
      type: Number,
      default: 50,
    },
    startDate: {
      type: String,
      required: true,
    },
    endDate: {
      type: String,
      required: true,
    },

    startTime: {
      type: String,
      required: true,
    },
    endTime: {
      type: String,
      required: true,
    },
    examCenterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ExamCenter",
    },
    examCenterName: {
      type: String,
    },
    schemeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Scheme",
    },
    subSchemeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SubSchemes",
    },
    schemeName: { type: String, default: null },
    subSchemeName: { type: String, default: null },
    batchMode: {
      type: String,
      enum: ["online", "offline"],
      default: "online",
    },

    proctoring: {
      imageProctor: {
        imageProctorStatus: { type: Boolean },
        imageProctoringTime: { type: String },
      },
      faceRecognition: {
        type: Boolean,
      },
      faceDetection: {
        type: Boolean,
      },
      videoStream: {
        videoStreaming: { type: Boolean },
        videoDuration: { type: String },
        videoInterval: { type: String },
      },
      wrongLogin: {
        wrongLoginStatus: { type: Boolean },
        noOfWrongLogin: { type: Number },
      },
      browserExit: {
        browserExitAlert: { type: Boolean },
        noOfBrowserExit: { type: Number },
      },
      videoScreensharingProctoringStatus: {
        type: Boolean,
      },
      capturingImageStatus: {
        type: Boolean,
      },
      identityProofStatus: {
        type: Boolean,
      },
      isAutoLogout: {
        type: Boolean,
        default: false,
      },
    },

    questionPaper: {
      multipleJobRole: [
        {
          level: { type: String, default: null },
          version: { type: String, default: null },
          jobRoleId: { type: mongoose.Schema.Types.ObjectId, ref: "Jobrole" },
        },
      ],
      isMultiJobRole: { type: Boolean, default: false },
      level: { type: String, default: null },
      version: { type: String, default: null },
      partialSubmission: { type: Boolean, default: false },
      passingPercentage: { type: Number, default: 33 },
      sectionTable: [
        {
          sectionName: { type: String, default: "Theory" },
          sectionOrder: { type: String, default: null },
          examDuration: { type: String, default: null },
          isSelected: { type: Boolean, default: false },
        },
        {
          sectionName: { type: String, default: "pratical" },
          sectionOrder: { type: String, default: null },
          examDuration: { type: String, default: null },
          isSelected: { type: Boolean, default: false },
        },
        {
          sectionName: { type: String, default: "viva" },
          sectionOrder: { type: String, default: null },
          examDuration: { type: String, default: null },
          isSelected: { type: Boolean, default: false },
        },
      ],
      chooseInstructions: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "instruction",
      },
      qpCode: {
        type: String,
      },
      // questionType: {
      //     type: String,
      //     enum: ['theory', 'viva-practical']
      // },

      multiLanguage: {
        type: Boolean,
        default: false,
      },
      suffleQuestion: {
        type: Boolean,
        default: false,
      },
      optionRandom: {
        type: Boolean,
        default: false,
      },
      markForReview: {
        type: Boolean,
        default: false,
      },
      questionNavigation: {
        type: Boolean,
        default: false,
      },
      paginationStatus: {
        type: Boolean,
        default: false,
      },
      examLanguageConduct: {
        type: Boolean,
        default: false,
      },
      primaryLanguage: {
        type: String,
        default: "English",
      },

      RejectComment: {
        type: String,
      },
      secondaryLanguage: {
        type: String,
        default: null,
      },
      questionSet: {
        type: String,
      },
      assesmentStatus: {
        type: Boolean,
        default: true,
      },
      status: {
        type: Boolean,
        default: false,
      },
      jobRole: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Jobrole",
      },
      questionType: {
        type: String,
        enum: ["objective", "viva", "practicle"],
        default: "objective",
      },
    },
    report_id: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "CandidateReport",
      },
    ],
    assignAssessorProctor: {
      type: Boolean,
      default: false,
    },
    accessorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "assessor",
      default: null,
    },
    accessorName: { type: String, default: null },
    colorAndTTSEnabled: {
      type: Boolean,
      default: false,
    },
    proctorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "proctor",
    },
    financeRemarks: {
      type: String,
    },
    jobRole: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Jobrole",
    },
    jobRoleNames: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "client",
    },
    clientname: { type: String },
    isAcceptAssesor: {
      type: Boolean,
      default: false,
    },
    assesmentId: {
      type: String,
    },
    status: {
      type: Boolean,
      default: false,
    },
    candidateAssigned: {
      type: Boolean,
      default: false,
    },
    RejectComment: {
      type: String,
      default: null,
    },
    endDateTime: {
      type: Date,
    },
    startDateTime: {
      type: Date,
    },
    batchStartDate: {
      type: Date,
      default: null,
    },
    batchEndDate: {
      type: Date,
      default: null,
    },
    RejctedAccessorId: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "assessor",
      },
    ],
    assessorFeePerCandidate: {
      type: Number,
      default: null,
    },
  },
  { timestamps: true }
);

// Performance optimization indexes for batch controller
batchSchema.index(
  {
    batchId: 1,
  },
  {
    name: "idx_batch_id",
    unique: true,
    background: true,
  }
);

batchSchema.index(
  {
    clientId: 1,
    jobRole: 1,
    status: 1,
  },
  {
    name: "idx_batch_client_jobrole",
    background: true,
  }
);

batchSchema.index(
  {
    batchStartDate: 1,
    batchEndDate: 1,
    status: 1,
  },
  {
    name: "idx_batch_dates",
    background: true,
  }
);

batchSchema.index(
  { clientId: 1 },
  { name: "idx_batch_client", background: true }
);
batchSchema.index(
  { accessorId: 1 },
  { name: "idx_batch_accessor", background: true }
);
batchSchema.index(
  { clientId: 1, accessorId: 1 },
  { name: "idx_batch_client_accessor", background: true }
);

batchSchema.index(
  { batchId: 1 },
  { name: "idx_batch_id_unique", unique: true, background: true }
);

// 2. High-performance text search for your main filter logic in the assessment list.
batchSchema.index(
  {
    batchId: "text",
    clientname: "text",
    examCenterName: "text",
    jobRoleNames: "text",
  },
  {
    name: "idx_batch_text_search",
    default_language: "english",
    background: true,
  }
);

// 3. (NEW) A powerful compound index for common operational queries:
// finding batches for a client, filtering by status/mode, and sorting by date.
batchSchema.index(
  {
    clientId: 1,
    status: 1,
    batchMode: 1,
    batchStartDate: -1
  },
  {
    name: "idx_batch_operational_query",
    background: true,
  }
);

// 4. Index for efficient querying by date ranges.
batchSchema.index(
  { batchStartDate: 1, batchEndDate: 1 },
  { name: "idx_batch_date_range", background: true }
);

// 5. Compound index for queries involving assessors.
// This also covers queries filtering by 'accessorId' alone.
batchSchema.index(
  { accessorId: 1, status: 1 },
  { name: "idx_batch_accessor_status", background: true }
);

const Batch = mongoose.model("Batch", batchSchema);

module.exports = Batch;
