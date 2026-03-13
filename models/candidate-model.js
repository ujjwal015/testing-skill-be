const mongoose = require("mongoose");

const candidateSchema = mongoose.Schema(
  {
    name: {
      type: String,
    },
    candidateType: {
      type: String,
      enum: ["ssc", "private"],
    },
    userName: {
      type: String,
    },
    password: {
      type: String,
    },
    logInSendViaEmail: {
      type: Boolean,
      default: false,
    },
    rawPassword: {
      type: String,
    },
    mobile: {
      type: String,
      default: null,
    },
    candidateId: {
      type: String,
      unique: false,
    },
    report_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CandidateReport",
    },
    jobRole: {
      type: String,
    },
    assesmentId: {
      type: String,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Batch",
    },
    examId: {
      type: String,
    },
    examTime: {
      type: String,
    },
    aadharNumber: {
      type: String,
    },
    aadharNo: {
      type: String,
      default: null,
    },
    dob: {
      type: String,
      default: null,
    },
    gender: {
      type: String,
      enum: ["male", "female", "transgender", "notSpecify", null],
    },
    fatherName: {
      type: String,
      default: null,
    },
    email: {
      type: String,
      default: null,
    },
    isPresent: {
      type: String,
      default: "Missing",
      enum: ["Present", "Absent", "Missing"],
    },
    email_status: {
      type: Boolean,
      default: false,
    },
    sms: {
      type: Boolean,
      default: false,
    },
    userType: {
      type: Number,
      default: 3,
    },
    studentType: {
      type: Number,
      default: 1,
    },
    isTestSubmitted: {
      type: Boolean,
      default: false,
    },
    isAssessmentStarted: {
      type: Boolean,
      default: false,
    },
    reasonToIncreaseExamTime: {
      type: String,
    },
    status: {
      type: Boolean,
      default: true,
    },
    loginTime: {
      type: Date,
      default: null,
    },
    logoutTime: {
      type: Date,
      default: null,
    },
    resumeTime: {
      type: Date,
      default: null,
    },
    passwordReset: {
      type: Boolean,
      default: false,
    },
    passwordResetTime: {
      type: Date,
      default: null,
    },
    token: {
      type: Boolean,
      default: false,
    },
    tokenSecret: {
      type: String,
      default: null,
    },
    latitude: {
      type: String,
      default: null,
    },
    longitude: {
      type: String,
      default: null,
    },
    os: {
      type: String,
      default: null,
    },
    osVersion: {
      type: String,
      default: null,
    },
    deviceType: {
      type: String,
      default: null,
    },
    deviceBrand: {
      type: String,
      default: null,
    },
    eligibility: {
      type: String,
      enum: ["yes", "no"],
      default: "yes",
    },
    deviceModel: {
      type: String,
      default: null,
    },
    ipAddress: {
      type: String,
      default: null,
    },
    browser: {
      type: String,
      default: null,
    },
    remainingSeconds: {
      type: Number,
      default: null,
    },
    suspiciousActivity: {
      type: Number,
      default: 0,
    },
    allSuspiciousActivity: {
      type: Number,
      default: 0,
    },
    wrongLogin: {
      type: Number,
      default: 0,
    },
    steps: [
      {
        screen: { type: String },
        isCompleted: { type: Boolean },
      },
    ],
    allStepsCompletedStatus: { type: Boolean, default: false },
    lastActivityTime: { type: Date, default: null },

    shareCredentials: {
      email: {
        type: Boolean,
        default: false,
      },
      sms: {
        type: Boolean,
        default: false,
      },
    },
    faceMatchStatus: {
      type: String,
      default: "Not Attempted",
      enum: ["Matched", "Not Matched", "Not Attempted"],
    },
    faceRecognition: {
      adminApproved: {
        type: Boolean,
        default: false,
      },
      approvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Uuser",
        default: null,
      },
    },
  },
  { timestamps: true }
);

const Candidate = mongoose.model("Candidate", candidateSchema);

module.exports = Candidate;
