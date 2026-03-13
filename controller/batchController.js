const { Paginate } = require("../utils/paginate");
const responseMessage = require("../utils/responseMessage");
const Batch = require("../models/batch-model");
const ExamCenter = require("../models/exam-center-model");
const Joi = require("@hapi/joi");
const validator = require("../utils/validator");
const { getFilter, batchFilter, batchFilterV2 } = require("../utils/custom-validators");
const { sendResponse, errorResponse } = require("../utils/response");
const Candidate = require("../models/candidate-model");
const CandidateReport = require("../models/candidateReport");
const moment = require("moment");
const {
  createQuestionPaper,
} = require("../controller/create-question-paper-controller");
const AnswerModel = require("../models/answerModel")
const OnlineResultModel = require("../models/onlineResult-model")
const NosTheory = require("../models/nos-theory-model");
const Question = require("../models/question");
const createAssesmentModel = require("../models/createAssesment-model");
const { formToJSON } = require("axios");
const ObjectId = require("mongoose").Types.ObjectId;
const JobRole = require("../models/jobRole-model");
const Scheme = require("../models/scheme-model");
const SubScheme = require("../models/sub-scheme-model");
const Proctor = require("../models/proctor-model");
const Assessor = require("../models/AssesorModel");
const QuestionBank = require("../models/questionBankModel");
const TheoryNosModel = require("../models/nos-theory-model");
const VivaPracticalNosModel = require("../models/nos-viva-model");
const Instruction = require("../models/instruction-model");
const setModel = require("../models/setsModel");
const AssesorNotificationModel = require("../models/assesor-notification-model");
const { candidate_Appeared_In_Batch, candidate_Appeared_In_Batch_v2 } = require("../utils/dbQuery");
const OfflineResultModel = require("../models/offlineResult-model");
const CandidateModel=require("../models/candidate-model");
const mongoose=require("mongoose");
const RedisService = require("../utils/redisService");
const { ONLINE_RESULT_BATCH_LIST, BATCH_LIST_EXAM_MANAGEMENT, BATCH_LIST_ASSIGN_CANDIDATE } = require("../constants/redis");
const ClientModel = require("../models/client-model");

const redisDB0 = new RedisService("db0");
const redisDB1 = new RedisService("db1");

const batchValidator = (data) => {
  try {
    const schema = Joi.object({
      batchId: Joi.string().required(),
      batchSize: Joi.number().required(),
      startDate: Joi.string().trim().required(),
      endDate: Joi.string().trim().required(),
      examCenterId: Joi.string().allow(""),
      schemeId: Joi.string().required(),
      batchMode: Joi.string().trim().required(),
      proctoring: Joi.object(),
      questionPaper: Joi.object(),
      assignAssessorProctor: Joi.boolean().required(),
      accessorId: Joi.string().trim(),
      proctorId: Joi.any().allow(''),
      financeRemarks: Joi.string().allow(''),
      subSchemeId: Joi.string().allow(''),
      jobRole: Joi.alternatives().conditional(Joi.exist(), { 
        then: Joi.string().trim().required(),
        otherwise: Joi.forbidden()
      }),
      startTime: Joi.string().trim().required(),
      endTime: Joi.string().trim().required(),
      assessorFeePerCandidate: Joi.number().allow(''),
      batchStartDate: Joi.string().trim().required(),
      batchEndDate: Joi.string().trim().required()
    });
    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
};


const getNosList = async (jobRole, version, level) => {
  // console.log('jobRole-->', jobRole)
  // console.log('version-->', version)
  // console.log('level-->', level)

  const jobRoleId = await NosTheory.findOne({
    jobRole: jobRole,
    nosData: {
      $elemMatch: {
        version: version,
        level: level,
      },
    },
  });

  // console.log('jobRoleId--->', jobRoleId)

  const query = [
    { $match: { _id: jobRoleId._id } },
    {
      $project: {
        jobRole: 1,
        section: 1,
        status: 1,
        nosData: {
          $filter: {
            input: "$nosData",
            as: "nosData",
            cond: {
              $and: [
                { $eq: ["$$nosData.version", version] },
                { $eq: ["$$nosData.level", level] },
              ],
            },
          },
        },
        _id: 0,
      },
    },
  ];

  const nosList = await NosTheory.aggregate(query);
  //  console.log('nosList-->', nosList)
  return nosList;
};


module.exports.createBatch = async (req, res) => {
  try {
    //return sendResponse(res, 200, "got data", req.body)
    const { error } = batchValidator(req.body);

    if (error) return errorResponse(res, 400, error.message, error.message);
    const {
      batchSize,
      batchId: rawBatchId,
      startDate,
      endDate,
      startTime,
      endTime,
      examCenterId,
      batchMode,
      proctoring,
      questionPaper,
      accesorStatus,
      accessorId,
      proctorId,
      financeRemarks,
      schemeId,
      subSchemeId,
      assignAssessorProctor,
      jobRole,
      shareCredentials,
      trainingPartner,
      assessorFeePerCandidate,
      batchStartDate,
      batchEndDate,
    } = req.body;
    let examCenter = null;

    const batchId = rawBatchId?.trim();
    
    if (proctoring)

      if (examCenterId) {
        examCenter = await ExamCenter.findOne({ _id: examCenterId });
        if (!examCenter)
          return errorResponse(
            res,
            400,
            "No exam center found.",
            "No exam center found."
          );

        if (batchSize > examCenter.noOfSeats)
          return errorResponse(
            res,
            400,
            "Batch Size can not be more than exam center seat capacity",
            "Batch Size can not be more than exam center seat capacity"
          );
      }

    if (!batchStartDate || !batchEndDate) {

      return errorResponse(
        res,
        400,
        "Batch start date and end date is required",
        "Batch start date and end date is required"
      );
    }

    const formattedBatchStartDate = moment(batchStartDate, "DD/MM/YYYY").startOf('day').toDate();
    const formattedBatchEndDate = moment(batchEndDate, "DD/MM/YYYY").endOf('day').toDate();

    if (formattedBatchEndDate < formattedBatchStartDate)
      return errorResponse(
        res,
        400,
        "Batch end date should be greater than or equal to start date",
        "Batch end date should be greater than or equal to start date"
      );



    // Ensure start and end dates are within the batch date range ---> new requirement assessment can start after batch ends
    const formattedStartDate = moment(startDate, "DD/MM/YYYY").startOf('day').toDate();
    const formattedEndDate = moment(endDate, "DD/MM/YYYY").endOf('day').toDate();

    if (formattedStartDate < formattedBatchStartDate ) {
      return errorResponse(
        res,
        400,
        "Assessment cannot start before batch start date",
        "Assessment cannot start before batch start date"
      );
    }

    if (formattedEndDate < formattedBatchStartDate) {
      return errorResponse(
        res,
        400,
        "Assessment end date must be within the batch date range",
        "Assessment end date must be within the batch date range"
      );
    }


    if (formattedEndDate < formattedStartDate)
      return errorResponse(
        res,
        400,
        "Assessment end must be greater than or equal to assessment start date",
        "Assessment end must be greater than or equal to assessment start date"
      );

    const regex = /^\d{2,3}$/;
    let examDurationError = false;

    questionPaper.sectionTable.forEach((item) => {
      if (item.sectionName === "theory" && item.examDuration !== null) {
        if (regex.test(item.examDuration)) {
          item.examDuration = `${item.examDuration}min`;
        } else {
          examDurationError = true;
        }
      }
    });

    if (examDurationError) {
      return errorResponse(
        res,
        400,
        "exam duration given in question paper should be a number of maximum 3 digit",
        "exam duration given in question paper should be a number of maximum 3 digit"
      );
    }

    const ExistBatch = await Batch.findOne({ batchId: batchId });
    if (ExistBatch)
      return errorResponse(
        res,
        400,
        responseMessage.batch_not_create,
        "batch already Exist!"
      );
    const [scheme, subScheme, accessor, jobRoleDoc] = await Promise.all([
      Scheme.findById(schemeId).select("schemeName"),
      subSchemeId ? SubScheme.findById(subSchemeId).select("subSchemeName") : null,
      accessorId ? Assessor.findById(accessorId).select("fullName") : null,
      jobRole ? JobRole.findById(jobRole).select("clientId") : null,
    ]);

    const clientFromJobRole = jobRoleDoc?.clientId
      ? await ClientModel.findById(jobRoleDoc.clientId).select("clientname")
      : null;

    let jobRoleNames = [];

    if (questionPaper?.isMultiJobRole) {


      const mainFunction = async (req, res) => {
        try {
          let TotalNoOfPracticalQuestion = 0;
          let TotalNoOfTheoryQuestion = 0;
          let TotalNoOfVivaQuestion = 0;
          let totalNosQuestionTheory = 0;
          let totalNosQuestionPractical = 0;
          let totalNosQuestionViva = 0;

          const existingNos = []

          let section = { theory: false, practical: false, viva: false };

          questionPaper.sectionTable.forEach((item) => {
            if (item.sectionName == "theory" && item.isSelected) {
              section.theory = true;
            }
            if (item.sectionName == "practical" && item.isSelected) {
              section.practical = true;
            }
            if (item.sectionName == "viva" && item.isSelected) {
              section.viva = true;
            }
          });

          for (const item of questionPaper.multipleJobRole) {
            let jobRoleDetails = await JobRole.findOne({ _id: item.jobRoleId });
            jobRoleNames.push(jobRoleDetails.jobRole);
            if (!jobRoleDetails) {
              return errorResponse(res, 400, "no jobRole found", "no jobRole found");
            }

            if (section.theory) {
              TotalNoOfTheoryQuestion += await findTotalNoOfQuestionSection(
                jobRoleDetails.jobRole,
                "Theory",
                item.level,
                item.version
              );
              const totalNosQuestionData = await totalNosQuestions(
                jobRoleDetails.jobRole,
                "Theory",
                item.version,
                item.level,
                existingNos
              )
              // console.log("existingNos-->", existingNos)
              existingNos.push(...totalNosQuestionData.nosList)
              // console.log('totalNosQuestionData-->', totalNosQuestionData)
              // console.log("existingNos-->", existingNos)
              totalNosQuestionTheory += totalNosQuestionData.nosCount;
            }
            if (section.viva) {
              TotalNoOfVivaQuestion += await findTotalNoOfQuestionSection(
                jobRoleDetails.jobRole,
                "viva",
                item.level,
                item.version
              );
              totalNosQuestionViva += await totalNosQuestions(
                jobRoleDetails.jobRole,
                "viva",
                item.version,
                item.level
              );
            }
            if (section.practical) {
              TotalNoOfPracticalQuestion += await findTotalNoOfQuestionSection(
                jobRoleDetails.jobRole,
                "practical",
                item.level,
                item.version
              );
              totalNosQuestionPractical += await totalNosQuestions(
                jobRoleDetails.jobRole,
                "practical",
                item.version,
                item.level
              );
            }

            if (
              section.theory &&
              TotalNoOfTheoryQuestion <
              totalNosQuestionTheory * questionPaper.questionSet
            ) {
              return errorResponse(
                res,
                400,
                "Question not Sufficient in theory to create question Paper",
                "Question not Sufficient in theory to create question Paper"
              );
            }
            if (section.theory && totalNosQuestionTheory.nosCount == 0) {
              return errorResponse(
                res,
                400,
                "Theory Nos not found",
                "Theory Nos not found"
              );
            }
            if (section.viva && TotalNoOfVivaQuestion < totalNosQuestionViva) {
              return errorResponse(
                res,
                400,
                "Question not Sufficient in viva to create question Paper",
                "Question not Sufficient in viva to create question Paper"
              );
            }
            if (section.viva && totalNosQuestionViva.nosCount == 0) {
              return errorResponse(
                res,
                400,
                "Viva Nos not found",
                "Viva Nos not found"
              );
            }
            if (
              section.practical &&
              TotalNoOfPracticalQuestion < totalNosQuestionPractical
            ) {
              return errorResponse(
                res,
                400,
                "Question not Sufficient in practical to create question Paper",
                "Question not Sufficient in practical to create question Paper"
              );
            }
            if (section.practical && totalNosQuestionPractical.nosCount == 0) {
              return errorResponse(
                res,
                400,
                "Practical Nos not found",
                "Practical Nos not found"
              );
            }
          }

          let jobRoleDetails = await JobRole.findOne({ _id: questionPaper.multipleJobRole[0].jobRoleId }).populate({path: 'clientId', select: '_id clientname'});
          let startDateTime = moment
            .utc(`${startDate} ${startTime}`, "DD/MM/YYYY hh:mmA")
            .toISOString();
          let endDateTime = moment
            .utc(`${endDate} ${endTime}`, "DD/MM/YYYY hh:mmA")
            .toISOString();

          let saveBatchDetails = new Batch({
            batchSize,
            batchId,
            startDate,
            endDate,
            startTime,
            endTime,
            startDateTime,
            endDateTime,
            batchMode,
            proctoring,
            questionPaper,
            accesorStatus,
            accessorId,
            financeRemarks,
            schemeId,
            assignAssessorProctor,
            clientId: jobRoleDetails?.clientId?._id,
            jobRole,
            shareCredentials,
            assessorFeePerCandidate,
            batchStartDate: formattedBatchStartDate,
            batchEndDate: formattedBatchEndDate,
            schemeName: scheme?.schemeName || null,
            subSchemeName: subScheme?.subSchemeName || null,
            accessorName: accessor?.fullName || null,
            clientname: jobRoleDetails?.clientId?.clientname || null,
            jobRoleNames,
            colorAndTTSEnabled: questionPaper.colorAndTTSEnabled
          });

          if (subSchemeId) {
            saveBatchDetails.subSchemeId = subSchemeId;
          }
          if (proctorId) {
            saveBatchDetails.proctorId = proctorId;
          }
          if (examCenterId) {
            saveBatchDetails.examCenterId = examCenterId;
            saveBatchDetails.examCenterName = examCenter.examCenterName || null;
          }

          await saveBatchDetails.save();

          if (saveBatchDetails) {
            if (accessorId) {
              await new AssesorNotificationModel({
                recipient: accessorId,
                sender: req.user?._id || accessorId,
                type: "other",
                title: batchId,
                content: "Accept the Batch Request to process further",
              }).save();
            }
            const QuestionPaperDetails = await createQuestionPaper(
              { batchId: saveBatchDetails._id },
              res,
              existingNos
            );
            // console.log('QuestionPaperDetails--->', QuestionPaperDetails)
            // console.log("questionDetails", QuestionPaperDetails);
            if (!QuestionPaperDetails || QuestionPaperDetails.error == true) {
              const batchDetails = await Batch.deleteOne({
                _id: saveBatchDetails._id,
              });
              const assesMentDetails = await createAssesmentModel.deleteOne({
                batch_id: saveBatchDetails._id,
              });
              console.log("batch delete", batchDetails, assesMentDetails);
              return errorResponse(
                res,
                400,
                QuestionPaperDetails.message,
                "Some thing wrong with question Paper"
              );

            }

            const assignAssessorToBatch = await Assessor.findOneAndUpdate(
              { _id: accessorId },
              { $set: { isAssessorAssignToBatch: true } },
              { new: true }
            );
            await redisDB1.destroyMatching(ONLINE_RESULT_BATCH_LIST);
            await redisDB0.destroyMatching(BATCH_LIST_ASSIGN_CANDIDATE);
            await redisDB0.destroyMatching(BATCH_LIST_EXAM_MANAGEMENT);
            return sendResponse(
              res,
              200,
              `${responseMessage.batch_create}
                ${QuestionPaperDetails.error == false
                ? QuestionPaperDetails.message
                : "Something Went wrong with question Paper"
              }`,
              saveBatchDetails
            );
          } else {
            return errorResponse(
              res,
              400,
              responseMessage.batch_not_create,
              responseMessage.errorMessage
            );
          }
        } catch (error) {
          //return new Error(error.message)
          return;
          return errorResponse(res, 500, responseMessage.something_wrong, error.message);
        }
      };


      await mainFunction(req, res)

    }


    else {

      const version = questionPaper?.version;
      const level = questionPaper?.level;

      if (!version && !level) {
        return errorResponse(
          res,
          400,
          "Version or level not provided",
          "Version or level not provided"
        );
      }

      const jobRoleDetails = await JobRole.findOne({ _id: jobRole });
      jobRoleNames = jobRoleDetails?.jobRole ?? null;
      let TotalNoOfPracticalQuestion = 0;
      let TotalNoOfTheoryQuestion = 0;
      let TotalNoOfVivaQuestion = 0;
      let totalNosQuestionTheory = 0;
      let totalNosQuestionPractical = 0;
      let totalNosQuestionViva = 0;

      let section = { theory: false, practical: false, viva: false };
      questionPaper.sectionTable.forEach((item) => {
        if (item.sectionName == "theory" && item.isSelected) {
          section.theory = true;
        }
        if (item.sectionName == "practical" && item.isSelected) {
          section.practical = true;
        }
        if (item.sectionName == "viva" && item.isSelected) {
          section.viva = true;
        }
      });

      if (section.theory) {
        TotalNoOfTheoryQuestion = await findTotalNoOfQuestionSection(
          jobRoleDetails.jobRole,
          "Theory",
          level,
          version
        );

        totalNosQuestionTheory = await totalNosQuestions(
          jobRoleDetails.jobRole,
          "Theory",
          version,
          level
        );
      }
      if (section.viva) {
        TotalNoOfVivaQuestion = await findTotalNoOfQuestionSection(
          jobRoleDetails.jobRole,
          "viva",
          level,
          version
        );
        totalNosQuestionViva = await totalNosQuestions(
          jobRoleDetails.jobRole,
          "viva",
          version,
          level
        );
      }

      if (section.practical) {
        TotalNoOfPracticalQuestion = await findTotalNoOfQuestionSection(
          jobRoleDetails.jobRole,
          "practical",
          level,
          version
        );
        totalNosQuestionPractical = await totalNosQuestions(
          jobRoleDetails.jobRole,
          "practical",
          version,
          level
        );
      }

      if (
        section.theory &&
        TotalNoOfTheoryQuestion <
        totalNosQuestionTheory * questionPaper.questionSet
      ) {
        return errorResponse(
          res,
          400,
          "Question not Sufficient in theory to create question Paper",
          "Question not Sufficient in theory to create question Paper"
        );
      }

      if (section.theory && totalNosQuestionTheory.nosCount == 0) {
        return errorResponse(
          res,
          400,
          "Theory Nos not found",
          "Theory Nos not found"
        );
      }
      if (section.viva && TotalNoOfVivaQuestion < totalNosQuestionViva) {
        return errorResponse(
          res,
          400,
          "Question not Sufficient in viva to create question Paper",
          "Question not Sufficient in viva to create question Paper"
        );
      }
      if (section.viva && totalNosQuestionViva.nosCount == 0) {
        return errorResponse(
          res,
          400,
          "Viva Nos not found",
          "Viva Nos not found"
        );
      }
      if (
        section.practical &&
        TotalNoOfPracticalQuestion < totalNosQuestionPractical
      ) {
        return errorResponse(
          res,
          400,
          "Question not Sufficient in practical to create question Paper",
          "Question not Sufficient in practical to create question Paper"
        );
      }
      if (section.practical && totalNosQuestionPractical.nosCount == 0) {
        return errorResponse(
          res,
          400,
          "Practical Nos not found",
          "Practical Nos not found"
        );
      }
      if (!jobRoleDetails) return errorResponse(res, 400, "no jobRole found");
      let startDateTime = moment
        .utc(`${startDate} ${startTime}`, "DD/MM/YYYY hh:mmA")
        .toISOString();
      let endDateTime = moment
        .utc(`${endDate} ${endTime}`, "DD/MM/YYYY hh:mmA")
        .toISOString();
      // console.log(startDateTime, endDateTime);
      let saveBatchDetails = new Batch({
        batchSize,
        batchId,
        startDate,
        endDate,
        startTime,
        endTime,
        startDateTime,
        endDateTime,
        // examCenterId,
        batchMode,
        proctoring,
        questionPaper,
        accesorStatus,
        accessorId,
        // proctorId,
        financeRemarks,
        schemeId,
        // subSchemeId,
        assignAssessorProctor,
        clientId: jobRoleDetails?.clientId,
        jobRole,
        shareCredentials,
        assessorFeePerCandidate,
        batchStartDate: formattedBatchStartDate,
        batchEndDate: formattedBatchEndDate,
        schemeName: scheme?.schemeName || null,
        subSchemeName: subScheme?.subSchemeName || null,
        accessorName: accessor?.fullName || null,
        clientname: clientFromJobRole?.clientname || null,
        jobRoleNames,
        colorAndTTSEnabled: questionPaper.colorAndTTSEnabled
      });

      if (subSchemeId) {
        saveBatchDetails.subSchemeId = subSchemeId;
      }
      if (proctorId) {
        saveBatchDetails.proctorId = proctorId;
      }
      if (examCenterId) {
        saveBatchDetails.examCenterId = examCenterId;
        saveBatchDetails.examCenterName = examCenter.examCenterName || null;
      }

      await saveBatchDetails.save();

      if (saveBatchDetails) {
        if (accessorId) {
          await new AssesorNotificationModel({
            recipient: accessorId,
            sender: req.user?._id || accessorId,
            type: "other",
            title: batchId,
            content: "Accept the Batch Request to process further",
          }).save();
        }
        const QuestionPaperDetails = await createQuestionPaper(
          { batchId: saveBatchDetails._id },
          res
        );
        // console.log("questionDetails", QuestionPaperDetails);
        if (!QuestionPaperDetails || QuestionPaperDetails.error == true) {
          const batchDetails = await Batch.deleteOne({
            _id: saveBatchDetails._id,
          });
          const assesMentDetails = await createAssesmentModel.deleteOne({
            batch_id: saveBatchDetails._id,
          });
          console.log("batch delete", batchDetails, assesMentDetails);
          return errorResponse(
            res,
            400,
            QuestionPaperDetails.message,
            "Some thing wrong with question Paper"
          );
        }

        const assignAssessorToBatch = await Assessor.findOneAndUpdate(
          { _id: accessorId },
          { $set: { isAssessorAssignToBatch: true } },
          { new: true });
          await redisDB1.destroyMatching(ONLINE_RESULT_BATCH_LIST);
          await redisDB0.destroyMatching(BATCH_LIST_ASSIGN_CANDIDATE);
          await redisDB0.destroyMatching(BATCH_LIST_EXAM_MANAGEMENT);
          await redisDB0.destroyMatching(BATCH_LIST_ASSIGN_CANDIDATE);
        // await scheduleBatchAutoSubmit(saveBatchDetails); need to discuss with Sourav and fix
        return sendResponse(
          res,
          200,
          `${responseMessage.batch_create}
              ${QuestionPaperDetails.error == false
            ? QuestionPaperDetails.message
            : "Something Went wrong with question Paper"
          }`,
          saveBatchDetails
        );
      } else {
        return errorResponse(
          res,
          400,
          responseMessage.batch_not_create,
          responseMessage.errorMessage
        );
      }
    }


  } catch (err) {
    console.log("error", err);
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      err.message
    );
  }
};

const findTotalNoOfQuestionSection = async (
  jobRole,
  section,
  level,
  version
) => {
  try {
    const totalNoOfQuestions = await QuestionBank.find({
      $and: [
        // { $or: [  {jobRole:jobRoleDetails.jobRole},
        //           {jobRoleId:jobRoleDetails._id},
        //       ]
        // },
        // {jobRole:jobRoleDetails._id},
        { jobRole: jobRole },
        { status: 'active' },
        { section: section },
        //{ nos: { $in : nosNames }   },

        // added on 27 jan morning
        { jobLevel: level },
        { version: version },
      ],
    });
    // console.log('questionBank',section,totalNoOfQuestions)
    let totalQuestion = totalNoOfQuestions.reduce((acc, curr) => {
      acc = acc + Number(curr.questionCount);
      return acc;
    }, 0);

    return totalQuestion || 0;
  } catch (err) {
    return err;
  }
};

const totalNosQuestions = async (jobRole, section, version, level, existingNos=[]) => {
  // console.log(jobRole, section, version, level, existingNos)
  // console.log("existingNos-->", existingNos)
  let nosList = {};
  let nosCount = 0;
  if (section == "Theory") {
    nosList = await NosTheory.findOne({
      $and: [
        { jobRole },
        { section },
        { "nosData.level": level },
        { "nosData.version": version },
        // { "nosData.NOS": { $nin : existingNos }}
      ],
    });
    // console.log("nosList-->", nosList)
    nosCount = nosList?.nosData.reduce((acc, curr) => {
      if (curr.version == version && curr.level == level) {
        // console.log("theory", curr);
     
          if(!existingNos.includes(curr.NOS)){
            // console.log('questionCount-->', curr.totalNOQ)
            acc = acc + Number(curr.totalNOQ);
          }
      
        
      }

      return acc;
    }, 0);
  } else if (section == "viva") {
    nosList = await VivaPracticalNosModel.findOne({
      $and: [
        { jobRole },
        // { section: "practical" },
        { "nosData.level": level },
        { "nosData.version": version },
      ],
    });

    nosCount = nosList?.nosData.reduce((acc, curr) => {
      if (curr.level == level && curr.version == version) {
        acc = acc + Number(curr.vivaNOQ);
      }

      return acc;
    }, 0);
    nosCount = nosCount == undefined ? 0 : nosCount;
  } else if (section == "practical") {
    nosList = await VivaPracticalNosModel.findOne({
      $and: [
        { jobRole },
        // { section: "practical" },
        { "nosData.level": level },
        { "nosData.version": version },
      ],
    });
    
    nosCount = nosList?.nosData.reduce((acc, curr) => {
      if (curr.level == level && curr.version == version) {
        acc = acc + Number(curr.practicalNOQ);
      }
      
      return acc;
    }, 0);
    nosCount = nosCount == undefined ? 0 : nosCount;
  } else {
  }

  let data = nosList?.nosData?.map(item2=>{
    if(!existingNos.includes(item2.NOS)){
      return item2.NOS
    }
}) || [];

  return {nosCount, nosList : data};
};


module.exports.updateBatch = async (req, res) => {
  try {
    const { error } = batchValidator(req.body);

    if (error) return errorResponse(res, 400, error.message, error.message);
    const {
      batchSize,
      batchId,
      startDate,
      endDate,
      startTime,
      endTime,
      examCenterId,
      batchMode,
      proctoring,
      questionPaper,
      accesorStatus,
      accessorId,
      proctorId,
      financeRemarks,
      schemeId,
      subSchemeId,
      assignAssessorProctor,
      jobRole,
      shareCredentials,
      assessorFeePerCandidate,
      batchStartDate,
      batchEndDate,
    } = req.body;

    const ExistBatch = await Batch.findOne({ _id: req.params.id });

    if (!ExistBatch)
      return errorResponse(
        res,
        400,
        responseMessage.batch_not_create,
        "batch not Exist!"
      );

    if (ExistBatch.isAcceptAssesor && ExistBatch.accessorId != accessorId) {
      return errorResponse(
        res,
        400,
        "Could not change assessor Batch Accepted",
        "Could not change assessor Batch Accepted"
      );
    }
    // startDate and endDate should be within the batch start and end date
    if (!batchStartDate || !batchEndDate) {
      return errorResponse(
        res,
        400,
        "Batch start date and end date is required",
        "Batch start date and end date is required"
      );
    }

    const momentBatchStartDate = moment(batchStartDate, "DD/MM/YYYY").startOf('day');
    const momentBatchEndDate = moment(batchEndDate, "DD/MM/YYYY").endOf('day');
    const momentStartDate = moment(startDate, "DD/MM/YYYY").startOf('day');
    const momentEndDate = moment(endDate, "DD/MM/YYYY").endOf('day');

    if (momentBatchEndDate.toDate() < momentBatchStartDate.toDate())
      return errorResponse(
        res,
        400,
        "Batch end date should be greater than or equal to start date",
        "Batch end date should be greater than or equal to start date"
      );

    if (momentStartDate.toDate() < momentBatchStartDate.toDate()) {
      return errorResponse(
        res,
        400,
        "Assessment cannot start before batch start date",
        "Assessment cannot start before batch start date"
      );
    }

    if (momentEndDate.toDate() < momentBatchStartDate.toDate()) {
      return errorResponse(
        res,
        400,
        "Assessment end date must be within the batch date range",
        "Assessment end date must be within the batch date range"
      );
    }

    if (momentEndDate.toDate() < momentStartDate.toDate())
      return errorResponse(
        res,
        400,
        "Assessment end must be greater than or equal to assessment start date",
        "Assessment end must be greater than or equal to assessment start date"
      );

    let examCenter = null;
    // checking the seat capacity  
    if (examCenterId) {
      examCenter = await ExamCenter.findOne({ _id: examCenterId });
      if (!examCenter)
        return errorResponse(
          res,
          400,
          "No exam center found.",
          "No exam center found."
        );

      if (batchSize > examCenter.noOfSeats)
        return errorResponse(
          res,
          400,
          "Batch Size can not be more than exam center seat capacity",
          "Batch Size can not be more than exam center seat capacity"
        );
    }

    // const jobRoleDetails = await JobRole.findOne({ _id: jobRole });
    // if (!jobRoleDetails) return errorResponse(res, 400, "no jobRole found");

    if (proctorId) {
      ExistBatch.proctorId = proctorId;
    }
    if (subSchemeId) {
      // subSchemeId ? SubScheme.findById(subSchemeId).select("subSchemeName") 
      const newSubScheme = await SubScheme.findById(subSchemeId).select("subSchemeName") 
      ExistBatch.subSchemeId = subSchemeId;
      ExistBatch.subSchemeName = newSubScheme.subSchemeName;
    }
    if (schemeId) {
      const newScheme = await Scheme.findById(schemeId).select("schemeName");
      ExistBatch.schemeName = newScheme.schemeName;
    }
    if (examCenterId) {
      ExistBatch.examCenterId = examCenterId;
      ExistBatch.examCenterName = examCenter.examCenterName || null;
    }

    if (batchMode === "online") {
      ExistBatch.proctoring = proctoring
    }

    if (batchMode === "offline") {
      ExistBatch.proctoring = { imageProctor: {}, videoStream: {}, wrongLogin: {}, browserExit: {} }
    }

    let startDateTime = moment(
      `${startDate} ${startTime}`,
      "DD/MM/YYYY hh:mmA"
    );
    let endDateTime = moment(`${endDate} ${endTime}`, "DD/MM/YYYY hh:mmA");
    const formattedBatchStartDate = moment(batchStartDate, "DD/MM/YYYY").startOf('day').toDate();
    const formattedBatchEndDate = moment(batchEndDate, "DD/MM/YYYY").endOf('day').toDate();
    ExistBatch.startDateTime = startDateTime;
    ExistBatch.startDateTime = endDateTime;
    (ExistBatch.batchSize = batchSize),
      // (ExistBatch.batchId = batchId),
      (ExistBatch.startDate = startDate),
      (ExistBatch.endDate = endDate),
      (ExistBatch.batchMode = batchMode),
      (ExistBatch.proctorId =
        assignAssessorProctor == "true" ? (proctorId || null) : null),
      (ExistBatch.accesorStatus = accesorStatus),
      (ExistBatch.accessorId =
        assignAssessorProctor == "true" ? accessorId : null),
      (ExistBatch.financeRemarks = financeRemarks),
      (ExistBatch.schemeId = schemeId),
      (ExistBatch.assignAssessorProctor = assignAssessorProctor);
    // ExistBatch.jobRole = jobRole;
    // ExistBatch.clientId = jobRoleDetails?.clientId;
    ExistBatch.startTime = startTime;
    ExistBatch.endTime = endTime;

    ExistBatch.shareCredentials = shareCredentials
    ExistBatch.assessorFeePerCandidate = assessorFeePerCandidate
    ExistBatch.batchStartDate = formattedBatchStartDate
    ExistBatch.batchEndDate = formattedBatchEndDate
    ExistBatch.colorAndTTSEnabled = questionPaper.colorAndTTSEnabled;


    const regex = /^\d{2,3}$/;
    let examDurationError = false;

    questionPaper.sectionTable.forEach((item) => {
      if (item.sectionName === "theory" && item.examDuration !== null) {
        if (regex.test(item.examDuration)) {
          item.examDuration = `${item.examDuration}min`;
        } else {
          examDurationError = true;
        }
      }
    });

    if (examDurationError) {
      return errorResponse(
        res,
        400,
        "exam duration given in question paper should be a number of maximum 3 digit",
        "exam duration given in question paper should be a number of maximum 3 digit"
      );
    }

    const oldPassingPercentage = ExistBatch.questionPaper.passingPercentage

    ExistBatch.questionPaper = questionPaper;
    const saveBatchDetails = await ExistBatch.save();

    if (saveBatchDetails) {


      //logic for udpate passing percentage based pass/fail candidate 

      // console.log('ExistBatch.questionPaper.passingPercentage------>', oldPassingPercentage)
      // console.log('questionPaper.passingPercentage------>', questionPaper.passingPercentage)

      const parsedNewPassingPercentage = parseFloat(questionPaper.passingPercentage)

      if (oldPassingPercentage !== parsedNewPassingPercentage) {

        //update candidateReport
        const updateCandidateReport = await CandidateReport.updateMany(
          { batchId: ExistBatch._id },
          [
            {
              $set: {
                passingPercentage: questionPaper.passingPercentage.toString(),
                passedStatus: {

                  $cond: [
                    {
                      $gte: [
                        {
                          $toDouble: {
                            $substr: ["$percentageScored", 0, { $subtract: [{ $strLenCP: "$percentageScored" }, 1] }]
                          }
                        },
                        parsedNewPassingPercentage
                      ]
                    },
                    "Pass",
                    "Fail"
                  ]
                }
              }
            }
          ]
        );

        //update online result
        const updateOnlineResult = await OnlineResultModel.updateMany(
          { batch_mongo_id: ExistBatch._id },
          [
            {
              $set: {
                result: {
                  $cond: {
                    if: {
                      $gte: [
                        { $toDouble: "$percentage" },
                        parsedNewPassingPercentage
                      ]
                    },
                    then: "Pass",
                    else: "Fail"
                  }
                }
              }
            }
          ]
        );



        // console.log("updateCandidateReport-->", updateCandidateReport)
        // console.log("updateOnlineResult-->", updateOnlineResult)

      }



      await redisDB1.destroyMatching(ONLINE_RESULT_BATCH_LIST);
      await redisDB0.destroyMatching(BATCH_LIST_ASSIGN_CANDIDATE);
      await redisDB0.destroyMatching(BATCH_LIST_EXAM_MANAGEMENT);
      await redisDB0.destroyMatching(BATCH_LIST_ASSIGN_CANDIDATE);
      return sendResponse(
        res,
        200,
        "Batch update successfully",
        saveBatchDetails
      );
    } else {
      return errorResponse(
        res,
        400,
        responseMessage.batch_not_create,
        responseMessage.errorMessage
      );
    }
  } catch (err) {
    console.log('err--->', err)
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      err.message
    );
  }
};

const generateBatchListCacheKey = (req) => {
  const { page = 1, limit = 10, ...filters } = req.query;
  return `batchList:${page}:${limit}:${JSON.stringify(filters)}`;
};

module.exports.batchList = async (req, res) => {
  try {
    const matchQuery = batchFilter(req);
    let { page, limit, skip, sortOrder } = Paginate(req);
    sortOrder.createdAt = parseInt(sortOrder.createdAt, 10);
    // Aggregation Pipeline

    // console.log(Batch.find({}))
    const pipeline = [
      // Populate fields
      {
        $lookup: {
          from: "schemes",
          localField: "schemeId",
          foreignField: "_id",
          as: "schemeId",
          pipeline: [{ $project: { schemeName: 1 } }],
        },
      },
      {
        $lookup: {
          from: "assessors",
          localField: "accessorId",
          foreignField: "_id",
          as: "accessorId",
          pipeline: [{ $project: { fullName: 1 } }],
        },
      },
      {
        $lookup: {
          from: "clients",
          localField: "clientId",
          foreignField: "_id",
          as: "clientId",
          pipeline: [{ $project: { clientname: 1 , clientcode: 1, email: 1} }],
        },
      },
      {
        $lookup: {
          from: "jobroles",
          localField: "jobRole",
          foreignField: "_id",
          as: "jobRole",
          pipeline: [{ $project: { jobRole: 1 } }],
        },
      },
      {
        $lookup: {
          from: "subschemes",
          localField: "subSchemeId",
          foreignField: "_id",
          as: "subSchemeId",
          pipeline: [{ $project: { subSchemeName: 1 } }],
        },
      },
      // Unwind populated fields to perform match operation
      // { $unwind: { path: '$accessorId', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$schemeId", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$clientId", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$jobRole", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$subSchemeId", preserveNullAndEmptyArrays: true } },

      // for multijobRole
      {$unwind: { path: "$questionPaper.multipleJobRole",preserveNullAndEmptyArrays: true}},

      {
        $lookup: {
          from: "jobroles",
          localField: "questionPaper.multipleJobRole.jobRoleId",
          foreignField: "_id",
          as: "questionPaper.multipleJobRole.jobRoleId"
        }
      },

      {$unwind: { path: "$questionPaper.multipleJobRole.jobRoleId",preserveNullAndEmptyArrays: true}},

      {$group: {
        _id: "$_id",
        "combinedFields": { "$mergeObjects": "$$ROOT" },
        "questionPaper": {
          "$push": "$questionPaper.multipleJobRole"
        }
      }},

      {$addFields: {
        "combinedFields.questionPaper.multipleJobRole": "$questionPaper"
      }},

      {$replaceRoot: {
        newRoot: "$combinedFields"
      }},

      // Applied match criteria
      { $match: matchQuery },

      { $sort: sortOrder },

      // $facet for parallel counting and pagination
      {
        $facet: {
          total: [{ $count: "count" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },

      // Formatting the output
      {  
        $project: {
          accessorId: { $arrayElemAt: ["$accessorId", 0] },
          total: { $arrayElemAt: ["$total.count", 0] },
          data: 1,
        },
      },
    ];

    const results = await Batch.aggregate(pipeline);

    // Handling results
    if (!results || results.length === 0) {
      return errorResponse(
        res,
        400,
        "Batch not found",
        "No batch details found with the given filters"
      );
    }

    const { total, data } = results[0];

    const response = await Promise.all(
      data.map(async (item) => {
        const data = await candidate_Appeared_In_Batch(
          item._id,
          item.batchMode 
        );
        return {
          ...JSON.parse(JSON.stringify(item)),
          candidate_Appeared_In_Batch: data,
        };
      })
    );

    return sendResponse(res, 200, "Batch found", {
      batchDetails: response,
      page,
      totalCounts: total ?? 0,
      totalPages: total ? Math.ceil(total / limit) : 0,
    });
  } catch (error) {
    return errorResponse(res, 500, "Internal Server Error", error.message);
  }
};

const BATCH_SIZE = 100;

const migrateClientNamesToBatches = async () => {
  let hasMore = true;
  let skip = 0;
  let processed = 0;

  while (hasMore) {
    const batches = await Batch.find({$or: [{ clientname: { $exists: false } }, { clientname: null } ]})
      .select("_id clientId")
      .limit(BATCH_SIZE)
      .skip(skip)
      .lean();

    if (!batches.length) {
      hasMore = false;
      break;
    }

    const updates = batches.map(async (batch) => {
      if (!batch.clientId) return;

      const client = await ClientModel.findById(batch.clientId)
        .select("clientname")
        .lean();
      if (client?.clientname) {
        await Batch.updateOne(
          { _id: batch._id },
          { $set: { clientname: client.clientname } }
        );
      }
    });

    // await Promise.allSettled(updates);
    processed += batches.length;
    skip += BATCH_SIZE;

    console.log(`Processed ${processed} batches so far...`);
  }

  console.log("Migration complete ✅");
};

const migrateJobRoleNamesToBatches = async () => {
  let page = 0;
  let totalProcessed = 0;
  while (true) {
    const batches = await Batch.find({
      $or: [{ jobRoleNames: { $exists: false } }, { jobRoleNames: null }],
    })
      .select(
        "_id jobRole questionPaper.isMultiJobRole questionPaper.multipleJobRole"
      )
      .skip(page * BATCH_SIZE)
      .limit(BATCH_SIZE)
      .lean();

    if (!batches.length) break;

    let updated = 0;
    let skipped = 0;
    const bulkOps = [];

    for (const batch of batches) {
      let jobRoleNames = null;

      if (
        batch.questionPaper?.isMultiJobRole &&
        Array.isArray(batch.questionPaper.multipleJobRole)
      ) {
        const jobRoleIds = batch.questionPaper.multipleJobRole
          .map((jr) => jr.jobRoleId)
          .filter(Boolean);

        if (!jobRoleIds.length) {
          skipped++;
          continue;
        }

        const jobRoles = await JobRole.find({ _id: { $in: jobRoleIds } })
          .select("jobRole")
          .lean();
        jobRoleNames = jobRoles.map((jr) => jr.jobRole);
      } else if (batch.jobRole) {
        const jr = await JobRole.findById(batch.jobRole)
          .select("jobRole")
          .lean();
        jobRoleNames = jr?.jobRole || null;
      }

      if (jobRoleNames) {
        updated++;
        bulkOps.push({
          updateOne: {
            filter: { _id: batch._id },
            update: { $set: { jobRoleNames } },
          },
        });
      } else {
        skipped++;
      }
    }

    if (bulkOps.length) {
      await Batch.bulkWrite(bulkOps);
    }

    totalProcessed += batches.length;

    console.log(
      `📦 Batch #${page + 1} → Total: ${
        batches.length
      }, ✅ Updated: ${updated}, ❌ Skipped: ${skipped}, 📊 Total Processed: ${totalProcessed}`
    );

    page++;
  }

  console.log("🎉 Job role names migration completed ✅");
};

const migrateSchemeNames = async () => {
  let page = 0;
  let totalProcessed = 0;

  while (true) {
    const batches = await Batch.find({
      schemeName: { $exists: false },
      schemeId: { $ne: null },
    })
      .select("_id schemeId")
      .skip(page * BATCH_SIZE)
      .limit(BATCH_SIZE)
      .lean();

    if (!batches.length) break;

    const bulkOps = [];
    let updated = 0;
    let skipped = 0;

    for (const batch of batches) {
      const scheme = await Scheme.findById(batch.schemeId)
        .select("schemeName")
        .lean();
      if (scheme?.schemeName) {
        bulkOps.push({
          updateOne: {
            filter: { _id: batch._id },
            update: { $set: { schemeName: scheme.schemeName } },
          },
        });
        updated++;
      } else {
        skipped++;
      }
    }

    if (bulkOps.length) {
      await Batch.bulkWrite(bulkOps);
    }

    totalProcessed += batches.length;

    console.log(
      `📦 Page ${page + 1}: Total ${
        batches.length
      }, ✅ Updated ${updated}, ❌ Skipped ${skipped}, 📊 Total Processed: ${totalProcessed}`
    );

    page++;
  }

  console.log("🎉 Scheme names migration completed ✅");
};

const migrateSubSchemeNames = async () => {
  let page = 0;
  let totalProcessed = 0;

  while (true) {
    const batches = await Batch.find({
      subSchemeName: { $exists: false },
      subSchemeId: { $ne: null },
    })
      .select("_id subSchemeId")
      .skip(page * BATCH_SIZE)
      .limit(BATCH_SIZE)
      .lean();

    if (!batches.length) break;

    const bulkOps = [];
    let updated = 0;
    let skipped = 0;

    for (const batch of batches) {
      const sub = await SubScheme.findById(batch.subSchemeId)
        .select("subSchemeName")
        .lean();
      if (sub?.subSchemeName) {
        bulkOps.push({
          updateOne: {
            filter: { _id: batch._id },
            update: { $set: { subSchemeName: sub.subSchemeName } },
          },
        });
        updated++;
      } else {
        skipped++;
      }
    }

    if (bulkOps.length) {
      await Batch.bulkWrite(bulkOps);
    }

    totalProcessed += batches.length;

    console.log(
      `📦 Page ${page + 1}: Total ${
        batches.length
      }, ✅ Updated ${updated}, ❌ Skipped ${skipped}, 📊 Total Processed: ${totalProcessed}`
    );

    page++;
  }

  console.log("🎉 Sub-scheme names migration completed ✅");
};

const migrateAccessorNames = async () => {
  let page = 0;
  let totalProcessed = 0;

  while (true) {
    const batches = await Batch.find({
      accessorName: { $exists: false, $eq: null },
      accessorId: { $ne: null },
    })
      .select("_id accessorId")
      .skip(page * BATCH_SIZE)
      .limit(BATCH_SIZE)
      .lean();

    if (!batches.length) break;

    const bulkOps = [];
    let updated = 0;
    let skipped = 0;

    for (const batch of batches) {
      console.log("accessor", batch.accessorId);

      const accessor = await Assessor.findById(batch.accessorId)
        .select("fullName")
        .lean();
        
      if (accessor?.fullName) {
        bulkOps.push({
          updateOne: {
            filter: { _id: batch._id },
            update: { $set: { accessorName: accessor.fullName } },
          },
        });
        updated++;
      } else {
        skipped++;
      }
    }

    if (bulkOps.length) {
      await Batch.bulkWrite(bulkOps);
    }

    totalProcessed += batches.length;

    console.log(
      `📦 Page ${page + 1}: Total ${
        batches.length
      }, ✅ Updated ${updated}, ❌ Skipped ${skipped}, 📊 Total Processed: ${totalProcessed}`
    );

    page++;
  }

  console.log("🎉 Accessor names migration completed ✅");
};

// const generateBatchListV2CacheKey = ({ matchQuery, page, limit, skip, sortOrder }) => {
//   const keyObj = {
//     matchQuery,
//     page,
//     limit,
//     skip,
//     sortOrder,
//   };
//   const keyString = JSON.stringify(keyObj);
//   return `${BATCH_LIST_EXAM_MANAGEMENT}:${Buffer.from(keyString).toString("base64")}`;
// };

const stableStringify = (obj) =>
  JSON.stringify(obj, (key, value) => {
    if (value && typeof value === 'object' && !(value instanceof RegExp) && !Array.isArray(value)) {
      return Object.keys(value).sort().reduce((res, k) => {
        res[k] = value[k];
        return res;
      }, {});
    }
    return value instanceof RegExp ? value.toString() : value;
  }, 2);

const generateBatchListV2CacheKey = ({ matchQuery, page, limit, skip, sortOrder }) => {
  const keyObj = {
    matchQuery: stableStringify(matchQuery),
    page,
    limit,
    skip,
    sortOrder
  };
  return `${BATCH_LIST_EXAM_MANAGEMENT}:${Buffer.from(JSON.stringify(keyObj)).toString("base64")}`;
};


module.exports.examManagementbatchList = async (req, res) => {
  try {
    const matchQuery = batchFilterV2(req);
    let { page, limit, skip, sortOrder } = Paginate(req);
    sortOrder.createdAt = parseInt(sortOrder.createdAt, 10);
    // await migrateClientNamesToBatches();
    // await migrateJobRoleNamesToBatches();
    // await migrateSchemeNames();
    // await migrateSubSchemeNames();
    // await migrateAccessorNames();

    // const examCenters = await ExamCenter.find().lean();

    // for ( let center of examCenters)  {
    //   await Batch.updateMany(
    //     { examCenterId: center._id },
    //     { $set: { examCenterName: center.examCenterName || null } }
    //   );
    // };

    const cacheKey = generateBatchListV2CacheKey({ matchQuery, page, limit, skip, sortOrder });
    
    const cached = await redisDB0.get(cacheKey);
    if (cached) {
      return sendResponse(res, 200, "Batch list fetched", cached, true);
    }
    const pipeline = [
      { $match: matchQuery },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $sort: sortOrder },
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                assessmentId: 1,
                batchId: 1,
                clientname: 1,
                schemeName: 1,
                subSchemeName: 1,
                jobRoleNames: 1,
                accessorName: 1,
                startDate: 1,
                endDate: 1,
                startTime: 1,
                endTime: 1,
                batchSize: 1,
                batchMode: 1,
                status: 1,
                createdAt: 1,

                // Extract levels and versions conditionally
                level: {
                  $cond: {
                    if: { $eq: ["$questionPaper.isMultiJobRole", true] },
                    then: {
                      $map: {
                        input: "$questionPaper.multipleJobRole",
                        as: "role",
                        in: "$$role.level"
                      }
                    },
                    else: "$questionPaper.level"
                  }
                },
                version: {
                  $cond: {
                    if: { $eq: ["$questionPaper.isMultiJobRole", true] },
                    then: {
                      $map: {
                        input: "$questionPaper.multipleJobRole",
                        as: "role",
                        in: "$$role.version"
                      }
                    },
                    else: "$questionPaper.version"
                  }
                }
              }
            }

          ],
        },
      },
      {
        $project: {
          data: 1,
          totalCounts: { $arrayElemAt: ["$metadata.total", 0] },
        },
      },
    ];

    const [result] = await Batch.aggregate(pipeline);
    const responsePayload = {
      batchDetails: result?.data || [],
      page,
      totalCounts: result?.totalCounts || 0,
      totalPages: Math.ceil((result?.totalCounts || 0) / limit),
    };
     await redisDB0.set(cacheKey, responsePayload, process.env.REDIS_DEFAULT_EXPIRY * 12);

    return sendResponse(res, 200, "Batch list fetched", responsePayload);
  } catch (error) {
    return errorResponse(res, 500, "Internal Server Error", error.message);
  }
};

module.exports.batchListForTotalBatchExport = async (req, res) => {
  try {
    // Get basic filtering
    const matchQuery = batchFilter(req);
    let { page, limit, skip, sortOrder } = Paginate(req);
    sortOrder.createdAt = parseInt(sortOrder.createdAt, 10);
    // Get total count efficiently with a simple query
    const totalCount = await Batch.countDocuments();
    if (totalCount === 0) {
      return sendResponse(res, 200, "No batches found", {
        batchDetails: [],
        page,
        totalCounts: 0,
        totalPages: 0,
      });
      //return errorResponse(res, 400, "Batch not found", "No batch details found with the given filters");
    }
    
    // One streamlined pipeline with clear stages
    const pipeline = [
      // Stage 1: Apply essential filters first
      // { $match: matchQuery },
      
      // Stage 2: Sort and paginate early to reduce documents
      { $sort: { createdAt: -1 } },
      // { $skip: skip },
      // { $limit: limit },
      
      // Stage 3: Do all lookups in a single stage
      {
        $lookup: {
          from: "jobroles",
          localField: "jobRole",
          foreignField: "_id",
          as: "jobRole",
        },
      },
      {
        $lookup: {
          from: "schemes",
          localField: "schemeId",
          foreignField: "_id",
          as: "schemeId",
        },
      },
      {
        $lookup: {
          from: "assessors",
          localField: "accessorId",
          foreignField: "_id",
          as: "accessorId",
        },
      },
      {
        $lookup: {
          from: "clients",
          localField: "clientId",
          foreignField: "_id",
          as: "clientId",
        },
      },
      {
        $lookup: {
          from: "subschemes",
          localField: "subSchemeId",
          foreignField: "_id",
          as: "subSchemeId",
        },
      },
      
      // Lookup job roles for multipleJobRole in the pipeline - more efficient
      {
        $lookup: {
          from: "jobroles",
          let: { multipleJobRoles: { $ifNull: ["$questionPaper.multipleJobRole", []] } },
          pipeline: [
            {
              $match: {
                $expr: {
                  $in: ["$_id", {
                    $map: {
                      input: "$$multipleJobRoles",
                      as: "mjr",
                      in: { 
                        $cond: { 
                          if: { $ne: ["$$mjr.jobRoleId", null] },
                          then: { $toObjectId: "$$mjr.jobRoleId" },
                          else: null
                        }
                      }
                    }
                  }]
                }
              }
            },
            { $project: { _id: 1, jobRole: 1 } }
          ],
          as: "allJobRolesForMultiple"
        }
      },
      
      // Stage 4: Unwind arrays
      { $unwind: { path: "$schemeId", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$clientId", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$jobRole", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$subSchemeId", preserveNullAndEmptyArrays: true } },
      
      // Process multiple job roles in the pipeline
      {
        $addFields: {
          "questionPaper.multipleJobRole": {
            $cond: {
              if: {
                $and: [
                  { $ifNull: ["$questionPaper", false] },
                  { $ifNull: ["$questionPaper.multipleJobRole", false] }
                ]
              },
              then: {
                $map: {
                  input: { $ifNull: ["$questionPaper.multipleJobRole", []] },
                  as: "mjr",
                  in: {
                    $mergeObjects: [
                      "$$mjr",
                      {
                        jobRoleId: {
                          $cond: {
                            if: { $ne: ["$$mjr.jobRoleId", null] },
                            then: {
                              $arrayElemAt: [
                                {
                                  $filter: {
                                    input: "$allJobRolesForMultiple",
                                    as: "jr",
                                    cond: { 
                                      $eq: [
                                        { $toString: "$$jr._id" }, 
                                        { $toString: "$$mjr.jobRoleId" }
                                      ] 
                                    }
                                  }
                                },
                                0
                              ]
                            },
                            else: null
                          }
                        }
                      }
                    ]
                  }
                }
              },
              else: []
            }
          }
        }
      },

      { $match: matchQuery },
      
      // Stage 6: Final projection - only keep what we need
      {
        $project: {
          _id: 1,
          schemeId: { _id: 1, schemeName: 1 },
          accessorId: { _id: 1, fullName: 1 },
          clientId: { _id: 1, clientname: 1, clientcode: 1, email: 1 },
          jobRole: { _id: 1, jobRole: 1 },
          subSchemeId: { _id: 1, subSchemeName: 1 },
          questionPaper: 1,
          batchId: 1,
          batchMode: 1,
          createdAt: 1,
          startDate: 1,
          endDate: 1,
          startTime: 1,
          endTime: 1,
          batchSize: 1,
          status: 1
        }
      }
    ];

    // If jobRole filter was specified, apply it
    if (req.query.jobRole) {
      pipeline.push({
        $match: {
          $or: [
            // Match against primary job role
            { "jobRole.jobRole": { $regex: new RegExp(`^${req.query.jobRole}$`, 'i') } },
            // Match against any job role in the multipleJobRole array
            { "questionPaper.isMultiJobRole": true, "questionPaper.multipleJobRole.jobRoleId.jobRole": { $regex: new RegExp(`^${req.query.jobRole}$`, 'i') } }
          ]
        }
      });
    }

    if (req.query.schemeName) {
      pipeline.push({
        $match: { "schemeId.schemeName": { $regex: new RegExp(`^${req.query.schemeName}$`, 'i') } }
      });
    }
    
    if (req.query.clientname) {
      pipeline.push({
        $match: { "clientId.clientname": { $regex: new RegExp(req.query.clientname, 'i') } }
      });
    }
    
    if (req.query.subSchemeName) {
      pipeline.push({
        $match: { "subSchemeId.subSchemeName": { $regex: new RegExp(req.query.subSchemeName, 'i') } }
      });
    }
    
    // Execute aggregation
    const data = await Batch.aggregate(pipeline);
    //console.log("DATA_DATA",data.length)
    if (data.length === 0) {
      return sendResponse(res, 200, "No batches found", {
        batchDetails: [],
        page,
        totalCounts: 0,
        totalPages: 0,
      });
    }
    // const batchWithCandidates = data.map(batch => ({
    //   ...batch,
    // }));

    return sendResponse(res, 200, "Batch found", {
      batchDetails: data,
      // page,
      totalCounts: data.length//totalCount,
      // totalPages: Math.ceil(totalCount / limit),
    });
  } catch (error) {
    console.error("Error in batchList:", error);
    return errorResponse(res, 500, "Internal Server Error", error.message);
  }
};


exports.getBatchById = async (req, res) => {
  try {
    const Id = req.params.id;

    const pipeline = [
      {$match: { _id: ObjectId(Id)}},
      {$unwind: { path: "$questionPaper.multipleJobRole",preserveNullAndEmptyArrays: true}},

      {
        $lookup: {
          from: "jobroles",
          localField: "questionPaper.multipleJobRole.jobRoleId",
          foreignField: "_id",
          as: "questionPaper.multipleJobRole.jobRoleId"
        }
      },

      {$unwind: { path: "$questionPaper.multipleJobRole.jobRoleId",preserveNullAndEmptyArrays: true}},

      {
        $lookup: {
          from: "examcenters",
          localField: "examCenterId",
          foreignField: "_id",
          as: "examCenterId"
        }
      },
      {
        $unwind: { path: "$examCenterId", preserveNullAndEmptyArrays: true }
      },

      {
        $lookup: {
          from: "trainingpartners",
          localField: "examCenterId.trainingPartner",
          foreignField: "_id",
          as: "examCenterId.trainingPartner"

        }
      },
      {
        $unwind: { path: "$examCenterId.trainingPartner", preserveNullAndEmptyArrays: true }
      },

      {
        $group: {
          _id: "$_id",
          "combinedFields": { "$mergeObjects": "$$ROOT" },
          "questionPaper": {
            "$push": "$questionPaper.multipleJobRole"
          }
        }
      },

      {
        $addFields: {
          "combinedFields.questionPaper.multipleJobRole": "$questionPaper"
        }
      },

      {
        $replaceRoot: {
          newRoot: "$combinedFields"
        }
      },
    ]

    const batchDetailsOutput = await Batch.aggregate(pipeline);
    const batchDetails = batchDetailsOutput[0]
    console.log("batchDetails", batchDetails);
    


    if (!batchDetails)
      return errorResponse(
        res,
        404,
        responseMessage.batch_not_found,
        responseMessage.errorMessage
      );

    batchDetails?.questionPaper?.sectionTable?.forEach((item) => {
      if (item?.sectionName === "theory") {
        if (item.examDuration) {
          return (item.examDuration = item.examDuration.split("m")[0]);
        }

        return item.examDuration;
      }
    });

    return sendResponse(res, 200, responseMessage.batch_found, batchDetails);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.changeBatchStatus = async (req, res) => {
  try {
    const Id = req.params.id;

    const batchDetails = await Batch.findById(Id);

    if (!batchDetails)
      return errorResponse(
        res,
        400,
        responseMessage.batch_not_found,
        responseMessage.errorMessage
      );

    if (batchDetails["status"] === req.body.status)
      return errorResponse(
        res,
        400,
        "request status are same as already existing status",
        responseMessage.errorMessage
      );

    batchDetails["status"] = req.body.status;

    const changedStatus = await batchDetails.save();

    if (!changedStatus)
      return errorResponse(
        res,
        400,
        "Status not able to change",
        responseMessage.errorMessage
      );

      await redisDB1.destroyMatching(ONLINE_RESULT_BATCH_LIST);
      await redisDB0.destroyMatching(BATCH_LIST_ASSIGN_CANDIDATE);
    await redisDB0.destroyMatching(BATCH_LIST_EXAM_MANAGEMENT);
    await redisDB0.destroyMatching(BATCH_LIST_ASSIGN_CANDIDATE);
    
    return sendResponse(
      res,
      200,
      "Batch status changed successfully",
      changedStatus
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.assesmentStatsByBatchId = async (req, res) => {
  try {
    const Id = req.params.id;
    if (Id) {
      if (!ObjectId.isValid(Id))
        return res.status(400).json({ message: "Id is not valid" });
      const assesmentStats = {
        studentRegistered: 0,
        studentAttended: 0,
        totalAssesments: 1,
        totalStudentAttendedPercentage: 0,
        assesmentChart: {
          completedAssesments: 0,
          incompeleteAssements: 0,
          notAttended: 0,
        },
        assesmentGraphical: [
          { name: "Student Registered", value: 0 },
          { name: "Student Attended", value: 0 },
          { name: "not attended", value: 0 },
          { name: "completed Assesments", value: 0 },
          { name: "incompleted Assesments", value: 0 },
        ],
        tpDetails: [],
      };

      const candidateDetails = await Candidate.find({
        batchId: Id,
      }).countDocuments();

      if (candidateDetails > 0) {
        const candidateReportDetails = await AnswerModel.find({
          batchId: Id,
        }).countDocuments();
        const candidateReportDetailsPass = await OnlineResultModel.find({
          batch_mongo_id: Id,
          result: "Pass",
        }).countDocuments();
        const candidateReportDetailsFail = await OnlineResultModel.find({
          batch_mongo_id: Id,
          result: "Fail",
        }).countDocuments();
        const candidateReportDetailsNotAttempt = await AnswerModel.find({
          batchId: Id
        }).countDocuments();
        assesmentStats.totalStudentAttendedPercentage = calculatePercent(
          candidateReportDetails,
          candidateDetails
        );


        const { examCenterId } = await Batch.findById(Id)
          .populate({
            path: "examCenterId",
            select: "",
            populate: { path: "trainingPartner", select: "" },
          })
          .lean();

        assesmentStats.tpDetails = { ...examCenterId };
        assesmentStats.studentRegistered = candidateDetails;
        assesmentStats.studentAttended = candidateReportDetails;
        assesmentStats.assesmentGraphical[0].value = candidateDetails;
        assesmentStats.assesmentGraphical[1].value = candidateReportDetails;
        assesmentStats.assesmentGraphical[2].value =
          candidateDetails - candidateReportDetails;
        assesmentStats.assesmentGraphical[3].value =
          candidateReportDetailsPass + candidateReportDetailsFail;
        assesmentStats.assesmentGraphical[4].value =
          candidateReportDetailsNotAttempt;
        assesmentStats.assesmentChart.notAttended = calculatePercent(
          candidateDetails - candidateReportDetails,
          candidateDetails
        );
        assesmentStats.assesmentChart.incompeleteAssements = calculatePercent(
          candidateReportDetailsNotAttempt,
          candidateDetails
        );
        assesmentStats.assesmentChart.completedAssesments = calculatePercent(
          candidateReportDetailsPass + candidateReportDetailsFail,
          candidateDetails
        );
      }
      return sendResponse(res, 200, "statics list", assesmentStats);
    }
  } catch (err) {
    console.log("error", err);
    errorResponse(res, 500, responseMessage.errorMessage, err.message);
  }
};

const calculatePercent = (obtain, total) => {
  return Number(((obtain / total) * 100).toFixed(2)) ?? 0;
};
module.exports.DeleteBatchWithOtherDetails= async (req, res) => {
  console.log('req.user',req.user)
  let session = null;
  
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const Id = req.params.id;

    const batchDetails = await Batch.findById(Id);

    if (!batchDetails)
      return errorResponse(
        res,
        400,
        responseMessage.batch_not_found,
        responseMessage.errorMessage
      );
    const assesment = await createAssesmentModel.findOne({ batch_id: Id });

    const checkOfflineResults = await OfflineResultModel.countDocuments({
      batch_mongo_id: Id,
    });

    const checkOnlineResults = await OnlineResultModel.countDocuments({
      batch_mongo_id: Id,
    });
    
    if ((checkOfflineResults > 0 || checkOnlineResults > 0) && !req.user.isSuperAdmin) {
      return errorResponse(res, 400, "Only superadmin has the right to delete batch", "Only superadmin has the right to delete batch");
    }
    const deleteSet = await setModel.deleteMany({
      assesment_id: assesment._id,
    });
    const deleteCandidates = await CandidateModel.deleteMany({ batchId: Id });
    const DeleleAssessment = await createAssesmentModel.findOneAndRemove({
      _id: assesment._id,
    });
    const DeleteBatch = await Batch.findOneAndRemove({ _id: Id });
   console.log('deleteCandidates',deleteCandidates)
   console.log('DeleleAssessment',DeleleAssessment)
   console.log('deleteSet',deleteSet)
   console.log('deleteBatch',DeleteBatch)
    await session.commitTransaction();
    await redisDB1.destroyMatching(ONLINE_RESULT_BATCH_LIST);
    await redisDB0.destroyMatching(BATCH_LIST_ASSIGN_CANDIDATE);
    await redisDB0.destroyMatching(BATCH_LIST_EXAM_MANAGEMENT);
    await redisDB0.destroyMatching(BATCH_LIST_ASSIGN_CANDIDATE);
    return sendResponse(
      res,
      200,
      "Batch removed successfully",
      "DeleteBatch"
    );
  } catch (error) {
    console.log('error',error)
   // console.log('session',session)
    if (!session) {
      await session.abortTransaction();
    }
    errorResponse(res, 500, responseMessage.errorMessage, error.message);
  } finally {
    if (session) {
      session.endSession();
    }
  }
};
module.exports.DeleteBatch = async (req, res) => {
  try {
    const Id = req.params.id;
        console.log('req.user',req.user)
        debugger;
    const batchDetails = await Batch.findById(Id);

    if (!batchDetails)
      return errorResponse(
        res,
        400,
        responseMessage.batch_not_found,
        responseMessage.errorMessage
      );

    const DeleteBatch = await Batch.findOneAndRemove({ _id: Id });

    if (DeleteBatch) {
      const assesment = await createAssesmentModel.findOne({ batch_id: Id });

      if (!assesment)
        return errorResponse(
          res,
          400,
          "Asssessment already deleted",
          "Asssessment already deleted"
        );

      const DeleleAssessment = await createAssesmentModel.findOneAndRemove({
        _id: assesment._id,
      });

      const deleteSet = await setModel.deleteMany({
        assesment_id: assesment._id,
      });

      await redisDB1.destroyMatching(ONLINE_RESULT_BATCH_LIST);
      await redisDB0.destroyMatching(BATCH_LIST_ASSIGN_CANDIDATE);
      await redisDB0.destroyMatching(BATCH_LIST_EXAM_MANAGEMENT);
      await redisDB0.destroyMatching(BATCH_LIST_ASSIGN_CANDIDATE);
      return sendResponse(
        res,
        200,
        "Batch removed successfully",
        "DeleteBatch"
      );
    }

    return errorResponse(
      res,
      400,
      "Batch not able to delete",
      responseMessage.errorMessage
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.jobRoleList = async (req, res) => {
  try {
    const {clientId}=req.query;
    let query = { status: true };
    // Add client filter based on whether clientId was provided in query params
    if (clientId) {
      query.clientId = clientId;
    } else {
      query.clientId = { $in: req?.user?.assigndClients };
    }

    const jobRoleDetails = await JobRole.find(query)
      .populate("clientId")
      .select("jobRole _id clientId qpCode");

    if (!jobRoleDetails)
      return errorResponse(
        res,
        400,
        responseMessage.job_role_not_found,
        responseMessage.errorMessage
      );

    const response = jobRoleDetails.map((item) => {
      return {
        jobRole: `${item.jobRole} - ${item.clientId?.clientname}`,
        jobRoleName: item.jobRole,
        clientId: item.clientId?._id,
        _id: item._id,
        qpCode: item.qpCode,
      };
    });

    return sendResponse(res, 200, responseMessage.job_role_found, response);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.schemeList = async (req, res) => {
  try {
    const schemeDetails = await Scheme.find({status: "active"}).select("schemeName _id");

    if (!schemeDetails)
      return errorResponse(
        res,
        400,
        responseMessage.scheme_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, responseMessage.scheme_found, schemeDetails);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.batchSubSchemeList = async (req, res) => {
  let query = {};

  if (req.query.schemeId) {
    query = {
      schemeId: req.query.schemeId,
      status: true
    };
  }

  try {
    const subSchemeDetails = await SubScheme.find(query).select(
      "subSchemeName _id"
    );

    console.log("subSchemeDetails==>",subSchemeDetails)
    if (!subSchemeDetails)
      return errorResponse(
        res,
        400,
        responseMessage.sub_scheme_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(
      res,
      200,
      responseMessage.sub_scheme_found,
      subSchemeDetails
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.proctorList = async (req, res, next) => {
  try {
    const proctorData = await Proctor.find({}).select("proctorName _id");

    if (!proctorData)
      return errorResponse(
        res,
        404,
        responseMessage.proctor_profile_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(
      res,
      200,
      responseMessage.proctor_profile_not_found,
      proctorData
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};


module.exports.assessorList = async (req, res, next) => {
  try {
    //let query = {};
    let query = { client_status: 'active', isDeleted: false };
    // if (req.query.schemeId) {
    //   if (req.query.schemeId === process.env.PM_VISHWAKARMA) {
    //     console.log('here')
    //     // For PM_VISHWAKARMA scheme - show assessors who have PM_VISHWAKARMA
    //     query = {
    //       scheme: { $in: [process.env.PM_VISHWAKARMA] }
    //     };
    //   } else {
    //     // For other schemes - exclude assessors who ONLY have PM_VISHWAKARMA
    //     query = {
    //       $or: [
    //         // Case 1: Doesn't have PM_VISHWAKARMA at all
    //         { scheme: { $nin: [process.env.PM_VISHWAKARMA] } },
    //         // Case 2: Has PM_VISHWAKARMA but also has other schemes
    //         { 
    //           $and: [
    //             { scheme: { $in: [process.env.PM_VISHWAKARMA] } },
    //             { scheme: { $not: { $size: 1 } } }
    //           ]
    //         }
    //       ]
    //     };
    //   }
    // }
    if (req.query.schemeId) {
      if (req.query.schemeId === process.env.PM_VISHWAKARMA) {
        console.log('here');
        // Add scheme condition for PM_VISHWAKARMA to the existing query
        query.scheme = { $in: [process.env.PM_VISHWAKARMA] };
      } else {
        // For other schemes - exclude assessors who ONLY have PM_VISHWAKARMA
        query.$or = [
          // Case 1: Doesn't have PM_VISHWAKARMA at all
          { scheme: { $nin: [process.env.PM_VISHWAKARMA] } },
          // Case 2: Has PM_VISHWAKARMA but also has other schemes
          {
            $and: [
              { scheme: { $in: [process.env.PM_VISHWAKARMA] } },
              { scheme: { $not: { $size: 1 } } }
            ]
          }
        ];
      }
    }
     console.log("query==>",query)
    const assessorData = await Assessor.find(query);

    // Filter to include only assessors with all documents in "accepted" statuss
    let filteredData = assessorData.filter((assessor) => {
      const hasSpecificScheme = assessor.scheme?.map(item=>item?._id?.toString()).includes(process.env.PM_VISHWAKARMA);

      if (hasSpecificScheme) {
        return true; // Automatically verified
      }
      const allAccepted = 
        assessor.education.some((edu) => edu.status === "accepted") &&
        assessor.jobRole.some((role) => role.status === "accepted") &&
        assessor.personalDetail.some((detail) => detail.status === "accepted") &&
        assessor.agreement.some((agreement) => agreement.status === "accepted");
 
      return (
        assessor.education.length &&
        assessor.jobRole.length &&
        assessor.agreement.length &&
        assessor.personalDetail.length >= 2 &&
        allAccepted
      );
    });
 
    // Extract fullName from the filteredData
    const fullNamesWithIds = filteredData.map((assessor) => ({
      _id: assessor._id,
      // fullName: `${assessor.fullName} - ${assessor.assessorId}`,
      fullName: assessor.assessorSipId  ? 
      `${assessor.fullName} - ${assessor.assessorSipId}` : assessor.fullName,
    }));
 
    if (!assessorData) {
      return errorResponse(
        res,
        404,
        responseMessage.assessor_profile_not_found,
        responseMessage.errorMessage
      );
    }
    
    return sendResponse(
      res,
      200,
      responseMessage.assessor_profile_get,
      fullNamesWithIds
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};


module.exports.questionBankList = async (req, res, next) => {
  try {
    const questionBank = await QuestionBank.find({}).select(
      "_id questionBankautoId qpCode"
    );
    if (!questionBank)
      return errorResponse(
        res,
        400,
        responseMessage.question_bankId_not_found,
        responseMessage.question_bankId_not_found
      );

    return sendResponse(res, 200, "", questionBank);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.getAllExamCenter = async (req, res) => {
  try {
    let examCenterList = await ExamCenter.find({}).select(
      "examCenterName address _id"
    );

    let modifiedExamCenterList = [];

    examCenterList.forEach((center) => {
      modifiedExamCenterList.push({
        examCenterName: center.examCenterName + " " + center.address,
        _id: center._id,
      });
    });

    if (examCenterList.length !== 0)
      return sendResponse(
        res,
        200,
        responseMessage.exam_center_get_successfully,
        { examCenterList: modifiedExamCenterList }
      );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.nosListByJobRole = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) return errorResponse(res, 400, "no job role id provided");

    const jobRoleDetails = await JobRole.findById(id);

    const theoryNosList = await TheoryNosModel.find({
      $and: [
        { jobRole: jobRoleDetails?.jobRole },
        { clientId: { $in: req.user?.assigndClients } },
      ],
    });

    const vivaPracticalNosList = await VivaPracticalNosModel.findOne({
      $and: [
        { jobRole: JobRole },
        { clientId: { $in: req.user?.assigndClients } },
      ],
    });

    let level = [];
    // let version = []

    if (!theoryNosList)
      return errorResponse(
        res,
        400,
        "No nos found in this jobRole",
        "No nos found in this jobRole"
      );

    if (theoryNosList) {
    }
    theoryNosList?.forEach((item) => {
      item.nosData?.map((nos) => {
        if (!level.includes(nos.level)) {
          level.push(nos.level);
        }

        // if(!version.includes(nos.version)){
        //   version.push(nos.version)
        // }
      });
    });

    if (theoryNosList || vivaPracticalNosList) {
      return sendResponse(
        res,
        200,
        "successfully got data",

        {
          theoryNosList,
          vivaPracticalNosList,
          level,
          // version
        }
      );
    }

    return sendResponse(res, 200, "no data found", []);
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

module.exports.nosListByJobRoleVersion = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id)
      return errorResponse(
        res,
        400,
        "no job role id provided",
        "no job role id provided"
      );

    const { level } = req.params;
    if (!level)
      return errorResponse(res, 400, "no level provided", "no level provided");

    const jobRoleDetails = await JobRole.findById(id);

    const theoryNosList = await TheoryNosModel.find({
      $and: [
        { jobRole: jobRoleDetails?.jobRole },
        { clientId: { $in: req.user?.assigndClients } },
      ],
    });

    const vivaPracticalNosList = await VivaPracticalNosModel.findOne({
      $and: [
        { jobRole: JobRole },
        { clientId: { $in: req.user?.assigndClients } },
      ],
    });

    // let level = []
    let version = [];

    if (!theoryNosList)
      return errorResponse(
        res,
        400,
        "No nos found in this jobRole",
        "No nos found in this jobRole"
      );

    if (theoryNosList) {
    }
    theoryNosList?.forEach((item) => {
      item.nosData?.map((nos) => {
        // if(!level.includes(nos.level)){
        //   level.push(nos.level)
        // }

        if (!version.includes(nos.version) && nos.level === level) {
          version.push(nos.version);
        }
      });
    });

    if (theoryNosList || vivaPracticalNosList) {
      return sendResponse(
        res,
        200,
        "successfully got data",

        {
          // theoryNosList,
          // vivaPracticalNosList,
          // level,
          version,
        }
      );
    }

    return sendResponse(res, 200, "no data found", []);
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

module.exports.multiLanguageDecider = async (req, res) => {
  try {
    const { jobRoleId, level, version } = req.params

    if (!jobRoleId, !level, !version)
      return errorResponse(res, 400, "something is missing", "something is missing");

    const jobRoleDetails = await JobRole.findById(jobRoleId);


    const theoryNosList = await TheoryNosModel.find({
      $and: [
        { jobRole: jobRoleDetails?.jobRole },
        { clientId: { $in: req.user?.assigndClients } },
      ],
    });

    const nosList = []

    if (!theoryNosList)
      return errorResponse(
        res,
        400,
        "No nos found in this jobRole",
        "No nos found in this jobRole"
      );

    if (theoryNosList) {
    }
    theoryNosList?.forEach((item) => {
      item.nosData?.map((nos) => {

        if (!nosList.includes(nos.NOS) && (nos.level === level && nos.version === version) ) {
          nosList.push(nos.NOS);
        }
      });
    });

    const questionBank = await QuestionBank.findOne({ $and:[ 
          {nos: nosList[0]},
          {jobLevel: level},
          {version: version},
          {jobRole:jobRoleDetails.jobRole,},
          {section: "Theory"},
          {secondaryLanguage: true}

    ]})

    if (theoryNosList) {
      return sendResponse(
        res,
        200,
        "successfully got data",

        questionBank
      );
    }

    return sendResponse(res, 200, "no data found", null);
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

module.exports.getAllInstruction = async (req, res) => {
  try {
    const instructionDetails = await Instruction.find({}).select(
      "_id instructionName"
    );

    return sendResponse(
      res,
      200,
      responseMessage.instruction_found,
      instructionDetails
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//showing list of assessed batch status //batchAssessedList
// module.exports.batchRequestList = async (req, res) => {
//   try {
//     const { limit, skip, sortOrder } = Paginate(req);
//     const { isAccept } = req.query;
//     if (isAccept === "true") {
//       let query = {};
//       const currentDate = moment().format("DD/MM/YYYY");
//       query = {
//         $and: [
//           // { startDate: { $gt: new Date().toLocaleDateString() } },
//           // { startDate: { $gt: currentDate } },
//           { isAcceptAssesor: true },
//         ],
//       };

//       const { filter } = getFilter(req, ["jobRole", "BatchId"]);
//       const totalCounts = await Batch.countDocuments(query);
//       const totalPages = Math.ceil(totalCounts / limit);
//       const BatchList = await Batch.find(query)
//         .populate({
//           path: "clientId",
//           select: "clientname",
//         })
//         .populate({
//           path: "schemeId",
//           select: "schemeName",
//         })
//         .populate({
//           path: "subSchemeId",
//           select: "subSchemeName",
//         })
//         .populate({
//           path: "jobRole",
//           select: "",
//         })
//         .populate({
//           path: "accessorId",
//           select: "fullName",
//         })
//         .populate({
//           path: "examCenterId",
//           select: "",
//         })
//         .populate({
//           path: "questionPaper.multipleJobRole.jobRoleId",
//           select: "",
//         })
//         .skip(skip)
//         .limit(limit)
//         .sort(sortOrder);
//       if (BatchList) {
//         return sendResponse(res, 200, "Batch List", {
//           BatchList,
//           totalCounts,
//           totalPages,
//         });
//       } else {
//         return errorResponse(res, 400, "Batch not found", "Batch not found");
//       }
//     } else if (isAccept === "false") {
//       let query = {};
//       const currentDate = moment().format("DD/MM/YYYY");

//       query = {
//         $and: [{ isAcceptAssesor: false }, { RejectComment: { $ne: null } }],
//       };

//       const { filter } = getFilter(req, ["jobRole", "BatchId"]);
//       const totalCounts = await Batch.countDocuments(query);
//       const totalPages = Math.ceil(totalCounts / limit);
//       const BatchList = await Batch.find(query)
//         .populate({
//           path: "clientId",
//           select: "clientname",
//         })
//         .populate({
//           path: "schemeId",
//           select: "schemeName",
//         })
//         .populate({
//           path: "subSchemeId",
//           select: "subSchemeName",
//         })
//         .populate({
//           path: "jobRole",
//           select: "",
//         })
//         .populate({
//           path: "accessorId",
//           select: "fullName",
//         })
//         .populate({
//           path: "examCenterId",
//           select: "",
//         })
//         .populate({
//           path: "RejctedAccessorId",
//           select: "fullName",
//         })
        
//         .populate({
//           path: "questionPaper.multipleJobRole.jobRoleId",
//           select: "",
//         })
//         .skip(skip)
//         .limit(limit)
//         .sort(sortOrder);
        
//       if (BatchList) {
//         return sendResponse(res, 200, "Batch List", {
//           BatchList,
//           totalCounts,
//           totalPages,
//         });
//       } else {
//         return errorResponse(res, 400, "Batch not found", "Batch not found");
//       }
//     } else if (isAccept === "pending") {
//       let query = {};

//       query = {
//         $and: [
//           { isAcceptAssesor: false, RejectComment: null },
//           { accessorId: { $ne: null } },
//         ],
//       };

//       const { filter } = getFilter(req, ["jobRole", "BatchId"]);
//       const totalCounts = await Batch.countDocuments(query);
//       const totalPages = Math.ceil(totalCounts / limit);
//       const BatchList = await Batch.find(query)
//         .populate({
//           path: "clientId",
//           select: "clientname",
//         })
//         .populate({
//           path: "schemeId",
//           select: "schemeName",
//         })
//         .populate({
//           path: "subSchemeId",
//           select: "subSchemeName",
//         })
//         .populate({
//           path: "jobRole",
//           select: "",
//         })
//         .populate({
//           path: "accessorId",
//           select: "fullName",
//         })
//         .populate({
//           path: "examCenterId",
//           select: "",
//         })
        
//         .populate({
//           path: "questionPaper.multipleJobRole.jobRoleId",
//           select: "",
//         })
//         .skip(skip)
//         .limit(limit)
//         .sort(sortOrder);
//       if (BatchList) {
//         return sendResponse(res, 200, "Batch List", {
//           BatchList,
//           totalCounts,
//           totalPages,
//         });
//       } else {
//         return errorResponse(res, 400, "Batch not found", "Batch not found");
//       }
//     } else {
//       return errorResponse(res, 400, "Invalid input", "Invalid input");
//     }
//   } catch (err) {
//     console.log("error", err);
//     return errorResponse(res, 500, responseMessage.something_wrong, err);
//   }
// };


//optimize code
module.exports.batchRequestList = async (req, res) => {
  try {
    const { limit, skip, sortOrder } = Paginate(req);
    const { isAccept } = req.query;

    //Determine allowed clientIds based on logged-in user
    let allowedClientIds = [];
    if (req?.user?.assigndClients?.length) {
      allowedClientIds = req.user.assigndClients.map((c) =>
        mongoose.Types.ObjectId(c._id || c)
      );
    }

    //Base query depending on isAccept
    let query = {};
    const currentDate = moment().format("DD/MM/YYYY");

    if (isAccept === "true") {
      query = { isAcceptAssesor: true };
    } else if (isAccept === "false") {
      query = { isAcceptAssesor: false, RejectComment: { $ne: null } };
    } else if (isAccept === "pending") {
      query = { isAcceptAssesor: false, RejectComment: null, accessorId: { $ne: null } };
    } else {
      return errorResponse(res, 400, "Invalid input", "Invalid input");
    }
    
    //Highlighted change: filter by allowedClientIds
    if (allowedClientIds.length > 0) {
      query.clientId = { $in: allowedClientIds };
    }

    //Apply additional filters from request (optional)
    const { filter } = getFilter(req, ["jobRole", "BatchId"]);
    if (filter?.query) {
      query = { ...query, ...filter.query };
    }

    //Get total counts and pages
    const totalCounts = await Batch.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);


    //Fetch batch list with populates
    const BatchList = await Batch.find(query)
      .populate({ path: "clientId", select: "clientname" })
      .populate({ path: "schemeId", select: "schemeName" })
      .populate({ path: "subSchemeId", select: "subSchemeName" })
      .populate({ path: "jobRole", select: "" })
      .populate({ path: "accessorId", select: "fullName" })
      .populate({ path: "RejctedAccessorId", select: "fullName" })
      .populate({ path: "examCenterId", select: "" })
      .populate({ path: "questionPaper.multipleJobRole.jobRoleId", select: "" })
      .skip(skip)
      .limit(limit)
      .sort(sortOrder);

    if (BatchList.length > 0) {
      return sendResponse(res, 200, "Batch List", { BatchList, totalCounts, totalPages });
    } else {
      return errorResponse(res, 400, "Batch not found", "Batch not found");
    }
  } catch (err) {
    console.error("error", err);
    return errorResponse(res, 500, "Something went wrong", err.message);
  }
};

module.exports.assessedBatchList = async (req, res) => {
  try {
    const { page, limit, skip, sortOrder } = Paginate(req);
    const matchQuery = batchFilter(req);
    const { isStatus } = req.query;

    const pipeline = [
      // Populate fields using $lookup
      {
        $lookup: {
          from: "schemes",
          localField: "schemeId",
          foreignField: "_id",
          as: "schemeId",
          pipeline: [{ $project: { schemeName: 1 } }],
        },
      },
      {
        $lookup: {
          from: "assessors",
          localField: "accessorId",
          foreignField: "_id",
          as: "accessorId",
          pipeline: [{ $project: { fullName: 1 } }],
        },
      },
      {
        $lookup: {
          from: "clients",
          localField: "clientId",
          foreignField: "_id",
          as: "clientId",
          pipeline: [{ $project: { clientname: 1 } }],
        },
      },
      {
        $lookup: {
          from: "jobroles",
          localField: "jobRole",
          foreignField: "_id",
          as: "jobRole",
          pipeline: [{ $project: { jobRole: 1, qpCode: 1 } }],
        },
      },
      {
        $lookup: {
          from: "subschemes",
          localField: "subSchemeId",
          foreignField: "_id",
          as: "subSchemeId",
          pipeline: [{ $project: { subSchemeName: 1 } }],
        },
      },
      // Unwind populated fields
      { $unwind: { path: "$schemeId", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$clientId", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$jobRole", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$subSchemeId", preserveNullAndEmptyArrays: true } },

      // for multijobRole
      {$unwind: { path: "$questionPaper.multipleJobRole",preserveNullAndEmptyArrays: true}},

      {
        $lookup: {
          from: "jobroles",
          localField: "questionPaper.multipleJobRole.jobRoleId",
          foreignField: "_id",
          as: "questionPaper.multipleJobRole.jobRoleId"
        }
      },

      {$unwind: { path: "$questionPaper.multipleJobRole.jobRoleId",preserveNullAndEmptyArrays: true}},

      {$group: {
        _id: "$_id",
        "combinedFields": { "$mergeObjects": "$$ROOT" },
        "questionPaper": {
          "$push": "$questionPaper.multipleJobRole"
        }
      }},

      {$addFields: {
        "combinedFields.questionPaper.multipleJobRole": "$questionPaper"
      }},

      {$replaceRoot: {
        newRoot: "$combinedFields"
      }},

      // Apply initial match criteria
      { $match: matchQuery },

      // Sort by sortOrder
      { $sort: sortOrder },
    ];

    // Execute the pipeline to get initial batch list
    let batchList = await Batch.aggregate(pipeline);

    // Function to check the batch time
    const checkTime = (
      { startDate, endDate, startTime, endTime },
      batchType
    ) => {
      let startDateTime = moment(
        `${startDate} ${startTime}`,
        "DD/MM/YYYY hh:mmA"
      );
      let currentDateTime = moment();
      let endDateTime = moment(`${endDate} ${endTime}`, "DD/MM/YYYY hh:mmA");

      switch (batchType) {
        case "upcoming":
          return startDateTime > currentDateTime.toDate();
        case "ongoing":
          return (
            startDateTime <= currentDateTime && endDateTime >= currentDateTime
          );
        case "pending":
          return startDateTime >= currentDateTime.toDate();
        case "complete":
          return endDateTime < currentDateTime.toDate();
        case "all":
          return true;
        default:
          return false;
      }
    };

    // Apply filtering based on `isStatus`  
    let filteredBatchList = batchList.filter((item) => checkTime(item, isStatus));

    // Count total batches after filtering
    const totalCounts = filteredBatchList.length;
    
    // Apply pagination to the filtered list
    const paginatedBatch = filteredBatchList.slice(skip, skip + limit);
    // Calculate total pages
    const totalPages = Math.ceil(totalCounts / limit);

    if (paginatedBatch.length > 0) {
      // Populate candidate attendance counts for paginated batch
      for (let batch of paginatedBatch) {
        const presentCount = await Candidate.countDocuments({
          batchId: batch._id,
          isPresent: "Present",
        });

        const absentCount = await Candidate.countDocuments({
          batchId: batch._id,
          isPresent: "Absent",
        });

        const missingCount = await Candidate.countDocuments({
          batchId: batch._id,
          isPresent: "Missing",
        });

        batch["candidateAttendanceCounts"] = {
          present: presentCount,
          absent: absentCount,
          missing: missingCount,
        };
      }

      // Return successful response with paginated data
      return sendResponse(res, 200, "Batch found", {
        batchList: paginatedBatch,
        page,
        totalCounts,
        totalPages,
      });
    } else {
      // Return response when no batches are found after filtering
      return sendResponse(res, 200, "Batch found", {
        batchList: [],
        totalCounts: 0,
        totalPages: 0,
      });
    }
  } catch (err) {
    console.error("Error occurred:", err);
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      err.message
    );
  }
};

module.exports.reAssignAssesorInBatch = async (req, res, next) => {
  try {
    const { batchId, assessorId } = req.body;
    const batchData = await Batch.findById(batchId);

    batchData.RejectComment = null;
    if (!batchData) {
      return errorResponse(res, 400, "Batch not found", "Batch not found");
    }

    const assessorData = await Assessor.findById(assessorId);
    if (!assessorData) {
      return errorResponse(
        res,
        400,
        "Accessor not found",
        "Accessor not found"
      );
    }
    const userStartDateTime = moment
      .utc(`${batchData.startDate} ${batchData.startTime}`, "DD/MM/YYYY hh:mmA")
      .toISOString();
    const userEndDateTime = moment
      .utc(`${batchData.endDate} ${batchData.endTime}`, "DD/MM/YYYY hh:mmA")
      .toISOString();

  

    batchData.accessorId = assessorId;

    batchData.isAcceptAssesor = false;

    const batchAssign = await batchData.save();
    const notification = new AssesorNotificationModel({
      recipient: batchData.assessorId,
      sender: req.user._id,
      title: "Batch reassign",
      content: `${batchData.batchId} has re-assign to you`,
      type: "message",
    });

    const notificationData = await notification.save();
    if (batchAssign && notificationData) {
      return sendResponse(
        res,
        200,
        `Assessor has been re-assign to ${batchData.batchId} to ${assessorData.fullName}`,
        { batchData, notificationData }
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};


module.exports.getAllBatchList = async (req, res, next) => {
  try {
    const { searchTerm, jobRole, scheme, date, page = 1, limit = 10 } = req.query;

    const matchTerm = {};
    if (searchTerm?.trim()) matchTerm[searchTerm] = searchTerm;
    if (jobRole) matchTerm[jobRole] = jobRole;
    if (scheme) matchTerm[scheme] = scheme;
    if (date) matchTerm[date] = date;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const basePipeline = [];

    if (Object.keys(matchTerm).length) {
      basePipeline.push({ $match: matchTerm });
    }

    const finalResult = [
      {
        $lookup: {
          from: "jobroles",
          localField: "jobRole",
          foreignField: "_id",
          as: "jobDetails"
        }
      },
      {
        $lookup: {
          from: "clients",
          localField: "clientId",
          foreignField: "_id",
          as: "clientDetails"
        }
      },
      {
        $unwind: {
          path: "$clientDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "schemes",
          localField: "schemeId",
          foreignField: "_id",
          as: "schemeDetails"
        }
      },
      {
        $unwind: {
          path: "$schemeDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "assessors",
          localField: "accessorId",
          foreignField: "_id",
          as: "assesorDetails"
        }
      },
      {
        $unwind: {
          path: "$assesorDetails",
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $lookup: {
          from: "batches",
          localField: "batchId",
          foreignField: "batchId",
          as: "matchingBatches"
        }
      },
      {
        $project: {
          _id: 1,
          batchId: 1,
          batchSize: 1,
          startDate: 1,
          endDate: 1,
          batchMode: 1,
          clientName: "$clientDetails.clientname",
          schemeName: "$schemeDetails.schemeName",
          tcNameLocation: "$examCenterDetails.examCenterName",
          jobRole: "$jobDetails.jobRole",
          assignedAssesor: {
            _id: "$assesorDetails._id",
            fullName: "$assesorDetails.fullName"
          },
          count: { $size: "$matchingBatches" },
          status: {
            $switch: {
              branches: [
                {
                  case: {
                    $and: [
                      { $lte: ["$startDate", new Date()] },
                      { $gte: ["$endDate", new Date()] }
                    ]
                  },
                  then: "Ongoing"
                },
                {
                  case: { $gt: ["$startDate", new Date()] },
                  then: "Pending"
                },
                {
                  case: { $lt: ["$endDate", new Date()] },
                  then: "Completed"
                }
              ],
              default: "unknown"
            }
          }
        }
      }
    ];

    // Add $facet for pagination
    const paginationPipeline = [
      ...basePipeline,
      {
        $facet: {
          data: [
            ...finalResult,
            { $skip: skip },
            { $limit: parseInt(limit) }
          ],
          totalCount: [
            ...finalResult,
            { $count: "count" }
          ]
        }
      }
    ];

    const result = await Batch.aggregate(paginationPipeline);

    return sendResponse(res, 200, "Batch List Fetched Successfully", {
      data: result[0].data,
      totalCount: result[0].totalCount[0]?.count || 0,
      page: parseInt(page),
      limit: parseInt(limit)
    });

  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

