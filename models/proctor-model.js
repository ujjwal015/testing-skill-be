const mongoose=require('mongoose');

const createProctorSchema=new mongoose.Schema({
    // BASIC DETAILS
    proctorId:{
      type:String,
      required:false
    },
    proctorName:{
        type:String,
        required:true
    },
    clientId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'client'
    },
    email: {
        type: String,
        required: true,
      },
      mobile: {
        type: String,
        required: true,
      },
      gender: {
        type: String,
        required: true,
        enum: ["male", "female", "transgender", "notSpecify"]
      },
      dob: {
        type: String,
        required: true,
      },
      address: {
        type: String,
        required: true,
      },
      state: {
        type: String,
        required: true,
      },
      district: {
        type: String,
        required: true,
      },
      pinCode: {
        type: String,
        required: true,
      },
      experience: {
        type: String,
        required: false,
      },
      //PERSONAL DETAILS
      aadharNo: {
        type: String,
        required: false
      },
      panCardNo: {
        type: String,
        required: false
      },
      bankName: {
        type: String,
        required: false,
      },
      bankAccount: {
        type: String,
        required: false
      },
      bankIFSC: {
        type: String,
        required: false,
      },
      otherCertificate: {
        otherCertificateName: {
          type: String,
          required: false,
        },
        otherCertificateSize: {
          type: String,
          required: false,
        },
        otherCertificateKey: {
          type: String,
          required: false,
        },
      },
      postgradCertificate: {
        postgraduateCertificateName: {
          type: String,
          required: false,
        },
        postgradCertificateSize: {
          type: String,
          required: false,
        },
        postgraduateCertificateKey: {
          type: String,
          required: false,
        },
      },
      undergradCertificate: {
        undergraduateCertificateName: {
          type: String,
          required: false,
        },
        undergradCertificateSize: {
          type: String,
          required: false,
        },
        undergraduateCertificateKey: {
          type: String,
          required: false,
        },
      },
      diplomaCertificate: {
        diplomaCertificateName: {
          type: String,
          required: false,
        },
        diplomaCertificateSize: {
          type: String,
          required: false,
        },
        diplomaCertificateKey: {
          type: String,
          required: false,
        },
      },
      intermediateCertificate: {
        intermediateCertificateName: {
          type: String,
          required: false,
        },
        intermediateCertificateSize: {
          type: String,
          required: false,
        },
        intermediateCertificateKey: {
          type: String,
          required: false,
        },
      },
      highSchoolCertificate: {
        highSchoolCertificateName: {
          type: String,
          required: false,
        },
        highSchoolCertificateSize: {
          type: String,
          required: false,
        },
        highSchoolCertificateKey: {
          type: String,
          required: false,
        },
      },
      agreementCertificate: {
        agreementName: {
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
      },
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
      panCardCertificate: {
        panCardName: {
          type: String,
          required: false,
        },
        panCardCertificateSize: {
          type: String,
          required: false,
        },
        panCardKey: {
          type: String,
          required: false,
        },
      },
      // aadharCardCertificate: {
      //   aadharName: {
      //     type: String,
      //     required: true,
      //   },
      //   aadharCertificateSize: {
      //     type: String,
      //     required: true,
      //   },
      //   aadharCardKey: {
      //     type: String,
      //     required: true,
      //   },
      // },
      aadharCardCertificate: {
        aadharName: {
          type: String,
          required: false,
        },
        aadharCertificateSize: {
          type: String,
          required: false,
        },
        aadharCardKey: {
          type: String,
          required: false,
        },
      },
      // cvCertificate: {
      //   cvName: {
      //     type: String,
      //     required: true,
      //   },
      //   cvCertificateSize: {
      //     type: String,
      //     required: true,
      //   },
      //   cvKey: {
      //     type: String,
      //     required: true,
      //   },
      // },
      cvCertificate: {
        cvName: {
          type: String,
          required: false,
        },
        cvCertificateSize: {
          type: String,
          required: false,
        },
        cvKey: {
          type: String,
          required: false,
        },
      },
      // experienceCertificate: {
      //   experienceCertificateName: {
      //     type: String,
      //     required: true,
      //   },
      //   experienceCertificateSize: {
      //     type: String,
      //     required: true,
      //   },
      //   experienceCertificateKey: {
      //     type: String,
      //     required: true,
      //   },
      // },
      experienceCertificate: {
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
  
      //AGREEMENT
      // agreementSigned: {
      //   type: String,
      //   enum: ["Yes", "No"],
      //   required: true,
      // },
      agreementSigned: {
        type: String,
        enum: ["Yes", "No"],
        required: false,
      },
      agreementValidity: {
        type: String,
        required: false,
      },
      modeofAgreement: {
        type: String,
        required: false,
      },
      isAllDocumentUploaded: {
        type: Boolean,
        default: false,
      },
    client_status:{
        type:String,
        enum:['active','inactive'],
        default:'inactive'
    }
   
},{timestamps: true});
const createProctorModel=mongoose.model('proctor',createProctorSchema);
module.exports=createProctorModel;