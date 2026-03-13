require("dotenv").config();
const fs = require("fs/promises");
const path = require("path");
const Joi = require("@hapi/joi");
const axios = require("axios");
const _ = require("lodash");
const jwt = require("jsonwebtoken");
const moment = require("moment");
const {
  validateMobileNumber,
  userTypeArr,
  validatePincode,
  validatePassword,
  validateUserType,
  getStateIdFromCountry,
  setDashboardNotification,
  //validateAadharCard,
  //validatePanCard,
} = require("../utils/custom-validators");
const { MailtrapClient, MailtrapTransport } = require("mailtrap");
const nodemailer = require("nodemailer");
const {
  TOKEN,
  SENDER_EMAIL,
  BASE_FRONTEND_URL,
  BASE_ASSESSOR_FRONTEND_URL,
  MSZ91_HOST,
  MSZ91_USER,
  MSZ91_PASS,
  MSZ91_PORT,
} = require("../config/envProvider");
const { default: mongoose } = require("mongoose");
// const Assesor = require("../models/assessor-adminModel");
const Assesor = require("../models/AssesorModel");
const ClientModel = require("../models/client-model");
const bcrypt = require("bcryptjs");
const { Paginate } = require("../utils/paginate");
const reader = require("xlsx");
const AssessorNotificationModel = require("../models/assesor-notification-model");
const { qaObjectLinks } = require("../utils/qaTabConstant");
//const Notification = require("../models/notification-model")
const responseMessage = require("../utils/responseMessage");
const { sendResponse, errorResponse } = require("../utils/response");
const URL = require("url").URL;
const { getFilter } = require("../utils/custom-validators");
const JobRole = require("../models/jobRole-model");
const {
  uploadAssessorFile,
  getAssessorFileUrl,
  deleteAssessorFromS3,
  getassessorExperienceFileUrl,
  getassessorPersonalFileUrl,
  getassessorFileUrl,
  uploadAssessorExperienceFile,
  getassessorJobroleFileUrl,
  getassessorEducationFileUrl,
  getassessorAgreementFileUrl,
  getassessorPhotoFileUrl,
  getassessorProfileFileUrl,
} = require("../utils/s3bucketAssessor");
const { manualUnlockOtp, getOtpLockoutStatus } = require("../utils/otpLockout");

const { assessorObjectLinks } = require("../utils/qaTabConstant");
const { generateRandomPassword } = require("../utils/generateRandomPassword");
const {
  checkAccountLockout,
  handleFailedLogin,
  handleSuccessfulLogin,
  getLockoutMessage,
  shouldAutoUnlock,
} = require("../utils/accountLockout");
const CVPdfGenerator = require("../utils/assessorCVPdfGenerator");

exports.deleteAssessorPersonalDetailById = async (req, res, next) => {
  try {
    let assessorId = req.query.assesor_id;
    let personalIdToDelete = req.query.personal_id; // Assuming you can get the experience ID from the request params
    if (!assessorId || !personalIdToDelete) {
      return errorResponse(
        res,
        403,
        responseMessage.invalid_request,
        responseMessage.invalid_request
      );
    }

    const assessorData = await Assesor.findOne({ _id: assessorId });
    if (!assessorData)
      return errorResponse(
        res,
        404,
        responseMessage.assessor_profile_not_found,
        responseMessage.errorMessage
      );

    // Use $pull to remove the experience with the given _id from the experiences array
    const result = await Assesor.updateOne(
      { _id: assessorId },
      { $pull: { personalDetail: { _id: personalIdToDelete } } }
    );
    if (!result.modifiedCount)
      //nModified)
      return errorResponse(
        res,
        400,
        "Id not found ", //responseMessage.experience_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(
      res,
      200,
      "Data deleted succesfully", //responseMessage.experience_deleted_successfully,
      result
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.updateAssessorExperience = async (req, res) => {
  try {
    const requestBody = req.body;
    const files = req.files;
    const assessorId = req.query.assessor_id; // Use the assessorId from the query parameter
    const IdToUpdate = req.query.IdToUpdate; // Use the IdToUpdate from the query parameter

    if (!assessorId || !IdToUpdate) {
      return errorResponse(
        res,
        402,
        responseMessage.invalid_query_parameters,
        responseMessage.invalid_query_parameters
      );
    }

    const data = await Assesor.findOne({ _id: assessorId });
    const email = data.email;

    const {
      designation,
      companyName,
      startDate,
      endDate,
      experienceCertificateName,
      experienceCertificateSize,
      experienceCertificateKey,
      isExperienceUploaded,
      adminUploaded,
      status,
    } = requestBody;

    // ... (Rest of the code)
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

    let experienceCertificateName2 = expFile ? expFile.originalname : null;

    let experienceCertificateSize2 = expFile
      ? `(${formatFileSize(expFile?.size)})`
      : null;

    const newArray = Object.entries(files).map(([key, value]) => {
      return { key, value };
    });
    const randomNo = Math.floor(Math.random() * 90000 + 10000);
    //to check key value
    let experienceToCheck = "";
    if (expFile) {
      const uploadedFilePromises = newArray.map(async (file) => {
        switch (file.key) {
          case "experienceCertificate":
            experienceToCheck = file.key + randomNo;
            break;
          default:
            "";
            break;
        }
        if (!file.value[0].buffer) {
          return file;
        }
        return uploadAssessorExperienceFile({
          req: {
            email: email,
            key: file.key,
            buffer: file.value[0].buffer,
            mimetype: file.value[0].mimetype,
          },
          randomNo: randomNo,
        });
      });
    } else {
      experienceToCheck = experienceCertificateKey;
    }

    // Find the index of the experience with the specified _id
    const experienceIndex = data.experiences.findIndex(
      (exp) => exp._id.toString() === IdToUpdate
    );
    if (experienceIndex === -1) {
      return errorResponse(
        res,
        404,
        responseMessage.experience_not_found,
        responseMessage.experience_not_found
      );
    }

    // Update the experience at the specified index
    updatedData = {
      designation,
      companyName,
      startDate,
      endDate,
      experienceCertificateName: experienceCertificateName,
      experienceCertificateSize: experienceCertificateSize,
      experienceCertificateKey: experienceCertificateKey,
      isExperienceUploaded: isExperienceUploaded,
      adminUploaded: adminUploaded,
      status: status,
    };

    if (expFile) {
      updatedData.experienceCertificateName = experienceCertificateName2;
      updatedData.experienceCertificateSize = experienceCertificateSize2;
      updatedData.experienceCertificateKey = experienceToCheck;
      updatedData.isExperienceUploaded = true;
      updatedData.adminUploaded = true;
      updatedData.status = "accepted";
    }

    data.experiences[experienceIndex] = updatedData;
    // Save the updated data
    await data.save();

    return sendResponse(res, 200, "Data updated successfully", data);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//adding personalDetail
exports.addAssessorPersonalDetail = async (req, res) => {
  try {
    const assesor_id = req.params.id;
    const requestBody = req.body;
    let files = req.files;
    const data = await Assesor.findById(assesor_id);
    if (!data) {
      return errorResponse(
        res,
        404,
        "Assessor not found",
        "Assessor not found"
      );
    }

    const email = data.email ? data.email : data.assessorSipId;
    const { cardType, cardNo } = requestBody;

    const formatFileSize = (bytes) => {
      if (bytes < 1024) {
        return bytes + " B";
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      }
    };

    const cardFile = files.card?.[0];

    let cardFileName = cardFile ? cardFile.originalname : null;

    let cardFileSize = cardFile ? `(${formatFileSize(cardFile?.size)})` : null;

    const newArray = Object.entries(files).map(([key, value]) => {
      return { key, value };
    });

    const randomNo = Math.floor(Math.random() * 9000 + 1000);
    let cardToCheck = "";
    const uploadedFilePromises = newArray.map(async (file) => {
      switch (file.key) {
        case "card":
          cardToCheck = file.key + randomNo;
          break;
        default:
          "";
          break;
      }
      if (!file.value[0].buffer) {
        return file;
      }
      return uploadAssessorExperienceFile({
        req: {
          email: email,
          key: file.key,
          buffer: file.value[0].buffer,
          mimetype: file.value[0].mimetype,
        },
        randomNo: randomNo,
      });
    });

    // Save the updated Assessor document
    // const updatedAssessor = await existingAssessor.save();
    const updatedDoc = await Assesor.findByIdAndUpdate(
      assesor_id,
      {
        $push: {
          personalDetail: {
            cardType,
            cardNo,
            cardFileName,
            cardFileSize,
            cardFileKey: cardToCheck,
            adminUploaded: true,
            status: "accepted",
            isDocumentUploaded: true,
          },
        },
      },
      { new: true, runValidators: true }
    );
    // Handle your response accordingly
    return sendResponse(res, 200, "Data uploaded successfully", updatedDoc);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.updateAssessorPersonalDetail = async (req, res) => {
  try {
    const requestBody = req.body;
    const files = req.files;
    const assessorId = req.query.assessor_id; // Use the assessorId from the query parameter
    const IdToUpdate = req.query.personal_id; // Use the IdToUpdate from the query parameter

    if (!assessorId || !IdToUpdate) {
      return errorResponse(
        res,
        402,
        "Invalid Id", //responseMessage.invalid_query_parameters,
        responseMessage.invalid_query_parameters
      );
    }

    const data = await Assesor.findOne({ _id: assessorId });
    console.log("data==>", data);
    const email = data.email;
    // Get data from body
    const {
      cardType,
      cardNo,
      adminUploaded,
      card,
      cardFileKey,
      cardFileName,
      cardFileSize,
      isDocumentUploaded,
      status,
    } = requestBody;

    // ... (Rest of the code)
    const formatFileSize = (bytes) => {
      if (bytes < 1024) {
        return bytes + " B";
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      }
    };

    const cardFile = files.card?.[0];

    // let cardFileName2 = cardFile ? cardFile.originalname : null;
    let cardFileName2 = cardFile ? cardFile.originalname : cardFileName;

    let cardFileSize2 = cardFile
      ? `(${formatFileSize(cardFile?.size)})`
      : cardFileSize;

    const newArray = Object.entries(files).map(([key, value]) => {
      return { key, value };
    });
    const randomNo = Math.floor(Math.random() * 90000 + 10000);
    //to check key value
    let cardToCheck = "";
    if (cardFile) {
      const uploadedFilePromises = newArray.map(async (file) => {
        switch (file.key) {
          case "card":
            cardToCheck = file.key + randomNo;
            break;
          default:
            "";
            break;
        }
        if (!file.value[0].buffer) {
          return file;
        }
        return uploadAssessorExperienceFile({
          req: {
            email: email,
            key: file.key,
            buffer: file.value[0].buffer,
            mimetype: file.value[0].mimetype,
          },
          randomNo: randomNo,
        });
      });
    } else {
      cardToCheck = cardFileKey;
    }

    // Find the index of the experience with the specified _id
    const cardIndex = data.personalDetail.findIndex(
      (pd) => pd._id.toString() === IdToUpdate
    );
    if (cardIndex === -1) {
      return errorResponse(
        res,
        404,
        "Data not found", //responseMessage.experience_not_found,
        "Data not found" //responseMessage.education_not_found
      );
    }

    // Create an object with all the updated values
    const updatedData = {
      cardType,
      cardNo,
      cardFileKey: cardFileKey,
      cardFileName: cardFileName,
      cardFileSize: cardFileSize,
      isDocumentUploaded: isDocumentUploaded,
      status: status,
      adminUploaded: adminUploaded,
      // adminUploaded,
      //status: status,//"accepted",
      //isDocumentUploaded: true,
    };

    // Only update card related fields if cardFile exists
    if (cardFile) {
      updatedData.cardFileName = cardFileName2;
      updatedData.cardFileSize = cardFileSize2;
      updatedData.cardFileKey = cardToCheck;
      updatedData.isDocumentUploaded = true;
      updatedData.adminUploaded = true;
      updatedData.status = "accepted";
    }

    // // Update the experience at the specified index
    data.personalDetail[cardIndex] = updatedData;

    // Save the updated data
    await data.save();
    // Construct update object based on updatedData

    return sendResponse(res, 200, "Data updated successfully", data);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.getAssessorPersonalDetailById = async (req, res) => {
  try {
    const assessorId = req.params.id;
    const { verified, all } = req.query;

    if (verified) {
      console.log("inside verified");
      const assessorDetail = await Assesor.findById(assessorId);

      if (assessorDetail) {
        if (!assessorDetail.email) {
          assessorDetail.email = assessorDetail.assessorSipId;
        }
        // Filter personal details with status 'accepted'
        const acceptedPersonalDetails = assessorDetail.personalDetail.filter(
          (data) => data.status === "accepted"
        );
        if (acceptedPersonalDetails.length > 0) {
          const fileKeys = acceptedPersonalDetails.map(
            (data) => data.cardFileKey
          );
          const dataWithUrls = await getassessorPersonalFileUrl(
            assessorDetail,
            fileKeys,
            verified
          );
          const uploadedFiles = dataWithUrls.map((data) => ({
            isDocumentUploaded: data.isDocumentUploaded,
            cardType: data.cardType,
            cardNo: data.cardNo,
            cardFileName: data.cardFileName,
            cardFileSize: data.cardFileSize,
            cardFileKey: data.cardFileKey,
            adminUploaded: data.adminUploaded,
            status: data.status,
            url: data.url,
            _id: data._id,
          }));

          return sendResponse(
            res,
            200,
            responseMessage.assessor_details_available,
            uploadedFiles
          );
        } else {
          return errorResponse(
            res,
            200,
            responseMessage.assessor_file_not_found,
            []
          );
        }
      } else {
        return errorResponse(
          res,
          400,
          responseMessage.assessor_not_found,
          responseMessage.errorMessage
        );
      }
    } else if (all || !verified) {
      // Process all personal details
      let assessorDetail = await Assesor.findById(assessorId);

      if (assessorDetail) {
        if (!assessorDetail.email) {
          assessorDetail.email = assessorDetail.assessorSipId;
        }
        const fileKeys = assessorDetail.personalDetail
          .filter((data) => data.cardFileKey)
          .map((data) => data.cardFileKey);

        if (fileKeys.length > 0) {
          const dataWithUrls = await getassessorPersonalFileUrl(
            assessorDetail,
            fileKeys
          );

          const uploadedFiles = dataWithUrls.map((data) => ({
            isDocumentUploaded: data.isDocumentUploaded,
            cardType: data.cardType,
            cardNo: data.cardNo,
            cardFileName: data.cardFileName,
            cardFileSize: data.cardFileSize,
            cardFileKey: data.cardFileKey,
            adminUploaded: data.adminUploaded,
            status: data.status,
            url: data.url,
            _id: data._id,
          }));

          return sendResponse(
            res,
            200,
            responseMessage.assessor_details_available,
            uploadedFiles
          );
        } else {
          return errorResponse(
            res,
            200,
            responseMessage.assessor_file_not_found,
            []
          );
        }
      } else {
        return errorResponse(
          res,
          400,
          responseMessage.assessor_not_found,
          responseMessage.errorMessage
        );
      }
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

// adding assesor experience certificate with details
exports.addAssessorExperience = async (req, res) => {
  try {
    const assesor_id = req.params.id;
    const requestBody = req.body;
    let files = req.files;
    const data = await Assesor.findById(assesor_id);
    const email = data.email ? data.email : data.assessorSipId;
    const { designation, companyName, startDate, endDate } = requestBody;

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

    const newArray = Object.entries(files).map(([key, value]) => {
      return { key, value };
    });

    // const randomNo = Math.floor((Math.random() * 90) + 10);
    // let experienceToCheck = uuidv4();//"" + randomNo;
    const randomNo = Math.floor(Math.random() * 90000 + 10000);
    let experienceToCheck = "";
    const uploadedFilePromises = newArray.map(async (file) => {
      switch (file.key) {
        case "experienceCertificate":
          experienceToCheck = file.key + randomNo;
          break;
        default:
          "";
          break;
      }
      if (!file.value[0].buffer) {
        return file;
      }
      return uploadAssessorExperienceFile({
        req: {
          email: email,
          key: file.key,
          buffer: file.value[0].buffer,
          mimetype: file.value[0].mimetype,
        },
        randomNo: randomNo,
      });
    });

    // Find the Assessor document by email
    const existingAssessor = await Assesor.findOne({
      $or: [{ email: email }, { assessorSipId: email }],
    });

    // Add the new experience to the existing experiences array
    existingAssessor.experiences = existingAssessor.experiences || [];
    existingAssessor.experiences.push({
      designation,
      companyName,
      startDate,
      endDate,
      experienceCertificateName: experienceCertificateName,
      experienceCertificateSize: experienceCertificateSize,
      experienceCertificateKey: experienceToCheck,
      adminUploaded: true,
      status: "accepted",
      isExperienceUploaded: true,
    });

    // Save the updated Assessor document
    const updatedAssessor = await existingAssessor.save();
    // Handle your response accordingly
    return sendResponse(
      res,
      200,
      "Experience certificate uploaded successfully",
      updatedAssessor
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//delete assessor experience
exports.deleteAssessorExperienceById = async (req, res, next) => {
  try {
    let assessorId = req.query.assesor_id;
    let experienceIdToDelete = req.query.experienceId; // Assuming you can get the experience ID from the request params
    if (!assessorId || !experienceIdToDelete) {
      return errorResponse(
        res,
        403,
        responseMessage.invalid_request,
        responseMessage.invalid_request
      );
    }

    const assessorData = await Assesor.findOne({ _id: assessorId });
    if (!assessorData)
      return errorResponse(
        res,
        404,
        responseMessage.assessor_profile_not_found,
        responseMessage.errorMessage
      );

    // Use $pull to remove the experience with the given _id from the experiences array
    const result = await Assesor.updateOne(
      { _id: assessorId },
      { $pull: { experiences: { _id: experienceIdToDelete } } }
    );
    if (!result.modifiedCount)
      //nModified)
      return errorResponse(
        res,
        400,
        "Experience Id not found ", //responseMessage.experience_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(
      res,
      200,
      "Experience detail deleted succesfully", //responseMessage.experience_deleted_successfully,
      result
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.getAssessorExperience = async (req, res) => {
  try {
    const assessorId = req.params.id;
    const { verified, all, pending } = req.query;

    if (verified) {
      let totalCounts = 0;
      const assessorDetail = await Assesor.findById(assessorId);

      if (assessorDetail) {
        if (!assessorDetail.email) {
          assessorDetail.email = assessorDetail.assessorSipId;
        }
        const acceptedExperienceDetails = assessorDetail.experiences.filter(
          (data) => data.status === "accepted"
        );

        if (acceptedExperienceDetails.length > 0) {
          const fileKeys = acceptedExperienceDetails.map(
            (data) => data.experienceCertificateKey
          );
          const dataWithUrls = await getassessorExperienceFileUrl(
            assessorDetail,
            fileKeys,
            verified,
            pending
          );
          const uploadedFiles = dataWithUrls.map((experience) => ({
            isExperienceUploaded: experience.isExperienceUploaded,
            designation: experience.designation,
            companyName: experience.companyName,
            startDate: experience.startDate,
            endDate: experience.endDate,
            experienceCertificateName: experience.experienceCertificateName,
            experienceCertificateSize: experience.experienceCertificateSize,
            experienceCertificateKey: experience.experienceCertificateKey,
            adminUploaded: experience.adminUploaded,
            status: experience.status,
            url: experience.url,
            _id: experience._id,
          }));

          totalCounts = uploadedFiles.length; // Update totalCounts

          if (uploadedFiles.length > 0) {
            return sendResponse(
              res,
              200,
              responseMessage.assessor_details_available,
              {
                uploadedFiles,
                totalCounts,
              }
            );
          } else {
            return errorResponse(
              res,
              200,
              responseMessage.assessor_file_not_found,
              []
            );
          }
        } else {
          return errorResponse(
            res,
            200,
            responseMessage.assessor_file_not_found,
            []
          );
        }
      }

      return errorResponse(
        res,
        400,
        responseMessage.assessor_not_found,
        responseMessage.errorMessage
      );
    } else if (all || !verified) {
      let totalCounts = 0;
      const assessorDetail = await Assesor.findById(assessorId);

      if (assessorDetail) {
        if (!assessorDetail.email) {
          assessorDetail.email = assessorDetail.assessorSipId;
        }
        const fileKeys = assessorDetail.experiences
          .filter((experience) => experience.experienceCertificateKey)
          .map((experience) => experience.experienceCertificateKey);

        if (fileKeys.length > 0) {
          const dataWithUrls = await getassessorExperienceFileUrl(
            assessorDetail,
            fileKeys
          );

          const uploadedFiles = dataWithUrls.map((experience) => ({
            isExperienceUploaded: experience.isExperienceUploaded,
            designation: experience.designation,
            companyName: experience.companyName,
            startDate: experience.startDate,
            endDate: experience.endDate,
            experienceCertificateName: experience.experienceCertificateName,
            experienceCertificateSize: experience.experienceCertificateSize,
            experienceCertificateKey: experience.experienceCertificateKey,
            adminUploaded: experience.adminUploaded,
            status: experience.status,
            url: experience.url,
            _id: experience._id,
          }));

          totalCounts = uploadedFiles.length; // Update totalCounts

          if (uploadedFiles.length > 0) {
            return sendResponse(
              res,
              200,
              responseMessage.assessor_details_available,
              {
                uploadedFiles,
                totalCounts,
              }
            );
          } else {
            return errorResponse(
              res,
              200,
              responseMessage.assessor_file_not_found,
              []
            );
          }
        } else {
          return errorResponse(
            res,
            200,
            responseMessage.assessor_file_not_found,
            []
          );
        }
      }

      return errorResponse(
        res,
        400,
        responseMessage.assessor_not_found,
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//adding education certificate with details
exports.addAssessorEducation = async (req, res) => {
  try {
    const assesor_id = req.params.id;
    const requestBody = req.body;
    let files = req.files;
    const data = await Assesor.findById(assesor_id);
    const email = data.email ? data.email : data.assessorSipId;

    const { collegeName, degree, startDate, endDate } = requestBody;

    const formatFileSize = (bytes) => {
      if (bytes < 1024) {
        return bytes + " B";
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      }
    };

    const educationFile = files.educationCertificate?.[0];

    let educationCertificateName = educationFile
      ? educationFile.originalname
      : null;

    let educationCertificateSize = educationFile
      ? `(${formatFileSize(educationFile?.size)})`
      : null;

    const newArray = Object.entries(files).map(([key, value]) => {
      return { key, value };
    });

    const randomNo = Math.floor(Math.random() * 90000 + 10000);

    let educationToCheck = "";
    const uploadedFilePromises = newArray.map(async (file) => {
      switch (file.key) {
        case "educationCertificate":
          educationToCheck = file.key + randomNo;
          break;
        default:
          "";
          break;
      }
      if (!file.value[0].buffer) {
        return file;
      }
      // Upload file on s3 bucket
      return uploadAssessorExperienceFile({
        req: {
          email: email,
          key: file.key,
          buffer: file.value[0].buffer,
          mimetype: file.value[0].mimetype,
        },
        randomNo: randomNo,
      });
    });
    // Find the Assessor document by email
    const existingAssessor = await Assesor.findOne({
      $or: [{ email: email }, { assessorSipId: email }],
    });

    // Add the new experience to the existing experiences array
    existingAssessor.education = existingAssessor.education || [];
    existingAssessor.education.push({
      collegeName,
      degree,
      startDate,
      endDate,
      educationCertificateName: educationCertificateName,
      educationCertificateSize: educationCertificateSize,
      educationCertificateKey: educationToCheck,
      adminUploaded: true,
      status: "accepted",
      isEducationUploaded: true,
    });

    // Save the updated Assessor document
    const updatedAssessor = await existingAssessor.save();

    // Handle your response accordingly
    return sendResponse(
      res,
      200,
      "Education certificate uploaded successfully",
      updatedAssessor
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//get assesor education list
exports.getAssessorEducation = async (req, res) => {
  try {
    const assessorId = req.params.id;
    const { verified, all } = req.query;

    if (verified) {
      let totalCounts = 0;
      const assessorDetail = await Assesor.findById(assessorId);

      if (assessorDetail) {
        if (!assessorDetail.email) {
          assessorDetail.email = assessorDetail.assessorSipId;
        }
        const acceptedEducationDetails = assessorDetail.education.filter(
          (data) => data.status === "accepted"
        );

        if (acceptedEducationDetails.length > 0) {
          const fileKeys = acceptedEducationDetails.map(
            (data) => data.educationCertificateKey
          );
          const dataWithUrls = await getassessorEducationFileUrl(
            assessorDetail,
            fileKeys,
            verified
          );
          const uploadedFiles = dataWithUrls.map((edu) => {
            return {
              isEducationUploaded: edu.isEducationUploaded,
              collegeName: edu.collegeName,
              degree: edu.degree,
              startDate: edu.startDate,
              endDate: edu.endDate,
              educationCertificateName: edu.educationCertificateName,
              educationCertificateSize: edu.educationCertificateSize,
              educationCertificateKey: edu.educationCertificateKey,
              adminUploaded: edu.adminUploaded,
              status: edu.status,
              url: edu.url,
              _id: edu._id,
            };
          });

          totalCounts = uploadedFiles.length;

          if (uploadedFiles.length > 0) {
            return sendResponse(
              res,
              200,
              responseMessage.assessor_details_available,
              {
                uploadedFiles,
                totalCounts,
              }
            );
          } else {
            return errorResponse(
              res,
              200,
              responseMessage.assessor_file_not_found,
              responseMessage.errorMessage
            );
          }
        } else {
          return errorResponse(
            res,
            200,
            responseMessage.assessor_file_not_found,
            []
          );
        }
      }

      return errorResponse(
        res,
        400,
        responseMessage.assessor_not_found,
        responseMessage.errorMessage
      );
    } else if (all || !verified) {
      let totalCounts = 0;
      const assessorDetail = await Assesor.findById(assessorId);

      if (assessorDetail) {
        if (!assessorDetail.email) {
          assessorDetail.email = assessorDetail.assessorSipId;
        }
        const fileKeys = assessorDetail.education
          .filter((edu) => edu.educationCertificateKey)
          .map((edu) => edu.educationCertificateKey);

        if (fileKeys.length > 0) {
          const dataWithUrls = await getassessorEducationFileUrl(
            assessorDetail,
            fileKeys
          );

          const uploadedFiles = dataWithUrls.map((edu) => {
            return {
              isEducationUploaded: edu.isEducationUploaded,
              collegeName: edu.collegeName,
              degree: edu.degree,
              startDate: edu.startDate,
              endDate: edu.endDate,
              educationCertificateName: edu.educationCertificateName,
              educationCertificateSize: edu.educationCertificateSize,
              educationCertificateKey: edu.educationCertificateKey,
              adminUploaded: edu.adminUploaded,
              status: edu.status,
              url: edu.url,
              _id: edu._id,
            };
          });

          totalCounts = uploadedFiles.length;

          if (uploadedFiles.length > 0) {
            return sendResponse(
              res,
              200,
              responseMessage.assessor_details_available,
              {
                uploadedFiles,
                totalCounts,
              }
            );
          } else {
            return errorResponse(
              res,
              200,
              responseMessage.assessor_file_not_found,
              []
            );
          }
        } else {
          return errorResponse(
            res,
            200,
            responseMessage.assessor_file_not_found,
            []
          );
        }
      }

      return errorResponse(
        res,
        400,
        responseMessage.assessor_not_found,
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//delete assesor educationById
exports.deleteAssessorEducation = async (req, res, next) => {
  try {
    let assessorId = req.query.assesor_id;
    let educationIdToDelete = req.query.education_id; // Assuming you can get the experience ID from the request params
    if (!assessorId || !educationIdToDelete) {
      return errorResponse(
        res,
        403,
        responseMessage.invalid_request,
        responseMessage.invalid_request
      );
    }

    const assessorData = await Assesor.findOne({ _id: assessorId });
    if (!assessorData)
      return errorResponse(
        res,
        404,
        responseMessage.assessor_profile_not_found,
        responseMessage.errorMessage
      );

    // Use $pull to remove the experience with the given _id from the experiences array
    const result = await Assesor.updateOne(
      { _id: assessorId },
      { $pull: { education: { _id: educationIdToDelete } } }
    );
    if (!result.modifiedCount)
      //nModified)
      return errorResponse(
        res,
        400,
        "Id not found ", //responseMessage.experience_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(
      res,
      200,
      "Data deleted succesfully", //responseMessage.experience_deleted_successfully,
      result
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//adding jobrole certificate with details
exports.addAssessorJobrole = async (req, res) => {
  try {
    const assesor_id = req.params.id;
    const requestBody = req.body;
    let files = req.files;
    const data = await Assesor.findById(assesor_id);
    const email = data.email ? data.email : data.assessorSipId;
    const { jobroleName, experience, issueDate, validUpto } = requestBody;

    const formatFileSize = (bytes) => {
      if (bytes < 1024) {
        return bytes + " B";
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      }
    };

    const jobRoleFile = files.jobRoleCertificate?.[0];

    let jobRoleCertificateName = jobRoleFile ? jobRoleFile.originalname : null;

    let jobRoleCertificateSize = jobRoleFile
      ? `(${formatFileSize(jobRoleFile?.size)})`
      : null;

    const newArray = Object.entries(files).map(([key, value]) => {
      return { key, value };
    });
    const randomNo = Math.floor(Math.random() * 90000 + 10000);
    let jobRoleToCheck = "";
    const uploadedFilePromises = newArray.map(async (file) => {
      switch (file.key) {
        case "jobRoleCertificate":
          jobRoleToCheck = file.key + randomNo;
          break;
        default:
          "";
          break;
      }
      if (!file.value[0].buffer) {
        return file;
      }
      // Upload file on s3 bucket
      return uploadAssessorExperienceFile({
        req: {
          email: email,
          key: file.key,
          buffer: file.value[0].buffer,
          mimetype: file.value[0].mimetype,
        },
        randomNo: randomNo,
      });
    });

    // Find the Assessor document by email
    const existingAssessor = await Assesor.findOne({
      $or: [{ email: email }, { assessorSipId: email }],
    });

    // Add the new experience to the existing experiences array
    existingAssessor.jobRole = existingAssessor.jobRole || [];
    existingAssessor.jobRole.push({
      jobroleName,
      experience,
      issueDate,
      validUpto,
      jobRoleCertificateName: jobRoleCertificateName,
      jobRoleCertificateSize: jobRoleCertificateSize,
      jobRoleCertificateKey: jobRoleToCheck,
      adminUploaded: true,
      status: "accepted",
      isJobroleUploaded: true,
    });

    // Save the updated Assessor document
    const updatedAssessor = await existingAssessor.save();

    // Handle your response accordingly
    return sendResponse(
      res,
      200,
      "Jobrole added successfully",
      updatedAssessor
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.getAssessorJobrole = async (req, res) => {
  try {
    const assessorId = req.params.id;
    const { verified, all } = req.query;

    if (verified) {
      let totalCounts = 0;
      const assessorDetail = await Assesor.findById(assessorId);

      if (assessorDetail) {
        if (!assessorDetail.email) {
          assessorDetail.email = assessorDetail.assessorSipId;
        }
        const acceptedJobroleDetails = assessorDetail.jobRole.filter(
          (data) => data.status === "accepted"
        );

        if (acceptedJobroleDetails.length > 0) {
          const fileKeys = acceptedJobroleDetails.map(
            (data) => data.jobRoleCertificateKey
          );
          const dataWithUrls = await getassessorJobroleFileUrl(
            assessorDetail,
            fileKeys,
            verified
          );

          const uploadedFiles = dataWithUrls.map((job) => {
            return {
              isJobroleUploaded: job.isJobroleUploaded,
              jobroleName: job.jobroleName,
              experience: job.experience,
              issueDate: job.issueDate,
              validUpto: job.validUpto,
              jobRoleCertificateName: job.jobRoleCertificateName,
              jobRoleCertificateSize: job.jobRoleCertificateSize,
              jobRoleCertificateKey: job.jobRoleCertificateKey,
              adminUploaded: job.adminUploaded,
              status: job.status,
              url: job.url,
              _id: job._id,
            };
          });

          totalCounts = uploadedFiles.length;

          if (uploadedFiles.length > 0) {
            return sendResponse(
              res,
              200,
              responseMessage.assessor_details_available,
              {
                uploadedFiles,
                totalCounts,
              }
            );
          } else {
            return errorResponse(
              res,
              200,
              responseMessage.assessor_file_not_found,
              []
            );
          }
        } else {
          return errorResponse(
            res,
            200,
            responseMessage.assessor_file_not_found,
            []
          );
        }
      }

      return errorResponse(
        res,
        400,
        responseMessage.assessor_not_found,
        responseMessage.errorMessage
      );
    } else if (all || !verified) {
      let totalCounts = 0;
      const assessorDetail = await Assesor.findById(assessorId);

      if (assessorDetail) {
        if (!assessorDetail.email) {
          assessorDetail.email = assessorDetail.assessorSipId;
        }
        const fileKeys = assessorDetail.jobRole
          .filter((job) => job.jobRoleCertificateKey)
          .map((job) => job.jobRoleCertificateKey);

        if (fileKeys.length > 0) {
          const dataWithUrls = await getassessorJobroleFileUrl(
            assessorDetail,
            fileKeys
          );

          const uploadedFiles = dataWithUrls.map((job) => {
            return {
              isJobroleUploaded: job.isJobroleUploaded,
              jobroleName: job.jobroleName,
              experience: job.experience,
              issueDate: job.issueDate,
              validUpto: job.validUpto,
              jobRoleCertificateName: job.jobRoleCertificateName,
              jobRoleCertificateSize: job.jobRoleCertificateSize,
              jobRoleCertificateKey: job.jobRoleCertificateKey,
              adminUploaded: job.adminUploaded,
              status: job.status,
              url: job.url,
              _id: job._id,
            };
          });

          totalCounts = uploadedFiles.length;

          if (uploadedFiles.length > 0) {
            return sendResponse(
              res,
              200,
              responseMessage.assessor_details_available,
              {
                uploadedFiles,
                totalCounts,
              }
            );
          } else {
            return errorResponse(
              res,
              200,
              responseMessage.assessor_file_not_found,
              []
            );
          }
        } else {
          return errorResponse(
            res,
            200,
            responseMessage.assessor_file_not_found,
            []
          );
        }
      }

      return errorResponse(
        res,
        400,
        responseMessage.assessor_not_found,
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//udate assesor jobrole
exports.updateAssessorJobrole = async (req, res) => {
  try {
    const requestBody = req.body;
    const files = req.files;
    const assessorId = req.query.assessor_id; // Use the assessorId from the query parameter
    const IdToUpdate = req.query.jobrole_id; // Use the IdToUpdate from the query parameter

    if (!assessorId || !IdToUpdate) {
      return errorResponse(
        res,
        402,
        "Invalid Id", //responseMessage.invalid_query_parameters,
        responseMessage.invalid_query_parameters
      );
    }

    const data = await Assesor.findOne({ _id: assessorId });
    const email = data.email;
    // Get data from body
    const {
      jobroleName,
      experience,
      issueDate,
      validUpto,
      jobRoleCertificateName,
      jobRoleCertificateSize,
      jobRoleCertificateKey,
      adminUploaded,
      status,
      isJobroleUploaded,
    } = requestBody;

    // ... (Rest of the code)
    const formatFileSize = (bytes) => {
      if (bytes < 1024) {
        return bytes + " B";
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      }
    };

    const jobRoleFile = files.jobRoleCertificate?.[0];

    let jobRoleCertificateName2 = jobRoleFile ? jobRoleFile.originalname : null;

    let jobRoleCertificateSize2 = jobRoleFile
      ? `(${formatFileSize(jobRoleFile?.size)})`
      : null;

    const newArray = Object.entries(files).map(([key, value]) => {
      return { key, value };
    });
    const randomNo = Math.floor(Math.random() * 90000 + 10000);
    //to check key value
    let jobRoleToCheck = "";
    if (jobRoleFile) {
      const uploadedFilePromises = newArray.map(async (file) => {
        switch (file.key) {
          case "jobRoleCertificate":
            jobRoleToCheck = file.key + randomNo;
            break;
          default:
            "";
            break;
        }
        if (!file.value[0].buffer) {
          return file;
        }
        return uploadAssessorExperienceFile({
          req: {
            email: email,
            key: file.key,
            buffer: file.value[0].buffer,
            mimetype: file.value[0].mimetype,
          },
          randomNo: randomNo,
        });
      });
    } else {
      jobRoleToCheck = jobRoleCertificateKey;
    }

    // Find the index of the experience with the specified _id
    const jobRoleIndex = data.jobRole.findIndex(
      (jobrole) => jobrole._id.toString() === IdToUpdate
    );
    if (jobRoleIndex === -1) {
      return errorResponse(
        res,
        404,
        responseMessage.experience_not_found,
        responseMessage.experience_not_found
      );
    }

    // Update the experience at the specified index
    updatedData = {
      jobroleName,
      experience,
      issueDate,
      validUpto,
      jobRoleCertificateName: jobRoleCertificateName,
      jobRoleCertificateSize: jobRoleCertificateSize,
      jobRoleCertificateKey: jobRoleCertificateKey,
      adminUploaded: adminUploaded,
      status: status,
      isJobroleUploaded: isJobroleUploaded,
    };

    if (jobRoleFile) {
      updatedData.jobRoleCertificateName = jobRoleCertificateName2;
      updatedData.jobRoleCertificateSize = jobRoleCertificateSize2;
      updatedData.jobRoleCertificateKey = jobRoleToCheck;
      updatedData.isJobroleUploaded = true;
      updatedData.adminUploaded = true;
      updatedData.status = "accepted";
    }

    data.jobRole[jobRoleIndex] = updatedData;
    // Save the updated data
    await data.save();

    return sendResponse(res, 200, "Data updated successfully", data);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//delete assessor jobrole
exports.deleteAssessorJobroleById = async (req, res, next) => {
  try {
    let assessorId = req.query.assesor_id;
    let jobIdToDelete = req.query.jobrole_id;
    if (!assessorId || !jobIdToDelete) {
      return errorResponse(
        res,
        403,
        responseMessage.invalid_request,
        responseMessage.invalid_request
      );
    }

    const assessorData = await Assesor.findOne({ _id: assessorId });
    if (!assessorData)
      return errorResponse(
        res,
        404,
        responseMessage.assessor_profile_not_found,
        responseMessage.errorMessage
      );

    // Use $pull to remove the experience with the given _id from the experiences array
    const result = await Assesor.updateOne(
      { _id: assessorId },
      { $pull: { jobRole: { _id: jobIdToDelete } } }
    );
    if (!result.modifiedCount)
      //nModified)
      return errorResponse(
        res,
        400,
        "Id not found ", //responseMessage.experience_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(
      res,
      200,
      "Data deleted succesfully", //responseMessage.experience_deleted_successfully,
      result
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.updateAssessorEducation = async (req, res) => {
  try {
    const requestBody = req.body;
    const files = req.files;
    const assessorId = req.query.assessor_id; // Use the assessorId from the query parameter
    const IdToUpdate = req.query.education_id; // Use the IdToUpdate from the query parameter

    if (!assessorId || !IdToUpdate) {
      return errorResponse(
        res,
        402,
        "Invalid Id", //responseMessage.invalid_query_parameters,
        responseMessage.invalid_query_parameters
      );
    }

    const data = await Assesor.findOne({ _id: assessorId });
    const email = data.email;
    // Get data from body

    const {
      collegeName,
      degree,
      startDate,
      endDate,
      educationCertificateName,
      educationCertificateSize,
      educationCertificateKey,
      adminUploaded,
      status,
      isEducationUploaded,
    } = requestBody;

    // ... (Rest of the code)
    const formatFileSize = (bytes) => {
      if (bytes < 1024) {
        return bytes + " B";
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      }
    };

    const educationFile = files.educationCertificate?.[0];

    let educationCertificateName2 = educationFile
      ? educationFile.originalname
      : null;

    let educationCertificateSize2 = educationFile
      ? `(${formatFileSize(educationFile?.size)})`
      : null;

    const newArray = Object.entries(files).map(([key, value]) => {
      return { key, value };
    });
    const randomNo = Math.floor(Math.random() * 90000 + 10000);
    //to check key value

    let educationToCheck = "";
    if (educationFile) {
      const uploadedFilePromises = newArray.map(async (file) => {
        switch (file.key) {
          case "educationCertificate":
            educationToCheck = file.key + randomNo;
            break;
          default:
            "";
            break;
        }
        if (!file.value[0].buffer) {
          return file;
        }
        return uploadAssessorExperienceFile({
          req: {
            email: email,
            key: file.key,
            buffer: file.value[0].buffer,
            mimetype: file.value[0].mimetype,
          },
          randomNo: randomNo,
        });
      });
    } else {
      educationToCheck = educationCertificateKey;
    }

    // Find the index of the experience with the specified _id
    const educationIndex = data.education.findIndex(
      (exp) => exp._id.toString() === IdToUpdate
    );
    if (educationIndex === -1) {
      return errorResponse(
        res,
        404,
        "Id not found", //responseMessage.experience_not_found,
        "Not found" //responseMessage.education_not_found
      );
    }

    const updatedData = {
      collegeName,
      degree,
      startDate,
      endDate,
      educationCertificateName: educationCertificateName,
      educationCertificateSize: educationCertificateSize,
      educationCertificateKey: educationCertificateKey,
      adminUploaded: adminUploaded,
      status: status,
    };

    if (educationFile) {
      updatedData.educationCertificateName = educationCertificateName2;
      updatedData.educationCertificateSize = educationCertificateSize2;
      updatedData.educationCertificateKey = educationToCheck;
      updatedData.isEducationUploaded = true;
      updatedData.adminUploaded = true;
      updatedData.status = "accepted";
    }
    // Update  at the specified index

    data.education[educationIndex] = updatedData;
    // Save the updated data
    await data.save();

    return sendResponse(res, 200, "Data updated successfully", data);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//add assessor agreement
exports.addAssessorAgreement = async (req, res) => {
  try {
    const assesor_id = req.params.id;
    const requestBody = req.body;
    let files = req.files;
    const data = await Assesor.findById(assesor_id);
    const email = data.email;

    const { agreementName, agreementValidFrom, agreementValidTo } = requestBody;

    const formatFileSize = (bytes) => {
      if (bytes < 1024) {
        return bytes + " B";
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      }
    };

    const agreementFile = files.agreementCertificate?.[0];

    let agreementCertificateName = agreementFile
      ? agreementFile.originalname
      : null;

    let agreementCertificateSize = agreementFile
      ? `(${formatFileSize(agreementFile?.size)})`
      : null;

    const newArray = Object.entries(files).map(([key, value]) => {
      return { key, value };
    });

    const randomNo = Math.floor(Math.random() * 90000 + 10000);

    let agreementToCheck = "";
    const uploadedFilePromises = newArray.map(async (file) => {
      switch (file.key) {
        case "agreementCertificate":
          agreementToCheck = file.key + randomNo;
          break;
        default:
          "";
          break;
      }
      if (!file.value[0].buffer) {
        return file;
      }
      // Upload file on s3 bucket
      return uploadAssessorExperienceFile({
        req: {
          email: email,
          key: file.key,
          buffer: file.value[0].buffer,
          mimetype: file.value[0].mimetype,
        },
        randomNo: randomNo,
      });
    });

    // Find the Assessor document by email
    const existingAssessor = await Assesor.findOne({ email: email });

    // Add the new experience to the existing experiences array
    existingAssessor.agreement = existingAssessor.agreement || [];
    existingAssessor.agreement.push({
      agreementName,
      agreementValidFrom,
      agreementValidTo,
      agreementCertificateName: agreementCertificateName,
      agreementCertificateSize: agreementCertificateSize,
      agreementCertificateKey: agreementToCheck,
      adminUploaded: true,
      status: "accepted",
      isAgreementUploaded: true,
    });

    // Save the updated Assessor document
    const updatedAssessor = await existingAssessor.save();

    // Handle your response accordingly
    return sendResponse(
      res,
      200,
      "Data uploaded successfully",
      updatedAssessor
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//get assesor agreement list
exports.getAssessorAgreement = async (req, res) => {
  try {
    const assessorId = req.params.id;
    const { verified, all } = req.query;

    if (verified) {
      let totalCounts = 0;
      const assessorDetail = await Assesor.findById(assessorId);

      if (assessorDetail) {
        const acceptedAgreementDetails = assessorDetail.agreement.filter(
          (data) => data.status === "accepted"
        );

        if (acceptedAgreementDetails.length > 0) {
          const fileKeys = acceptedAgreementDetails.map(
            (data) => data.agreementCertificateKey
          );
          const dataWithUrls = await getassessorAgreementFileUrl(
            assessorDetail,
            fileKeys,
            verified
          );

          const uploadedFiles = dataWithUrls.map((agree) => {
            return {
              agreementName: agree.agreementName,
              agreementValidFrom: agree.agreementValidFrom,
              agreementValidTo: agree.agreementValidTo,
              agreementCertificateName: agree.agreementCertificateName,
              agreementCertificateSize: agree.agreementCertificateSize,
              agreementCertificateKey: agree.agreementCertificateKey,
              isAgreementUploaded: agree.isAgreementUploaded,
              adminUploaded: agree.adminUploaded,
              status: agree.status,
              url: agree.url,
              _id: agree._id,
            };
          });

          totalCounts = uploadedFiles.length;
          if (uploadedFiles.length > 0) {
            return sendResponse(
              res,
              200,
              responseMessage.assessor_details_available,
              {
                uploadedFiles,
                totalCounts,
              }
            );
          } else {
            return errorResponse(
              res,
              200,
              responseMessage.assessor_file_not_found,
              []
            );
          }
        } else {
          return errorResponse(
            res,
            200,
            responseMessage.assessor_file_not_found,
            []
          );
        }
      }

      return errorResponse(
        res,
        400,
        responseMessage.assessor_not_found,
        responseMessage.errorMessage
      );
    } else if (all || !verified) {
      let totalCounts = 0;
      const assessorDetail = await Assesor.findById(assessorId);

      if (assessorDetail) {
        const fileKeys = assessorDetail.agreement
          .filter((agree) => agree.agreementCertificateKey)
          .map((agree) => agree.agreementCertificateKey);

        if (fileKeys.length > 0) {
          const dataWithUrls = await getassessorAgreementFileUrl(
            assessorDetail,
            fileKeys
          );

          const uploadedFiles = dataWithUrls.map((agree) => {
            return {
              agreementName: agree.agreementName,
              agreementValidFrom: agree.agreementValidFrom,
              agreementValidTo: agree.agreementValidTo,
              agreementCertificateName: agree.agreementCertificateName,
              agreementCertificateSize: agree.agreementCertificateSize,
              agreementCertificateKey: agree.agreementCertificateKey,
              isAgreementUploaded: agree.isAgreementUploaded,
              adminUploaded: agree.adminUploaded,
              status: agree.status,
              url: agree.url,
              _id: agree._id,
            };
          });

          totalCounts = uploadedFiles.length;
          if (uploadedFiles.length > 0) {
            return sendResponse(
              res,
              200,
              responseMessage.assessor_details_available,
              {
                uploadedFiles,
                totalCounts,
              }
            );
          } else {
            return errorResponse(
              res,
              200,
              responseMessage.assessor_file_not_found,
              []
            );
          }
        } else {
          return errorResponse(
            res,
            200,
            responseMessage.assessor_file_not_found,
            []
          );
        }
      }

      return errorResponse(
        res,
        400,
        responseMessage.assessor_not_found,
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//update assesor agreement
exports.updateAssessorAgreement = async (req, res) => {
  try {
    const requestBody = req.body;
    const files = req.files;
    const assessorId = req.query.assessor_id; // Use the assessorId from the query parameter
    const IdToUpdate = req.query.agreement_id; // Use the IdToUpdate from the query parameter

    if (!assessorId || !IdToUpdate) {
      return errorResponse(
        res,
        402,
        "Invalid Id", //responseMessage.invalid_query_parameters,
        responseMessage.invalid_query_parameters
      );
    }

    const data = await Assesor.findOne({ _id: assessorId });
    const email = data.email;

    const {
      agreementName,
      agreementValidFrom,
      agreementValidTo,
      agreementCertificateName,
      agreementCertificateSize,
      agreementCertificateKey,
      isAgreementUploaded,
      adminUploaded,
      status,
    } = requestBody;

    // ... (Rest of the code)
    const formatFileSize = (bytes) => {
      if (bytes < 1024) {
        return bytes + " B";
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      }
    };

    const agreementFile = files.agreementCertificate?.[0];

    let agreementCertificateName2 = agreementFile
      ? agreementFile.originalname
      : null;

    let agreementCertificateSize2 = agreementFile
      ? `(${formatFileSize(agreementFile?.size)})`
      : null;

    //assign agreement signed in database
    // if (data?.agreement && data.agreement.length > 0) {
    //   agreementValidity = data.agreement[0]?.agreementValidTo;
    //   console.log("agreementValidity==>",agreementValidity)
    //   // Parse the agreementValidity string into a valid date object
    //   const [day, month, year] = agreementValidity ? agreementValidity?.split('/') : [];
    //   const agreementValidityDate = new Date(`${year}-${month}-${day}`);

    // } else {
    //   // If data.agreement is null or empty, set agreementSigned to 'no'
    //   agreementSigned = 'no';
    // }

    //       let agreementSigned;
    // //const agreementValidTo = "02-29-2024"; // Example date in MM-DD-YYYY format

    // const [month, day, year] = agreementValidTo.split('-');

    // const agreementValidityDateStr = `${year}-${month}-${day}`;

    // // Create Date objects for agreementValidityDate and currentDate
    // const agreementValidityDate = new Date(agreementValidityDateStr);
    // const currentDate = new Date();

    // // Compare dates to determine agreementSigned
    // if (agreementValidityDate >= currentDate) {
    //     agreementSigned = 'yes';
    // } else {
    //     agreementSigned = 'no';
    // }

    // console.log(agreementSigned);

    const newArray = Object.entries(files).map(([key, value]) => {
      return { key, value };
    });
    const randomNo = Math.floor(Math.random() * 90000 + 10000);
    //to check key value
    let agreementToCheck = "";
    if (agreementFile) {
      const uploadedFilePromises = newArray.map(async (file) => {
        switch (file.key) {
          case "agreementCertificate":
            agreementToCheck = file.key + randomNo;
            break;
          default:
            "";
            break;
        }
        if (!file.value[0].buffer) {
          return file;
        }
        return uploadAssessorExperienceFile({
          req: {
            email: email,
            key: file.key,
            buffer: file.value[0].buffer,
            mimetype: file.value[0].mimetype,
          },
          randomNo: randomNo,
        });
      });
    } else {
      agreementToCheck = agreementCertificateKey;
    }

    // Find the index of the experience with the specified _id
    const agreementIndex = data.agreement.findIndex(
      (agree) => agree._id.toString() === IdToUpdate
    );
    if (agreementIndex === -1) {
      return errorResponse(
        res,
        404,
        "Id not found", //responseMessage.experience_not_found,
        responseMessage.agreement_not_found
      );
    }

    // Update the experience at the specified index
    const updatedData = {
      agreementName,
      agreementValidFrom,
      agreementValidTo,
      agreementCertificateName: agreementCertificateName,
      agreementCertificateSize: agreementCertificateSize,
      agreementCertificateKey: agreementCertificateKey,
      adminUploaded: adminUploaded,
      status: status,
      isAgreementUploaded: isAgreementUploaded,
    };

    if (agreementFile) {
      updatedData.agreementCertificateName = agreementCertificateName2;
      updatedData.agreementCertificateSize = agreementCertificateSize2;
      updatedData.agreementCertificateKey = agreementToCheck;
      updatedData.isAgreementUploaded = true;
      updatedData.adminUploaded = true;
      updatedData.status = "accepted";
    }
    data.agreement[agreementIndex] = updatedData;
    // Save the updated data
    await data.save();

    return sendResponse(res, 200, "Data updated successfully", data);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//delete agreement
exports.deleteAssessorAgreement = async (req, res, next) => {
  try {
    let assessorId = req.query.assesor_id;
    let IdToDelete = req.query.agreement_id; // Assuming you can get the experience ID from the request params
    if (!assessorId || !IdToDelete) {
      return errorResponse(
        res,
        403,
        "Invalid Id", //responseMessage.invalid_request,
        responseMessage.invalid_request
      );
    }

    const assessorData = await Assesor.findOne({ _id: assessorId });
    if (!assessorData)
      return errorResponse(
        res,
        404,
        "Data not found", //responseMessage.assessor_profile_not_found,
        responseMessage.errorMessage
      );

    // Use $pull to remove the experience with the given _id from the experiences array
    const result = await Assesor.updateOne(
      { _id: assessorId },
      { $pull: { agreement: { _id: IdToDelete } } }
    );
    if (!result.modifiedCount)
      //nModified)
      return errorResponse(
        res,
        400,
        "Id not found ", //responseMessage.experience_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(
      res,
      200,
      "Data deleted succesfully", //responseMessage.experience_deleted_successfully,
      result
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.updateAssessorBankDetails = async (req, res) => {
  try {
    const requestBody = req.body;
    //if(!_.isEmpty(requestBody)){
    // const { error, value } = validateUpdateAssesor(requestBody);
    // if (error)
    //   return errorResponse(
    //     res,
    //     400,
    //     responseMessage.request_invalid,
    //     error.message
    //   );
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
      accountHolderName,
      bankName,
      bankAccount,
      bankIFSC,
      bankBranchName,
    } = requestBody;

    const updateObject = {
      bankName: bankName,
      bankAccount: bankAccount,
      bankIFSC: bankIFSC,
      accountHolderName: accountHolderName,
      bankBranchName: bankBranchName,
    };

    const updateAssessorBank = await Assesor.findOneAndUpdate(
      { _id: requestId },
      { $set: updateObject },
      { new: true }
    );

    if (!updateAssessorBank)
      return errorResponse(
        res,
        404,
        responseMessage.assessor_profile_not_found,
        responseMessage.assessor_profile_not_found
      );

    return sendResponse(
      res,
      200,
      "Bank detail uploded successfully",
      updateAssessorBank
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//delete bankdetails
exports.deleteAssessorBankById = async (req, res) => {
  try {
    const assessorId = req.params.id;

    if (!assessorId) {
      return errorResponse(
        res,
        402,
        responseMessage.no_assessor_id_provided,
        responseMessage.no_assessor_id_provided
      );
    }

    // Specify the fields you want to delete
    const fieldsToDelete = [
      "accountHolderName",
      "bankName",
      "bankAccount",
      "bankIFSC",
      "bankBranchName",
    ];

    // Create the $unset object based on the fields to delete
    const unsetObject = {};
    fieldsToDelete.forEach((field) => {
      unsetObject[field] = 1;
    });

    // Update the document to delete specified fields
    const updateAssessorBank = await Assesor.findOneAndUpdate(
      { _id: assessorId },
      { $unset: unsetObject },
      { new: true }
    );

    if (!updateAssessorBank) {
      return errorResponse(
        res,
        404,
        responseMessage.assessor_profile_not_found,
        responseMessage.assessor_profile_not_found
      );
    }

    return sendResponse(
      res,
      200,
      "Bank details deleted successfully",
      updateAssessorBank
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//get assesor bankDetail
exports.getAssessorBankDetails = async (req, res) => {
  try {
    const assessorId = req.params.id;

    const assessorDetail = await Assesor.findById(assessorId).select(
      "accountHolderName bankAccount bankIFSC bankName bankBranchName"
    );
    console.log("assessorDetail===>", assessorDetail);
    if (!assessorDetail) {
      return errorResponse(
        res,
        404,
        "Assessor not found", //responseMessage.user_not_found,
        responseMessage.errorMessage
      );
    } else {
      // userDetail = { user: user, userId: getAssesorId };
      return sendResponse(
        res,
        200,
        "Assessor Details get successfully", //responseMessage.user_profile_get,
        assessorDetail
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.updateAssessorProfile = async (req, res) => {
  try {
    const requestBody = req.body;

    //if(!_.isEmpty(requestBody)){
    // const { error, value } = validateUpdateAssesor(requestBody);
    // if (error)
    //   return errorResponse(
    //     res,
    //     400,
    //     responseMessage.request_invalid,
    //     error.message
    //   );

    const requestId = req?.params?.id;
    if (!requestId)
      return errorResponse(
        res,
        402,
        responseMessage.no_assessor_id_provided,
        responseMessage.no_assessor_id_provided
      );

    const data = await Assesor.findById(requestId);
    const assesorEmail = data.email;

    let files = req.files;

    //get data from body
    const {
      fullName,
      email,
      ToaType,
      RadiantFundToa,
      mobile,
      gender,
      dob,
      address,
      state,
      district,
      pincode,
      modeofAgreement,
    } = requestBody;
    //to check duplicate email
    const isExistingAssessor = await Assesor.findOne({ email: email });

    if (isExistingAssessor && isExistingAssessor._id.toString() !== requestId)
      // if (isExistAssesor)
      return errorResponse(
        res,
        400,
        responseMessage.assesor_not_update,
        responseMessage.assesor_already_register
      );

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

    const assessorFile = files.assessorPhoto?.[0];
    let assessorPhotoName = assessorFile?.originalname || null;
    let assessorSize = assessorFile
      ? `(${formatFileSize(assessorFile?.size)})`
      : null;

    const newArray = Object.entries(files).map(([key, value]) => {
      return { key, value };
    });

    //to check key value
    let assessorToCheck = "";

    const uploadedFilePromises = newArray.map(async (file) => {
      switch (file.key) {
        case "assessorPhoto":
          assessorToCheck = file.key;
          break;
        default:
          "";
          break;
      }
      if (!file.value[0].buffer) {
        return file;
      }
      //upload file on s3 bucket
      return uploadAssessorFile({
        buffer: file.value[0].buffer,
        key: file.key,
        mimetype: file.value[0].mimetype,
        email: assesorEmail,
      });
    });

    // Convert undefined to false for isPayroll
    // const isPayrollValue = isPayroll !== undefined ? Boolean(isPayroll) : false;
    // const isFreelanceValue = isFreelance !== undefined ? Boolean(isFreelance) : false;
    //send file original name and size with key
    const assessorCert = {
      assessorName: assessorPhotoName,
      assessorPhotoSize: assessorSize,
      profileKey: assessorToCheck,
    };

    const updateObject = {
      fullName: fullName,
      email: email,
      ToaType,
      RadiantFundToa,
      mobile: mobile,
      gender: gender,
      dob: dob,
      address: address,
      state: state,
      district: district,
      pinCode: pincode,
      modeofAgreement: modeofAgreement,
      assessorCertificate: assessorCert,
      isAssesorProfileUploaded: true,
    };
    if (!assessorPhotoName && !assessorSize && !assessorToCheck) {
      //delete updateObject["assessorPhoto"]
      delete updateObject["assessorCertificate"];
    }

    Promise.all(uploadedFilePromises)
      .then(async (result) => {
        const allStatusCodesAre200 = result.every(
          (res) => res.statusCode === 200
        );
        if (allStatusCodesAre200) {
          const updateAssessorProfile = await Assesor.findOneAndUpdate(
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

// exports.getAssessorProfileById = async (req, res) => {
//   try {
//     let assessorId = req.params.id;

//     const assessorDetail = await Assesor.findById(assessorId);
//     if (assessorDetail) {
//       // Dynamically create the fileKeys array based on uploaded files
//       const fileKeys = [];

//       if (
//         assessorDetail.assessorCertificate &&
//         assessorDetail.assessorCertificate.profileKey
//       ) {
//         fileKeys.push('assessorPhoto');
//       }

//       if(assessorDetail.isAssesorProfileUploaded){
//         const dataWithUrls = await getassessorProfileFileUrl(assessorDetail, fileKeys);
//         if (dataWithUrls && dataWithUrls.length > 0) {
//           // Filter out files with null URLs (i.e., not uploaded)
//           const uploadedFiles = dataWithUrls.filter((file) => file.url !== null);
//           if (uploadedFiles.length > 0) {
// const firstUploadedFile = {
//   _id: uploadedFiles[0]._id,
//   assessorSipId:uploadedFiles[0].assessorSipId,
//   assessorId:uploadedFiles[0].assessorId,
//   fullName: uploadedFiles[0].fullName,
//   email: uploadedFiles[0].email,
//   mobile: uploadedFiles[0].mobile,
//   gender: uploadedFiles[0].gender,
//   dob: uploadedFiles[0].dob,
//   address: uploadedFiles[0].address,
//   state: uploadedFiles[0].state,
//   district: uploadedFiles[0].district,
//   pincode: uploadedFiles[0].pincode,
//   modeofAgreement: uploadedFiles[0].modeofAgreement,
//   assessorName: uploadedFiles[0].assessorName,
//   assessorPhotoSize: uploadedFiles[0].assessorPhotoSize,
//   profileKey: uploadedFiles[0].profileKey,
//   key: uploadedFiles[0].key,
//   url: uploadedFiles[0].url,
// };
//             return sendResponse(
//               res,
//               200,
//               responseMessage.assessor_details_available,
//               firstUploadedFile
//             );
//           } else {
//             return errorResponse(
//               res,
//               200,
//               responseMessage.assessor_file_not_found,
//               []
//             );
//           }
//         }
//       } else {
//         return sendResponse(
//           res,
//           200,
//           responseMessage.assessor_details_available,
//           assessorDetail
//         );
//       }
//     } else{
//       return errorResponse(
//         res,
//         400,
//         responseMessage.assessor_not_found,
//         responseMessage.errorMessage
//       );
//     }

//   } catch (error) {
//     return errorResponse(res, 500, responseMessage.errorMessage, error.message);
//   }
// };
exports.getAssessorProfileById = async (req, res) => {
  try {
    let assessorId = req.params.id;

    const assessorDetail = await Assesor.findById(assessorId).select(
      "-password"
    );

    if (!assessorDetail) {
      return errorResponse(
        res,
        400,
        responseMessage.assessor_not_found,
        responseMessage.errorMessage
      );
    }

    let schemeDetails = [];
    if (assessorDetail.scheme && assessorDetail.scheme.length > 0) {
      schemeDetails = assessorDetail.scheme;
    }

    // Dynamically create the fileKeys array based on uploaded files
    const fileKeys = [];

    if (
      assessorDetail.assessorCertificate &&
      assessorDetail.assessorCertificate.profileKey
    ) {
      fileKeys.push("assessorPhoto");
    }
    // if (assessorDetail.isAssesorProfileUploaded) {
    if (assessorDetail) {
      const dataWithUrls = await getassessorProfileFileUrl(
        assessorDetail,
        fileKeys
      );

      if (dataWithUrls && dataWithUrls.length > 0) {
        // Filter out files with null URLs (i.e., not uploaded)
        const uploadedFiles = dataWithUrls.filter((file) => file.url !== null);

        if (uploadedFiles.length > 0) {
          const firstUploadedFile = {
            _id: uploadedFiles[0]._id,
            assessorSipId: uploadedFiles[0].assessorSipId,
            assessorId: uploadedFiles[0].assessorId,
            fullName: uploadedFiles[0].fullName,
            email: uploadedFiles[0].email,
            ToaType: uploadedFiles[0].ToaType,
            RadiantFundToa: uploadedFiles[0].RadiantFundToa,
            mobile: uploadedFiles[0].mobile,
            gender: uploadedFiles[0].gender,
            dob: uploadedFiles[0].dob,
            address: uploadedFiles[0].address,
            state: uploadedFiles[0].state,
            sector: uploadedFiles[0].sector,
            district: uploadedFiles[0].district,
            pinCode: uploadedFiles[0].pincode,
            modeofAgreement: uploadedFiles[0].modeofAgreement,
            assessorName: uploadedFiles[0].assessorName,
            assessorPhotoSize: uploadedFiles[0].assessorPhotoSize,
            profileKey: uploadedFiles[0].profileKey,
            key: uploadedFiles[0].key,
            url: uploadedFiles[0].url,
            scheme: schemeDetails,
            assessorType: uploadedFiles[0].assessorType,
          };

          return sendResponse(
            res,
            200,
            responseMessage.assessor_details_available,
            firstUploadedFile
          );
        } else {
          const firstUploadedFile = {
            _id: dataWithUrls[0]._id,
            assessorSipId: dataWithUrls[0].assessorSipId,
            assessorId: dataWithUrls[0].assessorId,
            fullName: dataWithUrls[0].fullName,
            email: dataWithUrls[0].email,
            ToaType: dataWithUrls[0].ToaType,
            RadiantFundToa: dataWithUrls[0].RadiantFundToa,
            mobile: dataWithUrls[0].mobile,
            gender: dataWithUrls[0].gender,
            dob: dataWithUrls[0].dob,
            address: dataWithUrls[0].address,
            state: dataWithUrls[0].state,
            sector: dataWithUrls[0].sector,
            district: dataWithUrls[0].district,
            pinCode: dataWithUrls[0].pincode,
            modeofAgreement: dataWithUrls[0].modeofAgreement,
            assessorName: dataWithUrls[0].assessorName,
            assessorPhotoSize: dataWithUrls[0].assessorPhotoSize,
            profileKey: dataWithUrls[0].profileKey,
            key: dataWithUrls[0].key,
            url: dataWithUrls[0].url,
            scheme: schemeDetails,
            assessorType: dataWithUrls[0].assessorType,
          };
          //console.log("firstUploadedFile-->", firstUploadedFile);
          return sendResponse(
            res,
            200,
            responseMessage.assessor_details_available,
            firstUploadedFile
          );
        }
      } else {
        // If no files are uploaded or dataWithUrls is empty, return assessorDetail
        return sendResponse(
          res,
          200,
          responseMessage.assessor_details_available,
          assessorDetail
        );
      }
    } else {
      // If no files are uploaded or dataWithUrls is empty, return assessorDetail
      return sendResponse(
        res,
        200,
        responseMessage.assessor_details_available,
        assessorDetail
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

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
    // Construct the file path
    const filePath = path.resolve(
      __dirname,
      "..",
      "public",
      "files",
      "testa-logo.png"
    );
    const mailOptions = {
      from: {
        address: SENDER_EMAIL,
        name: "Testa",
      },
      to: response.email,
      host: "smtp.mailtrap.io",
      subject: "Create New Password for Testa",
      attachments: [
        {
          filename: "testa-logo.png",
          path: filePath, //'public\files\testa-logo.png',//path.join(__dirname, 'public/files/testa-logo.png'), // Adjust the path accordingly
          cid: "testa-logo", //same cid value as in the html img src
        },
      ],

      //--->New code template added here -->START<---
      html: `
    <!DOCTYPE html>
    <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
    
    <head>
      <title></title>
      <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]--><!--[if !mso]><!-->
      <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;300;400;500;600;700;800;900"
        rel="stylesheet" type="text/css">
      <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900"
        rel="stylesheet" type="text/css"><!--<![endif]-->
      <style>
        * {
          box-sizing: border-box;
        }
    
        body {
          margin: 0;
          padding: 0;
        }
    
        a[x-apple-data-detectors] {
          color: inherit !important;
          text-decoration: inherit !important;
        }
    
        #MessageViewBody a {
          color: inherit;
          text-decoration: none;
        }
    
        p {
          line-height: inherit
        }
    
        .desktop_hide,
        .desktop_hide table {
          mso-hide: all;
          display: none;
          max-height: 0px;
          overflow: hidden;
        }
    
        .image_block img+div {
          display: none;
        }
    
        @media (max-width:660px) {
          .desktop_hide table.icons-inner {
            display: inline-block !important;
          }
    
          .icons-inner {
            text-align: center;
          }
    
          .icons-inner td {
            margin: 0 auto;
          }
    
          .mobile_hide {
            display: none;
          }
    
          .row-content {
            width: 100% !important;
          }
    
          .stack .column {
            width: 100%;
            display: block;
          }
    
          .mobile_hide {
            min-height: 0;
            max-height: 0;
            max-width: 0;
            overflow: hidden;
            font-size: 0px;
          }
    
          .desktop_hide,
          .desktop_hide table {
            display: table !important;
            max-height: none !important;
          }
        }
      </style>
    </head>
    
    <body style="background-color: #f8f8f9; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
      <table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"
        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f8f8f9;">
        <tbody>
          <tr>
            <td>
              <table class="row row-1" align="center" width="100%" border="0" cellpadding="0" cellspacing="0"
                role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                <tbody>
                  <tr>
                    <td>
                      <table class="row-content stack" align="center" border="0" cellpadding="0"
                        cellspacing="0" role="presentation"
                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 640px; margin: 0 auto;"
                        width="640">
                        <tbody>
                          <tr>
                            <td class="column column-1" width="100%"
                              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                              <table class="image_block block-1" width="100%" border="0"
                                cellpadding="10" cellspacing="0" role="presentation"
                                style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                <tr>
                                  <td class="pad">
                                    <div class="alignment" align="center"
                                      style="line-height:10px">
                                      <div style="max-width: 80px;">
                                      <img src="cid:testa-logo" alt="testa-logo" border="0">
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
              <table class="row row-2" style="padding: 0 10px;" align="center" width="100%" border="0"
                cellpadding="0" cellspacing="0" role="presentation"
                style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                <tbody>
                  <tr>
                    <td>
                      <table class="row-content stack" align="center" border="0" cellpadding="0"
                        cellspacing="0" role="presentation"
                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; background-color: #fff; width: 640px; margin: 0 auto;border-radius: 12px;"
                        width="640">
                        <tbody>
                          <tr>
                            <td class="column column-1" width="100%"
                              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                              <table class="divider_block block-1" width="100%" border="0"
                                cellpadding="0" cellspacing="0" role="presentation"
                                style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                <tr>
                                  <td class="pad" style="padding-top:30px;">
                                    <div class="alignment" align="center">
                                      <table border="0" cellpadding="0" cellspacing="0"
                                        role="presentation" width="100%"
                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                        <tr>
                                          <td class="divider_inner"
                                            style="font-size: 1px; line-height: 1px; border-top: 0px solid #BBBBBB;">
                                            <span>&#8202;</span>
                                          </td>
                                        </tr>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              </table>
                              <table class="paragraph_block block-2" width="100%" border="0"
                                cellpadding="0" cellspacing="0" role="presentation"
                                style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                <tr>
                                  <td class="pad"
                                    style="padding-bottom:10px;padding-left:15px;padding-right:15px;padding-top:10px;">
                                    <div
                                      style="color:#1f1f1f;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:24px;font-weight:400;line-height:120%;text-align:left;mso-line-height-alt:28.799999999999997px;">
                                      <p style="margin: 0; word-break: break-word;">
                                        <strong>Welcome to Testa</strong> 👋
                                      </p>
                                    </div>
                                  </td>
                                </tr>
                              </table>
                              <table class="paragraph_block block-3" width="100%" border="0"
                                cellpadding="0" cellspacing="0" role="presentation"
                                style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                <tr>
                                  <td class="pad"
                                    style="padding-bottom:10px;padding-left:15px;padding-right:15px;padding-top:10px;">
                                    <div
                                      style="color:#333333;direction:ltr;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:13px;font-weight:400;letter-spacing:0px;line-height:120%;text-align:left;mso-line-height-alt:15.6px;">
                                      <p style="margin: 0;">Hi <span>${response.fullName},</span></p>
                                    </div>
                                  </td>
                                </tr>
                              </table>
                              <table class="paragraph_block block-4" width="100%" border="0"
                                cellpadding="0" cellspacing="0" role="presentation"
                                style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                <tr>
                                  <td class="pad"
                                    style="padding-bottom:10px;padding-left:15px;padding-right:15px;padding-top:10px;">
                                    <div
                                      style="color:#333333;direction:ltr;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:13px;font-weight:400;letter-spacing:0px;line-height:120%;text-align:left;mso-line-height-alt:16.8px;">
                                      <p style="margin: 0;font-weight: 600;">
                                      You are invited to access the Assessor Application in Testa. To log in, please use the credentials provided below at the given URL:
                                      </p>
                                    </div>
                                  </td>
                                </tr>
                              </table>
                              <table class="paragraph_block block-5" width="100%" border="0"
                                cellpadding="0" cellspacing="0" role="presentation"
                                style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                <tr>
                                  <td class="pad"
                                    style="padding-bottom:10px;padding-left:15px;padding-right:15px;padding-top:10px;">
                                    <div
                                      style="color:#333333;direction:ltr;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:13px;font-weight:400;letter-spacing:0px;line-height:120%;text-align:left;mso-line-height-alt:16.8px;">
                                      <p style="margin: 0; margin-bottom: 12px;">Email ID:
                                        <span style="font-weight: 600;"> ${response.email}
                                        </span>
                                      </p>
                                      <p style="margin: 0; margin-bottom: 12px;">Password:
                                        <span
                                          style="font-weight: 600;">${randomString}</span>
                                      </p>
                                      <p style="margin: 0;">Link: <span
                                          style="color: #007bff;"><u><a
                                              href=${BASE_ASSESSOR_FRONTEND_URL}
                                              target="_blank"
                                              style="text-decoration: underline; color: #7747ff;"
                                              rel="noopener"><span
                                                style="color: #007bff;"><u>${BASE_ASSESSOR_FRONTEND_URL}</u></span></a></u></span>
                                      </p>
                                    </div>
                                  </td>
                                </tr>
                              </table>
                              <table class="divider_block block-6" width="100%" border="0"
                                cellpadding="0" cellspacing="0" role="presentation"
                                style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                <tr>
                                  <td class="pad" style="padding-top:30px;">
                                    <div class="alignment" align="center">
                                      <table border="0" cellpadding="0" cellspacing="0"
                                        role="presentation" width="100%"
                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                        <tr>
                                          <td class="divider_inner"
                                            style="font-size: 1px; line-height: 1px; border-top: 0px solid #BBBBBB;">
                                            <span>&#8202;</span>
                                          </td>
                                        </tr>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              </table>
                              <table class="paragraph_block block-7" width="100%" border="0"
                                cellpadding="0" cellspacing="0" role="presentation"
                                style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                <tr>
                                  <td class="pad"
                                    style="padding-bottom:10px;padding-left:15px;padding-right:15px;padding-top:10px;">
                                    <div
                                      style="color:#333333;direction:ltr;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:13px;font-weight:400;letter-spacing:0px;line-height:120%;text-align:left;mso-line-height-alt:16.8px;">
                                      <p style="margin: 0; margin-bottom: 12px;">If you
                                        experience difficulties accessing your account,
                                        you can contact to admin.</p>
                                      <p style="margin: 0;">Link : <u><span
                                            style="color: #007bff;"><a
                                              href="https://helpdesk@testaonline.com"
                                              target="_blank"
                                              style="text-decoration: underline; color: #007bff;"
                                              rel="noopener">https://helpdesk@testaonline.com</a></span></u>
                                      </p>
                                    </div>
                                  </td>
                                </tr>
                              </table>
                              <table class="paragraph_block block-8" width="100%" border="0"
                                cellpadding="0" cellspacing="0" role="presentation"
                                style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                <tr>
                                  <td class="pad"
                                    style="padding-bottom:10px;padding-left:15px;padding-right:15px;padding-top:10px;">
                                    <div
                                      style="color:#333333;direction:ltr;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:13px;font-weight:400;letter-spacing:0px;line-height:150%;text-align:left;mso-line-height-alt:21px;">
                                      <p style="margin: 0;">Thank you,<br>Testa Team</p>
                                    </div>
                                  </td>
                                </tr>
                              </table>
                              <table class="divider_block block-9" width="100%" border="0"
                                cellpadding="0" cellspacing="0" role="presentation"
                                style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                <tr>
                                  <td class="pad" style="padding-top:30px;">
                                    <div class="alignment" align="center">
                                      <table border="0" cellpadding="0" cellspacing="0"
                                        role="presentation" width="100%"
                                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                        <tr>
                                          <td class="divider_inner"
                                            style="font-size: 1px; line-height: 1px; border-top: 0px solid #BBBBBB;">
                                            <span>&#8202;</span>
                                          </td>
                                        </tr>
                                      </table>
                                    </div>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
              <table class="row row-3" align="center" width="100%" border="0" cellpadding="0" cellspacing="0"
                role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                <tbody>
                  <tr>
                    <td>
                      <table class="row-content stack" align="center" border="0" cellpadding="0"
                        cellspacing="0" role="presentation"
                        style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 640px; margin: 0 auto;"
                        width="640">
                        <tbody>
                          <tr>
                            <td class="column column-1" width="100%"
                              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                              <table class="paragraph_block block-1" width="100%" border="0"
                                cellpadding="0" cellspacing="0" role="presentation"
                                style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                <tr>
                                  <td class="pad"
                                    style="padding-bottom:30px;padding-left:40px;padding-right:40px;padding-top:20px;">
                                    <div
                                      style="color:#555555;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:11px;font-weight:400;line-height:180%;text-align:center;mso-line-height-alt:19.8px;">
                                      <p style="margin: 0; word-break: break-word;">
                                        Radiant Infonet, 901 Bhikaji Cama Place, Delhi
                                        110066
                                      </p>
                                      <p style="margin: 0; word-break: break-word;">
                                        Powered by testaonline.com</p>
                                    </div>
                                  </td>
                                </tr>
                              </table>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table><!-- End -->
    </body>
    
    </html>`,

      //----->END<-----
    };

    //Using MSZ91 SMTP
    const transporter = nodemailer.createTransport({
      host: MSZ91_HOST,
      port: MSZ91_PORT,
      secure: false,
      auth: {
        user: MSZ91_USER,
        pass: MSZ91_PASS,
      },
    });

    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.log("error--->", error.message);
        return errorResponse(
          res,
          500,
          responseMessage.something_wrong,
          error.message
        );
      } else {
        if (info.accepted && info.accepted.length > 0) {
          const salt = await bcrypt.genSalt(8);
          const hashPassword = await bcrypt.hash(randomString, salt);
          await Assesor.updateOne(
            { _id: response._id },
            {
              $set: { isPasswordChangeEmailSend: true, password: hashPassword },
            },
            { upsert: false, runValidators: true }
          );
          return sendResponse(
            res,
            200,
            responseMessage.assessor_added_successfully,
            response
          );
        } else {
          return errorResponse(
            res,
            400,
            "Unable to send initial password email",
            "Unable to send initial password email"
          );
        }
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
//assessor admin basic info registration
exports.addAssessorBasicDetails = async (req, res) => {
  try {
    const requestBody = req.body;
    
    if (typeof requestBody.sector === 'string') {
      try {
        requestBody.sector = JSON.parse(requestBody.sector);
      } catch (e) {
        requestBody.sector = []; 
      }
    }

    let files = req.files;
    let isAssesorProfileUploaded = false;
    if (files && files.assessorPhoto) {
      isAssesorProfileUploaded = true;
    }
    //get data from body
    const {
      assessorSipId,
      fullName,
      email,
      ToaType,
      RadiantFundToa,
      mobile,
      gender,
      dob,
      address,
      state,
      district,
      pinCode,
      modeofAgreement,
      scheme,
      assessorType,
      sector
    } = requestBody;
    let assesorEmail = null,
      isExistingAssessor = null;

    if (!process.env.PM_VISHWAKARMA) {
      return errorResponse(
        res,
        400,
        responseMessage.pm_vishwakarma_env_missing, //responseMessage.assesor_not_update,
        responseMessage.pm_vishwakarma_env_missing
      );
    }

    if (
      scheme &&
      scheme.length === 1 &&
      scheme[0] === process.env.PM_VISHWAKARMA
    ) {
      isExistingAssessor = await Assesor.findOne({
        assessorSipId: assessorSipId,
      });
      if (isExistingAssessor) {
        return errorResponse(
          res,
          400,
          responseMessage.assesor_sip_already_register, //responseMessage.assesor_not_update,
          responseMessage.assesor_sip_already_register
        );
      }
    } else {
      assesorEmail = email?.toLowerCase();
      isExistingAssessor = await Assesor.findOne({ email: assesorEmail });
      if (isExistingAssessor) {
        return errorResponse(
          res,
          400,
          responseMessage.assesor_email_already_register, //responseMessage.assesor_not_update,
          responseMessage.assesor_email_already_register
        );
      }
    }
    if (isExistingAssessor) {
      return errorResponse(
        res,
        400,
        responseMessage.pm_vishwakarma_env_missing, //responseMessage.assesor_not_update,
        responseMessage.pm_vishwakarma_env_missing
      );
    }

    if (
      scheme &&
      scheme.length === 1 &&
      scheme[0] === process.env.PM_VISHWAKARMA
    ) {
      isExistingAssessor = await Assesor.findOne({
        assessorSipId: assessorSipId,
      });
      if (isExistingAssessor) {
        return errorResponse(
          res,
          400,
          responseMessage.assesor_sip_already_register, //responseMessage.assesor_not_update,
          responseMessage.assesor_sip_already_register
        );
      }
    } else {
      assesorEmail = email?.toLowerCase();
      isExistingAssessor = await Assesor.findOne({ email: assesorEmail });
      if (isExistingAssessor) {
        return errorResponse(
          res,
          400,
          responseMessage.assesor_email_already_register, //responseMessage.assesor_not_update,
          responseMessage.assesor_email_already_register
        );
      }
    }

    if (assessorSipId) {
      const findAssesorSipId = await Assesor.find({
        assessorSipId: assessorSipId,
      });

      if (findAssesorSipId && findAssesorSipId.length > 0)
        return errorResponse(
          res,
          400,
          responseMessage.sipId_exists,
          responseMessage.errorMessage
        );
    }

    //let assessorautoId = `RD${Math.floor(1000 + Math.random() * 9000)}`;
    let assessorautoId = await generateUniqueAssessorId();
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

    const assessorFile = files.assessorPhoto?.[0];
    let assessorPhotoName = assessorFile?.originalname || null;
    let assessorSize = assessorFile
      ? `(${formatFileSize(assessorFile?.size)})`
      : null;

    const newArray = Object.entries(files).map(([key, value]) => {
      return { key, value };
    });

    //to check key value
    let assessorToCheck = "";

    const uploadedFilePromises = newArray.map(async (file) => {
      switch (file.key) {
        case "assessorPhoto":
          assessorToCheck = file.key;
          break;
        default:
          "";
          break;
      }
      if (!file.value[0].buffer) {
        return file;
      }
      //upload file on s3 bucket
      return uploadAssessorFile({
        buffer: file.value[0].buffer,
        key: file.key,
        mimetype: file.value[0].mimetype,
        // email: email,
        email: assesorEmail,
      });
    });

    //send file original name and size with key
    const assessorCert = {
      assessorName: assessorPhotoName,
      assessorPhotoSize: assessorSize,
      profileKey: assessorToCheck,
    };

    Promise.all(uploadedFilePromises)
      .then(async (result) => {
        const allStatusCodesAre200 = result.every(
          (res) => res.statusCode === 200
        );

        let updateObject = {};
        if (scheme.length === 1 && scheme[0] === process.env.PM_VISHWAKARMA) {
          updateObject = {
            assessorSipId: assessorSipId,
            fullName: fullName,
            isAssesorProfileUploaded: isAssesorProfileUploaded,
            assessorId: assessorautoId,
            assessorCertificate: assessorCert,
            scheme: scheme,
            sector: sector,
          };
        } else {
          updateObject = {
            assessorSipId: assessorSipId,
            fullName: fullName,
            email: assesorEmail,
            ToaType,
            assessorType,
            RadiantFundToa,
            mobile: mobile,
            gender: gender,
            dob: dob,
            address: address,
            state: state,
            district: district,
            pinCode: pinCode,
            assessorId: assessorautoId,
            modeofAgreement: modeofAgreement,
            assessorCertificate: assessorCert,
            isAssesorProfileUploaded: isAssesorProfileUploaded,
            scheme: scheme,
            sector: sector
          };
        }
        if (allStatusCodesAre200) {
          const assessorDetails = new Assesor(updateObject);

          const assessorBasicDetails = await assessorDetails.save();
          if (assessorBasicDetails) {
            if (
              scheme.length === 1 &&
              scheme[0] === process.env.PM_VISHWAKARMA
            ) {
              const generatedPassword = generateRandomPassword();

              await Assesor.updateOne(
                { _id: assessorBasicDetails._id },
                {
                  $set: {
                    isPasswordChangeEmailSend: true,
                    password: generatedPassword,
                  },
                },
                { upsert: false, runValidators: true }
              );

              return sendResponse(
                res,
                200,
                responseMessage.assessor_added_successfully,
                assessorDetails
              );
            } else {
              if (email) {
                await sendMailToUser(res, assessorBasicDetails);
              }
            }
          } else {
            return errorResponse(
              res,
              404,
              responseMessage.assessor_profile_not_found,
              responseMessage.assessor_profile_not_found
            );
          }
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
    console.log("error", error);
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//list of assessor
exports.assessorAdminVerifiedList = async (req, res, next) => {
  try {
    const options = ["assessorId", "firstName", "email"];
    let filter = getFilter(req, options, false);
    const { page, limit, skip, sortOrder } = Paginate(req);

    const modeofAgreement = req?.query?.modeofAgreement;
    const agreementSigned = req?.query?.agreementSigned;
    const from = req?.query?.from;
    const to = req?.query?.to;

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
     query.isDeleted = false;
    const assessorData = await Assesor.find(query)
      //.populate("clientDetail")
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    console.log("assessorData==>", assessorData);

    const totalCounts = await Assesor.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);

    if (assessorData.length < 1)
      return sendResponse(
        res,
        200,
        responseMessage.assessor_profile_not_found,
        {}
      );

    const imgUrl = assessorData.map((data) => {
      if (data) {
        // Filter out keys corresponding to arrays containing file objects
        const fileKeys = [];

        // Add profileKey from assessorCertificate if available
        if (data.assessorCertificate && data.assessorCertificate.profileKey) {
          fileKeys.push(data.assessorCertificate.profileKey);
        }

        return getassessorPhotoFileUrl(data, fileKeys);
      }
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

exports.assessorAdminList = async (req, res, next) => {
  try {
    const {
      verified = false,
      pending = false,
      schemeType,
      agreementSigned,
      state,
      assessorType,
      clientId,
      dashboardClient = true,
    } = req.query;
 
    //const {schemeId} = req.body;
    const options = ["assessorId", "fullName", "email", "assessorSipId"];
    let filter = getFilter(req, options, false);
    const { page, limit, skip, sortOrder } = Paginate(req);

    const pmvishwakarmaId = process.env.PM_VISHWAKARMA;

    const pmVishwakarmaId = pmvishwakarmaId; //"673ae2a21d9f795a1f756974";
    const pmkvyId = "65aa7bf1b19149328d4ec965";
    const nonPmKvyId = "65aa7ca8b19149328d4ecc61";

    const modeofAgreement = req?.query?.modeofAgreement;
    const currentDate = new Date();
    const from = req?.query?.from;
    const to = req?.query?.to;

    let query = filter ? filter.query : {};
    query.isDeleted = false;

    if (typeof req.body.sector === 'string') {
        try {
            req.body.sector = JSON.parse(req.body.sector);
        } catch (e) {
            req.body.sector = []; 
        }
    }

    //Client-wise filtering using jobRole + JobRole collection
    const isSupportUser = req?.user?.email === "support@radiantinfonet.com";

    let clientIds = [];
    if (clientId) {
      clientIds = clientId.split(",").map((id) => new mongoose.Types.ObjectId(id.trim()));
    } else if (dashboardClient && !isSupportUser) {
      clientIds = (req?.user?.assigndClients || []).map((c) => new mongoose.Types.ObjectId(c._id || c));
    }

    if (clientIds?.length > 0) {
      const clientsData = await ClientModel.find({ _id: { $in: clientIds } }).select('sector');
      const sectorIds = [...new Set(clientsData.flatMap(c => c.sector.map(s => s.sectorId)))];
      const jobRolesForClients = await JobRole.find({
        clientId: { $in: clientIds },
      }).select("jobRole");
      const jobRoleNames = jobRolesForClients.map((jr) => jr.jobRole);

      query["$or"] = [
        { "sector.sectorId": { $in: sectorIds } },
        // { "jobRole.jobroleName": { $in: jobRoleNames } } // THIS CONDITION IS FOR HAVING ASSESSOR OF JOBROLE NOW WE ARE FOCUSED ON SECTOR BASED ASSESSOR SO COMMENTED THIS CONDITION, IN FUTURE IF WE NEED TO ADD JOBROLE BASED ASSESSOR THEN WE CAN UNCOMMENT THIS CONDITION
      ];
    }

    //Add `assessorType` filter if provided
    if (assessorType) {
      query.assessorType = assessorType;
    }

    // Add `modeOfAgreement` filter if provided
    if (modeofAgreement) {
      query.modeofAgreement = modeofAgreement.trim();
    }

    // Add `state` filter if provided
    if (state) {
      query.state = state.trim(); // Ensure no leading/trailing spaces
    }

    // Retrieve the agreements and process the date fields
    const agreements = await Assesor.find({isDeleted: false}).select("agreement");

    // Process the agreements and convert the date string to Date object
    const processedAgreements = agreements?.flatMap((doc) =>
      doc.agreement.map((item) => ({
        ...item,
        agreementValidTo: moment(item.agreementValidTo, "MM-DD-YYYY").toDate(), // Convert string to Date object
        parentId: doc._id, // Store parent document ID for filtering
      }))
    );

    // Filter agreements based on agreementSigned parameter (Yes or No)
    let filteredAgreements;

    if (agreementSigned === "Yes") {
      filteredAgreements = processedAgreements?.filter(
        (item) => item.agreementValidTo >= currentDate
      );
    }

    // Extract the IDs of parent documents that match the condition
    let filteredIds = filteredAgreements?.map((item) => item.parentId) || [];

    if (agreementSigned === "No") {
      filteredAgreements = processedAgreements.filter((item) => {
        return (
          item?.agreementValidTo < currentDate // Agreement valid to date is less than the current date
        );
      });

      // Include empty agreements only when agreementSigned is "No"
      const emptyAgreementDocs = await Assesor.find({
        isDeleted:false,
        agreement: { $exists: true, $size: 0 }, // Only those with empty agreements
      }).select("_id");

      // Extract the IDs of these empty agreement documents
      const emptyAgreementIds = emptyAgreementDocs.map((doc) => doc._id);

      // Add these IDs to filteredIds
      filteredIds = [...filteredIds, ...emptyAgreementIds];
    }

    if (Array.isArray(filteredIds) && filteredIds.length > 0) {
      query["_id"] = { $in: filteredIds }; // Filter Assesor documents based on the parent document IDs
    }

    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);

      query.createdAt = {
        $gte: fromDate,
        $lte: toDate,
      };
    }
    // Determine the condition for PM Vishwakarma, Both, or General
    if (schemeType) {
      if (schemeType === "PMVishwakarma") {
        // PM Vishwakarma
        query["scheme"] = mongoose.Types.ObjectId(pmVishwakarmaId);
      } else if (schemeType === "Both") {
        query["$and"] = [
          {
            scheme: {
              $in: [
                mongoose.Types.ObjectId(pmkvyId),
                mongoose.Types.ObjectId(nonPmKvyId),
              ],
            },
          },
          {
            scheme: mongoose.Types.ObjectId(pmVishwakarmaId),
          },
        ];
      } else if (schemeType === "General") {
        // General: Must have either pmkvyId or nonPmKvyId and must NOT have pmVishwakarmaId
        query["$and"] = [
          {
            scheme: {
              $in: [
                mongoose.Types.ObjectId(pmkvyId),
                mongoose.Types.ObjectId(nonPmKvyId),
              ],
            },
          },
          {
            scheme: {
              $nin: [mongoose.Types.ObjectId(pmVishwakarmaId)],
            },
          },
        ];
      }
    }
  
    const assessorData = await Assesor.find(query)
      // .populate("scheme")
      .sort(sortOrder);

    // Post-process the results for PM Vishwakarma condition if the type is "PMVishwakarma"
    if (schemeType === "PMVishwakarma") {
      assessorData.forEach((assessor) => {
        assessor.scheme = assessor.scheme.filter(
          (scheme) => String(scheme._id) === pmVishwakarmaId
        );
      });
    }

    let totalCounts = assessorData.length;
    let totalPages = Math.ceil(totalCounts / limit);

    if (assessorData.length < 1) {
      return sendResponse(
        res,
        200,
        responseMessage.assessor_profile_not_found,
        {}
      );
    }

    let filteredData = assessorData;

    if (verified === "true") {
      // Filter assessors who have the specific scheme ID or pass the standard verification
      filteredData = assessorData.filter((assessor) => {
        const hasSpecificScheme = assessor.scheme
          ?.map((item) => item?._id?.toString())
          .includes(process.env.PM_VISHWAKARMA);

        if (hasSpecificScheme) {
          return true; // Automatically verified
        }

        // Existing verification logic
        const allAccepted =
          assessor.education.some((edu) => edu.status === "accepted") &&
          assessor.jobRole.some((role) => role.status === "accepted") &&
          assessor.personalDetail.some(
            (detail) => detail.status === "accepted"
          ) &&
          assessor.agreement.some(
            (agreement) => agreement.status === "accepted"
          );

        const personalDetailAcceptedCount =
          assessor.personalDetail.filter(
            (detail) => detail.status === "accepted"
          ).length >= 2;

        return (
          assessor.education.length &&
          assessor.jobRole.length &&
          assessor.agreement.length &&
          allAccepted &&
          personalDetailAcceptedCount
        );
      });

      totalCounts = filteredData.length;
      totalPages = Math.ceil(totalCounts / limit);
      filteredData = filteredData.slice(skip, skip + limit);
    } else if (pending === "true") {
      // Existing pending logic remains unchanged
      filteredData = assessorData.filter((assessor) => {
        const hasSpecificScheme = assessor.scheme
          ?.map((item) => item?._id?.toString())
          .includes(process.env.PM_VISHWAKARMA);
        if (hasSpecificScheme) {
          return false; // Exclude verified assessors
        }
        const isEmptyArray =
          assessor.experiences.length < 1 ||
          assessor.education.length < 1 ||
          assessor.jobRole.length < 1 ||
          assessor.personalDetail.length < 1 ||
          assessor.agreement.length < 1;

        const hasRejectedOrNoAction =
          assessor.experiences.some(
            (exp) =>
              !exp.status ||
              exp.status === "rejected" ||
              exp.status === "noAction"
          ) ||
          assessor.education.some(
            (edu) =>
              !edu.status ||
              edu.status === "rejected" ||
              edu.status === "noAction"
          ) ||
          assessor.jobRole.some(
            (role) =>
              !role.status ||
              role.status === "rejected" ||
              role.status === "noAction"
          ) ||
          assessor.personalDetail.some(
            (detail) =>
              !detail.status ||
              detail.status === "rejected" ||
              detail.status === "noAction"
          ) ||
          assessor.agreement.some(
            (agree) =>
              !agree.status ||
              agree.status === "rejected" ||
              agree.status === "noAction"
          );

        return hasRejectedOrNoAction || isEmptyArray;
      });

      totalCounts = filteredData.length;
      totalPages = Math.ceil(totalCounts / limit);
      filteredData = filteredData.slice(skip, skip + limit);
    } else {
      // No specific verification filter applied
      filteredData = assessorData.slice(skip, skip + limit);
    }

    // Process filtered data to include URLs and additional information
    const imgUrlPromises = filteredData.map(async (data) => {
      if (data) {
        // Assign clientName to jobRole
        if (data.jobRole) {
          data.jobRole = await Promise.all(
            data.jobRole.map(async (role) => {
              if (role && role.jobroleName) {
                const jobRoleData = await JobRole.findOne({
                  jobRole: role.jobroleName,
                }).populate({
                  path: "clientId",
                  select: "clientname",
                });
                if (jobRoleData && jobRoleData.clientId) {
                  role.jobRoleClientName = jobRoleData.clientId.clientname;
                }
              }
              return role;
            })
          );
        }

        // Determine highestQualification
        if (data.education.length > 0) {
          const latestEducation = data.education.reduce((prev, curr) => {
            return new Date(prev.endDate) > new Date(curr.endDate)
              ? prev
              : curr;
          });
          data.highestQualification = latestEducation.degree;
        } else {
          data.highestQualification = "";
        }

        // Determine validity dates
        if (data.jobRole.length > 0) {
          const { issueDate, validUpto } = data.jobRole.reduce(
            (latest, current) =>
              new Date(latest.validUpto || latest.issueDate) >
              new Date(current.validUpto || current.issueDate)
                ? latest
                : current
          );
          data.validityStartDate = issueDate || "";
          data.validityEndDate = validUpto || "";
        } else {
          data.validityStartDate = "";
          data.validityEndDate = "";
        }

        // Get assessor photo URLs
        const fileKeys = [];
        if (data.assessorCertificate && data.assessorCertificate.profileKey) {
          fileKeys.push(data.assessorCertificate.profileKey);
        }
        // return getassessorPhotoFileUrl(data, fileKeys);
        return getassessorPhotoFileUrl(data, fileKeys);
      }
    });

    const imgUrl = await Promise.all(imgUrlPromises);

    return sendResponse(res, 200, responseMessage.assessor_profile_get, {
      result: imgUrl,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//update assessor basic info
exports.updateAssessorBasicDetails = async (req, res) => {
  try {
    let updateObject = {};
    const formatFileSize = (bytes) => {
      if (bytes < 1024) {
        return bytes + " B";
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      }
    };

    const requestBody = req.body;

    if (typeof requestBody.sector === 'string') {
      try {
        requestBody.sector = JSON.parse(requestBody.sector);
      } catch (e) {
        requestBody.sector = [];
      }
    }
    const requestId = req?.params?.id;
    if (!requestId)
      return errorResponse(
        res,
        400,
        responseMessage.no_assessor_id_provided,
        responseMessage.no_assessor_id_provided
      );

    if (!process.env.PM_VISHWAKARMA) {
      return errorResponse(
        res,
        400,
        responseMessage.pm_vishwakarma_env_missing,
        responseMessage.pm_vishwakarma_env_missing
      );
    }

    const assessorDetail = await Assesor.findById(requestId);

    if (!assessorDetail) {
      return errorResponse(
        res,
        400,
        responseMessage.no_assessor_found,
        responseMessage.no_assessor_found
      );
    }

    const {
      assessorSipId,
      fullName,
      email,
      ToaType,
      RadiantFundToa,
      mobile,
      gender,
      dob,
      address,
      state,
      district,
      pinCode,
      modeofAgreement,
      assessorName,
      assessorPhotoSize,
      assessorPhoto,
      scheme,
      assessorType,
      sector
    } = requestBody;

    // Check for existing assessorSipId, excluding the current requestId
    if (assessorSipId && assessorSipId?.trim() !== "") {
      const isExistingAssessorSipId = await Assesor.findOne({
        isDeletd: false,
        assessorSipId: assessorSipId,
        _id: { $ne: requestId },
      });

      if (isExistingAssessorSipId) {
        return errorResponse(
          res,
          400,
          responseMessage.assesor_sip_already_register,
          responseMessage.assesor_sip_already_register
        );
      }
    }

    if (req.files && Object.keys(req.files).length > 0) {
      // it means there is a file to upload
      const file = req.files.assessorPhoto[0];

      const imageUpload = await uploadAssessorFile({
        buffer: file.buffer,
        key: "assessorPhoto",
        mimetype: file.mimetype,
        email: assessorDetail.email
          ? assessorDetail.email
          : assessorDetail.assessorSipId,
      });

      const assessorCert = {
        assessorName: file.fieldname,
        assessorPhotoSize: formatFileSize(file.size),
        profileKey: "assessorPhoto",
      };
      if (
        assessorDetail.scheme.length === 1 &&
        assessorDetail.scheme[0]?.toString() === process.env.PM_VISHWAKARMA
      ) {
        (updateObject.fullName = fullName),
          (updateObject.assessorSipId = assessorSipId),
          (updateObject.isAssesorProfileUploaded = true),
          (updateObject.scheme = scheme),
          (updateObject.assessorCertificate = assessorCert);
          (updateObject.sector = sector);
      } else {
        updateObject.assessorSipId = assessorSipId;
        updateObject.fullName = fullName;
        updateObject.email = email;
        updateObject.ToaType = ToaType;
        updateObject.RadiantFundToa = RadiantFundToa;
        updateObject.mobile = mobile;
        updateObject.gender = gender;
        updateObject.dob = dob;
        updateObject.address = address;
        updateObject.state = state;
        updateObject.sector = sector;
        updateObject.district = district;
        updateObject.pinCode = pinCode;
        updateObject.modeofAgreement = modeofAgreement;
        updateObject.assessorType = assessorType;
        updateObject.assessorCertificate = assessorCert;
        (updateObject.isAssesorProfileUploaded = true),
          (updateObject.scheme = scheme);
      }

      const updatedDoc = await Assesor.findByIdAndUpdate(
        //assessorDetail._id,
        { _id: assessorDetail._id, isDeleted: false },
        { $set: updateObject },
        { new: true, runValidators: true }
      );

      if (!updatedDoc) {
        return errorResponse(
          res,
          400,
          "unable to update assessor",
          "unable to update assessor"
        );
      }
      return sendResponse(
        res,
        200,
        "assessor successfully updated",
        updatedDoc
      );
    }

    if (!assessorPhoto && req.files && Object.keys(req.files).length < 1) {
      // delete the assessor profile photo
      const assessorCert = {
        assessorName: assessorName,
        assessorPhotoSize: assessorPhotoSize,
        profileKey: "assessorPhoto",
      };
      const imageDeleted = deleteAssessorFromS3({
        key: "assessorPhoto",
        email: assessorDetail.email,
      });

      if (
        assessorDetail.scheme.length === 1 &&
        assessorDetail.scheme[0]?.toString() === process.env.PM_VISHWAKARMA
      ) {
        (updateObject.fullName = fullName),
          (updateObject.assessorSipId = assessorSipId),
          (updateObject.isAssesorProfileUploaded = false),
          (updateObject.scheme = scheme),
          (updateObject.sector = sector),
          (updateObject.assessorCertificate = assessorCert);
      } else {
        updateObject.assessorSipId = assessorSipId;
        updateObject.fullName = fullName;
        updateObject.email = email;
        updateObject.ToaType = ToaType;
        updateObject.RadiantFundToa = RadiantFundToa;
        updateObject.mobile = mobile;
        updateObject.gender = gender;
        updateObject.dob = dob;
        updateObject.address = address;
        updateObject.state = state;
        updateObject.sector = sector;
        updateObject.district = district;
        updateObject.pinCode = pinCode;
        updateObject.modeofAgreement = modeofAgreement;
        updateObject.assessorType = assessorType;
        updateObject.assessorCertificate = assessorCert;
        (updateObject.isAssesorProfileUploaded = false),
          (updateObject.scheme = scheme);
      }

      delete assessorDetail["assessorCertificate"];

      const updatedDoc = await Assesor.findByIdAndUpdate(
        {_id : assessorDetail._id, isDeleted:false},
        { $set: updateObject },
        { new: true, runValidators: true }
      );

      if (!updatedDoc) {
        return errorResponse(
          res,
          400,
          "unable to update assessor",
          "unable to update assessor"
        );
      }
      return sendResponse(
        res,
        200,
        "assessor successfully updated",
        updatedDoc
      );
    }
    // console.log('updateDoc',updatedDoc)
    if (assessorPhoto && req.files && Object.keys(req.files).length < 1) {
      if (
        assessorDetail.scheme.length === 1 &&
        assessorDetail.scheme[0]?.toString() === process.env.PM_VISHWAKARMA
      ) {
        (updateObject.fullName = fullName),
          (updateObject.assessorSipId = assessorSipId),
          (updateObject.scheme = scheme);
          (updateObject.sector = sector);
      } else {
        updateObject.assessorSipId = assessorSipId;
        updateObject.fullName = fullName;
        updateObject.email = email;
        updateObject.ToaType = ToaType;
        updateObject.RadiantFundToa = RadiantFundToa;
        updateObject.mobile = mobile;
        updateObject.gender = gender;
        updateObject.dob = dob;
        updateObject.address = address;
        updateObject.assessorType = assessorType;
        (updateObject.state = state),
        (updateObject.sector = sector),
          (updateObject.district = district),
          (updateObject.pinCode = pinCode),
          (updateObject.modeofAgreement = modeofAgreement),
          (updateObject.scheme = scheme);
      }
      const updatedDoc = await Assesor.findByIdAndUpdate(
        assessorDetail._id,
        { $set: updateObject },
        { new: true, runValidators: true }
      );

      console.log("updatedDoc===>", updateObject);
      if (!updatedDoc) {
        return errorResponse(
          res,
          400,
          "unable to update assessor",
          "unable to update assessor"
        );
      }
      return sendResponse(
        res,
        200,
        "assessor successfully updated",
        updatedDoc
      );
    }

    if (
      assessorDetail.scheme.length === 1 &&
      assessorDetail.scheme[0]?.toString() === process.env.PM_VISHWAKARMA
    ) {
      (updateObject.fullName = fullName),
        (updateObject.assessorSipId = assessorSipId),
        (updateObject.scheme = scheme);
    } else {
      updateObject.assessorSipId = assessorSipId;
      updateObject.fullName = fullName;
      updateObject.email = email;
      updateObject.ToaType = ToaType;
      updateObject.RadiantFundToa = RadiantFundToa;
      updateObject.mobile = mobile;
      updateObject.gender = gender;
      updateObject.dob = dob;
      updateObject.address = address;
      updateObject.state = state;
      updateObject.sector = sector;
      updateObject.district = district;
      updateObject.pinCode = pinCode;
      updateObject.modeofAgreement = modeofAgreement;
      updateObject.assessorType = assessorType;
      updateObject.scheme = scheme;
    }

    const updatedDoc = await Assesor.findByIdAndUpdate(
      assessorDetail._id,
      { $set: updateObject },
      { new: true, runValidators: true }
    );
    if (!updatedDoc) {
      return errorResponse(
        res,
        400,
        "unable to update assessor",
        "unable to update assessor"
      );
    }
    return sendResponse(res, 200, "assessor successfully updated", updatedDoc);
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.checkAssessorFileStatusChange = async (req, res) => {
  try {
    const { assessor_Id, imageUpdates } = req.body;

    const updateAssessor = await updateImageStatuses(assessor_Id, imageUpdates);

    const notificationSend = await makeNoifiction(
      req,
      assessor_Id,
      imageUpdates
    );

    if (updateAssessor && notificationSend.status) {
      return sendResponse(
        res,
        200,
        "Image status updated successfully",
        updateAssessor
      );
    } else {
      return errorResponse(res, 400, "something wrong", {
        updateAssessor,
        notificationSend,
      });
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

const makeNoifiction = async (req, assessorId, imageUpdates) => {
  try {
    let tabData;
    assessorObjectLinks.forEach(async (item) => {
      if (item.objectName === imageUpdates[0].objectName) {
        tabData = { tabUrl: item.tabUrl };
      }
    });

    if (imageUpdates[0].newStatus === "rejected") {
      const notification = new AssessorNotificationModel({
        recipient: assessorId,
        sender: req.user._id,
        title: "Document rejected",
        content: `${imageUpdates[0].objectName} has rejected, please re-upload`,
        type: "alert",
        link: tabData.tabUrl,
      });

      const savedNotification = await notification.save();
      if (!savedNotification)
        return { status: false, message: savedNotification };
      return { status: true, message: savedNotification };
    }

    return { status: true, message: "for accepted, notification doesn't send" };
  } catch (error) {
    console.log("err-->", error.message);
    return { status: false, message: error.message };
  }
};

exports.assessorStatus = async (req, res) => {
  try {
    const getAssessorId = req.params.id;

    // Find the existing assessor
    const existingAssessor = await Assesor.findById(getAssessorId);
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

    const updatedAssessor = await Assesor.findByIdAndUpdate(
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

//----->Remove assessor
exports.removeAssessor = async (req, res, next) => {
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
    const assessorData = await Assesor.findOne({ _id: assessorId });
    //const assessorData = await Assesor.findById(assessorId)
    console.log("assessorData==>", assessorData);
    // check user if found or not
    if (!assessorData)
      return errorResponse(
        res,
        404,
        responseMessage.assessor_profile_not_found,
        responseMessage.errorMessage
      );

    //const result = await Assesor.deleteOne({ _id: assessorId });
    const result = await Assesor.findOneAndUpdate(
  { _id: assessorId, isDeleted: false },  
  { $set: { isDeleted: true } },
  { new: true }
);
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
      responseMessage.assessor_profile_delete
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};
async function updateImageStatuses(assessor_Id, imageUpdates) {
  try {
    const document = await Assesor.findOne({
      _id: assessor_Id,
    });
    console.log("document==>", document);
    if (!document) {
      throw new Error("Document not found");
    }

    for (const { objectName, imageId, newStatus } of imageUpdates) {
      const targetObject = document[objectName];

      if (!targetObject) {
        throw new Error(`Object ${objectName} not found`);
      }

      // const imageIndex = targetObject[fileType].findIndex(image => image._id.equals((imageId)));//ObjectId
      const imageIndex = targetObject.findIndex((image) =>
        image._id.equals(imageId)
      );
      if (imageIndex === -1) {
        throw new Error(`Image ${imageId} not found in ${objectName}`);
      }

      // targetObject[fileType][imageIndex].status = newStatus;
      targetObject[imageIndex].status = newStatus;
    }

    await document.save();

    return true;
  } catch (error) {
    console.error("Error updating image statuses:", error.message);
    return false;
  }
}

function validateAssessorDetails(userBody) {
  try {
    const schema = Joi.object({
      fullName: Joi.string().min(2).max(50).trim().required(),
      assessorSipId: Joi.string().allow(""),
      email: Joi.string()
        .min(5)
        .trim()
        .max(255)
        .email()
        .when({
          is: Joi.array()
            .items(Joi.string().valid(process.env.PM_VISHWAKARMA))
            .length(1),
          then: Joi.optional(),
          otherwise: Joi.required(),
        }),
      ToaType: Joi.string().when({
        is: Joi.array()
          .items(Joi.string().valid(process.env.PM_VISHWAKARMA))
          .length(1),
        then: Joi.optional(),
        otherwise: Joi.required(),
      }),
      RadiantFundToa: Joi.boolean(),
      mobile: Joi.string()
        .min(10)
        .max(10)
        .when({
          is: Joi.array()
            .items(Joi.string().valid(process.env.PM_VISHWAKARMA))
            .length(1),
          then: Joi.optional(),
          otherwise: Joi.required(),
        }),
      assesor_id: Joi.string().allow(""),
      gender: Joi.string().when({
        is: Joi.array()
          .items(Joi.string().valid(process.env.PM_VISHWAKARMA))
          .length(1),
        then: Joi.optional(),
        otherwise: Joi.required(),
      }),
      dob: Joi.string()
        .regex(/^\d{2}-\d{2}-\d{4}$/)
        .message("Invalid D.O.B format")
        .when({
          is: Joi.array()
            .items(Joi.string().valid(process.env.PM_VISHWAKARMA))
            .length(1),
          then: Joi.optional(),
          otherwise: Joi.required(),
        }),
      address: Joi.string()
        .min(3)
        .max(250)
        .trim()
        .when({
          is: Joi.array()
            .items(Joi.string().valid(process.env.PM_VISHWAKARMA))
            .length(1),
          then: Joi.optional(),
          otherwise: Joi.required(),
        }),
      state: Joi.string()
        .min(3)
        .max(100)
        .trim()
        .when({
          is: Joi.array()
            .items(Joi.string().valid(process.env.PM_VISHWAKARMA))
            .length(1),
          then: Joi.optional(),
          otherwise: Joi.required(),
        }),
      district: Joi.string()
        .min(3)
        .max(100)
        .trim()
        .when({
          is: Joi.array()
            .items(Joi.string().valid(process.env.PM_VISHWAKARMA))
            .length(1),
          then: Joi.optional(),
          otherwise: Joi.required(),
        }),
      pinCode: Joi.string()
        .min(6)
        .max(6)
        .trim()
        .when({
          is: Joi.array()
            .items(Joi.string().valid(process.env.PM_VISHWAKARMA))
            .length(1),
          then: Joi.optional(),
          otherwise: Joi.required(),
        }),
      modeofAgreement: Joi.string().allow(""),
      scheme: Joi.array().required(),
    });
    return schema.validate(userBody);
  } catch (err) {
    console.log(err);
  }
}

function validateNumbers(registerBody) {
  try {
    const schema = Joi.object({
      mobile: Joi.string().min(10).max(10).required(),
    });
    return schema.validate(registerBody);
  } catch (error) {
    console.log(error);
  }
}

module.exports.bulkUploadAssessor = async (req, res, next) => {
  try {
    const workbook = reader.readFile(req.file.path);
    const sheet_name_list = workbook.SheetNames;
    let xlData = reader.utils.sheet_to_json(
      workbook.Sheets[sheet_name_list[0]]
    );

    if (xlData.length < 1) {
      await fs.unlink(req.file.path);
      return errorResponse(res, 400, "empty file", { error: "empty file" });
    }

    let errors;
    const records = [];
    const existingEmail = [];

    // checking duplicate value in excel
    for (let i = 0; i < xlData.length; i++) {
      for (let j = i + 1; j < xlData.length; j++) {
        if (xlData[i].Email === xlData[j].Email) {
          errors = {
            _original: { email: xlData[i].Email },
            message: "duplicate vallue in excel",
          };
          break;
        }
        if (xlData[i]["Mobile"] === xlData[j]["Mobile"]) {
          errors = {
            _original: { email: xlData[i].Email },
            message: "duplicate vallue in excel",
          };
          break;
        }
      }
    }

    // assessorSipId:assessorSipId,
    // assessorId: assessorautoId,

    // checking validation for each row of excel
    xlData.forEach(async (row) => {
      let email = row.Email.toLowerCase();
      let ToaType = row.ToaType;
      // let RadiantFundToa=row.RadiantFundToa
      let address = row.Address;
      let fullName = row["Full Name"];
      let RadiantFundToa =
        row["Does Radiant funded for your training ?"] === "Yes" ? true : false;
      let mobile = row.Mobile && row.Mobile?.toString();
      let pinCode = row.Pincode && row.Pincode?.toString();
      let state = row.State;
      let district = row.District;
      let dob = row.DOB;
      let gender = row.Gender; //?.toLowerCase()?.trim()
      gender =
        gender === "notSpecify" ? "notSpecify" : gender.toLowerCase().trim();
      let modeofAgreement = row["Mode of Agreement"]?.toLowerCase()?.trim();
      //let assessorautoId = `RD${Math.floor(1000 + Math.random() * 9000)}`;
      let assessorautoId = await generateUniqueAssessorId();
      //let assessorEmail = email.toLowerCase();

      const { value, error } = validateBulkAssesor({
        fullName,
        email,
        ToaType,
        RadiantFundToa,
        mobile,
        pinCode,
        address,
        state,
        district,
        dob,
        gender,
        modeofAgreement,
      });

      let sipid = row["Sip Id"];
      if (sipid) {
        // value["sipid"] = sipid
        value["assessorSipId"] = sipid;
      }

      value["assessorId"] = assessorautoId;

      if (error) {
        errors = error;
        return false;
      } else {
        records.push(value);
        return true;
      }
    });

    //checking duplicate value in the database
    xlData.forEach((row) => {
      const existingAssessor = Assesor.findOne({
        $or: [{ email: row.Email }, { mobile: row.Mobile }],
      });
      if (existingAssessor) {
        existingEmail.push(existingAssessor);
      }
    });

    //checking for duplicate email in the db then send response accordingly

    const existingValue = await Promise.all(existingEmail);

    if (existingValue.length > 0) {
      existingValue?.forEach((value) => {
        if (value) {
          if (!errors) {
            //errors =  {_original:{ email: value?.email.toLowerCase()}, message:"email or mobile already exist"}
            errors = {
              _original: { email: value?.email },
              message: "email or mobile already exist",
            };
          }
        }
      });
    }
    if (errors) {
      await fs.unlink(req.file.path);
      return errorResponse(res, 400, responseMessage.something_wrong, {
        user: errors._original.email,
        error: errors.message,
      });
    } else {
      const result = await Assesor.insertMany(records);
      if (result) {
        const isMailSend = result.every(async (item) => {
          let randomString = generateRandomAlphanumeric(10);
          const salt = await bcrypt.genSalt(8);
          const encodedPassword = await bcrypt.hash(randomString, salt);
          const isSend = await sendMailToAssessor(item, randomString);
          if (isSend) {
            item.isInitialPasswordMailSend = true;
            item.password = encodedPassword;
            await item.save();
            return true;
          }
        });
        if (isMailSend) {
          await fs.unlink(req.file.path);
          return sendResponse(
            res,
            200,
            "all the assessor successfully added",
            `${result.length} "all the assessor successfully added"`
          );
        } else {
          await fs.unlink(req.file.path);
          return err(res, 200, "assessor added but email not send");
        }
      } else {
        await fs.unlink(req.file.path);
        return errorResponse(
          res,
          400,
          responseMessage.something_wrong,
          err.message
        );
      }
    }
  } catch (error) {
    await fs.unlink(req.file.path);
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

async function generateUniqueAssessorId() {
  let uniqueId = `RD${Math.floor(1000 + Math.random() * 9000)}`;
  // Check if the generated ID already exists in the database
  const existingAssessor = await Assesor.findOne({ assessorId: uniqueId });
  // If it exists, regenerate and check again
  if (existingAssessor) {
    return generateUniqueAssessorId();
  }
  // If it doesn't exist, return the unique ID
  return uniqueId;
}

exports.dowloadAssessorSampleFile = (req, res) => {
  const filepath = `public/files/bulkuploadsamplefile`;
  const file = `${filepath}/bulkAssessorSample.xlsx`;
  return res.status(200).download(file);
};

const sendMailToAssessor = async (data, randomString) => {
  try {
    const filePath = path.resolve(
      __dirname,
      "..",
      "public",
      "files",
      "testa-logo.png"
    );
    const mailOptions = {
      from: {
        address: SENDER_EMAIL,
        name: "Testa",
      },
      to: data.email,
      host: "smtp.mailtrap.io",
      subject: "Password for Assessor App",
      attachments: [
        {
          filename: "testa-logo.png",
          path: filePath, //"https://i.ibb.co/z4ZMDQj/testa-logo.png",
          cid: "testa-logo", //same cid value as in the html img src
        },
      ],
      //New code template added here--->start<----
      html: `
       <!DOCTYPE html>
       <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
       
       <head>
         <title></title>
         <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
         <meta name="viewport" content="width=device-width, initial-scale=1.0">
         <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]--><!--[if !mso]><!-->
         <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;300;400;500;600;700;800;900"
           rel="stylesheet" type="text/css">
         <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900"
           rel="stylesheet" type="text/css"><!--<![endif]-->
         <style>
           * {
             box-sizing: border-box;
           }
       
           body {
             margin: 0;
             padding: 0;
           }
       
           a[x-apple-data-detectors] {
             color: inherit !important;
             text-decoration: inherit !important;
           }
       
           #MessageViewBody a {
             color: inherit;
             text-decoration: none;
           }
       
           p {
             line-height: inherit
           }
       
           .desktop_hide,
           .desktop_hide table {
             mso-hide: all;
             display: none;
             max-height: 0px;
             overflow: hidden;
           }
       
           .image_block img+div {
             display: none;
           }
       
           @media (max-width:660px) {
             .desktop_hide table.icons-inner {
               display: inline-block !important;
             }
       
             .icons-inner {
               text-align: center;
             }
       
             .icons-inner td {
               margin: 0 auto;
             }
       
             .mobile_hide {
               display: none;
             }
       
             .row-content {
               width: 100% !important;
             }
       
             .stack .column {
               width: 100%;
               display: block;
             }
       
             .mobile_hide {
               min-height: 0;
               max-height: 0;
               max-width: 0;
               overflow: hidden;
               font-size: 0px;
             }
       
             .desktop_hide,
             .desktop_hide table {
               display: table !important;
               max-height: none !important;
             }
           }
         </style>
       </head>
       
       <body style="background-color: #f8f8f9; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
         <table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"
           style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f8f8f9;">
           <tbody>
             <tr>
               <td>
                 <table class="row row-1" align="center" width="100%" border="0" cellpadding="0" cellspacing="0"
                   role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                   <tbody>
                     <tr>
                       <td>
                         <table class="row-content stack" align="center" border="0" cellpadding="0"
                           cellspacing="0" role="presentation"
                           style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 640px; margin: 0 auto;"
                           width="640">
                           <tbody>
                             <tr>
                               <td class="column column-1" width="100%"
                                 style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                 <table class="image_block block-1" width="100%" border="0"
                                   cellpadding="10" cellspacing="0" role="presentation"
                                   style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                   <tr>
                                     <td class="pad">
                                       <div class="alignment" align="center"
                                         style="line-height:10px">
                                         <div style="max-width: 80px;">
                                         <img src="cid:testa-logo" alt="testa-logo" border="0">
                                         </div>
                                       </div>
                                     </td>
                                   </tr>
                                 </table>
                               </td>
                             </tr>
                           </tbody>
                         </table>
                       </td>
                     </tr>
                   </tbody>
                 </table>
                 <table class="row row-2" style="padding: 0 10px;" align="center" width="100%" border="0"
                   cellpadding="0" cellspacing="0" role="presentation"
                   style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                   <tbody>
                     <tr>
                       <td>
                         <table class="row-content stack" align="center" border="0" cellpadding="0"
                           cellspacing="0" role="presentation"
                           style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; background-color: #fff; width: 640px; margin: 0 auto;border-radius: 12px;"
                           width="640">
                           <tbody>
                             <tr>
                               <td class="column column-1" width="100%"
                                 style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                 <table class="divider_block block-1" width="100%" border="0"
                                   cellpadding="0" cellspacing="0" role="presentation"
                                   style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                   <tr>
                                     <td class="pad" style="padding-top:30px;">
                                       <div class="alignment" align="center">
                                         <table border="0" cellpadding="0" cellspacing="0"
                                           role="presentation" width="100%"
                                           style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                           <tr>
                                             <td class="divider_inner"
                                               style="font-size: 1px; line-height: 1px; border-top: 0px solid #BBBBBB;">
                                               <span>&#8202;</span>
                                             </td>
                                           </tr>
                                         </table>
                                       </div>
                                     </td>
                                   </tr>
                                 </table>
                                 <table class="paragraph_block block-2" width="100%" border="0"
                                   cellpadding="0" cellspacing="0" role="presentation"
                                   style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                   <tr>
                                     <td class="pad"
                                       style="padding-bottom:10px;padding-left:15px;padding-right:15px;padding-top:10px;">
                                       <div
                                         style="color:#1f1f1f;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:24px;font-weight:400;line-height:120%;text-align:left;mso-line-height-alt:28.799999999999997px;">
                                         <p style="margin: 0; word-break: break-word;">
                                           <strong>Welcome to Testa</strong> 👋
                                         </p>
                                       </div>
                                     </td>
                                   </tr>
                                 </table>
                                 <table class="paragraph_block block-3" width="100%" border="0"
                                   cellpadding="0" cellspacing="0" role="presentation"
                                   style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                   <tr>
                                     <td class="pad"
                                       style="padding-bottom:10px;padding-left:15px;padding-right:15px;padding-top:10px;">
                                       <div
                                         style="color:#333333;direction:ltr;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:13px;font-weight:400;letter-spacing:0px;line-height:120%;text-align:left;mso-line-height-alt:15.6px;">
                                         <p style="margin: 0;">Hi <span>${data.fullName},</span></p>
                                       </div>
                                     </td>
                                   </tr>
                                 </table>
                                 <table class="paragraph_block block-4" width="100%" border="0"
                                   cellpadding="0" cellspacing="0" role="presentation"
                                   style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                   <tr>
                                     <td class="pad"
                                       style="padding-bottom:10px;padding-left:15px;padding-right:15px;padding-top:10px;">
                                       <div
                                         style="color:#333333;direction:ltr;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:13px;font-weight:400;letter-spacing:0px;line-height:120%;text-align:left;mso-line-height-alt:16.8px;">
                                         <p style="margin: 0;font-weight: 600;">
                                         You are invited to join Testa! For login, You need to set an account password. Please click the button given below to create your account password.
                                         </p>
                                       </div>
                                     </td>
                                   </tr>
                                 </table>
                                 <table class="paragraph_block block-5" width="100%" border="0"
                                   cellpadding="0" cellspacing="0" role="presentation"
                                   style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                   <tr>
                                     <td class="pad"
                                       style="padding-bottom:10px;padding-left:15px;padding-right:15px;padding-top:10px;">
                                       <div
                                         style="color:#333333;direction:ltr;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:13px;font-weight:400;letter-spacing:0px;line-height:120%;text-align:left;mso-line-height-alt:16.8px;">
                                         <p style="margin: 0; margin-bottom: 12px;">Username:
                                           <span style="font-weight: 600;"> ${data.fullName}
                                           </span>
                                         </p>
                                         <p style="margin: 0; margin-bottom: 12px;">Password:
                                           <span
                                             style="font-weight: 600;">${randomString}</span>
                                         </p>
                                         <p style="margin: 0;">Link: <span
                                             style="color: #007bff;"><u><a
                                                 href=${BASE_FRONTEND_URL}
                                                 target="_blank"
                                                 style="text-decoration: underline; color: #7747ff;"
                                                 rel="noopener"><span
                                                   style="color: #007bff;"><u>${BASE_FRONTEND_URL}</u></span></a></u></span>
                                         </p>
                                       </div>
                                     </td>
                                   </tr>
                                 </table>
                                 <table class="divider_block block-6" width="100%" border="0"
                                   cellpadding="0" cellspacing="0" role="presentation"
                                   style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                   <tr>
                                     <td class="pad" style="padding-top:30px;">
                                       <div class="alignment" align="center">
                                         <table border="0" cellpadding="0" cellspacing="0"
                                           role="presentation" width="100%"
                                           style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                           <tr>
                                             <td class="divider_inner"
                                               style="font-size: 1px; line-height: 1px; border-top: 0px solid #BBBBBB;">
                                               <span>&#8202;</span>
                                             </td>
                                           </tr>
                                         </table>
                                       </div>
                                     </td>
                                   </tr>
                                 </table>
                                 <table class="paragraph_block block-7" width="100%" border="0"
                                   cellpadding="0" cellspacing="0" role="presentation"
                                   style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                   <tr>
                                     <td class="pad"
                                       style="padding-bottom:10px;padding-left:15px;padding-right:15px;padding-top:10px;">
                                       <div
                                         style="color:#333333;direction:ltr;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:13px;font-weight:400;letter-spacing:0px;line-height:120%;text-align:left;mso-line-height-alt:16.8px;">
                                         <p style="margin: 0; margin-bottom: 12px;">If you
                                           experience difficulties accessing your account,
                                           you can contact to admin.</p>
                                         <p style="margin: 0;">Link : <u><span
                                               style="color: #007bff;"><a
                                                 href="https://helpdesk@testaonline.com"
                                                 target="_blank"
                                                 style="text-decoration: underline; color: #007bff;"
                                                 rel="noopener">https://helpdesk@testaonline.com</a></span></u>
                                         </p>
                                       </div>
                                     </td>
                                   </tr>
                                 </table>
                                 <table class="paragraph_block block-8" width="100%" border="0"
                                   cellpadding="0" cellspacing="0" role="presentation"
                                   style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                   <tr>
                                     <td class="pad"
                                       style="padding-bottom:10px;padding-left:15px;padding-right:15px;padding-top:10px;">
                                       <div
                                         style="color:#333333;direction:ltr;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:13px;font-weight:400;letter-spacing:0px;line-height:150%;text-align:left;mso-line-height-alt:21px;">
                                         <p style="margin: 0;">Thank you,<br>Testa Team</p>
                                       </div>
                                     </td>
                                   </tr>
                                 </table>
                                 <table class="divider_block block-9" width="100%" border="0"
                                   cellpadding="0" cellspacing="0" role="presentation"
                                   style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                   <tr>
                                     <td class="pad" style="padding-top:30px;">
                                       <div class="alignment" align="center">
                                         <table border="0" cellpadding="0" cellspacing="0"
                                           role="presentation" width="100%"
                                           style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                           <tr>
                                             <td class="divider_inner"
                                               style="font-size: 1px; line-height: 1px; border-top: 0px solid #BBBBBB;">
                                               <span>&#8202;</span>
                                             </td>
                                           </tr>
                                         </table>
                                       </div>
                                     </td>
                                   </tr>
                                 </table>
                               </td>
                             </tr>
                           </tbody>
                         </table>
                       </td>
                     </tr>
                   </tbody>
                 </table>
                 <table class="row row-3" align="center" width="100%" border="0" cellpadding="0" cellspacing="0"
                   role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                   <tbody>
                     <tr>
                       <td>
                         <table class="row-content stack" align="center" border="0" cellpadding="0"
                           cellspacing="0" role="presentation"
                           style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 640px; margin: 0 auto;"
                           width="640">
                           <tbody>
                             <tr>
                               <td class="column column-1" width="100%"
                                 style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                                 <table class="paragraph_block block-1" width="100%" border="0"
                                   cellpadding="0" cellspacing="0" role="presentation"
                                   style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                                   <tr>
                                     <td class="pad"
                                       style="padding-bottom:30px;padding-left:40px;padding-right:40px;padding-top:20px;">
                                       <div
                                         style="color:#555555;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:11px;font-weight:400;line-height:180%;text-align:center;mso-line-height-alt:19.8px;">
                                         <p style="margin: 0; word-break: break-word;">
                                           Radiant Infonet, 901 Bhikaji Cama Place, Delhi
                                           110066
                                         </p>
                                         <p style="margin: 0; word-break: break-word;">
                                           Powered by testaonline.com</p>
                                       </div>
                                     </td>
                                   </tr>
                                 </table>
                               </td>
                             </tr>
                           </tbody>
                         </table>
                       </td>
                     </tr>
                   </tbody>
                 </table>
               </td>
             </tr>
           </tbody>
         </table><!-- End -->
       </body>
       
       </html>`,

      //---->end<------
    };

    //Using MSZ91 SMTP
    const transporter = nodemailer.createTransport({
      host: MSZ91_HOST,
      port: MSZ91_PORT,
      secure: false,
      auth: {
        user: MSZ91_USER,
        pass: MSZ91_PASS,
      },
    });

    const result = transporter.sendMail(mailOptions);
    if (result) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.log("error->>", error.message);
  }
};

function validateBulkAssesor(data) {
  try {
    const schema = Joi.object({
      fullName: Joi.string().min(2).max(50).trim().required(),
      email: Joi.string().min(5).trim().max(255).email().required(),
      ToaType: Joi.string().required(),
      RadiantFundToa: Joi.boolean(),
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
      modeofAgreement: Joi.string().required(),
    });

    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
}

module.exports.updateAssessorCommunicationStatus = async (req, res) => {
  try {
    console.log("updateA");
    const { assessorId } = req.params;
    const { isCommunicatedWithAssessor } = req.body;

    const assessor = await Assesor.findById(assessorId);
    if (!assessor) {
      return errorResponse(
        res,
        404,
        "Assessor not found",
        "Assessor not found"
      );
    }

    // Get the plain password from the database
    const plainPassword = assessor.password;

    // Hash the plain password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(plainPassword, salt);

    // Update the assessor's communication status and hashed password
    assessor.isCommunicatedWithAssessor = isCommunicatedWithAssessor;
    assessor.password = hashedPassword;

    // Save the updated assessor back to the database
    await assessor.save();

    return sendResponse(
      res,
      200,
      "Assessor communication status and password updated successfully",
      assessor
    );
  } catch (error) {
    return errorResponse(res, 500, "Something went wrong", error.message);
  }
};

exports.getAssesorPassword = async (req, res) => {
  try {
    let { assessorId } = req.params;

    const assessorDetail = await Assesor.findById(assessorId).select(
      "password isCommunicatedWithAssessor"
    );

    if (assessorDetail.isCommunicatedWithAssessor)
      return errorResponse(
        res,
        400,
        responseMessage.already_password_provided,
        responseMessage.errorMessage
      );

    if (!assessorDetail) {
      return errorResponse(
        res,
        400,
        responseMessage.assessor_not_found,
        responseMessage.errorMessage
      );
    }

    // If no files are uploaded or dataWithUrls is empty, return assessorDetail
    return sendResponse(
      res,
      200,
      responseMessage.asssessor_password_fetched_successfully,
      assessorDetail
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

// Admin function to unlock OTP lockout for a user
exports.unlockOtpLockout = async (req, res) => {
  try {
    const { assessorId } = req.params;

    if (!assessorId) {
      return errorResponse(
        res,
        400,
        "Assessor ID is required",
        "Please provide a valid assessor ID"
      );
    }

    const assessor = await Assesor.findById(assessorId);

    if (!assessor) {
      return errorResponse(
        res,
        404,
        "Assessor not found",
        "No assessor found with the provided ID"
      );
    }

    const unlockedAssessor = await manualUnlockOtp(assessor);

    // Save the unlocked assessor to database
    await Assesor.findByIdAndUpdate(assessorId, {
      failedOtpAttempts: 0,
      lastFailedOtp: null,
      isOtpLocked: false,
      otpLockoutExpiry: null,
    });

    return sendResponse(
      res,
      200,
      "OTP lockout has been successfully removed for the assessor",
      {
        assessorId: unlockedAssessor._id,
        mobile: unlockedAssessor.mobile,
        isOtpLocked: unlockedAssessor.isOtpLocked,
        failedOtpAttempts: unlockedAssessor.failedOtpAttempts,
      }
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

// Function to get OTP security status for an assessor
exports.getOtpSecurityStatus = async (req, res) => {
  try {
    const { assessorId } = req.params;

    if (!assessorId) {
      return errorResponse(
        res,
        400,
        "Assessor ID is required",
        "Please provide a valid assessor ID"
      );
    }

    const assessor = await Assesor.findById(assessorId);

    if (!assessor) {
      return errorResponse(
        res,
        404,
        "Assessor not found",
        "No assessor found with the provided ID"
      );
    }

    const otpStatus = getOtpLockoutStatus(assessor);

    return sendResponse(
      res,
      200,
      "OTP security status retrieved successfully",
      {
        assessorId: assessor._id,
        mobile: assessor.mobile,
        ...otpStatus,
      }
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

// Unlock assessor account functionality for admin
exports.unlockAssessorAdminAccount = async (req, res) => {
  try {
    const assessorId = req.params.id;

    if (!assessorId) {
      return errorResponse(
        res,
        400,
        "Assessor ID is required",
        responseMessage.errorMessage
      );
    }

    const assessor = await Assesor.findById(assessorId);
    if (!assessor) {
      return errorResponse(
        res,
        404,
        responseMessage.assessor_profile_not_found,
        responseMessage.errorMessage
      );
    }

    // Check if account is actually locked
    if (!assessor.isAccountLocked) {
      return errorResponse(
        res,
        400,
        "Account is not locked",
        responseMessage.errorMessage
      );
    }

    // Unlock the account
    const updatedAssessor = await Assesor.findByIdAndUpdate(
      assessorId,
      {
        $set: {
          isAccountLocked: false,
          failedLoginAttempts: 0,
          lockoutExpiry: null,
          lastFailedLogin: null,
        },
      },
      { new: true }
    );

    if (!updatedAssessor) {
      return errorResponse(
        res,
        500,
        "Failed to unlock account",
        responseMessage.errorMessage
      );
    }

    return sendResponse(res, 200, "Account unlocked successfully", {
      assessorId: updatedAssessor._id,
      email: updatedAssessor.email,
      isAccountLocked: updatedAssessor.isAccountLocked,
      failedLoginAttempts: updatedAssessor.failedLoginAttempts,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

// Download CV by Assessor ID
exports.downloadAssessorCV = async (req, res) => {
  try {
    const assessorId = req.params.assessorId;

    if (!assessorId) {
      return errorResponse(
        res,
        400,
        "Assessor ID is required",
        "Please provide a valid assessor ID"
      );
    }

    // Validate if assessor exists
    const assessor = await Assesor.findOne({ assessorId: assessorId });
    if (!assessor) {
      return errorResponse(
        res,
        404,
        "Assessor not found",
        "No assessor found with the provided ID"
      );
    }

    // Generate PDF
    const cvGenerator = new CVPdfGenerator();
    const pdfBuffer = await cvGenerator.generateCVPdf(assessorId);

    // Set response headers for PDF download
    const fileName = `${(assessor.fullName || "Assessor").replace(
      /\s+/g,
      "_"
    )}_CV.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);
  } catch (error) {
    console.error("Error generating CV PDF:", error);
    return errorResponse(res, 500, "Failed to generate CV", error.message);
  }
};

// Master Export CVs as ZIP
exports.masterExportCVs = async (req, res) => {
  try {
    const {
      verified = false,
      pending = false,
      schemeType,
      agreementSigned,
      state,
      modeofAgreement,
      from,
      to,
    } = req.query;

    const options = ["assessorId", "fullName", "email", "assessorSipId"];
    let filter = getFilter(req, options, false);
    const { page, limit, skip, sortOrder } = Paginate(req);

    if (page < 1 || limit < 1 || limit > 100) {
      return errorResponse(
        res,
        400,
        "Invalid pagination parameters",
        "Page must be >= 1 and limit must be between 1 and 100"
      );
    }

    const pmvishwakarmaId = process.env.PM_VISHWAKARMA;
    const pmVishwakarmaId = pmvishwakarmaId;
    const pmkvyId = "65aa7bf1b19149328d4ec965";
    const nonPmKvyId = "65aa7ca8b19149328d4ecc61";
    const currentDate = new Date();

    let query = filter ? filter.query : {};
    query.isDeletd = false;
    // `modeOfAgreement` filter if provided
    if (modeofAgreement) {
      query.modeofAgreement = modeofAgreement.trim();
    }

    // `state` filter if provided
    if (state) {
      query.state = state.trim();
    }

    // Handle agreement filtering logic
    if (agreementSigned) {
      const agreements = await Assesor.find({isDeleted: false}).select("agreement");
      const processedAgreements = agreements?.flatMap((doc) =>
        doc.agreement.map((item) => ({
          ...item,
          agreementValidTo: moment(
            item.agreementValidTo,
            "MM-DD-YYYY"
          ).toDate(),
          parentId: doc._id,
        }))
      );

      let filteredAgreements;
      let filteredIds = [];

      if (agreementSigned === "Yes") {
        filteredAgreements = processedAgreements?.filter(
          (item) => item.agreementValidTo >= currentDate
        );
        filteredIds = filteredAgreements?.map((item) => item.parentId) || [];
      } else if (agreementSigned === "No") {
        filteredAgreements = processedAgreements.filter(
          (item) => item?.agreementValidTo < currentDate
        );
        const emptyAgreementDocs = await Assesor.find({
          agreement: { $exists: true, $size: 0 },
        }).select("_id");
        const emptyAgreementIds = emptyAgreementDocs.map((doc) => doc._id);
        filteredIds = [
          ...filteredAgreements?.map((item) => item.parentId),
          ...emptyAgreementIds,
        ];
      }

      if (Array.isArray(filteredIds) && filteredIds.length > 0) {
        query["_id"] = { $in: filteredIds };
      }
    }

    // Handle date range filtering
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      query.createdAt = {
        $gte: fromDate,
        $lte: toDate,
      };
    }

    // Handle scheme type filtering
    if (schemeType) {
      if (schemeType === "PMVishwakarma") {
        query["scheme"] = mongoose.Types.ObjectId(pmVishwakarmaId);
      } else if (schemeType === "Both") {
        query["$and"] = [
          {
            scheme: {
              $in: [
                mongoose.Types.ObjectId(pmkvyId),
                mongoose.Types.ObjectId(nonPmKvyId),
              ],
            },
          },
          {
            scheme: mongoose.Types.ObjectId(pmVishwakarmaId),
          },
        ];
      } else if (schemeType === "General") {
        query["$and"] = [
          {
            scheme: {
              $in: [
                mongoose.Types.ObjectId(pmkvyId),
                mongoose.Types.ObjectId(nonPmKvyId),
              ],
            },
          },
          {
            scheme: {
              $nin: [mongoose.Types.ObjectId(pmVishwakarmaId)],
            },
          },
        ];
      }
    }

    console.log("Master CV Export query:", query);

    // Fetch assessors
    const assessorData = await Assesor.find(query)
      .populate("scheme")
      .sort(sortOrder);

    // Post-process for PM Vishwakarma if needed
    if (schemeType === "PMVishwakarma") {
      assessorData.forEach((assessor) => {
        assessor.scheme = assessor.scheme.filter(
          (scheme) => String(scheme._id) === pmVishwakarmaId
        );
      });
    }

    if (assessorData.length < 1) {
      return errorResponse(
        res,
        404,
        "No assessors found",
        "No assessors found matching the specified criteria"
      );
    }

    let filteredData = assessorData;

    // verification filtering
    if (verified === "true") {
      filteredData = assessorData.filter((assessor) => {
        const hasSpecificScheme = assessor.scheme
          ?.map((item) => item?._id?.toString())
          .includes(process.env.PM_VISHWAKARMA);

        if (hasSpecificScheme) {
          return true;
        }

        const allAccepted =
          assessor.education.some((edu) => edu.status === "accepted") &&
          assessor.jobRole.some((role) => role.status === "accepted") &&
          assessor.personalDetail.some(
            (detail) => detail.status === "accepted"
          ) &&
          assessor.agreement.some(
            (agreement) => agreement.status === "accepted"
          );

        const personalDetailAcceptedCount =
          assessor.personalDetail.filter(
            (detail) => detail.status === "accepted"
          ).length >= 2;

        return (
          assessor.education.length &&
          assessor.jobRole.length &&
          assessor.agreement.length &&
          allAccepted &&
          personalDetailAcceptedCount
        );
      });
    } else if (pending === "true") {
      filteredData = assessorData.filter((assessor) => {
        const hasSpecificScheme = assessor.scheme
          ?.map((item) => item?._id?.toString())
          .includes(process.env.PM_VISHWAKARMA);
        if (hasSpecificScheme) {
          return false;
        }
        const isEmptyArray =
          assessor.experiences.length < 1 ||
          assessor.education.length < 1 ||
          assessor.jobRole.length < 1 ||
          assessor.personalDetail.length < 1 ||
          assessor.agreement.length < 1;

        const hasRejectedOrNoAction =
          assessor.experiences.some(
            (exp) =>
              !exp.status ||
              exp.status === "rejected" ||
              exp.status === "noAction"
          ) ||
          assessor.education.some(
            (edu) =>
              !edu.status ||
              edu.status === "rejected" ||
              edu.status === "noAction"
          ) ||
          assessor.jobRole.some(
            (role) =>
              !role.status ||
              role.status === "rejected" ||
              role.status === "noAction"
          ) ||
          assessor.personalDetail.some(
            (detail) =>
              !detail.status ||
              detail.status === "rejected" ||
              detail.status === "noAction"
          ) ||
          assessor.agreement.some(
            (agree) =>
              !agree.status ||
              agree.status === "rejected" ||
              agree.status === "noAction"
          );

        return hasRejectedOrNoAction || isEmptyArray;
      });
    }

    const totalCounts = filteredData.length;
    const paginatedData = filteredData.slice(skip, skip + limit);

    console.log(
      `Starting master CV export: page=${page}, limit=${limit}, total=${totalCounts}, processing=${paginatedData.length}`
    );

    // Generate CVs using the CVPdfGenerator
    const cvGenerator = new CVPdfGenerator();
    const result = await cvGenerator.masterExportCVs(paginatedData);

    // Set response headers for ZIP download
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const fileName = `assessor_cvs_page_${page}_${timestamp}.zip`;

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    res.setHeader("Content-Length", result.zipBuffer.length);

    // Send ZIP buffer
    res.send(result.zipBuffer);
  } catch (error) {
    console.error("Error in master CV export:", error);
    return errorResponse(res, 500, "Failed to export CVs", error.message);
  }
};
