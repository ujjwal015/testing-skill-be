const { Paginate } = require("../utils/paginate");
const responseMessage = require("../utils/responseMessage");
const AnswerModel = require("../models/answerModel");
const AnswerModelOfflineTheory= require("../models/answerModelTheoryOffline")
const AssessmentModel = require("../models/createAssesment-model")
const Batch = require("../models/batch-model");
const createAssesmentModel = require("../models/createAssesment-model");
const Joi = require("@hapi/joi");
const validator = require("../utils/validator");
const fs = require("fs/promises");
const { sendResponse, errorResponse } = require("../utils/response");
const { batchFilter,assignBatchatchFilter } = require("../utils/custom-validators");
const { candidate_Appeared_In_Batch,getCandidateCountsByBatchIds } = require("../utils/dbQuery");
const { find } = require("lodash");
const reader = require("xlsx");
const bcrypt = require("bcryptjs");
const {
  mobileValidateRegEx,
  aadharValidateRegEx,
  getFilter,
  validatePassword,
} = require("../utils/custom-validators");

const Candidate = require("../models/candidate-model");
const OnlineResultModel = require("../models/onlineResult-model");
const OfflineResultModel = require("../models/offlineResult-model");
const CandidateReportModel = require("../models/candidateReport");
const SuspiciousActivity = require("../models/suspicious-activity-capturing-model");
const PracticalFilesModel = require("../models/practical-file-model");

const moment = require("moment");
const mongoose = require("mongoose");
const { deleteFileFromS3 } = require("../utils/s3bucketSuspicious");

const { generateUrlEncodingToken } = require("../utils/projectHelper");
const { CLIENT_URL } = require("../config/keys");


const { BATCH_LIST_ASSIGN_CANDIDATE } = require("../constants/redis");
const RedisService = require("../utils/redisService");
const redisDB0 = new RedisService("db0");
const { generateCandidateListPDF } = require("../utils/attendancePdfGenerator");

//ssss
module.exports.refreshWrongLoginAttempt = async (req, res) => {
  try {
    const candidateId = req.params.id;
    let CandidateDetails = await Candidate.findById(candidateId).populate(
      "batchId"
    );
    if (CandidateDetails) {
      CandidateDetails.wrongLogin = 0;
      await CandidateDetails.save();
    }

    return sendResponse(
      res,
      200,
      "candidate wrong login refresh successfully",
      "candidate wrong login refresh successfully"
    );
  } catch (err) {
    console.log("error", err);
    return errorResponse(res, 500, responseMessage.errorMessage, err);
  }
};
module.exports.changeCandidateStatus = async (req, res) => {
  try {
    const Id = req.params.id;

    const CandidateDetails = await Candidate.findById(Id);

    if (!CandidateDetails)
      return errorResponse(
        res,
        400,
        responseMessage.batch_not_found,
        responseMessage.errorMessage
      );

    if (CandidateDetails["status"] === req.body.status)
      return errorResponse(
        res,
        400,
        "request status are same as already existing status",
        responseMessage.errorMessage
      );

    CandidateDetails["status"] = req.body.status;

    const changedStatus = await CandidateDetails.save();

    if (!changedStatus)
      return errorResponse(
        res,
        400,
        "Status not able to change",
        responseMessage.errorMessage
      );

    await Candidate.findOneAndUpdate(
      { _id: Id },
      { $set: { suspiciousActivity: 0 } }
    );

    return sendResponse(
      res,
      200,
      "candidate status changed successfully",
      changedStatus
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.changeCandidateFaceRecognitionStatus = async (req, res) => {
  try {
    const Id = req.params.candidateId;

    const CandidateDetails = await Candidate.findById(Id);

    if (!CandidateDetails)
      return errorResponse(
        res,
        400,
        responseMessage.batch_not_found,
        responseMessage.errorMessage
      );

    CandidateDetails.faceRecognition.adminApproved =
      req.body.faceRecognitionStatus;

    CandidateDetails.faceRecognition.approvedBy = req.user._id;

    const changedStatus = await CandidateDetails.save();

    if (!changedStatus)
      return errorResponse(
        res,
        400,
        "Status not able to change",
        responseMessage.errorMessage
      );

    await Candidate.findOneAndUpdate(
      { _id: Id },
      { $set: { suspiciousActivity: 0 } }
    );

    return sendResponse(
      res,
      200,
      "candidate face recognition disabled successfully",
      changedStatus
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.changeCandidateMultipleStatus = async (req, res) => {
  try {
    const Id = req.params.id;

    const { candidateIds, status } = req.body;

    const CandidateDetails = await Candidate.find({
      _id: { $in: candidateIds },
    });

    if (!CandidateDetails?.length === 0)
      return errorResponse(
        res,
        400,
        "Candidate not found",
        "Candidate not found"
      );

    const allCandidateStatus = CandidateDetails?.every(
      (item) => item?.status === req.body.status
    );

    if (allCandidateStatus)
      return errorResponse(
        res,
        400,
        "request status are same as already existing status",
        responseMessage.errorMessage
      );

    const updatedCandidateStatus = await Candidate.updateMany(
      { _id: { $in: candidateIds }, status: { $ne: req.body.status } },
      { $set: { status: req.body.status, suspiciousActivity: 0 } }
    );

    if (!updatedCandidateStatus) {
      return errorResponse(
        res,
        500,
        "Unable to change status",
        "Unable to change status"
      );
    }
    return sendResponse(
      res,
      200,
      "candidate's status changed successfully",
      "candidate's status changed successfully"
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

function validateUpdateCandidate(data) {
  try {
    const schema = Joi.object({
      name: Joi.string().min(3).max(255).required(),
      email: Joi.string().min(5).trim().max(255).email().required(),
      mobile: Joi.string()
        .min(10)
        .max(10)
        .pattern(new RegExp(mobileValidateRegEx))
        .required(),
      aadharNumber: Joi.string()
        .min(12)
        .max(12)
        .pattern(new RegExp(aadharValidateRegEx))
        .allow(""),
    });

    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
}

module.exports.updateCandidate = async (req, res) => {
  try {
    const {
      name,
      email,
      mobile,
      aadharNumber,
      logInSendViaEmail = false,
    } = req.body;
    const data = { name, email, mobile, aadharNumber };
    const { error } = validateUpdateCandidate(data);
    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );

    const ExistCandidate = await Candidate.findOne({ _id: req.params.id });

    if (!ExistCandidate)
      return errorResponse(
        res,
        400,
        "No candidate exist",
        "No candidate exist"
      );

    ExistCandidate.name = name;
    ExistCandidate.email = email;
    ExistCandidate.mobile = mobile;
    ExistCandidate.aadharNumber = aadharNumber;
    ExistCandidate.logInSendViaEmail = logInSendViaEmail;

    const saveCandidate = await ExistCandidate.save();

    if (saveCandidate)
      sendResponse(
        res,
        200,
        responseMessage.candidate_create,
        `${saveCandidate.userName}'s candidate details updated successfully`
      );
    else {
      return errorResponse(
        res,
        400,
        responseMessage.candidate_not_create,
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

function convertMinutesToMilliseconds(minutesString) {
  const minutes = parseInt(minutesString);

  if (isNaN(minutes)) {
    throw new Error("Invalid numeric value in minutes string");
  }

  const milliseconds = minutes * 60 * 1000;
  return milliseconds;
}

module.exports.increaseExamTime = async (req, res) => {
  try {
    const { examTime, reasonToIncreaseExamTime } = req.body;

    const ExistCandidate = await Candidate.findOne({ _id: req.params.id });
    if (!ExistCandidate) {
      return errorResponse(
        res,
        400,
        "No candidate exist",
        "No candidate exist"
      );
    }

    const regex = /^\d{1,3}$/;
    let examDurationError = false;

    if (regex.test(examTime)) {
      examDurationError = false;
    } else {
      examDurationError = true;
    }

    if (examDurationError) {
      return errorResponse(
        res,
        400,
        "exam duration given in question paper should be a number of minimum of 2 and maximum 3 digit",
        "exam duration given in question paper should be a number of minimum of 2 and maximum 3 digit"
      );
    }

    ExistCandidate.examTime = examTime;
    ExistCandidate.reasonToIncreaseExamTime = reasonToIncreaseExamTime;

    const saveCandidate = await ExistCandidate.save();

    const candidate = await AnswerModel.findOne({ candidateId: req.params.id });

    if (!candidate)
      return errorResponse(
        res,
        400,
        "Time can't be increased as exam not started",
        "Time can't be increased as exam not started"
      );

    if (candidate.isAssessmentSubmited) {
      return errorResponse(
        res,
        400,
        "Exam time can't be increased as test submited",
        "Exam time can't be increased as test submited"
      );
    }
    console.log("examTime-->", examTime);
    const miliseconds = convertMinutesToMilliseconds(examTime);
    console.log("miliseconds-->", miliseconds);
    candidate.remainingMiliseconds = (
      parseInt(candidate.remainingMiliseconds, 10) + parseInt(miliseconds, 10)
    ).toString();
    console.log("remainingMiliseconds--->", candidate.remainingMiliseconds);
    const updatedCandidate = await candidate.save();

    if (saveCandidate && updatedCandidate) {
      sendResponse(
        res,
        200,
        "Exam Time Update Successfully",
        `exam time has been updated successfully for ${saveCandidate.email}`
      );
    } else {
      return errorResponse(
        res,
        400,
        "Exam Time not updated",
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

function validateCandidateSsc(data) {
  try {
    const schema = Joi.object({
      candidateId: Joi.alternatives()
        .try(
          Joi.string().trim().required().messages({
            "string.base": "Candidate Id should be alphanumeric",
            "string.empty": "Candidate Id should not be empty",
            "string.min": "Candidate Id should be a minimum of 3 characters",
            "any.required": "Candidate Id is a required field",
          }),
          Joi.number().required().messages({
            "number.base": "Candidate Id should be a number",
            "any.required": "Candidate Id is a required field",
          }),
        )
        .messages({
          "alternatives.match":
            "Candidate Id should be either a string or a number",
        }),
      name: Joi.string().trim().min(2).max(255).required().messages({
        "string.base": "Name should be a string",
        "string.empty": "Name should not be empty",
        "string.min": "Name should be a min 3 words",
        "any.required": "Name is required field",
      }),
      eligibility: Joi.string()
      .valid("yes", "no")
      .required()
      .messages({
        "any.only": "Eligibility must be Yes or No",
        "string.empty": "Eligibility is required",
      }),
    });

    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
}

function validateCandidate(data) {
  try {
    const schema = Joi.object({
      candidateId: Joi.string().trim().required().messages({
        "string.base": "Candidate Id should be a alpha-Numeric",
        "string.empty": "Candidate Id should not be empty",
        "string.min": "Candidate Id should be a min 3 words",
        "any.required": "Candidate Id is required field",
      }),
      name: Joi.string().trim().min(3).max(255).required().messages({
        "string.base": "Name should be a string",
        "string.empty": "Name should not be empty",
        "string.min": "Name should be a min 3 words",
        "any.required": "Name is required field",
      }),

      email: Joi.string().min(5).trim().max(255).email().required(),
      eligibility: Joi.string()
      .valid("yes", "no")
      .required()
      .messages({
        "any.only": "Eligibility must be Yes or No",
        "string.empty": "Eligibility is required",
      }),
      mobile: Joi.string()
        .trim()
        .min(10)
        .max(10)
        .pattern(new RegExp(mobileValidateRegEx))
        .required(),
    });

    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
}

// exports.bulkUploadCandidate = async (req, res, next) => {
//   try {
//     if (!req.file) return errorResponse(res, 400, "No excel file provided");
//     if (!req.params.type)
//       return errorResponse(
//         res,
//         400,
//         "Client type missing",
//         "Client type missing"
//       );

//     const workbook = reader.readFile(req.file.path);
//     const sheet_name_list = workbook.SheetNames;
//     const xlData = reader.utils.sheet_to_json(
//       workbook.Sheets[sheet_name_list[0]]
//     );

//     const batch = await Batch.findById(req?.params?.id);
//     if (!batch)
//       return errorResponse(res, 400, "No batch Found", "No batch Found");
    
//     const currentCandidatesCount = await Candidate.countDocuments({batchId: req?.params?.id});

//     if (currentCandidatesCount >= batch.batchSize) {
//         return errorResponse(
//           res,
//           400,
//           `Batch is already full. Current candidates: ${currentCandidatesCount}, Batch size: ${batch.batchSize}`,
//           `Batch is already full. Current candidates: ${currentCandidatesCount}, Batch size: ${batch.batchSize}`
//         );
//     }
//     const remainingSlots = batch.batchSize - currentCandidatesCount;
//     if (xlData.length > remainingSlots)
//       return errorResponse(
//         res,
//         400,
//         `Cannot add ${xlData.length} candidates. Only ${remainingSlots} slots remaining in batch (Current: ${currentCandidatesCount}/${batch.batchSize})`,
//         `Cannot add ${xlData.length} candidates. Only ${remainingSlots} slots remaining in batch (Current: ${currentCandidatesCount}/${batch.batchSize})`
//       );

//     // const batchEndDate = new Date(batch.endDate);
//     // const todayDate = new Date();

//     // todayDate.setUTCHours(0, 0, 0, 0); // Set time to midnight in UTC
//     // todayDate.setHours(todayDate.getHours() + 5, 30);
//     // todayDate.setHours(23, 59, 59, 999)

//     // console.log('todayDate-->', todayDate)

//     const endDate = batch.endDate;
//     const momentEndDate = moment(endDate, "DD/MM/YYYY").endOf("day");

//     const currentDate = moment();
//     const newMoment = currentDate.subtract(5, "minutes");

//     const isDateInRange = currentDate.isBetween(
//       newMoment,
//       momentEndDate,
//       null,
//       "[]"
//     );

//     // if(!isDateInRange)
//     // return errorResponse(res, 400, "candidate can't be assigned to the batch after batch end date",
//     // "candidate can't be assigned to the batch after batch end date")

//     // if(todayDate > batchEndDate)
//     //   return errorResponse(res, 400, "candidate can't be assigned to the batch after batch end date",
//     //   "candidate can't be assigned to the batch after batch end date")

//     if (xlData.length < 1) {
//       await fs.unlink(req.file.path);
//       return errorResponse(
//         res,
//         400,
//         responseMessage.can_not_insert_empty_file,
//         {
//           error: responseMessage.can_not_insert_empty_file,
//         }
//       );
//     }

//     let errors;
//     const records = [];
//     const existingEmail = [];

//     if (req.params.type === "ssc") {
//       // checking duplicate value in excel
//       for (let i = 0; i < xlData.length; i++) {
//         for (let j = i + 1; j < xlData.length; j++) {
//           // if (xlData[i].Mobile === xlData[j].Mobile) {
//           //   errors = {
//           //     _original: { Email: xlData[i].Email },
//           //     message: "Duplicate Mobile in excel",
//           //   };
//           //   break;
//           // }
//           if (xlData[i].CandidateId === xlData[j].CandidateId) {
//             errors = {
//               _original: { candidateId: xlData[i].CandidateId },
//               message: "Duplicate candidateId in excel",
//             };
//             break;
//           }
//         }
//       }

//       let lastSixCharacters = req?.params?.id.slice(-6);
//       // checking validation for each row of excel
//       for (const row of xlData) {
//         let name = row.Name.toString();
//         let candidateId = row.CandidateId;

//         const validatePayload = {
//           name,
//           candidateId,
//         };

//         const { value, error } = validateCandidateSsc(validatePayload);

//         if (error) {
//           errors = error;
//           break;
//         } else {
//           const generatedPassword = generatePassword();
//           const salt = await bcrypt.genSalt(8);

//           const hashPassword = await bcrypt.hash(generatedPassword, salt);
//           records.push({
//             ...value,
//             candidateType: "ssc",
//             batchId: req?.params?.id,
//             // userName: generateCandidateIdSsc(name, candidateId, lastSixCharacters),
//             userName: await generateUserName(),
//             password: hashPassword,
//             rawPassword: generatedPassword,
//           });
//         }
//       }

//       if (errors) {
//         await fs.unlink(req?.file?.path);
//         return errorResponse(res, 400, responseMessage.something_wrong, {
//           user: errors._original.candidateId,
//           error: errors.message,
//         });
//       }

//       // checking duplicate value in the database
//       const existingEmailPromises = xlData.map(async (row) => {
//         const existingCandidate = await Candidate.findOne({
//           $and: [
//             { batchId: req?.params?.id },
//             {
//               $or: [
//                 // { mobile: row.Mobile },
//                 { candidateId: row.CandidateId },
//               ],
//             },
//           ],
//         });
//         return existingCandidate;
//       });

//       const existingEmailResult = await Promise.all(existingEmailPromises);

//       existingEmailResult.forEach((value) => {
//         if (value) {
//           errors = {
//             _original: { candidateId: value.candidateId },
//             message: "Duplicate candidateId in database",
//           };
//         }
//       });

//       if (errors) {
//         await fs.unlink(req?.file?.path);
//         return errorResponse(res, 400, responseMessage.something_wrong, {
//           user: errors._original.candidateId,
//           error: errors.message,
//         });
//       }

//       const result = await Candidate.insertMany(records);

//       if (result.length > 0) {
//         const updatedBatchCandidateAssignedField = await Batch.findOneAndUpdate(
//           { _id: req?.params?.id },
//           { $set: { candidateAssigned: true } },
//           { new: true }
//         );

//         await fs.unlink(req?.file?.path);
//         await redisDB0.destroyMatching(BATCH_LIST_ASSIGN_CANDIDATE);
//         return sendResponse(
//           res,
//           200,
//           "Candidates added successfully",
//           `${result.length} candidate(s) added successfully`
//         );
//       } else {
//         await fs.unlink(req?.file?.path);
//         return errorResponse(
//           res,
//           400,
//           responseMessage.something_wrong,
//           "Not able to assign candidate"
//         );
//       }
//     } else {
//       // checking duplicate value in excel
//       for (let i = 0; i < xlData.length; i++) {
//         for (let j = i + 1; j < xlData.length; j++) {
//           if (xlData[i].Mobile === xlData[j].Mobile) {
//             errors = {
//               _original: { Email: xlData[i].Email },
//               message: "Duplicate Mobile in excel",
//             };
//             break;
//           }
//         }
//       }

//       let lastSixCharacters = req?.params?.id.slice(-6);
//       // checking validation for each row of excel
//       for (const row of xlData) {
//         let email = row.Email;
//         let name = row.Name?.toString();
//         let mobile = row.Mobile && row.Mobile?.toString();
//         let candidateId = generateCandidateId(name, mobile, lastSixCharacters);
//         row["candidateId"] = candidateId;
//         const validatePayload = {
//           name,
//           email,
//           mobile,
//           candidateId,
//         };

//         const { value, error } = validateCandidate(validatePayload);

//         if (error) {
//           errors = error;
//           break;
//         } else {
//           const generatedPassword = generatePassword();
//           const salt = await bcrypt.genSalt(8);
//           const hashPassword = await bcrypt.hash(generatedPassword, salt);
//           records.push({
//             ...value,
//             batchId: req?.params?.id,
//             candidateType: "private",
//             // userName: generateUserName(row.Email),
//             // userName: generateUserNamePrivate(name, mobile, batch._id.toString()),
//             userName: await generateUserName(),
//             password: hashPassword,
//             rawPassword: generatedPassword,
//           });
//         }
//       }

//       if (errors) {
//         await fs.unlink(req?.file?.path);
//         return errorResponse(res, 400, responseMessage.something_wrong, {
//           user: errors._original.mobile,
//           error: errors.message,
//         });
//       }

//       // checking duplicate value in the database
//       const existingEmailPromises = xlData.map(async (row) => {
//         const existingCandidate = await Candidate.findOne({
//           $and: [
//             { batchId: req?.params?.id },
//             {
//               $or: [{ mobile: row.Mobile }, { candidateId: row.candidateId }],
//             },
//           ],
//         });
//         return existingCandidate;
//       });

//       const existingEmailResult = await Promise.all(existingEmailPromises);

//       existingEmailResult.forEach((value) => {
//         if (value) {
//           errors = {
//             _original: { email: value.mobile },
//             message: "Already a candidate existed with this mobile",
//           };
//         }
//       });

//       if (errors) {
//         await fs.unlink(req?.file?.path);
//         return errorResponse(res, 400, responseMessage.something_wrong, {
//           user: errors._original.mobile,
//           error: errors.message,
//         });
//       }

//       const result = await Candidate.insertMany(records);

//       if (result.length > 0) {
//         const updatedBatchCandidateAssignedField = await Batch.findOneAndUpdate(
//           { _id: req?.params?.id },
//           { $set: { candidateAssigned: true } },
//           { new: true }
//         );

//         await fs.unlink(req?.file?.path);
//         await redisDB0.destroyMatching(BATCH_LIST_ASSIGN_CANDIDATE);
//         return sendResponse(
//           res,
//           200,
//           "Candidates added successfully",
//           `${result.length} candidate(s) added successfully`
//         );
//       } else {
//         await fs.unlink(req?.file?.path);
//         return errorResponse(
//           res,
//           400,
//           responseMessage.something_wrong,
//           "Not able to assign candidate"
//         );
//       }
//     }
//   } catch (error) {
//     await fs.unlink(req?.file?.path);
//     return errorResponse(
//       res,
//       500,
//       responseMessage.something_wrong,
//       error.message
//     );
//   }
// };

//OMR code added in bulkUploadCandidate
exports.bulkUploadCandidate = async (req, res, next) => {
  try {
    if (!req.file) return errorResponse(res, 400, "No excel file provided");
    if(!req.params.type) return errorResponse(res, 400, "Client type missing", "Client type missing")

    const workbook = reader.readFile(req.file.path);
    const sheet_name_list = workbook.SheetNames;
    const xlData = reader.utils.sheet_to_json(
      workbook.Sheets[sheet_name_list[0]]
    );

    const batch = await Batch.findById(req?.params?.id)
    if(!batch) return errorResponse(res, 400, "No batch Found", "No batch Found")

    // if(xlData.length > batch.batchSize) 
    //   return errorResponse(res, 400, `Can not assign candidates more than ${batch.batchSize}`,
    //   `Can not assign candidates more than ${batch.batchSize}`)

    const currentCandidatesCount = await Candidate.countDocuments({batchId: req?.params?.id});

    if (currentCandidatesCount >= batch.batchSize) {
        return errorResponse(
          res,
          400,
          `Batch is already full. Current candidates: ${currentCandidatesCount}, Batch size: ${batch.batchSize}`,
          `Batch is already full. Current candidates: ${currentCandidatesCount}, Batch size: ${batch.batchSize}`
        );
    }
    const remainingSlots = batch.batchSize - currentCandidatesCount;
    if (xlData.length > remainingSlots)
      return errorResponse(
        res,
        400,
        `Cannot add ${xlData.length} candidates. Only ${remainingSlots} slots remaining in batch (Current: ${currentCandidatesCount}/${batch.batchSize})`,
        `Cannot add ${xlData.length} candidates. Only ${remainingSlots} slots remaining in batch (Current: ${currentCandidatesCount}/${batch.batchSize})`
      );

      // const batchEndDate = new Date(batch.endDate);
      // const todayDate = new Date();

      // todayDate.setUTCHours(0, 0, 0, 0); // Set time to midnight in UTC
      // todayDate.setHours(todayDate.getHours() + 5, 30);
      // todayDate.setHours(23, 59, 59, 999)

      // console.log('todayDate-->', todayDate)

      const endDate = batch.endDate
      const momentEndDate = moment(endDate, "DD/MM/YYYY").endOf('day')

      const currentDate = moment();
      const newMoment = currentDate.subtract(5, 'minutes');

       const isDateInRange = currentDate.isBetween(newMoment, momentEndDate, null, '[]');

      // if(!isDateInRange)
      // return errorResponse(res, 400, "candidate can't be assigned to the batch after batch end date",
      // "candidate can't be assigned to the batch after batch end date")

    // if(todayDate > batchEndDate)
    //   return errorResponse(res, 400, "candidate can't be assigned to the batch after batch end date",
    //   "candidate can't be assigned to the batch after batch end date")
     

    if (xlData.length < 1) {
      await fs.unlink(req.file.path);
      return errorResponse(
        res,
        400,
        responseMessage.can_not_insert_empty_file,
        {
          error: responseMessage.can_not_insert_empty_file,
        }
      );
    }

    let errors;
    const records = [];
    const existingEmail = [];

    if (req.params.type === "ssc") {
      // checking duplicate value in excel
      for (let i = 0; i < xlData.length; i++) {
        for (let j = i + 1; j < xlData.length; j++) {
          // if (xlData[i].Mobile === xlData[j].Mobile) {
          //   errors = {
          //     _original: { Email: xlData[i].Email },
          //     message: "Duplicate Mobile in excel",
          //   };
          //   break;
          // }
          if (xlData[i].CandidateId === xlData[j].CandidateId) {
            errors = {
              _original: { candidateId: xlData[i].CandidateId },
              message: "Duplicate candidateId in excel",
            };
            break;
          }
        }
      }

      let lastSixCharacters = req?.params?.id.slice(-6);
      // checking validation for each row of excel
      for (const row of xlData) {
        let name = row.Name.toString();
        let candidateId = row.CandidateId;
        let eligibility = row.Eligibility?.toString().trim().toLowerCase();  // yes/no

        const validatePayload = {
          name,
          candidateId,
          eligibility
        };

            const { value, error } = validateCandidateSsc(validatePayload);

            if (error) {
              errors = error;
              break;
            } else {
              const generatedPassword = await generatePassword(
                name,
                candidateId,
                "ssc"
              );
              const salt = await bcrypt.genSalt(8);

          const hashPassword = await bcrypt.hash(generatedPassword, salt);
          records.push({
            ...value,
            candidateType: "ssc",
            batchId: req?.params?.id,
            // userName: generateCandidateIdSsc(name, candidateId, lastSixCharacters),
            userName: await generateUserName(),
            password: hashPassword,
            rawPassword: generatedPassword,
            eligibility: value.eligibility, 
          });
        }
      }

          if (errors) {
            await fs.unlink(req?.file?.path);
            return errorResponse(res, 400, responseMessage.something_wrong, {
              user: errors._original.candidateId,
              error: errors.message,
            });
          }

          // checking duplicate value in the database
          const existingEmailPromises = xlData.map(async (row) => {
            const existingCandidate = await Candidate.findOne({
              $and: [
                { batchId: req?.params?.id },
                {
                  $or: [
                    // { mobile: row.Mobile },
                    { candidateId: row.CandidateId },
                  ],
                },
              ],
            });
            return existingCandidate;
          });

          const existingEmailResult = await Promise.all(existingEmailPromises);

          existingEmailResult.forEach((value) => {
            if (value) {
              errors = {
                _original: { candidateId: value.candidateId },
                message: "Duplicate candidateId in database",
              };
            }
          });

          if (errors) {
            await fs.unlink(req?.file?.path);
            return errorResponse(res, 400, responseMessage.something_wrong, {
              user: errors._original.candidateId,
              error: errors.message,
            });
          }

          await redisDB0.destroyMatching(BATCH_LIST_ASSIGN_CANDIDATE);
          const result = await Candidate.insertMany(records);

          if (result.length > 0) {

            if(batch.batchMode === "offline"){
              console.log("inside batchMode offline")
              await createOfflineAnswerEmptyEntry(result)
            }


            const updatedBatchCandidateAssignedField = await Batch.findOneAndUpdate(
              { _id: req?.params?.id },
              { $set: { candidateAssigned: true } },
              { new: true }
            );

            await fs.unlink(req?.file?.path);
            return sendResponse(
              res,
              200,
              "Candidates added successfully",
              `${result.length} candidate(s) added successfully`
            );
          } else {
            await fs.unlink(req?.file?.path);
            return errorResponse(
              res,
              400,
              responseMessage.something_wrong,
              "Not able to assign candidate"
            );
          }
    }
    else{ 
              // checking duplicate value in excel
          for (let i = 0; i < xlData.length; i++) {
            for (let j = i + 1; j < xlData.length; j++) {
              if (xlData[i].Mobile === xlData[j].Mobile) {
                errors = {
                  _original: { Email: xlData[i].Email },
                  message: "Duplicate Mobile in excel",
                };
                break;
              }
            }
          }

      let lastSixCharacters = req?.params?.id.slice(-6);
      // checking validation for each row of excel
      for (const row of xlData) {
        let email = row.Email;
        let name = row.Name?.toString();
        let mobile = row.Mobile && row.Mobile?.toString();
        let candidateId = generateCandidateId(name, mobile, lastSixCharacters);
        let eligibility = row.Eligibility?.toString().trim().toLowerCase();
        row["candidateId"] = candidateId;
        const validatePayload = {
          name,
          email,
          mobile,
          candidateId,
          eligibility
        };

            const { value, error } = validateCandidate(validatePayload);

        if (error) {
          errors = error;
          break;
        } else {
          const generatedPassword = generatePassword();
          const salt = await bcrypt.genSalt(8);
          const hashPassword = await bcrypt.hash(generatedPassword, salt);
          records.push({
            ...value,
            batchId: req?.params?.id,
            candidateType: "private",
            // userName: generateUserName(row.Email),
            // userName: generateUserNamePrivate(name, mobile, batch._id.toString()),
            userName: await generateUserName(),
            password: hashPassword,
            rawPassword: generatedPassword,
            eligibility: value.eligibility,
          });
        }
      }

          if (errors) {
            await fs.unlink(req?.file?.path);
            return errorResponse(res, 400, responseMessage.something_wrong, {
              user: errors._original.mobile,
              error: errors.message,
            });
          }

          // checking duplicate value in the database
          const existingEmailPromises = xlData.map(async (row) => {
            const existingCandidate = await Candidate.findOne({
              $and: [
                { batchId: req?.params?.id },
                {
                  $or: [
                    { mobile: row.Mobile },
                    { candidateId: row.candidateId },
                  ],
                },
              ],
            });
            return existingCandidate;
          });

          const existingEmailResult = await Promise.all(existingEmailPromises);

          existingEmailResult.forEach((value) => {
            if (value) {
              errors = {
                _original: { email: value.mobile },
                message: "Already a candidate existed with this mobile",
              };
            }
          });

          if (errors) {
            await fs.unlink(req?.file?.path);
            return errorResponse(res, 400, responseMessage.something_wrong, {
              user: errors._original.mobile,
              error: errors.message,
            });
          }

          await redisDB0.destroyMatching(BATCH_LIST_ASSIGN_CANDIDATE);
          const result = await Candidate.insertMany(records);

          if (result.length > 0) {

            if(batch.batchMode === "offline"){
              await createOfflineAnswerEmptyEntry(result)
            }

            const updatedBatchCandidateAssignedField = await Batch.findOneAndUpdate(
              { _id: req?.params?.id },
              { $set: { candidateAssigned: true } },
              { new: true }
            );

            await fs.unlink(req?.file?.path);
            return sendResponse(
              res,
              200,
              "Candidates added successfully",
              `${result.length} candidate(s) added successfully`
            );
          } else {
            await fs.unlink(req?.file?.path);
            return errorResponse(
              res,
              400,
              responseMessage.something_wrong,
              "Not able to assign candidate"
            );
          }
    }
   
  } 
  
    catch (error) {
    await fs.unlink(req?.file?.path);
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

const createOfflineAnswerEmptyEntry = async (candidateList) => {
  try {
    const assessment = await AssessmentModel.findOne({ batch_id: candidateList[0].batchId}).populate({
      path: 'set_id' , select: "", populate: { path: "question_id", select: ""}
    })
    if(!assessment)
      return { status: false, message: "No assessment found"}
    console.log('assessment-->', assessment)
    const assessmentData = JSON.parse(JSON.stringify(assessment))
    const questionList = JSON.parse(JSON.stringify(assessmentData.set_id[0].question_id)).map((item, index)=> ({ ...item, questionNumber: index+1 }) )
    console.log('questionList-->', questionList)
    console.log('candiateList-->',  candidateList)
    await Promise.all( candidateList.forEach( ( item )=> { 

        const singleCandidate = new AnswerModelOfflineTheory({ 
          candidateId: item._id,
          setId:assessmentData.set_id[0],
          assessmentId: assessmentData._id,
          batchId: candidateList[0].batchId,
          questions: questionList
        })

        singleCandidate.save()
    }) 

    )

    return { status: true }
    
  } catch (error) {
    return { status: false }
  }
}


//update candidate
// exports.getCandiateByBatch = async (req, res, next) => {
//   try {
//     const filterOption = ["name", "userName", "mobile", "email", "candidateId"];
//     let filter = getFilter(req, filterOption);

//     const { page, limit, skip, sortOrder } = Paginate(req);

//     let query = filter ? filter.query : {};
//     query = { ...query, batchId: req?.params?.id };

//     const totalCounts = await Candidate.countDocuments(query);

//     const totalPages = Math.ceil(totalCounts / limit);

//     const candidateList = await Candidate.find(query, {
//       rawPassword: 0,
//       password: 0,
//     })
//       .populate([{ path: "batchId", populate: { path: "schemeId" } }])
//       .sort(sortOrder)
//       .skip(skip)
//       .limit(limit);

//     console.log('candidateList==>',candidateList)
//     const transformedData = candidateList.map(async(candidate) => {
//       const {
//         userName,
//         candidateId,
//         name,
//         mobile,
//         email,
//         aadharNumber,
//         _id,
//         logInSendViaEmail,
//         status,
//         candidateType
//       } = candidate;
//       const { batchId,batchMode, schemeId } = candidate.batchId;
//       return {
//         _id,
//         userName,
//         batchId,
//         batchMode,
//         schemeName: schemeId.schemeName,
//         candidateId,
//         name,
//         mobile,
//         email,
//         aadharNumber,
//         logInSendViaEmail,
//         status,
//         candidateType,
//       };
//     });

//     if (candidateList.length !== 0) {
//       return sendResponse(res, 200, "Candidate List", {
//         //rawCandidateList : candidateList,
//         candidateList: transformedData,
//         page,
//         totalCounts,
//         totalPages,
//       });
//     } else {
//       return sendResponse(res, 200, "no candidate found", []);
//     }
//   } catch (error) {
//     return errorResponse(
//       res,
//       500,
//       responseMessage.something_wrong,
//       error.message
//     );
//   }
// };

// exports.getCandiateByBatch = async (req, res, next) => {
//   try {
//     const filterOption = ["name", "userName", "mobile", "email", "candidateId"];
//     let filter = getFilter(req, filterOption);
//     let sectionTable = [];

//     const { page, limit, skip, sortOrder } = Paginate(req);

//     let query = filter ? filter.query : {};
//     query = { ...query, batchId: req?.params?.id };

//     const totalCounts = await Candidate.countDocuments(query);

//     const totalPages = Math.ceil(totalCounts / limit);

//     const candidateList = await Candidate.find(query, {
//       rawPassword: 0,
//       password: 0,
//     })
//       .populate([{ path: "batchId", populate: { path: "schemeId" } }])
//       .sort(sortOrder)
//       .skip(skip)
//       .limit(limit);
//     candidateList?.forEach((candidate, index) => {
//       // Extract sectionTable from the first candidate's batchId.questionPaper
//       if (index === 0 && candidate.batchId?.questionPaper?.sectionTable) {
//         sectionTable = candidate.batchId.questionPaper.sectionTable;
//       }
//     });

//     // Check for suspicious images for each candidate
//     const transformedData = await Promise.all(
//       candidateList.map(async (candidate) => {
//         const {
//           userName,
//           candidateId,
//           name,
//           mobile,
//           email,
//           aadharNumber,
//           _id,
//           logInSendViaEmail,
//           status,
//           candidateType,
//           isTestSubmitted,
//         } = candidate;
//         const { batchId, batchMode, schemeId } = candidate.batchId;

//         // Check if suspicious images exist for this candidate
//         const fileImgVideoUrls = await SuspiciousActivity.findOne({
//           candidateId: _id,
//         });
//         const hasSuspiciousImgVideo =
//           fileImgVideoUrls?.suspiciousImageIds?.length > 0 ||
//           fileImgVideoUrls?.suspiciousVideoIds?.length > 0;

//         //check vivva and practical file
//         const fileVivaPracticalImgVideoUrls = await PracticalFilesModel.find({
//           batch_id: candidate?.batchId?._id,
//           candidate_id: _id,
//           $or: [
//             { isViva: true, isVideo: true },
//             { isViva: true, isVideo: false },
//             { isViva: false, isVideo: true },
//           ],
//         });

//         // Set isSuspiciousVivaPractical to true if any files match the conditions
//         const isSuspiciousVivaPractical =
//           fileVivaPracticalImgVideoUrls?.length > 0;
//         return {
//           _id,
//           userName,
//           batchId,
//           batchMode,
//           schemeName: schemeId.schemeName,
//           candidateId,
//           name,
//           mobile,
//           email,
//           aadharNumber,
//           logInSendViaEmail,
//           status,
//           candidateType,
//           isSuspiciousTheory: hasSuspiciousImgVideo ? true : false,
//           isSuspiciousVivaPractical: isSuspiciousVivaPractical,
//           isTestSubmitted: isTestSubmitted,
//         };
//       })
//     );

//     if (candidateList.length !== 0) {
//       return sendResponse(res, 200, "Candidate List", {
//         candidateList: transformedData,
//         sectionTable,
//         page,
//         totalCounts,
//         totalPages,
//       });
//     } else {
//       return sendResponse(res, 200, "no candidate found", []);
//     }
//   } catch (error) {
//     return errorResponse(
//       res,
//       500,
//       responseMessage.something_wrong,
//       error.message
//     );
//   }
// };

//
exports.getCandiateByBatch = async (req, res, next) => {
  try {
    const filterOption = ["name", "userName", "mobile", "email", "candidateId"];
    let filter = getFilter(req, filterOption);
    let sectionTable = [];

    const { page, limit, skip, sortOrder } = Paginate(req);

    let query = filter ? filter.query : {};
    query = { ...query, batchId: req?.params?.id };

    const totalCounts = await Candidate.countDocuments(query);

    const totalPages = Math.ceil(totalCounts / limit);

    const candidateList = await Candidate.find(query, {
      rawPassword: 0,
      password: 0,
    })
      .populate([{ path: "batchId", populate: { path: "schemeId" } }])
      .sort({ candidateId: 1 })
      .skip(skip)
      .limit(limit)
      .lean();

    // let sortedById = candidateList.sort((a, b) => a.name - b.name);
    candidateList?.forEach((candidate, index) => {
      // Extract sectionTable from the first candidate's batchId.questionPaper
      if (index === 0 && candidate.batchId?.questionPaper?.sectionTable) {
        sectionTable = candidate.batchId.questionPaper.sectionTable;
      }
    });

    // Check for suspicious images for each candidate
    const transformedData = await Promise.all(
      candidateList.map(async (candidate) => {
        const {
          userName,
          candidateId,
          name,
          fatherName,
          mobile,
          email,
          aadharNumber,
          _id,
          logInSendViaEmail,
          status,
          candidateType,
          isTestSubmitted,
        } = candidate;
        const {
          batchId,
          batchMode,
          schemeId,
          proctoring = {},
        } = candidate.batchId;

        // Check if suspicious images exist for this candidate
        const fileImgVideoUrls = await SuspiciousActivity.findOne({
          candidateId: _id,
        });
        const hasSuspiciousImgVideo =
          fileImgVideoUrls?.suspiciousImageIds?.length > 0 ||
          fileImgVideoUrls?.suspiciousVideoIds?.length > 0;

        //check vivva and practical file
        const fileVivaPracticalImgVideoUrls = await PracticalFilesModel.find({
          batch_id: candidate?.batchId?._id,
          candidate_id: _id,
          $or: [
            { isViva: true, isVideo: true },
            { isViva: true, isVideo: false },
            { isViva: false, isVideo: true },
          ],
        });

        // Set isSuspiciousVivaPractical to true if any files match the conditions
        const isSuspiciousVivaPractical =
          fileVivaPracticalImgVideoUrls?.length > 0;
        return {
          _id,
          userName,
          batchId,
          faceRecognition: proctoring.faceRecognition,
          batchMode,
          schemeName: schemeId.schemeName,
          candidateId,
          name,
          fatherName,
          mobile,
          email,
          aadharNumber,
          logInSendViaEmail,
          status,
          candidateType,
          isSuspiciousTheory: hasSuspiciousImgVideo ? true : false,
          isSuspiciousVivaPractical: isSuspiciousVivaPractical,
          isTestSubmitted: isTestSubmitted,
          disabledFaceRecognition: candidate?.faceRecognition ?? {
            adminApproved: false,
            approvedBy: null,
          },
          faceMatchStatus: candidate?.faceMatchStatus ?? "Not Attempted",
        };
      })
    );

    if (candidateList.length !== 0) {
      return sendResponse(res, 200, "Candidate List", {
        candidateList: transformedData,
        sectionTable,
        page,
        totalCounts,
        totalPages,
      });
    } else {
      return sendResponse(res, 200, "no candidate found", []);
    }
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.candidatePasswordReset = async (req, res, next) => {
  try {
    const { oldPassword, newPassword } = req.body;

    const user = await Candidate.findOne({ _id: req.params.id });

    if (oldPassword && newPassword) {
      if (!user)
        return errorResponse(
          res,
          404,
          responseMessage.user_not_found,
          responseMessage.errorMessage
        );

      const isValidPassword = await bcrypt.compare(oldPassword, user.password);

      if (!isValidPassword)
        return errorResponse(
          res,
          400,
          responseMessage.enter_old_password,
          responseMessage.errorMessage
        );

      let checkNewPassword = validatePassword(newPassword);

      if (!checkNewPassword)
        return errorResponse(
          res,
          400,
          responseMessage.password_invalid,
          responseMessage.errorMessage
        );

      let checkComparePassword = comparePassword(oldPassword, newPassword);

      if (checkComparePassword)
        return errorResponse(
          res,
          400,
          responseMessage.new_password_not_same_as_old_password,
          responseMessage.errorMessage
        );

      const salt = await bcrypt.genSalt(8);
      const hashPassword = await bcrypt.hash(newPassword, salt);

      user.password = hashPassword;
      user.rawPassword = newPassword;
      const updatedUser = await user.save();

      if (!updatedUser)
        return errorResponse(res, 400, "error in password reset");

      await Candidate.findOneAndUpdate(
        { _id: user._id },
        { $set: { wrongLogin: 0 } }
      );
      return sendResponse(
        res,
        200,
        responseMessage.password_change_success,
        `${responseMessage.password_change_success} for ${user.email}`
      );
    } else {
      return errorResponse(
        res,
        400,
        "something is missing in the password reset"
      );
    }
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

function comparePassword(oldPass, newPass) {
  return oldPass !== newPass ? false : true;
}

exports.getRawPassword = async (req, res) => {
  try {
    const user = await Candidate.findOne({ _id: req.params.id });
    if (!user) {
      return errorResponse(
        res,
        400,
        responseMessage.no_user_found,
        responseMessage.no_user_found
      );
    }
    return sendResponse(res, 200, "candidate password", user.rawPassword);
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.downloadCandidateBulkUploadFile = (req, res) => {
  const filepath = `public/files/bulkuploadsamplefile`;
  if (req.params.type === "ssc") {
    const file = `${filepath}/candidateBulkUploadSSC.xlsx`;
    return res.status(200).download(file);
  } else {
    const file = `${filepath}/candidateBulkUploadPrivate.xlsx`;
    return res.status(200).download(file);
  }
};

exports.getCandidateById = async (req, res, next) => {
  try {
    const candidate = await Candidate.findOne(
      { _id: req.params.id },
      { rawPassword: 0, password: 0 }
    ).populate("batchId");
    if (candidate) {
      const {
        userName,
        candidateId,
        name,
        mobile,
        email,
        aadharNumber,
        _id,
        logInSendViaEmail,
        batchId,
      } = candidate;

      const transformedData = {
        _id,
        userName,
        candidateId,
        name,
        mobile,
        email,
        aadharNumber,
        logInSendViaEmail,
        batchId: batchId.batchId,
        batchId_mongoId: batchId._id,
      };

      return sendResponse(res, 200, "Candidate Details", transformedData);
    } else {
      return errorResponse(res, 400, "No Candidate Found");
    }
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

const generateCandidateIdSsc = (name, candidateId, lastSixCharacters) => {
  return (
    name?.substr(0, 3) +
    candidateId?.substr(candidateId.length - 4, 4) +
    lastSixCharacters
  );
};
const generateCandidateId = (name, mobile, lastSixCharacters) => {
  return name?.substr(0, 3) + mobile?.substr(6, 4) + lastSixCharacters;
};

// const generateUserName = async (res) => {
//   const randomString = Math.floor(100000 + Math.random() * 900000);
//   const userName =  `STD${randomString}`

//   const existingUserName = await Candidate.findOne({userName: userName})
//   if(existingUserName){
//     return await generateUserName()
//   }
//   else{
//     return userName
//   }
// }

const generateUserName = async () => {
  while (true) {
    const randomString = Math.floor(100000 + Math.random() * 900000);
    const userName = `STD${randomString}`;

    const existingUserName = await Candidate.findOne({ userName: userName });
    if (!existingUserName) {
      return userName;
    }
  }
};

const generateUserNameSsc = (name, candidateId, batchId) => {
  const username =
    name?.substr(0, 3) +
    candidateId?.substring(candidateId.length - 3) +
    batchId?.substring(batchId.length - 2);

  return username.toUpperCase();
};

const generateUserNamePrivate = (name, mobile, batchId) => {
  console.log(name, mobile, batchId);
  const username =
    name?.substr(0, 3) +
    mobile?.substring(mobile.length - 3) +
    batchId?.substring(batchId.length - 2);

  return username.toUpperCase();
};

const generatePassword = () => {
  return Math.floor(10000 + Math.random() * 90000).toString();
};

// exports.candidateListExport = async (req, res, next) => {
//   try {
//     const { attendanceList, candidateList, practicalAndVive } = req.body;
//     const query = { batchId: req?.params?.batchId };
//     const candidatesList = await Candidate.find(query, {
//       password: 0,
//     }).populate({ path: "batchId", select: "_id batchId" });

//     //const sheetTypeOptions = [ 'candidatesList', 'vivaPracticalMarksheet' , 'candidateAttandenceList']

//     if (candidatesList.length !== 0) {
//       // if(sheetType === "candidateList") return sendResponse(res, 200, "candidateList", candidateList)
//       const candidateIds = await candidatesList.map(
//         (candidate) => candidate._id
//       );
//       const fetchCandidateResults = async (candidateIds) => {
//         const chunkSize = 500;
//         const chunkArray = (arr, size) =>
//           arr.reduce(
//             (acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]),
//             []
//           );

//         const candidateChunks = chunkArray(candidateIds, chunkSize);

//         const results = await Promise.allSettled(
//           candidateChunks.map(async (chunk) => {
//             return AnswerModel.aggregate([
//               { $match: { candidateId: { $in: chunk } } },
//               {
//                 $lookup: {
//                   from: "candidates",
//                   localField: "candidateId",
//                   foreignField: "_id",
//                   as: "candidateDetails",
//                 },
//               },
//               { $unwind: "$candidateDetails" },
//               {
//                 $project: {
//                   candidateId: 1,
//                   "questions._id": 1,
//                   "questions.text": 1,
//                   "candidateDetails.candidateId": 1,
//                   "candidateDetails.name": 1,
//                 },
//               },
//             ]);
//           })
//         );

//         return results
//           .filter((r) => r.status === "fulfilled")
//           .map((r) => r.value)
//           .flat();
//       };

//       // const candidateResult = await AnswerModel.find({
//       //   candidateId: { $in: candidateIds },
//       // }).populate([
//       //   { path: "questions.question_bank_id", select: "" },
//       //   { path: "candidateId", select: ["candidateId", "name"] },
//       // ]);
//       const candidateResult = await fetchCandidateResults(candidateIds);
//       const batch = await Batch.findOne({ _id: req?.params?.batchId });

//       let nosList = [];
//       candidateResult.map((candidate) => {
//         candidate.questions.forEach((question) => {
//           nosList.push(question.question_bank_id?.nos);
//         });
//       });

//       let listForNosList = [];
//       const candidatesAttandenceList = await candidatesList.map((candidate) => {
//         const updatedCandidate = {
//           name: candidate.name,
//           candidateId: candidate.candidateId,
//           batch_mongo_id: candidate.batchId._id,
//           batchId: candidate.batchId.batchId,
//           userName: candidate.userName,
//           mobile: candidate.mobile,
//           aadharNumber: candidate.aadharNumber,
//           email: candidate.email,
//           userType: candidate.userType,
//           status: candidate.status,
//           attendance: "",
//           rawPassword:
//             batch.batchMode === "online" ? candidate.rawPassword : null,
//           logInSendViaEmail: candidate.logInSendViaEmail,
//         };

//         let listOfCandidate = {
//           name: candidate.name,
//           candidateId: candidate.candidateId,
//           batch_mongo_id: candidate.batchId._id,
//           batchId: candidate.batchId.batchId,
//           userName: candidate.userName,
//           mobile: candidate.mobile,
//           aadharNumber: candidate.aadharNumber,
//           email: candidate.email,
//           userType: candidate.userType,
//           status: candidate.status,
//           attendance: "",
//           rawPassword:
//             batch.batchMode === "online" ? candidate.rawPassword : null,
//           logInSendViaEmail: candidate.logInSendViaEmail,
//         };

//         listForNosList.push(listOfCandidate);

//         return updatedCandidate;
//       });

//       const uniqueNos = [...new Set(nosList)];

//       const nosListWithCandidate = {
//         candidateList: [...listForNosList],
//         nosList: uniqueNos,
//       };

//       const response = {};

//       if (candidateList) {
//         response.candidateList = candidatesList;
//       }

//       if (practicalAndVive) {
//         response.practicalAndVive = nosListWithCandidate;
//       }

//       if (attendanceList) {
//         response.attendanceList = candidatesAttandenceList;
//       }

//       return sendResponse(res, 200, "sheet data available", {
//         ...response,
//       });
//     } else {
//       return errorResponse(res, 400, "No Candidate Found");
//     }
//   } catch (error) {
//     return errorResponse(
//       res,
//       500,
//       responseMessage.something_wrong,
//       error.message
//     );
//   }
// };

exports.candidateListExport = async (req, res, next) => {
  try {
    const { attendanceList, candidateList, practicalAndVive, links } = req.body;
    const query = { batchId: req?.params?.batchId };
    let candidatesList = await Candidate.find(query, {
      password: 0,
    })
      .populate({ path: "batchId", select: "_id batchId" })
      .lean();

    if (links) {
      // Generate tokens for each candidate
      candidatesList = await Promise.all(
        candidatesList.map(async (candidate) => {
          const token = await generateUrlEncodingToken(
            candidate.batchId,
            candidate._id
          );
          return {
            ...candidate,
            urlEncodedLink: `${CLIENT_URL}/student-token-login?token=${token}`,
          };
        })
      );
    }

    if (candidatesList.length !== 0) {
      // if(sheetType === "candidateList") return sendResponse(res, 200, "candidateList", candidateList)
      const candidateIds = await candidatesList.map(
        (candidate) => candidate._id
      );
      const fetchCandidateResults = async (candidateIds) => {
        const chunkSize = 500;
        const chunkArray = (arr, size) =>
          arr.reduce(
            (acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]),
            []
          );

        const candidateChunks = chunkArray(candidateIds, chunkSize);

        const results = await Promise.allSettled(
          candidateChunks.map(async (chunk) => {
            return AnswerModel.aggregate([
              { $match: { candidateId: { $in: chunk } } },
              {
                $lookup: {
                  from: "candidates",
                  localField: "candidateId",
                  foreignField: "_id",
                  as: "candidateDetails",
                },
              },
              { $unwind: "$candidateDetails" },
              {
                $project: {
                  candidateId: 1,
                  "questions._id": 1,
                  "questions.text": 1,
                  "candidateDetails.candidateId": 1,
                  "candidateDetails.name": 1,
                },
              },
            ]);
          })
        );

        return results
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value)
          .flat();
      };

      // const candidateResult = await AnswerModel.find({
      //   candidateId: { $in: candidateIds },
      // }).populate([
      //   { path: "questions.question_bank_id", select: "" },
      //   { path: "candidateId", select: ["candidateId", "name"] },
      // ]);
      const candidateResult = await fetchCandidateResults(candidateIds);
      const batch = await Batch.findOne({ _id: req?.params?.batchId });

      let nosList = [];
      candidateResult.map((candidate) => {
        candidate.questions.forEach((question) => {
          nosList.push(question.question_bank_id?.nos);
        });
      });

      let listForNosList = [];
      const candidatesAttandenceList = await candidatesList.map((candidate) => {
        const updatedCandidate = {
          name: candidate.name,
          candidateId: candidate.candidateId,
          batch_mongo_id: candidate.batchId._id,
          batchId: candidate.batchId.batchId,
          userName: candidate.userName,
          mobile: candidate.mobile,
          aadharNumber: candidate.aadharNumber,
          email: candidate.email,
          userType: candidate.userType,
          status: candidate.status,
          attendance: "",
          rawPassword:
            batch.batchMode === "online" ? candidate.rawPassword : null,
          logInSendViaEmail: candidate.logInSendViaEmail,
        };

        let listOfCandidate = {
          name: candidate.name,
          candidateId: candidate.candidateId,
          batch_mongo_id: candidate.batchId._id,
          batchId: candidate.batchId.batchId,
          userName: candidate.userName,
          mobile: candidate.mobile,
          aadharNumber: candidate.aadharNumber,
          email: candidate.email,
          userType: candidate.userType,
          status: candidate.status,
          attendance: "",
          rawPassword:
            batch.batchMode === "online" ? candidate.rawPassword : null,
          logInSendViaEmail: candidate.logInSendViaEmail,
        };

        listForNosList.push(listOfCandidate);

        return updatedCandidate;
      });

      const uniqueNos = [...new Set(nosList)];

      const nosListWithCandidate = {
        candidateList: [...listForNosList],
        nosList: uniqueNos,
      };

      const response = {};

      if (candidateList || links) {
        response.candidateList = candidatesList;
      }

      if (practicalAndVive) {
        response.practicalAndVive = nosListWithCandidate;
      }

      if (attendanceList) {
        response.attendanceList = candidatesAttandenceList;
      }

      return sendResponse(res, 200, "sheet data available", {
        ...response,
      });
    } else {
      return errorResponse(res, 400, "No Candidate Found");
    }
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.candidateListExportPDF = async (req, res, next) => {
  try {
    const { attendanceList, candidateList, practicalAndVive, links } = req.body;
    const query = { batchId: req?.params?.batchId };
    let candidatesList = await Candidate.find(query, {
      password: 0,
    })
      .populate({ path: "batchId", select: "_id batchId" })
      .lean();

    if (links) {
      // Generate tokens for each candidate
      candidatesList = await Promise.all(
        candidatesList.map(async (candidate) => {
          const token = await generateUrlEncodingToken(
            candidate.batchId,
            candidate._id
          );
          return {
            ...candidate,
            urlEncodedLink: `${CLIENT_URL}/student-token-login?token=${token}`,
          };
        })
      );
    }

    if (candidatesList.length !== 0) {
      const candidateIds = await candidatesList.map(
        (candidate) => candidate._id
      );
      const fetchCandidateResults = async (candidateIds) => {
        const chunkSize = 500;
        const chunkArray = (arr, size) =>
          arr.reduce(
            (acc, _, i) => (i % size ? acc : [...acc, arr.slice(i, i + size)]),
            []
          );

        const candidateChunks = chunkArray(candidateIds, chunkSize);

        const results = await Promise.allSettled(
          candidateChunks.map(async (chunk) => {
            return AnswerModel.aggregate([
              { $match: { candidateId: { $in: chunk } } },
              {
                $lookup: {
                  from: "candidates",
                  localField: "candidateId",
                  foreignField: "_id",
                  as: "candidateDetails",
                },
              },
              { $unwind: "$candidateDetails" },
              {
                $project: {
                  candidateId: 1,
                  "questions._id": 1,
                  "questions.text": 1,
                  "candidateDetails.candidateId": 1,
                  "candidateDetails.name": 1,
                },
              },
            ]);
          })
        );

        return results
          .filter((r) => r.status === "fulfilled")
          .map((r) => r.value)
          .flat();
      };

      const candidateResult = await fetchCandidateResults(candidateIds);
      const batch = await Batch.findOne({ _id: req?.params?.batchId });

      let nosList = [];
      candidateResult.map((candidate) => {
        candidate.questions.forEach((question) => {
          nosList.push(question.question_bank_id?.nos);
        });
      });

      let listForNosList = [];
      const candidatesAttandenceList = await candidatesList.map((candidate) => {
        const updatedCandidate = {
          name: candidate.name,
          candidateId: candidate.candidateId,
          batch_mongo_id: candidate.batchId._id,
          batchId: candidate.batchId.batchId,
          userName: candidate.userName,
          mobile: candidate.mobile,
          aadharNumber: candidate.aadharNumber,
          email: candidate.email,
          userType: candidate.userType,
          status: candidate.status,
          attendance: "",
          rawPassword:
            batch.batchMode === "online" ? candidate.rawPassword : null,
          logInSendViaEmail: candidate.logInSendViaEmail,
        };

        let listOfCandidate = {
          name: candidate.name,
          candidateId: candidate.candidateId,
          batch_mongo_id: candidate.batchId._id,
          batchId: candidate.batchId.batchId,
          userName: candidate.userName,
          mobile: candidate.mobile,
          aadharNumber: candidate.aadharNumber,
          email: candidate.email,
          userType: candidate.userType,
          status: candidate.status,
          attendance: "",
          rawPassword:
            batch.batchMode === "online" ? candidate.rawPassword : null,
          logInSendViaEmail: candidate.logInSendViaEmail,
        };

        listForNosList.push(listOfCandidate);

        return updatedCandidate;
      });

      const uniqueNos = [...new Set(nosList)];

      const nosListWithCandidate = {
        candidateList: [...listForNosList],
        nosList: uniqueNos,
      };

      const response = {};

      if (candidateList || links) {
        response.candidateList = candidatesList;
      }

      if (practicalAndVive) {
        response.practicalAndVive = nosListWithCandidate;
      }

      if (attendanceList) {
        response.attendanceList = candidatesAttandenceList;
      }
      
      const batchName = response?.candidateList?.[0]?.batchId?.batchId || "Batch";
      const safeBatchName = batchName.replace(/[^a-zA-Z0-9_-]/g, "_");
      const date = new Date().toISOString().split("T")[0];
      const fileName = `${safeBatchName}_Candidate_List_${date}.pdf`;
      const pdf = await generateCandidateListPDF({
          ...response,
          links: links === true
      });
      
      
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
      res.setHeader(
        "Access-Control-Expose-Headers",
        "Content-Disposition, Content-Length"
      );

      res.end(pdf);
    } else {
      return errorResponse(res, 400, "No Candidate Found");
    }
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.getSchemabyBatch = async (req, res) => {
  try {
    const { batchId } = req.params;
    if (!batchId) return errorResponse(res, 400, "batch id not provided");

    const batch = await Batch.findOne({ _id: batchId }).populate("schemeId");
    if (!batch) return errorResponse(res, 400, "no batch found");

    const response = {
      schemeId: batch?.schemeId?._id,
      schemeName: batch?.schemeId?.schemeName,
    };

    return sendResponse(
      res,
      200,
      `successfully got scheme of batch ${batchId}`,
      response
    );
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.deleteCandidate = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return errorResponse(
        res,
        400,
        "candidate Id not provided",
        "candidate Id not provided"
      );

    const existingCandidate = await Candidate.findOne({ _id: id }).populate(
      "batchId"
    );
    if (!existingCandidate)
      return errorResponse(
        res,
        400,
        "candidate not found",
        "candidate not found"
      );

    if (existingCandidate.status)
      return errorResponse(
        res,
        400,
        "can't delete active candidate",
        "can't delete active candidate"
      );

    const candidate = await Candidate.deleteOne({ _id: id });
    if (!candidate)
      return errorResponse(res, 400, "error in deletion", "error in deletion");

    if (existingCandidate.batchId.batchMode === "online") {
      await CandidateReportModel.deleteOne({ candidateId: id });
      await AnswerModel.deleteOne({ candidateId: id });
      await OnlineResultModel.deleteOne({ candidate_mongo_id: id });
    } else {
      await OfflineResultModel.deleteOne({ candidate_mongo_id: id });
    }

    const candidateCountInBatch = await Candidate.countDocuments({
      batchId: existingCandidate.batchId,
    });
    if (candidateCountInBatch < 1) {
      await Batch.findOneAndUpdate(
        { _id: existingCandidate.batchId },
        { $set: { candidateAssigned: false } }
      );
    }

    return sendResponse(
      res,
      200,
      `candidate deleted successfully`,
      `candidate deleted successfully`
    );
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.deleteMultipleCandidate = async (req, res) => {
  try {
    const { candidateIds } = req.body;

    if (candidateIds?.length < 1) {
      return errorResponse(
        res,
        400,
        "Please provide at least one candidate Id",
        "Please provide at least one candidate Id"
      );
    }

    const existingCandidate = await Candidate.find({
      _id: { $in: candidateIds },
    }).populate("batchId");

    if (existingCandidate?.length === 0) {
      return errorResponse(
        res,
        404,
        "Candidate not found",
        "Candidate not found"
      );
    }

    const activeCandidate = existingCandidate?.filter((item) => item?.status);

    if (activeCandidate?.length > 0) {
      return errorResponse(
        res,
        "400",
        `Can't delete active candidates`,
        "Can't delete active candidates"
      );
    }

    const deletedCandidates = await Candidate.deleteMany({
      _id: { $in: candidateIds },
    });

    if (!deletedCandidates) {
      return errorResponse(
        res,
        500,
        "Somthing went wrong while delete candidates",
        "Somthing went wrong while delete candidates"
      );
    }

    for (const candidate of existingCandidate) {
      const id = candidate._id;

      if (candidate.batchId.batchMode === "online") {
        await CandidateReportModel.deleteOne({ candidateId: id });
        await AnswerModel.deleteOne({ candidateId: id });
        await OnlineResultModel.deleteOne({ candidate_mongo_id: id });
      } else {
        await OfflineResultModel.deleteOne({ candidate_mongo_id: id });
      }

      const count = await Candidate.countDocuments({
        batchId: candidate.batchId._id,
      });
      if (count < 1) {
        await Batch.findOneAndUpdate(
          { _id: candidate.batchId._id },
          { $set: { candidateAssigned: false } }
        );
      }
    }

    return sendResponse(
      res,
      200,
      `candidate deleted successfully`,
      `candidate deleted successfully`
    );
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.manualCandidateLogout = async (req, res) => {
  try {
    const candidateId = req.params.id;
    if (!candidateId)
      return errorResponse(
        res,
        400,
        "CandidateId not provided",
        "CandidateId not provided"
      );

    const candidate = await Candidate.findById(candidateId);
    if (!candidate)
      return errorResponse(
        res,
        400,
        "Candidate not found",
        "CandidateId not provided"
      );

    await Candidate.findOneAndUpdate(
      { _id: candidateId },
      { $set: { token: false } }
    );
    return sendResponse(
      res,
      200,
      "Candidiate logout successfully",
      "Candidiate logout successfully"
    );
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.reassignCandidate = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { candidateId } = req.params;
    if (!candidateId) {
      await session.abortTransaction();
      session.endSession();
      return errorResponse(res, 400, "Candidate ID is required");
    }

    // Retrieve candidate with associated batch details
    const candidate = await Candidate.findById(candidateId)
      .populate("batchId")
      .session(session);

    if (!candidate) {
      await session.abortTransaction();
      session.endSession();
      return errorResponse(res, 404, "Candidate not found");
    }

    // Eligibility check
    if (!candidate.isTestSubmitted) {
      await session.abortTransaction();
      session.endSession();
      return errorResponse(res, 400, "Candidate not eligible for reassignment");
    }

    try {
      // Collect file references atomically
      const [suspiciousActivity, practicalFiles] = await Promise.all([
        SuspiciousActivity.findOne({ candidateId }).session(session),
        PracticalFilesModel.find({ candidate_id: candidateId }).session(
          session
        ),
      ]);

      // Prepare file keys for deletion
      const fileKeys = [];

      // Suspicious activity files
      if (suspiciousActivity) {
        if (Array.isArray(suspiciousActivity.suspiciousImageIds)) {
          fileKeys.push(
            ...suspiciousActivity.suspiciousImageIds
              .filter((id) => id) // Filter out null/undefined
              .map((id) => `${candidateId}_${id}`)
          );
        }
        if (Array.isArray(suspiciousActivity.suspiciousVideoIds)) {
          fileKeys.push(
            ...suspiciousActivity.suspiciousVideoIds
              .filter((id) => id)
              .map((id) => `${candidateId}_${id}`)
          );
        }
      }

      // Practical/viva files
      if (Array.isArray(practicalFiles)) {
        practicalFiles.forEach((file) => {
          if (file.fileKey) {
            fileKeys.push(file.fileKey);
          }
        });
      }

      // Atomic database operations
      const deletionPromises = [
        AnswerModel.deleteMany({ candidateId }).session(session),
        SuspiciousActivity.deleteMany({ candidateId }).session(session),
        PracticalFilesModel.deleteMany({ candidate_id: candidateId }).session(
          session
        ),
        CandidateReportModel.deleteMany({ candidateId }).session(session),
      ];

      //  Result deletion based on batch mode
      if (candidate.batchId.batchMode === "online") {
        deletionPromises.push(
          OnlineResultModel.deleteOne({
            candidate_mongo_id: candidateId,
          }).session(session)
        );
      } else {
        deletionPromises.push(
          OfflineResultModel.deleteOne({
            candidate_mongo_id: candidateId,
          }).session(session)
        );
      }

      await Promise.all(deletionPromises);

      // Atomic candidate update - keeping existing credentials
      await Candidate.findByIdAndUpdate(
        candidateId,
        {
          $set: {
            ipAddress: null,
            browser: null,
            latitude: null,
            longitude: null,
            wrongLogin: 0,
            resumeTime: null,
            loginTime: null,
            token: false,
            tokenSecret: null,
            logoutTime: null,
            dob: null,
            aadharNo: null,
            isTestSubmitted: false,
            examTime: null,
            suspiciousActivity: 0,
            aadharNumber: "",
            steps: [],
            allStepsCompletedStatus: false,
            isPresent: "Missing",
            mobile: null,
          },
        },
        { session, new: true }
      );

      // Commit transaction before external operations
      await session.commitTransaction();
      session.endSession();

      // Non-transactional but critical cleanup
      if (fileKeys.length > 0) {
        try {
          const deletionResults = await deleteFileFromS3(fileKeys);
          if (deletionResults.errors?.length > 0) {
            console.error(
              "Some files failed to delete from S3:",
              deletionResults.errors
            );
          }
        } catch (s3Error) {
          console.error("S3 cleanup failed:", s3Error);
        }
      }

      return sendResponse(res, 200, "Candidate reassigned successfully", {
        candidateId: candidate._id,
      });
    } catch (innerError) {
      // Only abort if we haven't committed
      if (session.inTransaction()) {
        await session.abortTransaction();
      }
      session.endSession();
      throw innerError; // Re-throw to be caught by outer catch
    }
  } catch (error) {
    // Only abort if session exists and is in transaction
    if (session && session.inTransaction()) {
      await session.abortTransaction();
    }
    if (session) {
      session.endSession();
    }
    console.error("Reassignment failed:", error);
    return errorResponse(
      res,
      500,
      "Reassignment operation failed",
      error.message
    );
  }
};

const generateAssignCandidateCacheKey = ({ user, query, page, limit, skip, sortOrder }) => {
  const keyObj = {
    assigndClients: user?.assigndClients,
    search: query?.search?.trim(),
    type: query?.type,
    page,
    limit,
    skip,
    sortOrder,
  };
  const keyString = JSON.stringify(keyObj);
  return `${BATCH_LIST_ASSIGN_CANDIDATE}:${Buffer.from(keyString).toString("base64")}`;
};

module.exports.assignCandidateBatchList = async (req, res) => {
  try {
    const matchQuery = assignBatchatchFilter(req);
    let { page, limit, skip, sortOrder } = Paginate(req);
    sortOrder.createdAt = parseInt(sortOrder.createdAt, 10);

    const cacheKey = generateAssignCandidateCacheKey({
      user: req.user,
      query: req.query,
      page,
      limit,
      skip,
      sortOrder,
    });

     //Check in Redis
    const cached = await redisDB0.get(cacheKey);
  
    if (cached) {
      return sendResponse(res, 200, "Batch found", cached, true);
    }

    const projection = {
      batchId: 1,
      jobRoleNames: 1,
      schemeName: 1,
      clientname: 1,
      isMultiJobRole: "$questionPaper.isMultiJobRole",
      batchMode: 1,
      clientId:1,
    };

    const [batches, total] = await Promise.all([
      Batch.find(matchQuery)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)
        .select(projection)
        .lean(), 
      Batch.countDocuments(matchQuery),
    ]);

    if (!batches.length) {
      return sendResponse(
        res,
        200,
        "Batch found",
        []
      );
    }
    
const batchIds = batches.map((b) => b._id);
  
const batchMode = req.query.type || (batches[0]?.batchMode ?? "online"); 

const countsMap = await getCandidateCountsByBatchIds(batchIds, batchMode);

const response = batches.map((item) => ({
  ...item,
  candidate_Appeared_In_Batch: countsMap[item._id.toString()] || {
    totalCandidates: 0,
    candidateAttended: 0,
  },
}));


    const finalResponse = {
      batchDetails: response,
      page,
      totalCounts: total,
      totalPages: Math.ceil(total / limit),
    };

    //Save in Redis
    await redisDB0.set(
      cacheKey,
      JSON.stringify(finalResponse),
      process.env.REDIS_DEFAULT_EXPIRY
    );
  
    return sendResponse(res, 200, "Batch found", finalResponse);

    // return sendResponse(res, 200, "Batch found", {
    //   batchDetails: response,
    //   page,
    //   totalCounts: total,
    //   totalPages: Math.ceil(total / limit),
    // });
     
   
  } catch (error) {
    return errorResponse(res, 500, "Internal Server Error", error.message);
  }
};


//export all on assign candidate list
module.exports.exportAssignCandidateBatchList = async (req, res) => {
  try {
    const matchQuery = assignBatchatchFilter(req);

    const projection = {
      batchId: 1,
      jobRoleNames: 1,
      schemeName: 1,
      clientname: 1,
      isMultiJobRole: "$questionPaper.isMultiJobRole",
      batchMode: 1,
      clientId: 1,
    };

    // Fetch all batches without pagination or Redis caching
    const batches = await Batch.find(matchQuery)
      .sort({ createdAt: -1 }) // Default sort by createdAt descending
      .select(projection)
      .lean();

    if (!batches.length) {
      return sendResponse(res, 200, "No batches found", []);
    }

    const batchIds = batches.map((b) => b._id);
    const batchMode = req.query.type || (batches[0]?.batchMode ?? "online");

    const countsMap = await getCandidateCountsByBatchIds(batchIds, batchMode);

    const response = batches.map((item) => ({
      ...item,
      candidate_Appeared_In_Batch: countsMap[item._id.toString()] || {
        totalCandidates: 0,
        candidateAttended: 0,
      },
    }));

    return sendResponse(res, 200, "All batches exported successfully", {
      batchDetails: response,
      totalCounts: batches.length,
    });
  } catch (error) {
    return errorResponse(res, 500, "Internal Server Error", error.message);
  }
};

