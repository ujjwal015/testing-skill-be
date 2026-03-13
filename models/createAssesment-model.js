const mongoose = require("mongoose");

const createAssesmentSchema = new mongoose.Schema(
  {
    assessmentName: {
      type: String,
      required: true,
    },
    assessmentCode: {
      type: String,
      required: true,
    },
    section: {
      theory: {
        type: Boolean,
        default: false,
      },
      practical: {
        type: Boolean,
        default: false,
      },
      viva: {
        type: Boolean,
        default: false,
      },
    },
    batch_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
    },
    clientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Client",
    },
    batchMode: {
      type: String,
      enum: ["online", "offline"],
    },
    scheme: {
      type: String,
      default: "",
    },
    jobRole: {
      type: String,
      required: true,
    },
    isMultiJobRole: { 
      type: Boolean, 
      default: false
    },
    multipleJobRole: [
      {
          level: { type: String , default: null },
          version: { type: String , default: null },
          jobRoleName: { type: String},
          jobRoleId: { type: mongoose.Schema.Types.ObjectId , ref: "Jobrole" }
      }
    ],
    theoryNosList: [{
        nosName: {type: String},
        nosId: { type: mongoose.Schema.Types.ObjectId , ref: "nostheory" }
    }],
    totalMarks: {
      type: String,
      required: true,
    },
    passingPercentage: {
      type: String,
      required: true,
    },
    regiterLink: {
      type: String,
      default: "not created",
    },
    practicalQuestion_id: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "practicalQuestion",
      },
    ],
    vivaQuestion_id: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "vivaQuestion",
      },
    ],
    set_id: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "sets",
      },
    ],

    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    createdBy: {
      type: mongoose.Types.ObjectId,
    },
  },
  { timestamps: true }
);
const createAssesmentModel = mongoose.model(
  "createAssesments",
  createAssesmentSchema
);
module.exports = createAssesmentModel;
