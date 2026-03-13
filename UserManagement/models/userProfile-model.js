const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    firstName: {
      type: String,
      required: true,
    },
    lastName: {
      type: String,
      required: false,
    },
    isSuperAdmin: {
      type: Boolean,
      default: false,
    },
    gender: {
      type: String,
      enum: ["male", "female", "transgender", "notSpecify"],
    },
    mobile: {
      type: String,
    },
    address: {
      type: String,
    },
    country: {
      type: String,
    },
    state: {
      type: String,
    },
    email: {
      type: String,
      required: true,
    },
    userName: {
      type: String,
      required: true,
    },
    isProfilePicUploaded: {
      type: Boolean,
      default: false,
    },
    ProfileKey: {
      type: String,
    },
    ProfileUrl: {
      type: String,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
    },
    isPasswordChangeEmailSend: {
      type: Boolean,
      default: false,
    },
    isInitialPasswordChanged: {
      type: Boolean,
      default: false,
    },
    password: {
      type: String,
    },
    isUserProfileCreated: {
      type: Boolean,
      default: true,
    },
    isAdminApproved: {
      type: String,
      enum: ["accepted", "rejected", "pending"],
      default: "pending",
    },
    userType: {
      type: Number,
      default: 2,
    },
    isTourComplete: {
      type: Boolean,
      default: true,
    },
    userRole: [{ type: mongoose.Schema.Types.ObjectId, ref: "userRole" }],

    assigndClients: [{ type: mongoose.Schema.Types.ObjectId, ref: "client" }],

    //My profile schema
    assignedDashboard: [{ type: mongoose.Schema.Types.ObjectId, ref: "" }],

    role: {
      type: String,
      required: false,
    },

    reportinManager: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "uuser",
      default: null,
    },
    // About
    jobDescription: {
      type: String,
      required: false,
    },
    aboutJob: {
      type: String,
      required: false,
    },
    jobInterest: {
      type: String,
      required: false,
    },

    // Basic Details
    designation: {
      type: String,
      default: null,
    },
    dob: {
      type: String,
      required: false,
    },
    maritalStatus: {
      type: String,
      enum: ["single", "married", "don't prefer to disclose"],
      required: false,
    },
    bloodGroup: {
      type: String,
      required: false,
    },
    nationality: {
      type: String,
      required: false,
    },

    // Address
    //  currentAddress: {  //consider as address primary
    //      type: String,
    //      required: false
    //  },
    currentAddress: {
      address1: {
        type: String,
        required: false,
      },
      state: {
        type: String,
        required: false,
      },
      city: {
        type: String,
        required: false,
      },
      pinCode: {
        type: String,
        required: false,
      },
    },

    permanentAddress: {
      address1: {
        type: String,
        required: false,
      },
      state: {
        type: String,
        required: false,
      },
      city: {
        type: String,
        required: false,
      },
      pinCode: {
        type: String,
        required: false,
      },
    },

    // Contact Details
    workEmail: {
      //email
      type: String,
      required: false,
    },
    personalEmail: {
      type: String,
      required: false,
    },
    phoneNumber: {
      //mobile
      type: String,
      required: false,
    },
    workNumber: {
      type: String,
      required: false,
    },
    homeNumber: {
      type: String,
      required: false,
    },
    teamId: {
      type: String,
      required: false,
    },

    //Identification Information
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
        s3Url: {
          type: String,
          required: false,
          default: null,
        },
      },
    ],

    // Past Experience
    experiences: [
      {
        jobTitle: {
          type: String,
          required: false,
        },
        companyName: {
          type: String,
          required: false,
        },
        dateOfJoining: {
          type: String,
          required: false,
        },
        dateOfReceiving: {
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
      },
    ],

    // Degrees and Certificates
    education: [
      {
        degree: {
          type: String,
          required: false,
        },
        yearOfJoining: {
          type: String,
          required: false,
        },
        specilization: {
          type: String,
          required: false,
        },
        yearOfCompletion: {
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
      },
    ],
  },

  { timestamps: true }
);

const UserModel = mongoose.model("uuser", userSchema);

module.exports = UserModel;
