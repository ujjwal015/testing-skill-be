const QuestionModel = require("../models/questionBankModel");
const jobroleModel = require("../models/jobRole-model");
const { Paginate } = require("../utils/paginate");
const responseMessage = require("../utils/responseMessage");
const { sendResponse, errorResponse } = require("../utils/response");
const Joi = require("@hapi/joi");
const Question = require("../models/question");
const vivaModel = require("../models/vivaQuestion-model");
const ClientModel = require("../models/client-model");
const practicalModel = require("../models/practicalQuestion-model");
const {
  getFilter,
  clientNameValidateRegEX,
} = require("../utils/custom-validators");
const { default: mongoose } = require("mongoose");

exports.createQuestionForm = async (req, res) => {
  try {
    const { error } = validateQuestionDetails(req.body);
    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );

    const {
      jobRole,
      qpCode,
      jobLevel,
      version,
      section,
      nos,
      nosId,
      questionType,
      language,
    } = req.body;

    const jobData = await jobroleModel.findOne({
      $or: [{ _id: jobRole }, { jobRole: jobRole }],
    });

    const existingQuestionBank = await QuestionModel.find({
      $and: [
        // { jobRole: jobRole },
        { section: section },
        // { nosId: nosId},
        { nos: nos.split('{[(')[0].trim() },
        { jobLevel: jobLevel },
        { version: version },
        { qpCode: qpCode}
      ],
    });

    if (existingQuestionBank.length > 0 )
      return errorResponse(
        res,
        400,
        "Existing Question Bank",
        "Existing Question Bank"
      );

    let clientId = jobData.clientId;
    let questionCount = 0; // Default to zero
    let questionBankautoId = `QBAH${Math.floor(1000 + Math.random() * 9000)}`;

    const newQuestionModel = new QuestionModel({
      questionBankautoId,
      questionCount,
      questionType,
      language,
      jobRole: jobData.jobRole,
      nos: nos.split('{[(')[0].trim(),
      nosId,
      qpCode,
      jobLevel,
      version,
      section,
      clientId,
    });
    const savedQuestionForm = await newQuestionModel.save();
    if (savedQuestionForm) {
      return sendResponse(
        res,
        201,
        responseMessage.question_form_create,
        savedQuestionForm
      );
    } else {
      return errorResponse(
        res,
        400,
        responseMessage.question_bank_not_create,
        responseMessage.errorMessage
      );
    }
    //}
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.getJobrole = async (req, res) => {
  try {
    let regex = new RegExp(`^${req.query.jobRole}`, "i");

    var jobRoleFilter = jobroleModel
      .find({ jobRole: regex }, { jobRole: 1 })
      .sort({ updated_at: -1 })
      .sort({ created_at: -1 })
      .limit(5);

    jobRoleFilter.exec(async (err, data) => {
      let result = [];
      if (!err) {
        if (data && data.length && data.length > 0) {
          data.forEach((user) => {
            let obj = {
              id: user._id,
              label: user.jobRole,
            };
            result.push(obj);
          });
        } else {
          const newjobrole = new jobroleModel({
            jobRole: req.query.jobRole,
          });
          const savedJobrole = await newjobrole.save();
          if (savedJobrole) {
            return sendResponse(
              res,
              200,
              responseMessage.job_role_created,
              savedJobrole
            );
          } else {
            return errorResponse(
              res,
              400,
              responseMessage.job_role_not_created,
              responseMessage.errorMessage
            );
          }
        }
        res.json(result);
      }
    });
  } catch (error) {
    return res.status(500).send({
      statusCode: 500,
      success: false,
      message: "Oops! Something went wrong here...",
      error: error.message,
    });
  }
};
module.exports.changeStatus = async (req, res) => {
  try {
    const { error } = validateStatusChange(req.body);
    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );
    const { status, question_bank_id } = req.body;
    let change = status == "active" ? "active" : "inactive";

    const updateStatus = await QuestionModel.findByIdAndUpdate(
      question_bank_id,
      { status: change }
    );
    if (updateStatus) {
      return sendResponse(res, 200, responseMessage.status_change, {
        status: change,
      });
    } else {
      return errorResponse(
        res,
        400,
        responseMessage.status_not_change,
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};
module.exports.getOptionClients = async (req, res) => {
  try {
    let filter = getFilter(
      req,
      ["clientName", "qpCode", "nos", "jobRole"],
      true
    );
    let query = filter ? filter.query : {};
    const clientsData = await ClientModel.find({
      $and: [{ _id: query["clientId"] }, { client_status: "Active" }],
    }).select("clientname");
    if (clientsData.length > 0) {
      return sendResponse(res, 200, responseMessage.client_profile_get, {
        clientsData,
      });
    } else {
      return sendResponse(res, 200, responseMessage.client_profile_get, {
        clientsData,
      });
    }
  } catch (err) {
    console.log("error", err);
    return errorResponse(res, 500, responseMessage.something_wrong, err);
  }
};

module.exports.getQuestionBankList = async (req, res) => {
  try {
    let filter = getFilter(
      req,
      ["clientName", "qpCode", "nos", "jobRole"],
      true
    )
    //getFilter(req,["jobRole","qpCode"],true)
    const { page, limit, skip, sortOrder } = Paginate(req);
    let query = filter ? filter.query : {};
    let {
      clientId,
      jobRole,
      section,
      language,
      customFilter = false,
    } = req.query;

    let custumFilterQuery = await applyCustomFilter({
      clientId,
      jobRole,
      section,
      language,
    });
    
    if (clientId != undefined && !clientId && customFilter) {
      query = { ...custumFilterQuery, ...query };
    } else if (customFilter == "true") {
      
      query = { ...custumFilterQuery };
      
    } else {
    
      query = { ...query};
    }
    //ss
    console.log('query',customFilter == "true")
    if(req.query?.search || req.query?.section){
     
      req.query?.section? query["section"]=req.query?.section:''
    }
    console.log(JSON.stringify(query))
    const totalCounts = await QuestionModel.countDocuments(query);

    const totalPages = Math.ceil(totalCounts / limit);

    const questionDetails = await QuestionModel.find(query)
      .populate({ path: "clientId", select: "clientname" })
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    if (!questionDetails)
      return errorResponse(
        res,
        400,
        responseMessage.question_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, responseMessage.question_bank_found, {
      questionDetails,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};
async function applyCustomFilter(params) {
  let { clientId, jobRole } = params;

  let findByJobRole = { jobRole };
  if (jobRole || mongoose.Types.ObjectId.isValid(jobRole)) {
    if (mongoose.Types.ObjectId.isValid(jobRole)) {
      findByJobRole = {
        $or: [
          { jobRole: new mongoose.Types.ObjectId(jobRole) },
          { jobRole: jobRole },
        ],
      };
    } else {
      findByJobRole = { $or: [{ jobRole: jobRole }] };
    }
  }
  console.log(clientId,jobRole)
  let customFilterQuery = {};
  if (clientId && !jobRole) {
    customFilterQuery["$and"] =[{ clientId: new mongoose.Types.ObjectId(clientId) }];
  } else if (jobRole && !clientId) {
    customFilterQuery["$and"] = [{...findByJobRole}];
  } else if(jobRole && clientId){
    console.log('here')
    customFilterQuery["$and"] = [{...findByJobRole},{ clientId: new mongoose.Types.ObjectId(clientId) }];
  } else {
    customFilterQuery = {};
  }

  return customFilterQuery;
}
module.exports.getQuestionsByQuestionBankId = async (req, res) => {
  try {
    const { page, limit, skip, sortOrder } = Paginate(req);
    const { search } = req.query;
    const questionBank = await QuestionModel.findById(req.query.id);
    let query = { question_bank_id: questionBank._id };

    if (search) {
      query = {
        question_bank_id: questionBank._id,
        $or: [{ questionText: search }],
      };
    }
    const questions = await Question.find(query)
      //.sort(sortOrder)
      .skip(skip)
      .limit(limit);
    const totalCounts = await Question.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);
    if (!questions)
      return errorResponse(
        res,
        400,
        responseMessage.question_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, responseMessage.question_bank_found, {
      questions,
      questionType: questionBank.questionType,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.questionBankFilter = async (req, res) => {
  try {
    let { search } = req.query;
    const { page, limit, skip, sortOrder } = await Paginate(req);
    let query = {};

    if (search !== undefined) {
      query = { $or: [{ questionBankName: search }, { jobRole: search }] };
    }
    const totalCounts = await QuestionModel.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);
    const questionBankDetails = await QuestionModel.find(query)
      .select(
        "jobRole jobLevel code sector subSector sectorCode schemeCode questionType nos schemeName nosCode theoryMarks practicalMarks status questionBankId questionBankName"
      )
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);
    if (!questionBankDetails)
      return errorResponse(
        res,
        400,
        responseMessage.question_not_found,
        responseMessage.errorMessage
      );
    return sendResponse(res, 200, responseMessage.question_bank_found, {
      questionBankDetails,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.getQuestionbankIddetail = async (req, res) => {
  try {
    const bankId = req.params.id;

    const bankDetail = await QuestionModel.findById(bankId);

    if (!bankDetail)
      return errorResponse(
        res,
        400,
        responseMessage.question_bankId_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(
      res,
      200,
      responseMessage.question_bank_found,
      bankDetail
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.updateQuestionbankList = async (req, res) => {
  try {
    const bankId = req.body._id;

    const { error } = validateQuestionbankDetails(req.body);
    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );

    const {
      jobRole,
      qpCode,
      jobLevel,
      version,
      section,
      nos,
      nosId,
      questionType,
      language,
    } = req.body;

    const bankDetail = await QuestionModel.findById(bankId);

    if (!bankDetail)
      return errorResponse(
        res,
        400,
        responseMessage.question_bankId_not_found,
        responseMessage.errorMessage
      );

    const jobData = await jobroleModel.findOne({
      $or: [{ _id: jobRole }, { jobRole: jobRole }],
    });

    const updateQuestionbank = await QuestionModel.findOneAndUpdate(
      { _id: bankId },
      {
        jobRole: jobData.jobRole,
        qpCode,
        jobLevel,
        version,
        section,
        nos,
        nosId,
        questionType,
        language,
      },
      { new: true }
    );

    if (!updateQuestionbank)
      return errorResponse(
        res,
        400,
        responseMessage.question_bank_not_update,
        responseMessage.errorMessage
      );

    return sendResponse(
      res,
      200,
      responseMessage.question_bank_update,
      updateQuestionbank
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//latest code to delete questions with qbId
exports.removeQuestionbankList = async (req, res) => {
  try {
    const questionbankId = req.params.id;

    // Find the question bank you want to remove
    const questionbankList = await QuestionModel.findById(questionbankId);
    if (!questionbankList) {
      return errorResponse(
        res,
        400,
        responseMessage.question_bankId_not_found,
        responseMessage.errorMessage
      );
    }

    // First, remove associated documents in Question model
    const qdelete = await Question.deleteMany({
      question_bank_id: questionbankId,
    });
    // Second, remove associated documents in vivaModel
    const vdelete = await vivaModel.deleteMany({
      question_bank_id: questionbankId,
    });
    // Third, remove associated documents in practicalModel
    const pdelete = await practicalModel.deleteMany({
      question_bank_id: questionbankId,
    });
    // Finally, remove the question bank
    //const deleteqbId = await questionbankList.remove();
    const result = await QuestionModel.deleteOne({ _id: questionbankId });

    // Successfully deleted, you can also send the deleted item
    return sendResponse(res, 200, responseMessage.question_bank_delete, result);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//delte qbId by reference
// exports.removeQuestionbankList = async (req, res) => {
//   try {
//     const questionbankId = req.params.id;

//     // Find the question bank you want to remove
//     const questionbankList = await QuestionModel.findById(questionbankId).populate('theoryQuestionId');
//     console.log('questionbankList', questionbankList)
//     if (!questionbankList) {
//       return errorResponse(
//         res,
//         400,
//         responseMessage.question_bankId_not_found,
//         responseMessage.errorMessage
//       );
//     }

//     // Collect all associated document IDs in an array
//     const iddelete = questionbankList?.theoryQuestionId?.map(data=>data._id)
//     console.log('iddelete',iddelete);

//     const qdelete = await Question.deleteMany({_id: {$in: iddelete}});
//     console.log('qdelete',qdelete);

//     const qbDelete = await QuestionModel.findOneAndDelete({_id:questionbankId})
//     console.log('qDelete',qbDelete)
//     // Successfully deleted, you can also send the deleted item
//     return sendResponse(res, 200, responseMessage.question_bank_delete, qbDelete);
//   } catch (error) {
//     return errorResponse(res, 500, responseMessage.errorMessage, error.message);
//   }
// };

//getFilteredUsers
module.exports.getFilterQbList = async (req, res) => {
  try {
    const { page, limit, skip, sortOrder } = Paginate(req);

    // Get filter values from query parameters
    const questionType = req.query.questionType;
    const section = req.query.section;
    const language = req.query.language;

    // Define the filter query based on the provided parameters
    const filterQuery = {};

    if (questionType) {
      filterQuery.questionType = questionType;
    }

    if (section) {
      filterQuery.section = section;
    }

    if (language) {
      filterQuery.language = language;
    }

    // Query the database with the filter
    const totalCounts = await QuestionModel.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalCounts / limit);

    const filteredQuestions = await QuestionModel.find(filterQuery)
      //.select("questionText options section language")
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    if (!filteredQuestions) {
      return errorResponse(
        res,
        400,
        responseMessage.question_not_exist,
        responseMessage.errorMessage
      );
    }

    return sendResponse(res, 200, responseMessage.question_found, {
      filteredQuestions,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.getQbList = async (req, res) => {
  try {
    let filter = getFilter(req, [
      "nos",
      "jobRole",
      "questionType",
      "section",
      "language",
    ]);

    const { page, limit, skip, sortOrder } = Paginate(req);

    let query = filter ? filter.query : {};

    const totalCounts = await QuestionModel.countDocuments(query);

    const totalPages = Math.ceil(totalCounts / limit);

    const questionDetails = await QuestionModel.find(query)
      .select("questionType section language")
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    if (!questionDetails)
      return errorResponse(
        res,
        400,
        responseMessage.question_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, responseMessage.question_bank_found, {
      questionDetails,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

function validateStatusChange(body) {
  try {
    const schema = Joi.object({
      question_bank_id: Joi.string().required(),
      status: Joi.string().required(),
    });
    return schema.validate(body);
  } catch (err) {
    console.log(err);
  }
}
function validateQuestionDetails(body) {
  try {
    const schema = Joi.object({
      jobRole: Joi.string().min(3).max(100).required(),
      qpCode: Joi.string().min(2).max(50).trim().required(),
      jobLevel: Joi.number().required(),
      version: Joi.number().required(),
      section: Joi.string().required(),
      questionType: Joi.string().required(),
      language: Joi.string().required(),
      nos: Joi.string().required(),
      nosId: Joi.string().required(),
    });
    return schema.validate(body);
  } catch (err) {
    console.log(err);
  }
}

function validateQuestionbankDetails(body) {
  try {
    const schema = Joi.object({
      _id: Joi.string().required(),
      jobRole: Joi.string().min(3).max(100).required(),
      qpCode: Joi.string().min(2).max(50).trim().required(),
      jobLevel: Joi.number().required(),
      version: Joi.number().required(),
      section: Joi.string().min(3).max(50).required(),
      nos: Joi.string().required(),
      nosId: Joi.string().required(),
      questionType: Joi.string().required(),
      language: Joi.string().required(),
    });
    return schema.validate(body);
  } catch (err) {
    console.log(err);
  }
}

