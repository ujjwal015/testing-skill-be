const createAssesmentModel = require("../models/createAssesment-model");
const Joi = require("@hapi/joi");
const { Paginate } = require("../utils/paginate");
const { getFilter } = require("../utils/custom-validators");
const responseMessage = require("../utils/responseMessage");
const { sendResponse, errorResponse } = require("../utils/response");
const path = require("path");
const crypto = require("crypto");
const sets = require("../models/setsModel");
const { isNull } = require("lodash");
const algorithm = "aes-256-cbc";
const initVector = crypto.randomBytes(16);
const Securitykey = crypto.randomBytes(32);
const QuestionModel = require("../models/question")
const {  getFileUrl: getS3FileUrl} = require('../utils/s3bucket');


const {
  AWS_ACCESS_KEY_ID,
  AWS_ACCESS_KEY_SECRET,
  AWS_BUCKET_NAME,
  AWS_REGION,
  CLIENT_URL
} = require("../config/envProvider");

const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const s3UrlToBlob = require("../utils/s3UrlToBlob");

module.exports.addSelectedQuestions = async (req, res) => {
  try {
    const { error } = await validaddSelectAssesment(req.body);
    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );
    const { assessment_id, question_id } = req.body;

    let isExistAssesment = await createAssesmentModel.findById(assessment_id);

    if (!isExistAssesment)
      return errorResponse(
        res,
        400,
        "please create assesment",
        "assesment not exist"
      );

    // isExistAssesment.question_id.addToSet(...question_id);

    isExistAssesment.question_id = question_id;

    const updateQuestions = await isExistAssesment.save();

    if (updateQuestions) {
      return sendResponse(
        res,
        200,
        responseMessage.assesment_create,
        updateQuestions
      );
    } else {
      return errorResponse(
        res,
        400,
        responseMessage.assesment_not_create,
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.finalCreateAssessment = async (req, res) => {
  try {
    let query = { _id: req.body.id };

    const getAssessment = await createAssesmentModel.findOne(query);

    if (!getAssessment)
      return errorResponse(
        res,
        400,
        responseMessage.assesment_not_found,
        responseMessage.errorMessage
      );

    if (getAssessment.question_id.length === 0)
      return errorResponse(
        res,
        400,
        "Assessment should have atleast one question",
        responseMessage.errorMessage
      );

    const assessment = await createAssesmentModel.findOne(query).populate({
      path: "question_id",
    });

    const totalMarks = parseFloat(assessment.totalMarks);

    let findTotalQuestionMarsk = 0;

    assessment.question_id.forEach((list) => {
      findTotalQuestionMarsk += list.questionMarks;
    });

    let finaCaluculationMark = parseFloat(findTotalQuestionMarsk);

    if (totalMarks !== finaCaluculationMark) {
      return errorResponse(
        res,
        400,
        "Total marks not matched with total question mark",
        responseMessage.errorMessage
      );
    }

    const message = `${getAssessment.createdBy}`;

    // // secret key generate 32 bytes of random data
    const cipher = crypto.createCipheriv(algorithm, Securitykey, initVector);

    let encryptedData = cipher.update(message, "utf-8", "hex");

    encryptedData += cipher.final("hex");

    getAssessment.regiterLink = `${CLIENT_URL}/assessment-test/${encryptedData}`;

    const updateQuestions = await getAssessment.save();

    return sendResponse(
      res,
      200,
      "assessment created successfully",
      updateQuestions
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.setAssessmentTest = async (req, res) => {
  try {
    const decipher = crypto.createDecipheriv(
      algorithm,
      Securitykey,
      initVector
    );

    let decryptedData = decipher.update(req.params.id, "hex", "utf-8");

    decryptedData += decipher.final("utf8");

    return sendResponse(res, 200, "decrypted message", decryptedData);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

// module.exports.getQuestionsByAssesmentId = async (req, res) => {
//   try {
//     const { page, limit } = Paginate(req);

//     const type = req.query.type
//     const filterLanguage = req.query.lang || "English"
//     console.log("filterLanguage==>",filterLanguage)

//     const AssesmentDetails = await createAssesmentModel.findById(req.query.id);
//     let query = { assesment_id: AssesmentDetails._id, _id: req.query.set_id };

//     let Assesment = await sets.findOne(query).populate({
//       path: "question_id",
//     });

//     if (!Assesment)
//       return errorResponse(
//         res,
//         400,
//         responseMessage.assesment_not_found,
//         responseMessage.errorMessage
//       );

//       // const languages = Assesment.question_id[0]?.lang?.map(item=>item?.language)
//       const languages = Assesment.question_id.flatMap(item=>{ 
//         return item.lang.map(item=> item.language)
//       })
//       let uniqueLanguages = [...new Set(languages)];

//       const updateQuestionsWithSecondaryLanguage = async (questions) => {
//         return Promise.all(questions.map(async (question) => {
//           console.log("question.lang=>",question.lang)
//           let secondaryLangQuestion = question.lang.find(item => item.language === filterLanguage);
//           console.log("secondaryLangQuestion=>",secondaryLangQuestion)
//           if (secondaryLangQuestion) {
//             console.log("inside secondaryLangQuestion")
//             question.secondaryQuestionText = secondaryLangQuestion.questionText;
      
//             if (type === "Theory") {
//               console.log("inside type theory")
//               await Promise.all(question.options.map( async (item) => {
//                 const secondaryItem = secondaryLangQuestion.options.find(secItem => item.optionKey === secItem.optionKey);

//                 if (secondaryItem) {
//                   item.secondaryOptionValue = secondaryItem.optionValue;
//                 }
//                 console.log("item=>",item)
//                 if (item.optionImgKey) {
  
//                   item.optionUrl = await getFileUrl(item.optionImgKey);
//                 }
//               }));
//             } else if (type === "Viva" || type === "Practical") {
//               question.secondaryAnswer = secondaryLangQuestion.answer;
//             }
//           }
      
//           return question;
//         }));
//       };
      

//     Assessment = await updateQuestionsWithSecondaryLanguage(Assesment.question_id);
      
      

//     let getRightVal = page * limit;

//     let countLength = page > 0 ? page * limit - limit : 0;

//     const totalCounts =
//       Assesment.question_id.length > 0 ? Assesment.question_id.length : 0;

//     const totalPages = Math.ceil(totalCounts / limit);

//     Assesment.question_id.length !== 0
//       ? (Assesment.question_id = Assesment.question_id.slice(
//           countLength,
//           getRightVal
//         ))
//       : (Assesment.question_id = []);
//     return sendResponse(res, 200, responseMessage.assesment_found, {
//       Assesment,
//       // questionType:sectionDetails.questionType,
//       uniqueLanguages,
//       page,
//       totalCounts,
//       totalPages,
//     });
//   } catch (error) {
//     return errorResponse(res, 500, responseMessage.errorMessage, error.message);
//   }
// };

module.exports.getQuestionsByAssesmentId = async (req, res) => {
  try {
    const { page, limit } = Paginate(req);

    const type = req.query.type;
    const filterLanguage = req.query.lang || "English";

    const AssesmentDetails = await createAssesmentModel.findById(req.query.id);
    let query = { assesment_id: AssesmentDetails._id, _id: req.query.set_id };

    let Assesment = await sets.findOne(query).populate({
      path: "question_id",
    });

    if (!Assesment)
      return errorResponse(
        res,
        400,
        responseMessage.assesment_not_found,
        responseMessage.errorMessage
      );

    const languages = Assesment.question_id.flatMap(item => {
      return item.lang.map(item => item.language);
    });
    let uniqueLanguages = [...new Set(languages)];

    const updateQuestionsWithSecondaryLanguage = async (questions) => {
      return Promise.all(questions.map(async (question) => {
        let secondaryLangQuestion = question.lang.find(item => item.language === filterLanguage);

        // Add secondary language question text if available
        if (secondaryLangQuestion) {
          question.secondaryQuestionText = secondaryLangQuestion.questionText;

          if (type === "Theory") {
            await Promise.all(question.options.map(async (item) => {
              // Add secondary option value if available
              const secondaryItem = secondaryLangQuestion.options.find(secItem => item.optionKey === secItem.optionKey);
              if (secondaryItem) {
                item.secondaryOptionValue = secondaryItem.optionValue;
              }
              // Always fetch image URL if optionImgKey exists
              if (item.optionImgKey) {
                item.optionUrl = await getFileUrl(item.optionImgKey);
              }
            }));
          } else if (type === "Viva" || type === "Practical") {
            question.secondaryAnswer = secondaryLangQuestion.answer;
          }
        } else {
          // If no secondary language match, still fetch option images
          if (type === "Theory") {
            await Promise.all(question.options.map(async (item) => {
              if (item.optionImgKey) {
                item.optionUrl = await getFileUrl(item.optionImgKey);
              }
            }));
          }
        }

        return question;
      }));
    };

    Assesment.question_id = await updateQuestionsWithSecondaryLanguage(Assesment.question_id);

    let getRightVal = page * limit;
    let countLength = page > 0 ? page * limit - limit : 0;
    const totalCounts = Assesment.question_id.length || 0;
    const totalPages = Math.ceil(totalCounts / limit);

    Assesment.question_id = Assesment.question_id.slice(countLength, getRightVal);

    return sendResponse(res, 200, responseMessage.assesment_found, {
      Assesment,
      uniqueLanguages,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};



const getFileUrl = async (data) => {
  try {
    const s3 = new S3Client({
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_ACCESS_KEY_SECRET,
      },
      region: AWS_REGION,
    });

    const fileGetData = {
      Bucket: AWS_BUCKET_NAME,
      Key: data
    };
    const getCommand = new GetObjectCommand(fileGetData);

    const url = await getSignedUrl(s3, getCommand, { expiresIn: 36000 });
    if (url) {
      return url;
    }
  } catch (error) {
    return error.message;
  }
};

const assessmentFilter = (req) => {

  const query = {};
   if(req?.user?.assigndClients){
    query["batch.client._id"]={$in:req.user.assigndClients}
   }

  const searchOptions = ['assessmentName', 'batch.examCenter.examCenterName', 'batch.client.clientname',];
  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    query['$or'] = searchOptions.map(item => ({ [item]: { $regex: searchRegex } }));
  }
  if (req.query.batchId) {
    query['batch_id'] = mongoose.Types.ObjectId(req.query.batchId);
  }


  if (req.query.assessmentName) {
    const assessmentName = new RegExp(req.query.assessmentName, 'i');
    query['assessmentName'] = assessmentName;
  }
  if (req.query.jobRole) {
    const jobRole = new RegExp(req.query.jobRole, 'i');
    query['jobRole'] = jobRole;
  }

  if (req.query.examCenterName) {
    query['batch.examCenter.examCenterName'] = { $regex: req.query.examCenterName, $options: 'i' };
  }

  if (req.query.clientname) {
    query['batch.client.clientname'] = { $regex: req.query.clientname, $options: 'i' };
  }

  return query;
};

const allAssessmentFilter = (req) => {
  const preLookupMatch = {};
  const postLookupMatch = {};

  if (req?.user?.assigndClients?.length) {
    postLookupMatch["batch.clientId"] = { $in: req.user.assigndClients };
  }

  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    
    const preLookupSearchFields = ['assessmentName'];
    const postLookupSearchFields = ['batch.examCenterName', 'batch.clientname', 'batch.jobRoleNames', 'batch.batchId'];
    
    postLookupMatch['$or'] = postLookupSearchFields.map(field => ({
      [field]: { $regex: searchRegex }
    }));

    const allSearchConditions = [
      ...preLookupSearchFields.map(field => ({ [field]: { $regex: searchRegex } })),
      ...postLookupSearchFields.map(field => ({ [field]: { $regex: searchRegex } }))
    ];
    
    
    postLookupMatch['$or'] = allSearchConditions;
  }
  
  // A special case: if a user searches for something in 'assessmentName' only,
  // we could potentially move that part to the preLookupMatch, but a combined
  // search is more common and must happen post-lookup.

  return { preLookupMatch, postLookupMatch };
};

const getPreLookupFilter = (req) => {
  const query = {};
  if (req.query.batchId) {
    query['batch_id'] = mongoose.Types.ObjectId(req.query.batchId);
  }
  if (req.query.assessmentName) {
    query['assessmentName'] = new RegExp(req.query.assessmentName, 'i');
  }
  if (req.query.jobRole) {
    query['jobRole'] = new RegExp(req.query.jobRole, 'i');
  }
  return query;
};

const getPostLookupFilter = (req) => {
  const query = {};

  if (req?.user?.assigndClients?.length > 0) {
    query['batch.client._id'] = { $in: req.user.assigndClients };
  }

  if (req.query.examCenterName) {
    query['batch.examCenter.examCenterName'] = {
      $regex: req.query.examCenterName,
      $options: 'i'
    };
  }

  if (req.query.clientname) {
    query['batch.client.clientname'] = {
      $regex: req.query.clientname,
      $options: 'i'
    };
  }

  if (req.query.search) {
    const searchRegex = new RegExp(req.query.search, 'i');
    const searchOptions = [
      'assessmentName',
      'batch.examCenter.examCenterName',
      'batch.client.clientname'
    ];
    query['$or'] = searchOptions.map((field) => ({
      [field]: { $regex: searchRegex }
    }));
  }

  return query;
};

module.exports.accesmentList = async (req, res) => {
  try {
    // const matchQuery = assessmentFilter(req);
    console.time("MATCH_QUERY");
    const preMatchQuery = getPreLookupFilter(req);
const postMatchQuery = getPostLookupFilter(req);
       console.timeEnd("MATCH_QUERY");
    let { page, limit, skip, sortOrder } = Paginate(req);
    console.time("PIPELINE");
    const pipeline = [
      { $match: preMatchQuery },
      // Populate batch details within the assessment
      {
        $lookup: {
          from: 'batches',
          localField: 'batch_id',
          foreignField: '_id',
          as: 'batch'
        }
      },
      { $unwind: { path: '$batch', preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: 'examcenters',
          localField: 'batch.examCenterId',
          foreignField: '_id',
          as: 'batch.examCenter'
        }
      },
      { $unwind: { path: '$batch.examCenter', preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: 'clients',
          localField: 'batch.clientId',
          foreignField: '_id',
          as: 'batch.client'
        }
      },
      { $unwind: { path: '$batch.client', preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: 'practicalquestions',
          let: { practicalQuestionIds: '$practicalQuestion_id' },
          pipeline: [
            { $match: { $expr: { $in: ['$_id', '$$practicalQuestionIds'] } } },
            // Lookup questionBank for each practical question
            {
              $lookup: {
                from: 'questionbanks',
                localField: 'question_bank_id',
                foreignField: '_id',
                as: 'questionBankData'
              }
            },
            // Unwind the questionBankData array
            { $unwind: { path: '$questionBankData', preserveNullAndEmptyArrays: true } },
            // Add NOS data to the practical question
            {
              $addFields: {
                nosName: '$questionBankData.nos',
                nosId: '$questionBankData.nosId'
              }
            },
            // Remove questionBankData to keep response clean
            {
              $project: {
                questionBankData: 0
              }
            }
          ],
          as: 'practicalQuestions'
        }
      },

      // Lookup vivaQuestions and enrich with questionBank data in one operation
      {
        $lookup: {
          from: 'vivaquestions',
          let: { vivaQuestionIds: '$vivaQuestion_id' },
          pipeline: [
            { $match: { $expr: { $in: ['$_id', '$$vivaQuestionIds'] } } },
            // Lookup questionBank for each viva question
            {
              $lookup: {
                from: 'questionbanks', 
                localField: 'question_bank_id',
                foreignField: '_id',
                as: 'questionBankData'
              }
            },
            // Unwind the questionBankData array
            { $unwind: { path: '$questionBankData', preserveNullAndEmptyArrays: true } },
            // Add NOS data to the viva question
            {
              $addFields: {
                nosName: '$questionBankData.nos',
                nosId: '$questionBankData.nosId'
              }
            },
            // Remove questionBankData to keep response clean
            {
              $project: {
                questionBankData: 0
              }
            }
          ],
          as: 'vivaQuestions'
        }
      },

      // Populate set details
      { 
        $lookup: { 
          from: 'sets', 
          localField: 'set_id', 
          foreignField: '_id', 
          as: 'setDetails' 
        } 
      },
      
      // Apply match criteria
      { $match: postMatchQuery },
      { $sort: sortOrder },
      
      // Use $facet for parallel counting and pagination
      {
        $facet: {
          total: [{ $count: 'count' }],
          data: [{ $skip: skip }, { $limit: limit }]
        }
      },

      // Project to format the output
      {
        $project: {
          total: { $arrayElemAt: ['$total.count', 0] },
          data: 1
        }
      }
    ];

    const results = await createAssesmentModel.aggregate(pipeline);
    console.timeEnd("PIPELINE");
    // Handling results
    if (!results || results.length === 0) {
      return errorResponse(res, 400, "Assessment not found", "No assessment details found with the given filters");
    }

    const { total, data } = results[0];
    console.time("ENRICH_DATA");
    // Handle client logo URL based on isProfilePicUploaded only
    const enrichedData = await Promise.all(data.map(async (assessment) => {
      const client = assessment?.batch?.client;
      if (client?.isProfilePicUploaded) {
        const logoInfo = await getS3FileUrl(client);
        assessment.batch.client = logoInfo
        const url =await s3UrlToBlob(logoInfo.url);
        assessment.batch.client.url = url.buffer
      } else if (client) {
        assessment.batch.client.url = null;
      }
      return assessment;
    }));
    console.timeEnd("ENRICH_DATA");
    return sendResponse(res, 200, "Assessment found", {
      assesmentDetails: enrichedData,
      page,
      totalCounts: total ?? 0,
      totalPages: total ? Math.ceil(total / limit) : 0
    });
  } catch (error) {
    return errorResponse(res, 500, "Internal Server Error", error.message);
  }
};

module.exports.previewAssessmentList = async (req, res) => {
  try {
    const { preLookupMatch, postLookupMatch } = allAssessmentFilter(req);
    let { page, limit, skip, sortOrder } = Paginate(req);

    const pipeline = [
      { $match: preLookupMatch },

      {
        $lookup: {
          from: 'batches',
          localField: 'batch_id',
          foreignField: '_id',
          as: 'batch'
        }
      },
      { $unwind: { path: '$batch', preserveNullAndEmptyArrays: true } },

      { $match: postLookupMatch },

      { $sort: sortOrder },

      {
        $facet: {
          metadata: [{ $count: "total" }],
          
          data: [
            { $skip: skip },
            { $limit: limit },

            {
              $lookup: {
                from: 'sets',
                localField: 'set_id',
                foreignField: '_id',
                as: 'setDetails'
              }
            },
            {
              $lookup: {
                from: 'vivaquestions',
                localField: 'vivaQuestion_id',
                foreignField: '_id',
                as: 'vivaQuestions'
              }
            },
            {
              $lookup: {
                from: 'practicalquestions',
                localField: 'practicalQuestion_id',
                foreignField: '_id',
                as: 'practicalQuestions'
              }
            },
            
            // STAGE 7: Project the final shape for the paginated data.
            {
              $project: {
                _id: 1,
                batchSIPId: "$batch.batchId",
                clientName: "$batch.clientname",
                jobRole: "$batch.jobRoleNames",
                examCenter: "$batch.examCenterName",
                assessmentStartDate: "$batch.startDate",
                assessmentEndDate: "$batch.endDate",
                section: "$section",
                batchMode: "$batch.batchMode",
                noOfSets: { $size: { $ifNull: ["$set_id", []] } },
                setDetails: 1,
                vivaQuestions: 1,
                practicalQuestions: 1,
                batch: "$batch" // Pass along the batch if needed by the frontend
              }
            }
          ]
        }
      },
      // STAGE 8: Reshape the output from the $facet stage.
      {
        $project: {
          data: "$data",
          total: { $arrayElemAt: ["$metadata.total", 0] }
        }
      }
    ];

    const results = await createAssesmentModel.aggregate(pipeline);
    
    // The structure from $facet is slightly different, so we adjust how we access the results.
    const assesmentDetails = results[0].data;
    const totalCounts = results[0].total ? results[0].total : 0;

    if (!assesmentDetails.length) {
      return errorResponse(res, 404, "Assessment not found", "No assessment details found with the given filters");
    }

    return sendResponse(res, 200, "Assessment found", {
      assesmentDetails: assesmentDetails,
      page,
      totalCounts: totalCounts,
      totalPages: totalCounts ? Math.ceil(totalCounts / limit) : 0
    });
  } catch (error) {
    return errorResponse(res, 500, "An internal server error occurred", error.message);
  }
};

exports.getAssesment = async (req, res) => {
  try {
    let assesmentId = req.params.id;

    const assesmentDetail = await createAssesmentModel.findById(assesmentId);

    if (!assesmentDetail)
      return errorResponse(
        res,
        400,
        responseMessage.assessor_not_found,
        responseMessage.errorMessage
      );

    // send data to client
    return sendResponse(
      res,
      200,
      responseMessage.assesment_found,
      assesmentDetail
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.updateAccesment = async (req, res) => {
  try {
    const requestUpdateAccesmentId = req.params.id;

    if (!requestUpdateAccesmentId)
      return errorResponse(
        res,
        400,
        "accessmentId  is required",
        responseMessage.errorMessage
      );

    const { error } = validateAddAssesment(req.body);

    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );

    const {
      assessmentName,
      assessmentCode,
      scheme,
      jobRole,
      totalMarks,
      status,
      passingPercentage,
      createdBy,
    } = req.body;

    const findaccesmentId = await createAssesmentModel.findById(
      requestUpdateAccesmentId
    );

    if (!findaccesmentId)
      return errorResponse(
        res,
        400,
        "accessmentId not found",
        responseMessage.errorMessage
      );

    if (
      findaccesmentId.jobRole === jobRole &&
      findaccesmentId.totalMarks === totalMarks
    ) {
      const updatedAccessmentId = await createAssesmentModel.findOneAndUpdate(
        { _id: requestUpdateAccesmentId },
        {
          assessmentName,
          assessmentCode,
          scheme,
          jobRole,
          totalMarks,
          status,
          passingPercentage,
          createdBy,
        },
        { new: true }
      );

      if (!updatedAccessmentId)
        return errorResponse(
          res,
          400,
          "AccessorId not able to update",
          responseMessage.errorMessage
        );

      return sendResponse(
        res,
        200,
        "Assesment updated Successfully",
        updatedAccessmentId
      );
    } else {
      return errorResponse(
        res,
        400,
        "jobRole and totalMarks not allow to edit",
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.removeSingleAssessment = async (req, res) => {
  try {
    const getRemoveAssessmentId = req.params.id;

    const removeAssessment = await createAssesmentModel.findById(
      getRemoveAssessmentId
    );

    if (!removeAssessment)
      return errorResponse(
        res,
        400,
        responseMessage.assesment_not_found,
        responseMessage.errorMessage
      );

    const finalResult = await createAssesmentModel.deleteOne({
      _id: getRemoveAssessmentId,
    });

    return sendResponse(
      res,
      200,
      "Assessment removed successfully",
      finalResult
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.removeQuestion = async (req, res) => {
  try {
    const requestId = req.body.assessment_id;

    var getAssessmentElement = await createAssesmentModel.findById(requestId);

    if (!getAssessmentElement)
      return errorResponse(
        res,
        400,
        responseMessage.assesment_not_found,
        responseMessage.errorMessage
      );

    const requestRemoveQuestionId = req.body.question_id;

    if (!requestRemoveQuestionId)
      return errorResponse(
        res,
        400,
        "Question id is required",
        responseMessage.errorMessage
      );

    getAssessmentElement.question_id = getAssessmentElement.question_id.filter(
      (list) => {
        if (list.toString() !== requestRemoveQuestionId.toString()) {
          return list;
        }
      }
    );

    // for multiple question remove functionality

    // let getAssessmentFilteredArray = [];

    // getAssessmentElement.question_id.filter((list) => {
    //   requestRemoveQuestionId.forEach((element) => {
    //     if (list.toString() !== element.toString()) {
    //       getAssessmentFilteredArray.push(list);
    //     }
    //   })
    // });

    // getAssessmentElement.question_id = getAssessmentFilteredArray

    const finalResult = await getAssessmentElement.save();

    return sendResponse(res, 200, "Question removed successfully", finalResult);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

async function validaddSelectAssesment(data) {
  try {
    const schema = Joi.object({
      assessment_id: Joi.string().required(),
      question_id: Joi.any(),
    });
    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
}

module.exports.getQuestionsBySetId = async (req, res) => {
  try {
    const existingSet = await sets.findById(req.params.setId).populate('question_id');    
    if (!existingSet) {
      return sendResponse(res, 404, "Set not found", null);
    }
    
    if (existingSet.question_id && existingSet.question_id.length > 0) {
      const setData = JSON.parse(JSON.stringify(existingSet));
      
      const processedQuestions = await Promise.all(
        setData.question_id.map(async (question) => {
          if (question && question.options && Array.isArray(question.options)) {
            const processedOptions = await Promise.all(
              question.options.map(async (opt) => {
                if (opt && opt.optionImgKey) {
                  const url=await getFileUrl(opt.optionImgKey);
                  return {
                    ...opt,
                    optionUrl: url,
                    binaryUrl: await s3UrlToBlob(url)
                  };
                }
                return opt;
              })
            );
            
            return {
              ...question,
              options: processedOptions
            };
          }
          return question;
        })
      );
      setData.question_id = processedQuestions;
      
      return sendResponse(res, 200, "sets found", {
        existingSet: setData
      });
    }
    
    //if no question id is found 
    return sendResponse(res, 200, "sets found", {
      existingSet
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};
