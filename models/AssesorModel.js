const mongoose = require("mongoose");

const createAssesorSchema = new mongoose.Schema(
  {
    // BASIC DETAILS
    assessorId: {
      type: String,
      required: false,
    },
    assessorSipId: {
      type: String,
      required: false,
      default: null,
    },
    isMobileVerified: {
      type: Boolean,
      default: false,
    },
    isInitialPasswordMailSend: {
      type: Boolean,
    },
    password: {
      type: String,
      required: false,
    },
    acceptTermCondition: {
      type: Boolean,
    },
    firstName: {
      type: String,
      required: false,
    },
    fullName: {
      type: String,
      required: false,
    },
    lastName: {
      type: String,
      required: false,
    },
    email: {
      type: String,
      required: false,
      // unique: true,
    },
    ToaType: {
      type: String,
      default: "Self",
      enum: ["Radiant", "Self", "None"],
    },
    assessorType: {
      type: String,
      default: "Assessor",
      required: false
    },
    RadiantFundToa: {
      type: Boolean,
      default: false,
    },
    mobile: {
      type: String,
      required: false,
    },
    gender: {
      type: String,
      required: false,
      enum: ["male", "female", "transgender", "notSpecify"],
    },
    dob: {
      type: String,
      required: false,
    },
    address: {
      type: String,
      required: false,
    },
    state: {
      type: String,
      required: false,
    },
    sector: [{
      sectorId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "sector",
          required: true
      },
      sectorName: { type: String, required: true } 
    }],
    district: {
      type: String,
      required: false,
    },
    pinCode: {
      type: String,
      required: false,
    },
    cardType: {
      type: String,
      required: false,
      //unique: true,
    },
    //education certificate
    collegeName: {
      type: String,
      required: false,
    },
    degree: {
      type: String,
      required: false,
    },
    educationStartDate: {
      type: String,
      required: false,
    },
    educationEndDate: {
      type: String,
      required: false,
    },

    bankName: {
      type: String,
      required: false,
    },
    bankAccount: {
      type: String,
      required: false,
      // unique: true,
    },
    bankIFSC: {
      type: String,
      required: false,
    },
    bankBranchName: {
      type: String,
      required: false,
    },
    accountHolderName: {
      type: String,
      required: false,
    },
    // sipId: {
    //   type: String,
    //   required: false,
    //   default: null
    // },

    assessorCertificate: {
      assessorName: {
        type: String,
        required: false,
      },
      assessorPhotoSize: {
        type: String,
        required: false,
      },
      profileKey: {
        type: String,
        required: false,
      },
    },

    modeofAgreement: {
      type: String,
      enum: ["payroll", "freelance", "other"],
      required: false,
    },
    //Agreement Details
    isAllDocumentUploaded: {
      type: Boolean,
      default: false,
    },
    isAssesorProfileUploaded: {
      type: Boolean,
      default: false,
    },
    clientDetail: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "client",
        required: false,
      },
    ],
    sipDetails: [
      {
        jobroleId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Jobrole",
          required: false,
        },
        jobroleName: {
          type: String,
          required: false,
        },
        sipValidity: {
          type: String,
          required: false,
        },
        sipCertificateKey: {
          type: String,
          required: false,
        },
        sipCertificateName: {
          type: String,
          required: false,
        },
        sipCertificateSize: {
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

    client_status: {
      type: String,
      enum: ["active", "inactive"],
      default: "inactive",
    },

    //assesor app field of experience certificate
    experiences: [
      {
        designation: {
          type: String,
          required: false,
        },
        companyName: {
          type: String,
          required: false,
        },
        startDate: {
          type: String,
          required: false,
        },
        endDate: {
          type: String,
          required: false,
        },
        isExperienceUploaded: {
          type: Boolean,
          default: false,
        },
        //experienceCertificate: {
        experienceCertificateName: {
          type: String,
          required: false,
        },
        experienceCertificateSize: {
          type: String,
          required: false,
        },
        experienceCertificateKey: {
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
    //assesor app education field
    education: [
      {
        collegeName: {
          type: String,
          required: false,
        },
        degree: {
          type: String,
          required: false,
        },
        startDate: {
          type: String,
          required: false,
        },
        endDate: {
          type: String,
          required: false,
        },
        isEducationUploaded: {
          type: Boolean,
          default: false,
        },
        educationCertificateName: {
          type: String,
          required: false,
        },
        educationCertificateSize: {
          type: String,
          required: false,
        },
        educationCertificateKey: {
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
    //assessor app jobRole field
    jobRole: [
      {
        jobroleName: {
          type: String,
          required: false,
        },
        experience: {
          type: String,
          required: false,
        },
        issueDate: {
          type: String,
          required: false,
        },
        validUpto: {
          type: String,
          required: false,
        },
        isJobroleUploaded: {
          type: Boolean,
          default: false,
        },
        jobRoleCertificateKey: {
          type: String,
          required: false,
        },
        jobRoleCertificateName: {
          type: String,
          required: false,
        },
        jobRoleCertificateSize: {
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
        jobRoleClientName: {
          type: String,
          required: false,
        },
      },
    ],

    personalDetail: [
      {
        cardType: {
          type: String,
          required: false,
        },
        cardNo: {
          type: String,
          required: false,
          // unique: true,
        },
        isDocumentUploaded: {
          type: Boolean,
          default: false,
        },
        cardFileName: {
          type: String,
          required: false,
        },
        cardFileSize: {
          type: String,
          required: false,
        },
        cardFileKey: {
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

    //assesor agreement
    agreement: [
      {
        agreementName: {
          type: String,
          required: false,
        },
        agreementValidFrom: {
          type: String,
          required: false,
        },
        agreementValidTo: {
          type: String,
          required: false,
        },
        isAgreementUploaded: {
          type: Boolean,
          default: false,
        },
        agreementCertificateName: {
          type: String,
          required: false,
        },
        agreementCertificateSize: {
          type: String,
          required: false,
        },
        agreementCertificateKey: {
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
        client_status: {
          type: String,
          enum: ["active", "inactive"],
          default: "inactive",
        },
      },
    ],

    isAssessorAssignToBatch: {
      type: Boolean,
      default: false,
      required: false,
    },
    scheme: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Scheme",
        required: false,
      },
    ],
    isCommunicatedWithAssessor: {
      type: Boolean,
      default: false,
      required: false,
    },
    isJobRoleCertificatMailSend: { type: Boolean, default: false },
    
    // Account lockout fields
    failedLoginAttempts: {
      type: Number,
      default: 0
    },
    isAccountLocked: {
      type: Boolean,
      default: false
    },
    lockoutExpiry: {
      type: Date,
      default: null
    },
    lastFailedLogin: {
      type: Date,
      default: null
    },
    
    // OTP lockout fields
    failedOtpAttempts: {
      type: Number,
      default: 0
    },
    isOtpLocked: {
      type: Boolean,
      default: false
    },
    otpLockoutExpiry: {
      type: Date,
      default: null
    },
    lastFailedOtp: {
      type: Date,
      default: null
    },
    isDeleted: {
      type: Boolean,
      default:false
    },
  },
  { timestamps: true }
);
const createAssesorModel = mongoose.model("assessor", createAssesorSchema);

createAssesorSchema.index({ fullName: 1 }, { name: "idx_assessor_fullname", background: true });
createAssesorSchema.index({ email: 1 }, { name: "idx_assessor_email", background: true });
createAssesorSchema.index({ assessorId: 1 }, { name: "idx_assessor_id", background: true });
createAssesorSchema.index({ mobile: 1 }, { name: "idx_assessor_mobile", background: true });
createAssesorSchema.index({ createdAt: -1 }, { name: "idx_assessor_created_at", background: true });

module.exports = createAssesorModel;
