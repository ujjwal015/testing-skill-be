
const assessorModel = require("../models/AssesorModel.js")
const JobRole = require("../models/jobRole-model");
const Joi = require("@hapi/joi");
const { Paginate } = require("../utils/paginate");
const responseMessage = require("../utils/responseMessage");
const {
  uploadFile,
  getFileUrl,
  getassessorFileUrl,
  getassessorListFileUrl
} = require("../utils/s3bucketAccessor");
const validator = require("../utils/validator");
const fs = require("fs/promises");
const { sendResponse, errorResponse } = require("../utils/response");
const {
  uploadAssessorFile,
  getAssessorFileUrl,
  deleteAssessorFromS3,
} = require("../utils/s3bucketAssessor");


const {
  getFilter,
  validateMobileNumber,
  validatePincode,
} = require("../utils/custom-validators");
const { Console } = require("console");

// const {
//  sendMailToUser
// } = require("../controller/userController");
const nodemailer = require("nodemailer");
const {
  TOKEN,
  SENDER_EMAIL,
  CLIENT_URL,
  JWT_SECRET
} = require("../config/envProvider.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { MailtrapClient, MailtrapTransport } = require("mailtrap")
const reader = require("xlsx")
//function to generate randomstring
function generateRandomAlphanumeric(length) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars.charAt(randomIndex);
  }

  return result;
}
//function for sending mail
async function sendMailToUser(res, response) {
  try {
    const randomString = generateRandomAlphanumeric(10);
    const mailOptions = {
      from: {
        address: SENDER_EMAIL,
        name: "Testa"
      },
      to: response.email,
      host: 'smtp.mailtrap.io',
      subject: "Create New Password for Testa",
      attachments: [
        {
          filename: "testa-logo.png",
          path: "https://i.ibb.co/z4ZMDQj/testa-logo.png",
          cid: "testa-logo", //same cid value as in the html img src
        },
        {
          filename: "testa-logo.png",
          path: "https://i.ibb.co/GTkNybW/bg-testa.png",
          cid: "bg-testa",
        },
        {
          filename: "Union.png",
          path: "https://i.ibb.co/w0JwsJ3/Union.png",
          cid: "Union",
        },
        {
          filename: "Union-1.png",
          path: "https://i.ibb.co/HrWXkBs/Union-1.png",
          cid: "Union-1",
        },
        {
          filename: "Union-2.png",
          path: "https://i.ibb.co/7J62VZF/Union-2.png",
          cid: "Union-2",
        },
        {
          filename: "Union-3.png",
          path: "https://i.ibb.co/xsTmm4P/Union-3.png",
          cid: "Union-3",
        },
        {
          filename: "Union-4.png",
          path: "https://i.ibb.co/4KGLZYM/Union-4.png",
          cid: "Union-4",
        },
      ],
      html: `<body bgcolor="#FFFFFF" leftmargin="0" marginwidth="-10" topmargin="0" marginheight="0" >
      <table border="0" cellpadding="0" cellspacing="0" height="100%" width="100%" id="bodyTbl" style="max-width: 970px!important;margin: auto;">
        <tr>
          <td align="center"  id="bodyCell">
            <table bgcolor="#FFFFFF" border="0" cellpadding="0" cellspacing="0" width="100%" id="emailBody" >
              <tr>
                <td>
                  <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:transparent">
                    <tr>
                      <td align="center" >
                        <table border="0" cellpadding="0" cellspacing="0" width="95%" class="flexibleContainer" style="margin: 20px auto;border-radius: 20px;border: 1px solid #0000001f;overflow: hidden;">
                          <tr class="demo">
                            <td align="center"  width="95%" class="flexibleContainerCell">
                              <table border="0" cellpadding="30" cellspacing="0" width="100%">
                                <tr>
                                  <td style="padding: 0px;">
                                    <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#FFFFFF" style="font-size:16px;
                                    max-width: 100%;
                                    margin: auto;">
                                      <tr>
                                        <td  style="
                                          padding: 0;
                                          text-align:left;
                                          font-size:15px;
                                          margin-bottom:0;
                                          color: #2c2c2a;
                                          margin-top: 40px;
                                          border: solid 1px #eee;
                                          border-radius: 20px;
                                          overflow: hidden;
                                          width: 100%;
                                        ">
                                          <div class="overall-content"
                                            style="
                                              padding: 12px 0 0;
                                              width: 100%;
                                              box-sizing: border-box;
                                            "
                                          >
                                            <div class="testa-topcontent" style="width: 100%;padding-left: 40px;">
                                              <div class="right-content" style="width:50%;display: inline-block;">
                                                <div
                                                style="
                                                  display: block;
                                                  max-width: 100%;
                                                  padding-top: 28px;
                                                "
                                              >
                                                <p style="display: inline-block;">
                                                  <img src="cid:testa-logo" alt="testa-logo" border="0">
                                                </p>
                                                <p
                                                  style="
                                                    font-weight: 400;
                                                    font-size: 20px;
                                                    line-height: 22px;
                                                    letter-spacing: 0.02em;
                                                    color: #000000;
                                                    margin: 0;
                                                    padding-left: 17px;
                                                    display: inline-block;
                                                  "
                                                >
                                                  Testa
                                                </p>
                                                </div>
                                                <h1
                                                  style="
                                                    font-weight: 400;
                                                    font-size: 48px;
                                                    line-height: 58px;
                                                    text-transform: capitalize;
                                                    color: #000000;
                                                    max-width: 100%;
                                                    padding-bottom: 57px;
                                                  "
                                                >
                                                  Welcome to Testa
                                                </h1>
                                                <div style="max-width:100%;">
                                                  <p
                                                    style="
                                                      font-weight: 700;
                                                      font-size: 15px;
                                                      line-height: 22px;
                                                      letter-spacing: 0.02em;
                                                      color: #000000;
                                                      margin: 0;
                                                      padding-bottom: 10px;
                                                    "
                                                  >
                                                    Hi ${response.firstName} ${response.lastName}
                                                  </p>
                                                  <h3>Your Temporary Password : ${randomString}</h3>
                                                  <p
                                                    style="
                                                      font-style: normal;
                                                      font-weight: 400;
                                                      font-size: 14px;
                                                      line-height: 19px;
                                                      color: #000000;
                                                      margin: 0;
                                                      padding-bottom: 30px;
                                                    "
                                                  >
                                                    Thank you for Signing up!
                                                    You are invited to join Testa! For login, You need to set an account password.
                                                    Please click the button given below to create your account password.
                                                  </p>
                                                </div>
                                              </div>
                                              <div class="left-image" style="width:50%;display: inline-block; float: right;text-align: right;">
                                                <a href="#">
                                                  <img src="cid:bg-testa" alt="bg-testa" border="0">
                                                </a>
                                              </div>
                                            </div>
                                            <div style="display: block;width: 100%;padding-left: 40px;">
                                              <p class="verify-btn"
                                                style="
                                                  background: #2EA8DB;
                                                  box-shadow: 5.5758px 27.879px 22.3032px rgba(0, 0, 0, 0.04);
                                                  border-radius: 5px;
                                                  font-weight: 700;
                                                  font-size: 18px;
                                                  line-height: 22px;
                                                  color: #FDFDFD;
                                                  margin: 0 0 45px;
                                                  padding: 12px 46px;
                                                  display: inline-block;
                                                  width: auto;
                                                "
                                              >
                                              <a href=${CLIENT_URL}/reset-password>Set Account Password</a>
                                              </p>
                                              <p class="access-account"
                                                style="
                                                  font-style: normal;
                                                  font-weight: 400;
                                                  font-size: 14px;
                                                  line-height: 19px;
                                                  color: #000000;
                                                  display: inline-block;
                                                  width: 100%;
                                                  margin: 0 0 21px;
                                                "
                                              >
                                                You can access your account area to view your orders and change your account settings here:
                                                <a style="color: #2EA8DB;" href="http://nextmockup.com/my-account/.">
                                                  http://nextmockup.com/my-account/.
                                                </a>
                                              </p>
                                              <p class="testa-regards"
                                                style="
                                                  font-style: normal;
                                                  font-weight: 400;
                                                  font-size: 14px;
                                                  line-height: 19px;
                                                  color: #000000;
                                                  display: block;
                                                  width: 100%;
                                                  margin: 0 0 52px;
                                                  text-align: left;
                                                "
                                              >
                                                <span style="display: block;" >We hope you have an enriching experience.</span>
                                                <span style="display: block;" >Regards,</span>
                                                <span style="display: block;" >Testa Team</span>
                                              </p>
                                              <div class="socail-icons"
                                                style="
                                                  display: inline-block;
                                                  text-align: center;
                                                  width: 100%;
                                                  margin: 0 0 31px;
                                                "
                                              >
                                                <span style="padding-right: 23px;display: inline-block;">
                                                  <a href="#">
                                                    <img src="cid:Union" alt="Union" border="0">
                                                  </a>
                                                </span>
                                                <span style="padding-right: 23px;display: inline-block;">
                                                  <a href="#">
                                                    <img src="cid:Union-1" alt="Union-1" border="0">
                                                  </a>
                                                </span>
                                                <span style="padding-right: 23px;display: inline-block;">
                                                  <a href="#">
                                                    <img src="cid:Union-2" alt="Union-2" border="0">
                                                  </a>
                                                </span>
                                                <span style="padding-right: 23px;display: inline-block;">
                                                  <a href="#">
                                                    <img src="cid:Union-3" alt="Union-3" border="0">
                                                  </a>
                                                </span>
                                                <span style="display: inline-block;">
                                                  <a href="#">
                                                    <img src="cid:Union-4" alt="Union-4" border="0">
                                                  </a>
                                                </span>
                                              </div>
                                            </div>
                                            <div
                                              style="
                                                display: block;
                                                text-align: center;
                                                width: 100%;
                                                background: #F9F9F9;
                                                padding: 22px 0;
                                              "
                                            >
                                              <p
                                                style="
                                                  font-weight: 700;
                                                  font-size: 15px;
                                                  line-height: 22px;
                                                  letter-spacing: 0.02em;
                                                  color: #000000;
                                                  display: inline-block;
                                                  width: auto;
                                                  margin: 0;
                                                  padding-right: 15px;
                                                "
                                              >
                                                POWERED BY
                                              </p>
                                              <p
                                                style="
                                                  font-weight: 400;
                                                  font-size: 20px;
                                                  line-height: 22px;
                                                  letter-spacing: 0.02em;
                                                  color: #022A50;
                                                  display: inline-block;
                                                  width: auto;
                                                  margin: 0;
                                                "
                                              >
                                                Testa Online
                                              </p>
                                            </div>
                                          </div>
                                        </td>
                                      </tr>
                                    </table>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
  </body>`,
    };

    // const transporter = nodemailer.createTransport({
    //   service: EMAIL_SERVICE,
    //   auth: {
    //     user: EMAIL_USERNAME,
    //     pass: EMAIL_PASSWORD,
    //   },
    // });

    const transporter = nodemailer.createTransport(MailtrapTransport({
      token: TOKEN
    }))

    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.log('error--->', error.message)
        return errorResponse(
          res,
          500,
          responseMessage.something_wrong,
          error.message
        );
      } else {

        if(info.success){

         
          const salt = await bcrypt.genSalt(8);
          const hashPassword = await bcrypt.hash(randomString, salt);
          await assesorModel.updateOne(
            { _id: response._id },
            { $set: { isPasswordChangeEmailSend: true, password: hashPassword } },
            { upsert: false, runValidators: true }
          );
          return sendResponse(
            res,
            200,
            responseMessage.assessor_added_successfully,
            response
          )
        }

        else{ 
          return errorResponse(
            res,
            400,
            "Unable to send initial password email",
            "Unable to send initial password email"
          );
        }
;
      }
    });
  } catch (error) {
    return errorResponse(
      res,
      500,
      "Oops! Something went wrong here...",
      error.message
    );
  }
}

module.exports.uploadfile = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(
        res,
        401,
        responseMessage.file_not_received,
        responseMessage.file_not_received
      );
    }
    const files = req.file;
    const formatFileSize = (bytes) => {
      if (bytes < 1024) {
        return bytes + " B";
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      }
    };

    const sipCertificateName = files ? files.originalname : null;
    const sipCertificateSize = files ? `(${formatFileSize(files.size)})` : null;

    let uploadedData = await uploadFile(req);
    if (uploadedData.statusCode === 200) {
      uploadedData = {
        sipCertificateKey: uploadedData.key,
        jobroleId: req.body.jobroleId,
        sipCertificateName: sipCertificateName,
        sipCertificateSize: sipCertificateSize,
      };
      return sendResponse(
        res,
        200,
        responseMessage.sip_added_successfully,
        uploadedData
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.getfile = async (req, res) => {
  try {
    let query = {};
    const assessorData = await assesorModel.find(query);
    if (!assessorData)
      return errorResponse(
        res,
        404,
        responseMessage.assessor_profile_not_found,
        responseMessage.errorMessage
      );

    if (assessorData.length < 1)
      return errorResponse(
        res,
        404,
        responseMessage.assessor_profile_not_found,
        responseMessage.no_assessor_found
      );

    const imgUrl = assessorData.map((data) => {
      const sipCertificateKeys = data.sipDetails.map(
        (sipDetail) => sipDetail.sipCertificateKey
      );
      if (sipCertificateKeys) {
        return getFileUrl(data);
      } else {
        return errorResponse(
          res,
          500,
          responseMessage.errorMessage,
          error.message
        );
      }
    });

    Promise.all(imgUrl)
      .then((result) => {
        return sendResponse(res, 200, responseMessage.assessor_profile_get, {
          result,
        });
      })
      .catch((err) => {
        return errorResponse(
          res,
          422,
          responseMessage.image_not_found,
          responseMessage.image_not_found
        );
      });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.getassessorfile = async (req, res) => {
  try {
    let query = {};
    const assessorData = await assesorModel.find(query);
    if (!assessorData)
      return errorResponse(
        res,
        404,
        responseMessage.assessor_profile_not_found,
        responseMessage.errorMessage
      );

    if (assessorData.length < 1)
      return errorResponse(
        res,
        404,
        responseMessage.assessor_profile_not_found,
        responseMessage.no_assessor_found
      );

    const imgUrl = assessorData.map((data) => {
      if (data) {
        return getassessorFileUrl(data);
      } else {
        const {
          _id,
          firstName,
          lastName,
          email,
          mobile,
          gender,
          dob,
          address,
          state,
          district,
          pinCode,
          experience,
          aadharNo,
          panCardNo,
          bankName,
          bankAccount,
          bankIFSC,
          agreementSigned,
          agreementValidity,
          modeofAgreement,
          isAllDocumentUploaded,
          sipDetails,
        } = data;

        const newData = {
          _id,
          firstName,
          lastName,
          email,
          mobile,
          gender,
          dob,
          address,
          state,
          district,
          pinCode,
          experience,
          aadharNo,
          panCardNo,
          bankName,
          bankAccount,
          bankIFSC,
          agreementSigned,
          agreementValidity,
          isAllDocumentUploaded,
          modeofAgreement,
          sipDetails,
          url: null,
        };

        return newData;
      }
    });

    Promise.all(imgUrl)
      .then((result) => {
        return sendResponse(res, 200, responseMessage.assessor_profile_get, {
          result,
        });
      })
      .catch((err) => {
        return errorResponse(
          res,
          422,
          responseMessage.image_not_found,
          responseMessage.image_not_found
        );
      });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.addAssesor = async (req, res) => {
  try {
    const { error } = await validateAddAssesor(req.body);

    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );
    const {
      firstName,
      lastName,
      email,
      mobile,
      gender,
      dob,
      address,
      state,
      district,
      pinCode,
      experience,
      aadharNo,
      panCardNo,
      bankName,
      bankAccount,
      bankIFSC,
      agreementSigned,
      agreementValidity,
      modeofAgreement,
      sipDetails,
    } = req.body;

    const clientDetail = [];
    // Iterate through sipDetails to find clients for each jobroleId
    for (const sipDetail of sipDetails) {
      const { jobroleId } = sipDetail;

      // Assuming jobroleId is a reference to the JobRole model
      const client = await JobRole.findById(jobroleId).populate("clientId");

      if (client) {
        // Add the client details to the clientDetail array
        clientDetail.push(client?.clientId?._id);
      }
    }
    const isExistAssesor = await assesorModel.findOne({ email: email });

    if (isExistAssesor)
      return errorResponse(
        res,
        400,
        responseMessage.assesor_not_create,
        responseMessage.assesor_already_register
      );

    let check = validateMobileNumber(mobile);

    if (!check)
      return errorResponse(
        res,
        400,
        responseMessage.mobile_num_invalid,
        responseMessage.errorMessage
      );
    
      const isExistMobile = await assesorModel.findOne({ mobile: mobile });
  
      if (isExistMobile)
        return errorResponse(
          res,
          400,
          'Mobile No. you have entered already registered',
          'Mobile No. you have entered already registered'
        );  

    let checkPincode = validatePincode(pinCode);

    if (!checkPincode)
      return errorResponse(
        res,
        400,
        responseMessage.pincode_invalid,
        responseMessage.errorMessage
      );

      const isExistAadhar = await assesorModel.findOne({ aadharNo: aadharNo });
  
      if (isExistAadhar)
        return errorResponse(
          res,
          400,
          'Aadhar No. you have entered already registered',
          'Aadhar No. you have entered already registered'
        );  

        const isExistPancard = await assesorModel.findOne({ panCardNo: panCardNo });

        if (isExistPancard)
          return errorResponse(
            res,
            400,
            'Pancard No. you have entered already registered',
            'Pancard No. you have entered already registered'
          );    

          const isExistBankAccount = await assesorModel.findOne({ bankAccount: bankAccount });

          if (isExistBankAccount)
            return errorResponse(
              res,
              400,
              'Bank account No. you have entered already registered',
              'Bank account No. you have entered already registered'
            );      



    let assessorautoId = `RD${Math.floor(1000 + Math.random() * 9000)}`;

    //------------>set file originalname limit  and length<----------
    const files = req.files;
    console.log("files==>",files)
    const formatFileSize = (bytes) => {
      if (bytes < 1024) {
        return bytes + " B";
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      }
    };

    const sipFile = files.experienceCertificate?.[0];

    let experienceCertificateName = sipFile ? sipFile.originalname : null;

    let experienceCertificateSize = sipFile
      ? `(${formatFileSize(sipFile?.size)})`
      : null;

    // Define default values for optional fields (if not provided)
    const cvFile = files.cv?.[0];
    let cvName = cvFile?.originalname || null;
    let cvSize = cvFile ? `(${formatFileSize(cvFile?.size)})` : null;

    //adding tpDeclaration and examCenter
    const tpFile = files.tpDeclaration?.[0];
    let tpName = tpFile?.originalname || null;
    let tpSize = cvFile ? `(${formatFileSize(tpFile?.size)})` : null;

    const examcenterFile = files.examcenter?.[0];
    let examcenterName = examcenterFile?.originalname || null;
    let examcenterSize = cvFile ? `(${formatFileSize(examcenterFile?.size)})` : null;

    

    const aadharCardFile = files.aadharCard?.[0];
    let aadharCardName = aadharCardFile?.originalname || null;
    let aadharCardSize = aadharCardFile
      ? `(${formatFileSize(aadharCardFile?.size)})`
      : null;

    const panCardFile = files.panCard?.[0];
    let panCardName = panCardFile?.originalname || null;
    let panCardSize = panCardFile
      ? `(${formatFileSize(panCardFile?.size)})`
      : null;

    const assessorFile = files.assessorPhoto?.[0];
    let assessorPhotoName = assessorFile?.originalname || null;
    let assessorSize = assessorFile
      ? `(${formatFileSize(assessorFile?.size)})`
      : null;

    const agreementFile = files.agreementCertificate?.[0] || null;
    let agreementCertificateName = agreementFile?.originalname || null;
    let agreementSize = agreementFile
      ? `(${formatFileSize(agreementFile?.size)})`
      : null;

    const highSchoolFile = files.highSchoolCertificate?.[0];
    let highSchoolCertificateName = highSchoolFile?.originalname || null;
    let highSchoolCertificateSize = highSchoolFile
      ? `(${formatFileSize(highSchoolFile?.size)})`
      : null;

    const intermediateFile = files.intermediateCertificate?.[0];
    let intermediateCertificateName = intermediateFile?.originalname || null;
    let intermediateCertificateSize = intermediateFile
      ? `(${formatFileSize(intermediateFile?.size)})`
      : null;

    const diplomaFile = files.diplomaCertificate?.[0];
    let diplomaCertificateName = diplomaFile?.originalname || null;
    let diplomaCertificateSize = diplomaFile
      ? `(${formatFileSize(diplomaFile?.size)})`
      : null;

    const undergradFile = files.undergradCertificate?.[0];
    let undergradCertificateName = undergradFile?.originalname || null;
    let undergradCertificateSize = undergradFile
      ? `(${formatFileSize(undergradFile?.size)})`
      : null;

    const postgradFile = files.postgradCertificate?.[0];
    let postgradCertificateName = postgradFile?.originalname || null;
    let postgradCertificateSize = postgradFile
      ? `(${formatFileSize(postgradFile?.size)})`
      : null;

    const otherFile = files.otherCertificate?.[0] || null;
    let otherCertificateName = otherFile?.originalname || null;
    let otherCertificateSize = otherFile
      ? `(${formatFileSize(otherFile?.size)})`
      : null;

    //here we get the key and value, key of file
    const newArray = Object.entries(req.files).map(([key, value]) => {
      return { key, value };
    });

    if (!req.files) {
      return errorResponse(
        res,
        401,
        responseMessage.file_not_received,
        responseMessage.file_not_received
      );
    }

    let assessorToCheck = "";
    let cvToCheck = "";
    let experienceToCheck = "";
    let aadharToCheck = "";
    let panToCheck = "";
    let agreementToCheck = "";
    let highSchoolToCheck = "";
    let intermediateToCheck = "";
    let diplomaToCheck = "";
    let undergradToCheck = "";
    let postgradToCheck = "";
    let otherCertificateToCheck = "";
    let tpToCheck = "";
    let examcenterToCheck = "";
    const uploadedFilePromises = newArray.map(async (file) => {
      switch (file.key) {
        case "assessorPhoto":
          assessorToCheck = file.key;
          break;
        case "cv":
          cvToCheck = file.key;
          break;
        case "experienceCertificate":
          experienceToCheck = file.key;
          break;
        case "aadharCard":
          aadharToCheck = file.key;
          break;
        case "panCard":
          panToCheck = file.key;
          break;
        case "agreementCertificate":
          agreementToCheck = file.key;
          break;
        case "highSchoolCertificate":
          highSchoolToCheck = file.key;
          break;
        case "intermediateCertificate":
          intermediateToCheck = file.key;
          break;
        case "diplomaCertificate":
          diplomaToCheck = file.key;
          break;
        case "undergradCertificate":
          undergradToCheck = file.key;
          break;
        case "postgradCertificate":
          postgradToCheck = file.key;
          break;
        case "otherCertificate":
          otherCertificateToCheck = file.key;
          break;
         case "tpDeclaration":
          tpToCheck = file.key;
          break;
        case "examCenter":
          examcenterToCheck = file.key;
          break;
        default:
          "";
          break;
      }
      //upload file on s3 bucket
      return uploadAssessorFile({
        buffer: file.value[0].buffer,
        key: file.key,
        mimetype: file.value[0].mimetype,
        email: req.body.email,
      });
    });

    const expCert = {
      experienceCertificateName: experienceCertificateName,
      experienceCertificateSize: experienceCertificateSize,
      experienceCertificateKey: experienceToCheck,
    };
    const cvCert = {
      cvName: cvName,
      cvCertificateSize: cvSize,
      cvKey: cvToCheck,
    };
    const aadharCert = {
      aadharName: aadharCardName,
      aadharCertificateSize: aadharCardSize,
      aadharCardKey: aadharToCheck,
    };
    const panCert = {
      panCardName: panCardName,
      panCardCertificateSize: panCardSize,
      panCardKey: panToCheck,
    };
    const assessorCert = {
      assessorName: assessorPhotoName,
      assessorPhotoSize: assessorSize,
      profileKey: assessorToCheck,
    };
    const agreementCert = {
      agreementName: agreementCertificateName,
      agreementCertificateSize: agreementSize,
      agreementCertificateKey: agreementToCheck,
    };
    const highSchoolCert = {
      highSchoolCertificateName: highSchoolCertificateName,
      highSchoolCertificateSize: highSchoolCertificateSize,
      highSchoolCertificateKey: highSchoolToCheck,
    };
    const intermediateCert = {
      intermediateCertificateName: intermediateCertificateName,
      intermediateCertificateSize: intermediateCertificateSize,
      intermediateCertificateKey: intermediateToCheck,
    };
    const diplomaCert = {
      diplomaCertificateName: diplomaCertificateName,
      diplomaCertificateSize: diplomaCertificateSize,
      diplomaCertificateKey: diplomaToCheck,
    };
    const undergradCert = {
      undergraduateCertificateName: undergradCertificateName,
      undergradCertificateSize: undergradCertificateSize,
      undergraduateCertificateKey: undergradToCheck,
    };
    const postgradCert = {
      postgraduateCertificateName: postgradCertificateName,
      postgradCertificateSize: postgradCertificateSize,
      postgraduateCertificateKey: postgradToCheck,
    };
    const otherCert = {
      otherCertificateName: otherCertificateName,
      otherCertificateSize: otherCertificateSize,
      otherCertificateKey: otherCertificateToCheck,
    };

    const tpCert = {
      tpName: tpName,
      tpDeclarationSize: tpSize,
      tpKey: tpToCheck,
    };
    const examcenterCert = {
      examcenterName: examcenterName,
      examCenterSize: examcenterSize,
      examCenterKey: examcenterToCheck,
    };
   console.log("tpCert==>",tpCert,examcenterCert)
    //here we handle all promises and check status of all file is 200 or not
    Promise.all(uploadedFilePromises)
      .then(async (result) => {
        const allStatusCodesAre200 = result.every(
          (res) => res.statusCode === 200
        );
        if (allStatusCodesAre200) {
          const assessorDetails = await new assesorModel({
            profileKey: assessorToCheck,
            cvKey: cvToCheck,
            highSchoolCertificateKey: highSchoolToCheck,
            intermediateCertificateKey: intermediateToCheck,
            diplomaCertificateKey: diplomaToCheck,
            undergraduateCertificateKey: undergradToCheck,
            postgraduateCertificateKey: postgradToCheck,
            otherCertificateKey: otherCertificateToCheck,
            //experienceCertificateKey: experienceToCheck,
            aadharCardKey: aadharToCheck,
            panCardKey: panToCheck,
            agreementCertificateKey: agreementToCheck,
            assessorId: assessorautoId,
            firstName: firstName,
            lastName: lastName,
            email: email,
            mobile: mobile,
            gender: gender,
            dob: dob,
            address: address,
            state: state,
            district: district,
            pinCode: pinCode,
            aadharNo: aadharNo,
            panCardNo: panCardNo,
            bankName: bankName,
            bankAccount: bankAccount,
            bankIFSC: bankIFSC,
            experience: experience,
            agreementSigned: agreementSigned,
            agreementValidity: agreementValidity,
            modeofAgreement: modeofAgreement,
            sipDetails,
            otherCertificate: otherCert,
            postgradCertificate: postgradCert,
            undergradCertificate: undergradCert,
            diplomaCertificate: diplomaCert,
            intermediateCertificate: intermediateCert,
            highSchoolCertificate: highSchoolCert,
            agreementCertificate: agreementCert,
            assessorCertificate: assessorCert,
            panCardCertificate: panCert,
            aadharCardCertificate: aadharCert,
            cvCertificate: cvCert,

            experienceCertificate: expCert,

            tpKey: tpToCheck,
            tpDeclaration:tpCert,
            examCenterKey: examcenterToCheck,
            examcenter:examcenterCert,

            clientDetail: clientDetail,
            isAllDocumentUploaded: true,
          });
          const imageDetails = await assessorDetails.save();
           
          //functionality to send mail
        
          if (imageDetails) {
            await sendMailToUser(res, imageDetails);
            //await sendMailToUser(res, response);
            // return sendResponse(
            //   res,
            //   200,
            //   responseMessage.assessor_added_successfully,
            //   imageDetails
            // );
          } else {
            return errorResponse(
              res,
              400,
              responseMessage.assessor_not_saved,
              responseMessage.errorMessage
            );
          }
        } else {
          //we can apply here delet key from s3 when not upload
          return errorResponse(
            res,
            400,
            responseMessage.assessor_file_upload_failed,
            result
          );
        }
      })
      .catch((err) => {
        return errorResponse(
          res,
          422,
          responseMessage.image_not_found,
          err.message
        );
      });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//---->get all assessor list
exports.assessorList = async (req, res, next) => {
  try {
    const options = ["assessorId", "firstName", "email"];
    let filter = getFilter(req, options,false);
    const { page, limit, skip, sortOrder } = Paginate(req);

    //let query = filter ? filter.query : {};
    // ===>Code for filter<====
    const modeofAgreement = req?.query?.modeofAgreement;
    const agreementSigned = req?.query?.agreementSigned;
    const from = req?.query?.from;
    const to = req?.query?.to;
    
    // Build the filter query
    let query = filter ? filter.query : {};

    if (modeofAgreement) {
      query.modeofAgreement = modeofAgreement;
    }

    if (agreementSigned) {
      query.agreementSigned = agreementSigned;
    }

    if (from && to) {
      query.createdAt = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    } else if (from) {
      query.createdAt = {
        $gte: new Date(from),
      };
    } else if (to) {
      query.createdAt = {
        $lte: new Date(to),
      };
    }
    //===>END<===
    const assessorData = await assesorModel
      .find(query)
      .populate("clientDetail")
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);
    const totalCounts = await assesorModel.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);
    // if (!assessorData)
    //   return errorResponse(
    //     res,
    //     404,
    //     responseMessage.assessor_profile_not_found,
    //     responseMessage.errorMessage
    //   );

    if (assessorData.length < 1)
      return sendResponse(
        res,
        200,
        responseMessage.assessor_profile_not_found,
        {}
      );

    const imgUrl = assessorData.map((data) => {
      if (data) {
         // Dynamically create the fileKeys array based on uploaded files
         const fileKeys = [];

         if (data.cvCertificate && data.cvCertificate.cvKey) {
           fileKeys.push('cv');
         }
          
         if (
           data.experienceCertificate &&
           data.experienceCertificate.experienceCertificateKey
         ) {
           fileKeys.push('experienceCertificate');
         }
 
         if (
           data.aadharCardCertificate &&
           data.aadharCardCertificate.aadharCardKey
         ) {
           fileKeys.push('aadharCard');
         }
 
         if (
           data.panCardCertificate &&
           data.panCardCertificate.panCardKey
         ) {
           fileKeys.push('panCard');
         }
 
         if (
           data.assessorCertificate &&
           data.assessorCertificate.profileKey
         ) {
           fileKeys.push('assessorPhoto');
         }
 
         if (
           data.agreementCertificate &&
           data.agreementCertificate.agreementCertificateKey
         ) {
           fileKeys.push('agreementCertificate');
         }
 
         if (
           data.highSchoolCertificate &&
           data.highSchoolCertificate.highSchoolCertificateKey
         ) {
           fileKeys.push('highSchoolCertificate');
         }
 
         if (
           data.intermediateCertificate &&
           data.intermediateCertificate.intermediateCertificateKey
         ) {
           fileKeys.push('intermediateCertificate');
         }
 
         if (
           data.diplomaCertificate &&
           data.diplomaCertificate.diplomaCertificateKey
         ) {
           fileKeys.push('diplomaCertificate');
         }
 
         if (
           data.undergradCertificate &&
           data.undergradCertificate.undergraduateCertificateKey
         ) {
           fileKeys.push('undergradCertificate');
         }
 
         if (
           data.postgradCertificate &&
           data.postgradCertificate.postgraduateCertificateKey
         ) {
           fileKeys.push('postgradCertificate');
         }
 
         if (
           data.otherCertificate &&
           data.otherCertificate.otherCertificateKey
         ) {
           fileKeys.push('otherCertificate');
         }

         if (data.tpDeclaration && data.cvCertificate.tpKey) {
          fileKeys.push('tpDeclaration');
        }
        
        if (data.examcenter && data.examcenter.examCenterKey) {
          fileKeys.push('examcenter');
        }
 
        return getassessorListFileUrl(data,fileKeys);
      } 
      // else {
      //   return errorResponse(
      //     res,
      //     400,
      //     responseMessage.assessor_file_not_found,
      //     data
      //   );
      // }
    });

    Promise.all(imgUrl)
      .then((result) => {
        return sendResponse(res, 200, responseMessage.assessor_profile_get, {
          result,
          page,
          totalCounts,
          totalPages,
        });
      })
      .catch((err) => {
        return errorResponse(
          res,
          422,
          responseMessage.image_not_found,
          err.message
        );
      });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//----->Remove assessor
exports.deleteAssessor = async (req, res, next) => {
  try {
    let assessorId = req.params.id;

    if (!assessorId) {
      return errorResponse(
        res,
        403,
        responseMessage.no_assessor_id_provided,
        responseMessage.no_assessor_id_provided
      );
    }
    const assessorData = await assesorModel.findOne({ _id: assessorId });
    // check user if found or not
    if (!assessorData)
      return errorResponse(
        res,
        404,
        responseMessage.assessor_profile_not_found,
        responseMessage.errorMessage
      );

    const result = await assesorModel.deleteOne({ _id: assessorId });
    // send data to client
    if (!result)
      return errorResponse(
        res,
        400,
        responseMessage.assessor_not_able_delete,
        responseMessage.errorMessage
      );

    return sendResponse(
      res,
      200,
      responseMessage.assessor_profile_delete,
      result
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

// exports.getAssessorById = async (req, res) => {
//   try {
//     let accessorId = req.params.id;

//     const accessorDetail = await assesorModel.findById(accessorId);
//     if (accessorDetail) {
//       if (accessorDetail.isAllDocumentUploaded) {
//         const dataWithUrl = await getassessorFileUrl(accessorDetail); //getAssessorFileUrl
//         if (dataWithUrl) {
//           return sendResponse(
//             res,
//             200,
//             responseMessage.assessor_details_available,
//             dataWithUrl
//           );
//         } else {
//           return errorResponse(
//             res,
//             400,
//             responseMessage.assessor_file_not_found,
//             result
//           );
//         }
//       }
//     }
//     return errorResponse(
//       res,
//       400,
//       responseMessage.assessor_not_found,
//       responseMessage.errorMessage
//     );
//   } catch (error) {
//     return errorResponse(res, 500, responseMessage.errorMessage, error.message);
//   }
// };

//get only file which have uploaded
exports.getAssessorById = async (req, res) => {
  try {
    let assessorId = req.params.id;

    const assessorDetail = await assesorModel.findById(assessorId);

    if (assessorDetail) {
      if (assessorDetail.isAllDocumentUploaded) {
        // Dynamically create the fileKeys array based on uploaded files
        const fileKeys = [];

        if (assessorDetail.cvCertificate && assessorDetail.cvCertificate.cvKey) {
          fileKeys.push('cv');
        }

        if (
          assessorDetail.experienceCertificate &&
          assessorDetail.experienceCertificate.experienceCertificateKey
        ) {
          fileKeys.push('experienceCertificate');
        }

        if (
          assessorDetail.aadharCardCertificate &&
          assessorDetail.aadharCardCertificate.aadharCardKey
        ) {
          fileKeys.push('aadharCard');
        }

        if (
          assessorDetail.panCardCertificate &&
          assessorDetail.panCardCertificate.panCardKey
        ) {
          fileKeys.push('panCard');
        }

        if (
          assessorDetail.assessorCertificate &&
          assessorDetail.assessorCertificate.profileKey
        ) {
          fileKeys.push('assessorPhoto');
        }

        if (
          assessorDetail.agreementCertificate &&
          assessorDetail.agreementCertificate.agreementCertificateKey
        ) {
          fileKeys.push('agreementCertificate');
        }

        if (
          assessorDetail.highSchoolCertificate &&
          assessorDetail.highSchoolCertificate.highSchoolCertificateKey
        ) {
          fileKeys.push('highSchoolCertificate');
        }

        if (
          assessorDetail.intermediateCertificate &&
          assessorDetail.intermediateCertificate.intermediateCertificateKey
        ) {
          fileKeys.push('intermediateCertificate');
        }

        if (
          assessorDetail.diplomaCertificate &&
          assessorDetail.diplomaCertificate.diplomaCertificateKey
        ) {
          fileKeys.push('diplomaCertificate');
        }

        if (
          assessorDetail.undergradCertificate &&
          assessorDetail.undergradCertificate.undergraduateCertificateKey
        ) {
          fileKeys.push('undergradCertificate');
        }

        if (
          assessorDetail.postgradCertificate &&
          assessorDetail.postgradCertificate.postgraduateCertificateKey
        ) {
          fileKeys.push('postgradCertificate');
        }

        if (
          assessorDetail.otherCertificate &&
          assessorDetail.otherCertificate.otherCertificateKey
        ) {
          fileKeys.push('otherCertificate');
        }

        const dataWithUrls = await getassessorFileUrl(assessorDetail, fileKeys);

        if (dataWithUrls && dataWithUrls.length > 0) {
          // Filter out files with null URLs (i.e., not uploaded)
          const uploadedFiles = dataWithUrls.filter((file) => file.url !== null);

          if (uploadedFiles.length > 0) {
            return sendResponse(
              res,
              200,
              responseMessage.assessor_details_available,
              uploadedFiles
            );
          } else {
            return errorResponse(
              res,
              400,
              responseMessage.assessor_file_not_found,
              responseMessage.errorMessage
            );
          }
        }
      }
    }

    return errorResponse(
      res,
      400,
      responseMessage.assessor_not_found,
      responseMessage.errorMessage
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};


exports.updateAssessor = async (req, res) => {
  try {
    const requestBody = req.body;
    //if(!_.isEmpty(requestBody)){
    const { error, value } = validateUpdateAssesor(requestBody);
    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );
    let files = req.files;
    //let filesip = req.file;
    const requestId = req?.params?.id;
    if (!requestId)
      return errorResponse(
        res,
        402,
        responseMessage.no_assessor_id_provided,
        responseMessage.no_assessor_id_provided
      );

    //get data from body
    const {
      firstName,
      lastName,
      email,
      mobile,
      gender,
      dob,
      address,
      state,
      district,
      pinCode,
      experience,
      aadharNo,
      panCardNo,
      bankName,
      bankAccount,
      bankIFSC,
      agreementSigned,
      agreementValidity,
      modeofAgreement,
      sipDetails,
    } = requestBody;
    
    //to check duplicate email
    const isExistingAssessor = await assesorModel.findOne({ email: email });

    if (isExistingAssessor && isExistingAssessor._id.toString() !== requestId)
      // if (isExistAssesor)
      return errorResponse(
        res,
        400,
        responseMessage.assesor_not_create,
        responseMessage.assesor_already_register
      );
    //set cliendId
    const clientDetail = [];
    // Iterate through sipDetails to find clients for each jobroleId
    for (const sipDetail of sipDetails) {
      const { jobroleId } = sipDetail;

      // Assuming jobroleId is a reference to the JobRole model
      const client = await JobRole.findById(jobroleId).populate("clientId");

      if (client) {
        // Add the client details to the clientDetail array
        clientDetail.push(client?.clientId?._id);
      }
    }

    //for getting file nameand size
    const formatFileSize = (bytes) => {
      if (bytes < 1024) {
        return bytes + " B";
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      }
    };

    const expFile = files.experienceCertificate?.[0];

    let experienceCertificateName = expFile ? expFile.originalname : null;

    let experienceCertificateSize = expFile
      ? `(${formatFileSize(expFile?.size)})`
      : null;

    // Define default values for optional fields (if not provided)
    const cvFile = files.cv?.[0];
    let cvName = cvFile?.originalname || null;
    let cvSize = cvFile ? `(${formatFileSize(cvFile?.size)})` : null;

    const aadharCardFile = files.aadharCard?.[0];
    let aadharCardName = aadharCardFile?.originalname || null;
    let aadharCardSize = aadharCardFile
      ? `(${formatFileSize(aadharCardFile?.size)})`
      : null;

    const panCardFile = files.panCard?.[0];
    let panCardName = panCardFile?.originalname || null;
    let panCardSize = panCardFile
      ? `(${formatFileSize(panCardFile?.size)})`
      : null;

    const assessorFile = files.assessorPhoto?.[0];
    let assessorPhotoName = assessorFile?.originalname || null;
    let assessorSize = assessorFile
      ? `(${formatFileSize(assessorFile?.size)})`
      : null;

    const agreementFile = files.agreementCertificate?.[0] || null;
    let agreementCertificateName = agreementFile?.originalname || null;
    let agreementSize = agreementFile
      ? `(${formatFileSize(agreementFile?.size)})`
      : null;

    const highSchoolFile = files.highSchoolCertificate?.[0];
    let highSchoolCertificateName = highSchoolFile?.originalname || null;
    let highSchoolCertificateSize = highSchoolFile
      ? `(${formatFileSize(highSchoolFile?.size)})`
      : null;

    const intermediateFile = files.intermediateCertificate?.[0];
    let intermediateCertificateName = intermediateFile?.originalname || null;
    let intermediateCertificateSize = intermediateFile
      ? `(${formatFileSize(intermediateFile?.size)})`
      : null;

    const diplomaFile = files.diplomaCertificate?.[0];
    let diplomaCertificateName = diplomaFile?.originalname || null;
    let diplomaCertificateSize = diplomaFile
      ? `(${formatFileSize(diplomaFile?.size)})`
      : null;

    const undergradFile = files.undergradCertificate?.[0];
    let undergradCertificateName = undergradFile?.originalname || null;
    let undergradCertificateSize = undergradFile
      ? `(${formatFileSize(undergradFile?.size)})`
      : null;

    const postgradFile = files.postgradCertificate?.[0];
    let postgradCertificateName = postgradFile?.originalname || null;
    let postgradCertificateSize = postgradFile
      ? `(${formatFileSize(postgradFile?.size)})`
      : null;

    const otherFile = files.otherCertificate?.[0] || null;
    let otherCertificateName = otherFile?.originalname || null;
    let otherCertificateSize = otherFile
      ? `(${formatFileSize(otherFile?.size)})`
      : null;

    const newArray = Object.entries(files).map(([key, value]) => {
      return { key, value };
    });

    //to check key value
    let assessorToCheck = "";
    let cvToCheck = "";
    let experienceToCheck = "";
    let aadharToCheck = "";
    let panToCheck = "";
    let agreementToCheck = "";
    let highSchoolToCheck = "";
    let intermediateToCheck = "";
    let diplomaToCheck = "";
    let undergradToCheck = "";
    let postgradToCheck = "";
    let otherCertificateToCheck = "";
    const uploadedFilePromises = newArray.map(async (file) => {
      switch (file.key) {
        case "assessorPhoto":
          assessorToCheck = file.key;
          break;
        case "cv":
          cvToCheck = file.key;
          break;
        case "experienceCertificate":
          experienceToCheck = file.key;
          break;
        case "aadharCard":
          aadharToCheck = file.key;
          break;
        case "panCard":
          panToCheck = file.key;
          break;
        case "agreementCertificate":
          agreementToCheck = file.key;
          break;
        case "highSchoolCertificate":
          highSchoolToCheck = file.key;
          break;
        case "intermediateCertificate":
          intermediateToCheck = file.key;
          break;
        case "diplomaCertificate":
          diplomaToCheck = file.key;
          break;
        case "undergradCertificate":
          undergradToCheck = file.key;
          break;
        case "postgradCertificate":
          postgradToCheck = file.key;
          break;
        case "otherCertificate":
          otherCertificateToCheck = file.key;
          break;

        default:
          "";
          break;
      }
      if(!file.value[0].buffer){
        return file
      }
      //upload file on s3 bucket
      return uploadAssessorFile({
        buffer: file.value[0].buffer,
        key: file.key,
        mimetype: file.value[0].mimetype,
        email: req.body.email,
      });
    });

    //send file original name and size with key

    const expCert = {
      experienceCertificateName: experienceCertificateName,
      experienceCertificateSize: experienceCertificateSize,
      experienceCertificateKey: experienceToCheck,
    };
    const cvCert = {
      cvName: cvName,
      cvCertificateSize: cvSize,
      cvKey: cvToCheck,
    };
    const aadharCert = {
      aadharName: aadharCardName,
      aadharCertificateSize: aadharCardSize,
      aadharCardKey: aadharToCheck,
    };
    const panCert = {
      panCardName: panCardName,
      panCardCertificateSize: panCardSize,
      panCardKey: panToCheck,
    };
    const assessorCert = {
      assessorName: assessorPhotoName,
      assessorPhotoSize: assessorSize,
      profileKey: assessorToCheck,
    };
    const agreementCert = {
      agreementName: agreementCertificateName,
      agreementCertificateSize: agreementSize,
      agreementCertificateKey: agreementToCheck,
    };
    const highSchoolCert = {
      highSchoolCertificateName: highSchoolCertificateName,
      highSchoolCertificateSize: highSchoolCertificateSize,
      highSchoolCertificateKey: highSchoolToCheck,
    };
    const intermediateCert = {
      intermediateCertificateName: intermediateCertificateName,
      intermediateCertificateSize: intermediateCertificateSize,
      intermediateCertificateKey: intermediateToCheck,
    };
    const diplomaCert = {
      diplomaCertificateName: diplomaCertificateName,
      diplomaCertificateSize: diplomaCertificateSize,
      diplomaCertificateKey: diplomaToCheck,
    };
    const undergradCert = {
      undergraduateCertificateName: undergradCertificateName,
      undergradCertificateSize: undergradCertificateSize,
      undergraduateCertificateKey: undergradToCheck,
    };
    const postgradCert = {
      postgraduateCertificateName: postgradCertificateName,
      postgradCertificateSize: postgradCertificateSize,
      postgraduateCertificateKey: postgradToCheck,
    };
   
    const otherCert = {
      otherCertificateName: otherCertificateName,
      otherCertificateSize: otherCertificateSize,
      otherCertificateKey: otherCertificateToCheck,
    };


    const updateObject = {
      firstName: firstName,
      lastName: lastName,
      email: email,
      mobile: mobile,
      gender: gender,
      dob: dob,
      address: address,
      state: state,
      district: district,
      pinCode: pinCode,
      aadharNo: aadharNo,
      panCardNo: panCardNo,
      bankName: bankName,
      bankAccount: bankAccount,
      bankIFSC: bankIFSC,
      experience: experience,
      agreementSigned: agreementSigned,
      agreementValidity: agreementValidity,
      modeofAgreement: modeofAgreement,
      sipDetails,

      //sipCertificateName: sipCertificateNames,
      otherCertificate: otherCert,
      postgradCertificate: postgradCert,
      undergradCertificate: undergradCert,
      diplomaCertificate: diplomaCert,
      intermediateCertificate: intermediateCert,
      highSchoolCertificate: highSchoolCert,
      agreementCertificate: agreementCert,
      assessorCertificate: assessorCert,
      panCardCertificate: panCert,
      aadharCardCertificate: aadharCert,
      cvCertificate: cvCert,
      experienceCertificate: expCert,
      clientDetail: clientDetail,
      isAllDocumentUploaded: true,
    };
   
    if(!otherCertificateName && !otherCertificateSize && !otherCertificateToCheck){
      delete updateObject["otherCertificate"]
    }

    if(!postgradCertificateName && !postgradCertificateSize && !postgradToCheck){
      delete updateObject["postgradCertificate"]
    }

    if(!undergradCertificateName && !undergradCertificateSize && !undergradToCheck){
      delete updateObject["undergradCertificate"]
    }

    if(!diplomaCertificateName && !diplomaCertificateSize && !diplomaToCheck){
      delete updateObject["diplomaCertificate"]
    }

    if(!intermediateCertificateName && !intermediateCertificateSize && !intermediateToCheck){
      delete updateObject["intermediateCertificate"]
    }

    if(!highSchoolCertificateName && !highSchoolCertificateSize && !highSchoolToCheck){
      delete updateObject["highSchoolCertificate"]
    }
   
    if(!agreementCertificateName && !agreementSize && !agreementToCheck){
      delete updateObject["agreementCertificate"]
    }

    if(!assessorPhotoName && !assessorSize && !assessorToCheck){
      //delete updateObject["assessorPhoto"]
      delete updateObject["assessorCertificate"];
    }

   
    if(!panCardName && !panCardSize && !panToCheck){
      delete updateObject["panCard"]
    }

    if(!aadharCardName && !aadharCardSize && !aadharToCheck){
      delete updateObject["aadharCard"]
    }

    if(!experienceCertificateName && !experienceCertificateSize && !experienceToCheck){
      delete updateObject["experienceCertificate"]
    }

    if(!cvName && !cvSize && !cvToCheck){
      delete updateObject["cv"]
    }
    
    
    
    Promise.all(uploadedFilePromises)
      .then(async (result) => {
        const allStatusCodesAre200 = result.every(
          (res) => res.statusCode === 200
        );
        if (allStatusCodesAre200) {
          const updateAssessorProfile = await assesorModel.findOneAndUpdate(
            { _id: requestId },
            { $set: updateObject },
            { new: true }
          );
          if (!updateAssessorProfile)
            return errorResponse(
              res,
              404,
              responseMessage.assessor_profile_not_found,
              responseMessage.assessor_profile_not_found
            );

          return sendResponse(
            res,
            200,
            responseMessage.assessor_profile_update,
            updateAssessorProfile
          );
        } else {
          return errorResponse(
            res,
            405,
            responseMessage.image_upload_failed,
            data
          );
        }
      })
      .catch((err) => {
        return errorResponse(
          res,
          422,
          responseMessage.image_not_found,
          err.message
        );
      });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.assessorStatusChange = async (req, res) => {
  try {
    const getAssessorId = req.params.id;

    // Find the existing assessor
    const existingAssessor = await assesorModel.findById(getAssessorId);
    if (!existingAssessor)
      return errorResponse(
        res,
        400,
        responseMessage.assessor_not_found,
        responseMessage.errorMessage
      );

    // Check if the new status is the same as the current status
    if (existingAssessor.client_status === req.body.status) {
      return errorResponse(
        res,
        400,
        responseMessage.status_same_exists,
        responseMessage.errorMessage
      );
    }

    const updatedAssessor = await assesorModel.findByIdAndUpdate(
      getAssessorId,
      { client_status: req.body.status },
      { new: true }
    );

    if (!updatedAssessor)
      return errorResponse(
        res,
        400,
        responseMessage.status_not_change,
        responseMessage.errorMessage
      );

    return sendResponse(
      res,
      200,
      responseMessage.status_change,
      updatedAssessor
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//--->filter assessor list by passing assessorMode, agreementSigned,from,to
exports.assessorFilterList = async (req, res, next) => {
  try {
    const filterOptions = ["assessorId", "firstName", "email"];
    const { page, limit, skip, sortOrder } = Paginate(req);
    
    // Define filter criteria
    const filter = getFilter(req, filterOptions);
    const modeofAgreement = req.query.modeofAgreement;
    const agreementSigned = req.query.agreementSigned;
    const from = req.query.from;
    const to = req.query.to;

    // Build the filter query
    delete filter.query.clientId
    let query = filter ? filter.query : {};
    //let query = filter ? filter.clientQuery : {};
    
    if (modeofAgreement) {
      query.modeofAgreement = modeofAgreement;
    }

    if (agreementSigned) {
      query.agreementSigned = agreementSigned;
    }

    if (from && to) {
      query.createdAt = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    } else if (from) {
      query.createdAt = {
        $gte: new Date(from),
      };
    } else if (to) {
      query.createdAt = {
        $lte: new Date(to),
      };
    }

    const assessorData = await assesorModel
      .find(query)
      .populate("clientDetail")
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);
    const totalCounts = await assesorModel.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);

    if (!assessorData) {
      return errorResponse(
        res,
        404,
        responseMessage.assessor_profile_not_found,
        responseMessage.errorMessage
      );
    }

    if (assessorData.length < 1) {
      return errorResponse(
        res,
        404,
        responseMessage.assessor_profile_not_found,
        responseMessage.no_assessor_found
      );
    }

    const imgUrlPromises = assessorData.map((data) => {
      if (data.isAllDocumentUploaded) {
        return getassessorFileUrl(data);
      } else {
        return errorResponse(
          res,
          400,
          responseMessage.assessor_file_not_found,
          result
        );
      }
    });

    Promise.all(imgUrlPromises)
      .then((result) => {
        return sendResponse(res, 200, responseMessage.assessor_profile_get, {
          result,
          page,
          totalCounts,
          totalPages,
        });
      })
      .catch((err) => {
        return errorResponse(
          res,
          422,
          responseMessage.image_not_found,
          err.message
        );
      });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

async function validateAddAssesor(data) {
  try {
    const sipDetailSchema = Joi.object().keys({
      jobroleId: Joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required(),
      jobroleName: Joi.string().trim().required(),
      sipValidity: Joi.string()
        .pattern(/^\d{2}-\d{2}-\d{4}$/)
        .message("Invalid sip date format")
        .required(),
      sipCertificateKey: Joi.string().required(),
      sipCertificateName: Joi.string().required(),
      sipCertificateSize: Joi.string().optional().allow(""),
    });
    const schema = Joi.object({
      firstName: Joi.string().min(2).max(50).trim().required(),
      lastName: Joi.string().optional().allow("").min(2).max(50).trim(),
      email: Joi.string().min(5).trim().max(255).email().required(),
      mobile: Joi.string().min(10).max(10).required(),
      gender: Joi.string().required(),
      dob: Joi.string()
        .regex(/^\d{2}-\d{2}-\d{4}$/)
        .message("Invalid D.O.B format")
        .required(),
      address: Joi.string().min(7).max(250).trim().required(),
      state: Joi.string().min(3).max(100).trim().required(),
      district: Joi.string().min(3).max(100).trim().required(),
      pinCode: Joi.string().min(6).max(6).trim().required(),
      panCardNo: Joi.string().pattern(new RegExp(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)),
      aadharNo: Joi.string()
        .pattern(/^[2-9]\d{3}\d{4}\d{4}$/)
        .message("Invalid aadhaar card number")
        .required(),
      bankName: Joi.string().min(2).max(255).required(),
      bankAccount: Joi.string()
        .pattern(/^\d{9,18}$/)
        .message("Invalid bank account number")
        .trim()
        .required(),
        bankIFSC: Joi.string()
        .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
        .message("Invalid IFSC code format")
        .required(),
      experience: Joi.string().required(),
      agreementSigned: Joi.string().required(),
      modeofAgreement: Joi.string().empty(""),
      agreementValidity: Joi.string()
        .pattern(/^\d{2}-\d{2}-\d{4}$/)
        .message("Invalid agreement date format")
        .empty(""),
      sipDetails: Joi.array().items(sipDetailSchema),
      intermediateCertificate: Joi.string().empty(""),
      diplomaCertificate: Joi.string().empty(""),
      undergradCertificate: Joi.string().empty(""),
      postgradCertificate: Joi.string().empty(""),
      otherCertificate: Joi.string().empty(""),
      agreementCertificate: Joi.string().empty(""),
      assessorPhoto:Joi.string().empty(""),
      tpDeclaration: Joi.string().empty(""),
      examcenter:Joi.string().empty("")
    });
    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
}
//--->for validate uploade
async function validateUpdateAssesor(data) {
  try {
    const sipDetailSchema = Joi.object().keys({
      jobroleId: Joi.string()
        .regex(/^[0-9a-fA-F]{24}$/)
        .required(),
      jobroleName: Joi.string().required(),
      sipValidity: Joi.string()
        .pattern(/^\d{2}-\d{2}-\d{4}$/)
        .message("Invalid sip date format")
        .required(),
      sipCertificateKey: Joi.string().required(),
      sipCertificateName: Joi.string().required(),
      sipCertificateSize: Joi.string().optional().allow(""),
    });
    const schema = Joi.object({
      firstName: Joi.string().min(2).max(50).trim().required(),
      lastName: Joi.string()
        .optional()
        .allow("")
        .min(2)
        .max(50)
        .trim(),
      email: Joi.string().min(5).trim().max(255).email().required(),
      mobile: Joi.string().min(10).max(10).required(),
      gender: Joi.string().required(),
      dob: Joi.string()
        .regex(/^\d{2}-\d{2}-\d{4}$/)
        .message("Invalid D.O.B format")
        .required(),
      address: Joi.string().min(7).max(250).trim().required(),
      state: Joi.string().min(3).max(100).trim().required(),
      district: Joi.string().min(3).max(100).trim().required(),
      pinCode: Joi.string().min(6).max(6).trim().required(),
      panCardNo: Joi.string().pattern(new RegExp(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)),
      aadharNo: Joi.string()
        .pattern(/^[2-9]\d{3}\d{4}\d{4}$/)
        .message("Invalid aadhaar card number")
        .required(),
      bankName: Joi.string().min(2).max(255).required(),
      bankAccount: Joi.string()
        .pattern(/^\d{9,18}$/)
        .message("Invalid bank account number")
        .trim()
        .required(),
        bankIFSC: Joi.string()
        .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
        .message("Invalid IFSC code format")
        .required(),
      experience: Joi.string().required(),
      agreementSigned: Joi.string().required(),
      modeofAgreement: Joi.string().empty(""),
      agreementValidity: Joi.string()
        .pattern(/^\d{2}-\d{2}-\d{4}$/)
        .message("Invalid agreement date format")
        .empty(""),
      sipDetails: Joi.array().items(sipDetailSchema),
      intermediateCertificate: Joi.string().empty(""),
      diplomaCertificate: Joi.string().empty(""),
      undergradCertificate: Joi.string().empty(""),
      postgradCertificate: Joi.string().empty(""),
      otherCertificate: Joi.string().empty(""),
      agreementCertificate: Joi.string().empty(""),
      assessorPhoto:Joi.string().empty("")
    });
    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
}




