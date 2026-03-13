
const Question = require("../models/question");
const questionbankModel = require("../models/questionBankModel");
const vivaModel = require("../models/vivaQuestion-model");
const practicalModel = require("../models/practicalQuestion-model");
const nosModel = require("../models/nos-theory-model");
const nosVivaModel = require("../models/nos-viva-model");
const Joi = require("@hapi/joi");
const ExcelJS = require("exceljs");
const mongoose = require("mongoose");
const { Paginate } = require("../utils/paginate");
const { getFilter } = require("../utils/custom-validators");
const responseMessage = require("../utils/responseMessage");
const { sendResponse, errorResponse } = require("../utils/response");
const reader = require("xlsx");
const fs = require("fs/promises");
const {
  uploadOption,
  getOptionsFileUrl,
  deleteImageFromS3,
} = require("../utils/s3bucketAccessor");
const ObjectId = mongoose.Types.ObjectId;

const { S3Client, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");

const {
  AWS_ACCESS_KEY_ID,
  AWS_ACCESS_KEY_SECRET,
  AWS_BUCKET_NAME,
  AWS_REGION,
} = require("../config/envProvider");
const { isTemplate } = require("@hapi/joi/lib/template");

module.exports.uploadQuestionOption = async (req, res) => {
  try {
    if (!req.file) {
      return errorResponse(
        res,
        401,
        responseMessage.file_not_received,
        responseMessage.file_not_received
      );
    }

    let uploadedData = await uploadOption(req);

    if (uploadedData.statusCode === 200) {
      //let deleteS3Data = await deleteImageFromS3(imagekey);

      uploadedData = {
        optionIdKey: uploadedData.key,
        optionId: req.body.optionId,
      };
      return sendResponse(
        res,
        200,
        responseMessage.question_options_added_successfully,
        uploadedData
      );
    } else {
      return errorResponse(
        res,
        400,
        responseMessage.question_option_upload_failed,
        uploadedData
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.getQuestionOptions = async (req, res) => {
  try {
    const questionData = await Question.find();
    if (!questionData || questionData.length < 1) {
      return errorResponse(
        res,
        404,
        responseMessage.question_not_found,
        responseMessage.question_not_found
      );
    }

    let imgUrl = [];

    for (const data of questionData) {
      if (data.options && Array.isArray(data.options)) {
        for (const option of data.options) {
          if (option.optionImgKey) {
            imgUrl.push(option.optionImgKey);
          }
        }
      }
    }

    Promise.all(imgUrl.map((optionImgKey) => getOptionsFileUrl(optionImgKey)))
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
//update schema
module.exports.deleteOptionImage = async (req, res) => {
  try {
    const optionId = req.params.optionId; // Assuming you're passing the option ID as a parameter
    const imageKey = req.params.imageKey; // Assuming you're passing the image key (filename) as a parameter

    // Call the function to delete the image from the S3 bucket
    await deleteImageFromS3(imageKey);

    // Update the database to remove the reference to the image
    const option = await Question.findById(optionId);

    if (!option) {
      return res.status(404).json({ message: "Option not found" });
    }

    // Remove the image reference from the option's data
    const updatedOptions = option.options.map((opt) => {
      if (opt.optionIdKey === imageKey) {
        // Remove the option with the matching image key
        return null;
      }
      return opt;
    });

    option.options = updatedOptions.filter((opt) => opt !== null); // Filter out null values

    // Save the updated option
    await option.save();

    return res.status(200).json({ message: "Image deleted successfully" });
  } catch (error) {
    return res.status(500).json({ message: "Internal server error" });
  }
};

module.exports.createQuestion = async (req, res) => {
  try {
    let { question_bank_id, questions } = req.body;

    const { error } = validatecreateQuestion(req.body);
    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );

    const isExistquestionBank = await questionbankModel.findById(
      question_bank_id
    );

   let nosTheoryData;
    const { jobRole,section,version,nosId} = isExistquestionBank;
    
    if(section === 'Theory'){
      const theoryNOS = await nosModel.findOne({
        jobRole: jobRole,
        section: section,
        nosData: {
            $elemMatch: {
              version: version,
              _id: nosId
            }
        }
      })

       nosTheoryData = theoryNOS.nosData.filter(item=>item._id==nosId)//item.NOS===nos)
      
    }

    if (!isExistquestionBank)
      return errorResponse(
        res,
        400,
        responseMessage.question_bankId_not_found,
        responseMessage.question_bankId_not_found
      );

    // Check if questions is an array and has elements
    if (!Array.isArray(questions) || questions.length === 0) {
      return errorResponse(
        res,
        400,
        "No valid questions provided",
        "No valid questions provided"
      );
    }

    for (let item of questions) {
      const isQuestionExist = await Question.findOne({
        question_bank_id,
        questionText: item.questionText.trim(),
      });
      if (isQuestionExist)
        return errorResponse(
          res,
          400,
          responseMessage.request_invalid,
          responseMessage.question_is_already_exist
        );
    }

    let questionList = [];   
    for (let value of questions) {
      let questionText = value["questionText"];
      let difficulty_level = value["difficulty_level"].trim();
      const rawAnswer = value["answer"]?.replace(/\s/g, "");
      const answerArr = rawAnswer?.split(",") || [];
      const answer = answerArr.map((item) => ({ rawAnswer: item }));
      let marks = value["marks"];
      let questionImgKey = value["questionImgKey"];
      const options = value.options.map((option) => ({
        optionKey: option.optionId,
        optionValue: option.title.trim(),
        optionImgKey: option.optionImgKey,
        isSelect: option.isSelect || false,
      })).filter(item => item.optionValue);
  
      let expectedMarks;

      let nosData = nosTheoryData[0];
      if (difficulty_level === 'Easy') {
          expectedMarks = nosData?.easyMPQ;
      } else if (difficulty_level === 'Medium') {
          expectedMarks = nosData?.mediumMPQ;
      } else if (difficulty_level === 'Difficult') {
          expectedMarks = nosData?.difficultMPQ;
      }
  

if (expectedMarks != marks) {
    return errorResponse(
        res,
        400,
        "Marks do not match with NOS",
        "Marks do not match with NOS"
    );
}

      questionList.push({
        questionText: questionText,
        options: options,
        difficulty_level: difficulty_level,
        answer: answer,
        marks: marks,
        questionImgKey: questionImgKey,
        question_bank_id: question_bank_id,
      });
    }

    const existingQuestionCount = await Question.countDocuments({
      question_bank_id,
    });

    if (questions.length > 0) {
      const response = await Question.insertMany(questionList);

      if (response) {
        const updatedQuestionCount = existingQuestionCount + response.length;

        // Update the questionCount in the questionbank model
        const updatedQuestionBank = await questionbankModel.findByIdAndUpdate(
          question_bank_id,
          { questionCount: updatedQuestionCount },
          { new: true }
        );

        for (let i = 0; i < response.length; i++) {
          const question = response[i];
          const options = question.options;

          question.answer = question.answer.map((answerObj) => {
            const rawAnswer = answerObj.rawAnswer;

            const extractedLetter = rawAnswer.toLowerCase();

            const option = options.find(
              (opt) =>
                opt.optionKey.toLowerCase() === `option${extractedLetter}`
            );

            if (option) {
              answerObj.answerId = option._id;
            }

            return answerObj;
          });

          // Update the question with updated answer objects
          await question.save();
        }

        return sendResponse(res, 200, "Question uploaded successfully", {
          questions: response,
          questionCount: updatedQuestionCount,
        });
      } else {
        return errorResponse(
          (res,
          400,
          "Error in uploading the questions",
          "Error in uploading the questions")
        );
      }
    } else {
      return errorResponse(res, 400, "Question is empty", "Question is empty");
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.questionList = async (req, res) => {
  try {
    let filter = getFilter(req, ["jobRole", "qpCode", "diffculityLevel"]);

    const { page, limit, skip, sortOrder } = Paginate(req);

    let query = filter ? filter.query : {};

    const totalCounts = await Question.countDocuments(query);

    const totalPages = Math.ceil(totalCounts / limit);

    const questionDetails = await Question.find(query)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);
    if (!questionDetails)
      return errorResponse(
        res,
        400,
        responseMessage.question_list_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, responseMessage.question_list_found, {
      questionDetails,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//---->update question<---
module.exports.updateQuestion = async (req, res) => {
  try {
    const { question_bank_id, questions } = req.body;
    const questionId = req.params.id;
    const filterLanguage = req.query?.lang;
    // Create a query to find all questions with the specified question_bank_id
    const query = {
      question_bank_id: mongoose.Types.ObjectId(question_bank_id),
    };
    // Validate the request body
    const { error } = validateUpdateQuestion(req.body);
    if (error) {
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );
    }

    if (!filterLanguage) {
      // Find the existing question by its _id
      const existingQuestion = await Question.findById(questionId);
      if (!existingQuestion) {
        return errorResponse(res, 400, "Question not found", "The not found.");
      }

      // Check if the provided question_bank_id matches the existing question's question_bank_id
      if (existingQuestion.question_bank_id.toString() !== question_bank_id) {
        return errorResponse(
          res,
          400,
          "Invalid question_bank_id",
          "The provided question_bank_id does not match the existing question."
        );
      }

      // check the mark as per nos marks

      const getNosMarkValidation = async (question_bank_id, questions) => { 
          const isExistquestionBank = await questionbankModel.findById(question_bank_id);
          let nosTheoryData;
          const { jobRole,section,version,nosId} = isExistquestionBank;

          if(section === 'Theory'){
            const theoryNOS = await nosModel.findOne({
              jobRole: jobRole,
              section: section,
              nosData: {
                  $elemMatch: {
                    version: version,
                    _id: nosId
                  }
              }
            })

            nosTheoryData = theoryNOS.nosData.filter(item=>item._id==nosId)//item.NOS===nos)
          
          }

          let expectedMarks;

          let nosData = nosTheoryData[0];
          if (questions[0].difficulty_level === 'Easy') {
              expectedMarks = nosData?.easyMPQ;
          } else if (questions[0].difficulty_level === 'Medium') {
              expectedMarks = nosData?.mediumMPQ;
          } else if (questions[0].difficulty_level === 'Difficult') {
              expectedMarks = nosData?.difficultMPQ;
          }

          if (expectedMarks != questions[0].marks) {
              return { status: false , message: "Marks do not match with NOS"}
          }else{
              return { status: true , message: "Marks do match with NOS"}
          }

      }

      const valid_mark_as_per_nos = await getNosMarkValidation(question_bank_id, questions)
      if(!valid_mark_as_per_nos.status){
          return errorResponse(
                res,
                400,
                valid_mark_as_per_nos.message,
                valid_mark_as_per_nos.message
          );
      } 

      const alreadyExistsQuestions = await Question.find(query);
      // Check if the new questionText already exists in the same question bank
      const questionTextExists = alreadyExistsQuestions.some((question) => {
        return (
          question.questionText === questions[0].questionText &&
          question._id.toString() !== questionId
        );
      });
      if (questionTextExists) {
        return errorResponse(
          res,
          400,
          "QuestionText already exists in this question bank",
          "The provided questionText already exists in this question bank."
        );
      }
      // Update the existing question with the new data
      existingQuestion.difficulty_level = questions[0].difficulty_level;
      existingQuestion.marks = questions[0].marks;

      const rawAnswer = questions[0].answer;
      const answerArr = rawAnswer.split(",").map((item) => ({
        rawAnswer: item.trim(),
      }));
      existingQuestion.answer = answerArr;

      existingQuestion.questionText = questions[0].questionText;
      existingQuestion.questionImgKey = questions[0].questionImgKey;
      existingQuestion.options = questions[0].options.map((option) => ({
        optionKey: option.optionId,
        optionValue: option.title,
        optionImgKey: option.optionImgKey,
        isSelect: option.isSelect || false,
      }));

      // Update answerId based on options
      existingQuestion.answer = existingQuestion.answer.map((answerObj) => {
        const rawAnswer = answerObj.rawAnswer;

        if (rawAnswer) {
          const extractedLetter = rawAnswer.toLowerCase();

          const option = existingQuestion.options.find(
            (opt) =>
              opt.optionKey &&
              opt.optionKey.toLowerCase() === `option${extractedLetter}`
          );

          if (option) {
            answerObj.answerId = option._id;
          }
        }
        return answerObj;
      });

      // Save the updated question
      const updatedQuestion = await existingQuestion.save();

      // Response
      return sendResponse(
        res,
        200,
        "Question updated successfully for English",
        updatedQuestion
      );
    } else {
      const question = await Question.findOne({ _id: questionId });
      if (!question)
        return errorResponse(res, 400, "Question not found", "The not found.");
      const validLanguage = [
        ...new Set(question.lang.map((item) => item.language)),
      ];

      console.log("validLanguage--->", validLanguage);

      const validateGivenLanguage = validLanguage.some(
        (item) => item === filterLanguage
      );
      if (!validateGivenLanguage)
        return errorResponse(
          res,
          400,
          "This question is not available in given language",
          "This question is not available in given language"
        );

      question.lang.forEach(item=> { 
          if(item.language === filterLanguage){
              item.questionText = questions[0].questionText

              item.options.map(langitem=>{ 
                  
                questions[0].options.forEach(primaryItem=>{

                    if(primaryItem.optionId === langitem.optionKey){
                        langitem.optionValue = primaryItem.title
                    }
                  })
              })
          }
      })

      // Save the updated question
      const updatedQuestion = await question.save();

      // Response
      return sendResponse(
        res,
        200,
        `Question updated successfully for ${filterLanguage}`,
        updatedQuestion
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//---->update viva question

module.exports.updateVivaQuestion = async (req, res) => {
  try {
    const { question_bank_id, questions } = req.body;
    const questionId = req.params.id;

    // Validate the request body
    const { error } = validateUpdateVivaQuestion(req.body);
    if (error) {
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );
    }

    // Find the existing question by its _id
    const existingQuestion = await vivaModel.findById(questionId);
    if (!existingQuestion) {
      return errorResponse(
        res,
        400,
        "Question not found",
        "The question not found."
      );
    }

    // Check if the provided question_bank_id matches the existing question's question_bank_id
    if (existingQuestion.question_bank_id.toString() !== question_bank_id) {
      return errorResponse(
        res,
        400,
        "Invalid question_bank_id",
        "The provided question does not match the existing question."
      );
    }

    // check the mark as per nos marks

      const getNosMarkValidation = async (question_bank_id, questions) => { 
          const isExistquestionBank = await questionbankModel.findById(question_bank_id);
          let nosTheoryData;
          const { jobRole,section,version,nosId} = isExistquestionBank;

          if(section === 'practical'|| section ==='viva'){
            const vivaNOS = await nosVivaModel.findOne({
              jobRole: jobRole,
              section: 'practical',
              nosData: {
                  $elemMatch: {
                    version: version,
                    _id: nosId
                  }
              }
            })

            

            nosTheoryData = vivaNOS.nosData.filter(item=>item._id==nosId)//item.NOS===nos)
          }

          const expectedMarks = nosTheoryData[0]?.vivaMPQ;

          if (expectedMarks != questions[0].marks) {
              return { status: false , message: "Marks do not match with NOS"}
          }else{
              return { status: true , message: "Marks do match with NOS"}
          }

      }

      const valid_mark_as_per_nos = await getNosMarkValidation(question_bank_id, questions)
      if(!valid_mark_as_per_nos.status){
          return errorResponse(
                res,
                400,
                valid_mark_as_per_nos.message,
                valid_mark_as_per_nos.message
          );
      } 

    

    // Check if the new questionText already exists in the same question bank
    const questionTextExists = await vivaModel.findOne({
      question_bank_id: question_bank_id,
      questionText: questions[0].questionText,
      _id: { $ne: questionId }, // Exclude the current question
    });
    console.log("questiontextExists", questionTextExists);
    if (questionTextExists) {
      return errorResponse(
        res,
        400,
        "Questiont text already exists in this question bank",
        "The provided question text already exists in this question bank."
      );
    }

    // Update the existing question with the new data, including the "answer" field
    existingQuestion.questionText = questions[0].questionText;
    existingQuestion.answer = questions[0].answer;
    existingQuestion.marks = questions[0].marks;
    // Save the updated question
    const updatedQuestion = await existingQuestion.save();
    // Response
    return sendResponse(
      res,
      200,
      "Question updated successfully",
      updatedQuestion
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.removeVivaQuestion = async (req, res) => {
  try {
    let questionId = req.params.id;

    const questionDetail = await vivaModel.findById(questionId);
    // check user if found or not
    if (!questionDetail)
      return errorResponse(
        res,
        400,
        responseMessage.question_not_found,
        responseMessage.errorMessage
      );

    const result = await vivaModel.deleteOne({ _id: questionId });
    // send data to client
    return sendResponse(res, 200, responseMessage.question_delete, result);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.updatePracticalQuestion = async (req, res) => {
  try {
    const { question_bank_id, questions } = req.body;
    const questionId = req.params.id;

    // Validate the request body
    const { error } = validateUpdatePracticalQuestion(req.body);
    if (error) {
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );
    }

    // Find the existing question by its _id
    const existingQuestion = await practicalModel.findById(questionId);
    if (!existingQuestion) {
      return errorResponse(
        res,
        400,
        "Question not found",
        "The question not found."
      );
    }

    // Check if the provided question_bank_id matches the existing question's question_bank_id
    if (existingQuestion.question_bank_id.toString() !== question_bank_id) {
      return errorResponse(
        res,
        400,
        "Invalid question_bank_id",
        "The provided question does not match the existing question."
      );
    }

    // check the mark as per nos marks

      const getNosMarkValidation = async (question_bank_id, questions) => { 
          const isExistquestionBank = await questionbankModel.findById(question_bank_id);
          let nosTheoryData;
          const { jobRole,section,version,nosId} = isExistquestionBank;

          if(section === 'practical'|| section ==='viva'){
            const vivaNOS = await nosVivaModel.findOne({
              jobRole: jobRole,
              section: 'practical',
              nosData: {
                  $elemMatch: {
                    version: version,
                    _id: nosId
                  }
              }
            })

            

            nosTheoryData = vivaNOS.nosData.filter(item=>item._id==nosId)//item.NOS===nos)
          }

          const expectedMarks = nosTheoryData[0]?.practicalMPQ;

          if (expectedMarks != questions[0].marks) {
              return { status: false , message: "Marks do not match with NOS"}
          }else{
              return { status: true , message: "Marks do match with NOS"}
          }

      }

      const valid_mark_as_per_nos = await getNosMarkValidation(question_bank_id, questions)
      if(!valid_mark_as_per_nos.status){
          return errorResponse(
                res,
                400,
                valid_mark_as_per_nos.message,
                valid_mark_as_per_nos.message
          );
      } 

    // Check if the new questionText already exists in the same question bank
    const questionTextExists = await practicalModel.findOne({
      question_bank_id: question_bank_id,
      questionText: questions[0].questionText,
      _id: { $ne: questionId }, // Exclude the current question
    });
    console.log("questiontextExists", questionTextExists);
    if (questionTextExists) {
      return errorResponse(
        res,
        400,
        "QuestionText already exists in this question bank",
        "The provided questionText already exists in this question bank."
      );
    }

    // Update the existing question with the new data, including the "answer" field
    existingQuestion.questionText = questions[0].questionText;
    existingQuestion.answer = questions[0].answer;
    existingQuestion.marks = questions[0].marks;
    // Save the updated question
    const updatedQuestion = await existingQuestion.save();
    console.log("updated questions", updatedQuestion);
    // Response
    return sendResponse(
      res,
      200,
      "Question updated successfully",
      updatedQuestion
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.removePracticalQuestion = async (req, res) => {
  try {
    let questionId = req.params.id;

    const questionDetail = await practicalModel.findById(questionId);

    // check user if found or not
    if (!questionDetail)
      return errorResponse(
        res,
        400,
        responseMessage.question_not_found,
        responseMessage.errorMessage
      );
    // const result = await practicalModel.findByIdAndDelete(questionId);
    const result = await practicalModel.deleteOne({ _id: questionId });
    // send data to client
    return sendResponse(res, 200, responseMessage.question_delete, result);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.getUpdateQuestionBankdetail = async (req, res) => {
  try {
    const questionId = req.params.id;

    let questionDetail = await Question.findById(questionId);
    const filterLanguage = req.query.lang || "English";

    if (!questionDetail)
      return errorResponse(
        res,
        400,
        "Question detail doesn't exists",
        responseMessage.errorMessage
      );

    let secondaryLangQuestion = questionDetail.lang.find(
      (item) => item.language === filterLanguage
    );

    if (secondaryLangQuestion) {
      questionDetail.questionText = secondaryLangQuestion.questionText;
      questionDetail.options.map((item) => {
        secondaryLangQuestion.options.map((secondaryItem) => {
          if (item.optionKey === secondaryItem.optionKey) {
            item.optionValue = secondaryItem.optionValue;
          }
        });
      });
    }

    // Do not use map on questionDetail, directly access its properties
    questionDetail.options = await Promise.all(
      questionDetail.options.map(async (item) => {
        if (item.optionImgKey) {
          return {
            ...JSON.parse(JSON.stringify(item)),
            optionUrl: await getFileUrl(item.optionImgKey),
          };
        } else {
          return item;
        }
      })
    );

    return sendResponse(
      res,
      200,
      "Question detail get data successfully",
      questionDetail
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.getVivaQuestionById = async (req, res) => {
  try {
    const questionId = req.params.id;

    const questionDetail = await vivaModel.findById(questionId);

    if (!questionDetail)
      return errorResponse(
        res,
        400,
        "Question detail doesn't exists",
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, "Question data found", questionDetail);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.getPracticalQuestionById = async (req, res) => {
  try {
    const questionId = req.params.id;

    const questionDetail = await practicalModel.findById(questionId);

    if (!questionDetail)
      return errorResponse(
        res,
        400,
        "Question detail doesn't exists",
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, "Question data found", questionDetail);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.getQuestionsByQuestionBankId = async (req, res) => {
  try {
    // const { page, limit, skip, sortOrder } = Paginate(req);

    const question_bank_id = req.params.id;
    const filterLanguage = req.query.lang || "English";
    // const { error } = validateQuestionsByQuestionBankId(question_bank_id);

    // if (error)
    //   return errorResponse(
    //     res,
    //     400,
    //     responseMessage.request_invalid,
    //     error.message
    //   );

    const isExistquestionBank = await questionbankModel.findById(
      question_bank_id
    );
    if (!isExistquestionBank)
      return errorResponse(
        res,
        400,
        responseMessage.question_bankId_not_found,
        responseMessage.question_bankId_not_found
      );
    //check section and upload according to section
    if (isExistquestionBank.section === "Theory") {
      let filter = getFilter(req, ["difficulty_level", "questionText"]);
      const { page, limit, skip, sortOrder } = Paginate(req);

      // Define the base query
      const baseQuery = {
        question_bank_id: mongoose.Types.ObjectId(question_bank_id),
      };

      // Merge the base query with the filter query, if it exists
      const query = filter ? { ...baseQuery, ...filter.query } : baseQuery;

      //Find all questions that have the specified questionbankId
      const totalCounts = await Question.countDocuments(query);

      const totalPages = Math.ceil(totalCounts / limit);

      let questions = await Question.find(query)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit);

      if (!questions || questions.length === 0) {
        return sendResponse(res, 200, "Questions not found", {});
      }

      const languages = questions[0]?.lang?.map((item) => item?.language);

      let uniqueLanguages = [...new Set(languages)];

      // questions.map(question=> {
      //     return question.lang = question.lang.filter(item=> item.language === req.params.lang)
      // })

      questions.map((question) => {
        let secondaryLangQuestion = question.lang.find(
          (item) => item.language === filterLanguage
        );

        if (secondaryLangQuestion) {
          question.questionText = secondaryLangQuestion.questionText;
          question.options.map((item) => {
            secondaryLangQuestion.options.map((secondaryItem) => {
              if (item.optionKey === secondaryItem.optionKey) {
                item.optionValue = secondaryItem.optionValue;
              }
            });
          });

          return question;
        }

        return question;
      });

      questions = await Promise.all(
        questions.map(async (question) => {
          question.options = await Promise.all(
            question.options.map(async (item) => {
              if (item.optionImgKey) {
                return {
                  ...JSON.parse(JSON.stringify(item)),
                  optionUrl: await getFileUrl(item.optionImgKey),
                };
              } else {
                return item;
              }
            })
          );
          return question;
        })
      );

      return sendResponse(res, 200, "Questions retrieved successfully", {
        questions,
        uniqueLanguages,
        page,
        totalCounts,
        totalPages,
      });
    } else if (isExistquestionBank.section === "viva") {
      let filter = getFilter(req, ["questionText"]);
      const { page, limit, skip, sortOrder } = Paginate(req);

      // Define the base query
      const baseQuery = {
        question_bank_id: mongoose.Types.ObjectId(question_bank_id),
      };

      // Merge the base query with the filter query, if it exists
      const query = filter ? { ...baseQuery, ...filter.query } : baseQuery;

      //Find all questions that have the specified questionbankId
      const totalCounts = await vivaModel.countDocuments(query);

      const totalPages = Math.ceil(totalCounts / limit);

      const questions = await vivaModel
        .find(query)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit);

      if (!questions || questions.length === 0) {
        return sendResponse(res, 200, "Questions not found", {});
      }

      const languages = questions[0]?.lang?.map((item) => item?.language);

      let uniqueLanguages = [...new Set(languages)];

      questions.map((question) => {
        let secondaryLangQuestion = question.lang?.find(
          (item) => item?.language === filterLanguage
        );

        if (secondaryLangQuestion) {
          question.questionText = secondaryLangQuestion.questionText;
          question.answer = secondaryLangQuestion.answer;

          return question;
        }

        return question;
      });

      return sendResponse(res, 200, "Questions retrieved successfully", {
        questions,
        uniqueLanguages,
        page,
        totalCounts,
        totalPages,
      });
    } else if (isExistquestionBank.section === "practical") {
      let filter = getFilter(req, ["questionText"]);
      const { page, limit, skip, sortOrder } = Paginate(req);

      // Define the base query
      const baseQuery = {
        question_bank_id: mongoose.Types.ObjectId(question_bank_id),
      };

      // Merge the base query with the filter query, if it exists
      const query = filter ? { ...baseQuery, ...filter.query } : baseQuery;

      //Find all questions that have the specified questionbankId
      const totalCounts = await practicalModel.countDocuments(query);

      const totalPages = Math.ceil(totalCounts / limit);

      const questions = await practicalModel
        .find(query)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit);

      if (!questions || questions.length === 0) {
        return sendResponse(res, 200, "Questions not found", {});
      }

      const languages = questions[0]?.lang?.map((item) => item?.language);

      let uniqueLanguages = [...new Set(languages)];

      questions.map((question) => {
        let secondaryLangQuestion = question.lang?.find(
          (item) => item?.language === filterLanguage
        );

        if (secondaryLangQuestion) {
          question.questionText = secondaryLangQuestion.questionText;
          question.answer = secondaryLangQuestion.answer;

          return question;
        }

        return question;
      });

      return sendResponse(res, 200, "Questions retrieved successfully", {
        questions,
        uniqueLanguages,
        page,
        totalCounts,
        totalPages,
      });
    }
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
      Key: data,
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

exports.removeQuestion = async (req, res) => {
  try {
    let questionId = req.params.id;

    const questionDetail = await Question.findById(questionId);
    // check user if found or not
    if (!questionDetail)
      return errorResponse(
        res,
        400,
        responseMessage.question_not_found,
        responseMessage.errorMessage
      );

    const result = await Question.deleteOne({ _id: questionId });
    const questionCount = await Question.countDocuments({question_bank_id:questionDetail.question_bank_id})
    await questionbankModel.findByIdAndUpdate({_id: questionDetail.question_bank_id},
            {$set: { questionCount: questionCount}})

    
    // send data to client
    return sendResponse(res, 200, responseMessage.question_delete, result);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.questionStatus = async (req, res) => {
  try {
    const { error } = validateStatusChange(req.body);
    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );
    const { status, question_id } = req.body;
    let change = status == "active" ? "active" : "inactive";

    const updateStatus = await Question.findByIdAndUpdate(question_id, {
      status: change,
    });
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

//here if download question sample file
module.exports.downloadTheoryQuestionSampleFile = (req, res) => {
  const filepath = `public/files/bulkuploadsamplefile`;
  const file = `${filepath}/Theory-questionSample.xlsx`;
  return res.status(200).download(file);
};

//here download viva-pracical question sample file
module.exports.downloadVivaQuestionSampleFile = (req, res) => {
  const filepath = `public/files/bulkuploadsamplefile`;
  const file = `${filepath}/Viva-questionSample.xlsx`;
  return res.status(200).download(file);
};

module.exports.downloadPracticalQuestionSampleFile = (req, res) => {
  const filepath = `public/files/bulkuploadsamplefile`;
  const file = `${filepath}/Practical-questionSample.xlsx`;
  return res.status(200).download(file);
};

//here is Viva fileupload function
module.exports.bulkUploadVivaqb = async (req, res) => {
  try {
    let { question_bank_id } = req.body;
    const { error } = validatebulkUploadVivaqb(req.body);

    if (error) {
      // const fileDelete = await fs.unlink(req.file.path);
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );
    }

    let workbook = reader.readFile(req.file.path);
    let sheet_name_list = workbook.SheetNames;
    let xlData = reader.utils.sheet_to_json(
      workbook.Sheets[sheet_name_list[0]]
    );
    let questions = [];
    xlData.map(async (item, index) => {
      let correctAnswer = item["correct answer"] ? item["correct answer"] : "";

      questions.push({
        question_bank_id: question_bank_id,
        questionText: item.Question,
        correctAnswer: correctAnswer,
      });
    });

    const details = await questionbankModel.findById(question_bank_id); //findById({ _id: questionbankId });

    if (details) {
      for (let item of questions) {
        const isQuestionExist = await vivaModel.findOne({
          question_bank_id,
          questionText: item.questionText,
        });
        if (isQuestionExist)
          return errorResponse(
            res,
            400,
            responseMessage.request_invalid,
            "Question is already created"
          );
      }

      const existingQuestionCount = await vivaModel.countDocuments({
        question_bank_id,
      });

      let questionAddSection = [...questions];
      let questionWithSection = await questionAddSection.map((item) => {
        return {
          ...item,
        };
      });

      const saveQuestion = await vivaModel.insertMany(questionWithSection);

      if (saveQuestion) {
        const updatedQuestionCount =
          existingQuestionCount + saveQuestion.length;

        // Update the questionCount in the questionbank model
        const updatedQuestionBank = await questionbankModel.findByIdAndUpdate(
          question_bank_id,
          { questionCount: updatedQuestionCount },
          { new: true }
        );

        return sendResponse(
          res,
          200,
          responseMessage.question_create,
          { questions: saveQuestion, questionCount: updatedQuestionCount }
          //saveQuestion
        );
      } else {
        return errorResponse(
          res,
          400,
          responseMessage.question_not_create,
          responseMessage.errorMessage
        );
      }
    } else {
      return errorResponse(
        res,
        400,
        "Question bank not found",
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//bulk upload question in question bank
const validatebulkUpload2 = (data) => {
  try {
    const schema = Joi.object({
      question_bank_id: Joi.string().required(),
    });
    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
};
const checkQuestion = async (
  questions,
  difficulty_level,
  marks,
  noOfQuestion
) => {
  const questionCount = questions.filter(
    (item) => item.difficulty_level == difficulty_level
  ).length;
  if (noOfQuestion <= questionCount) {
    return questions
      .filter((item) => item.difficulty_level == difficulty_level)
      .every((item) => item.marks == marks);
  }
  return false;
};
const checkVivaPQuestion=async(questions,marks,noOfQuestion)=>{
  const questionCount = questions.filter(
    (item) =>item.marks == marks
  ).length;
      if(noOfQuestion <= questionCount){  
        return questions
      //.filter((item) => item.marks == marks)
      .every((item) => item.marks == marks);
  }
  return false;
}
const nosValidationCheck = async (nosDetails,section, questions,existingQuestionCountCheck) => {
    if(!nosDetails) return {error:true,message:`Nos Details not found in ${section}`}
  console.log("nosItem>>>>", nosDetails, questions);
   if(section=='Theory'){
    let easyNotExist = await checkQuestion(
      questions,
      "Easy",
      nosDetails.easyMPQ,
      nosDetails.easyNOQ-existingQuestionCountCheck.exEasyNoQ
    );
    if (!easyNotExist)
      return { error: true, message: "Easy Marks or count not match with nos" };
    let mediumNotExist = await checkQuestion(
      questions,
      "Medium",
      nosDetails.mediumMPQ,
      nosDetails.mediumNOQ-existingQuestionCountCheck.exMediumNoQ
    );
    if (!mediumNotExist)
      return { error: true, message: "Medium Marks or count not match with nos" };
    let difficultNotExist = await checkQuestion(
      questions,
      "Difficult",
      nosDetails.difficultMPQ,
      nosDetails.difficultNOQ-existingQuestionCountCheck.exDifficultNoQ
    );
    if (!difficultNotExist)
      return { error: true, message: "Difficult Marks or count not match with nos" };
   }else if(section=='practical'){
      console.log(nosDetails)
    let practicalNotExist = await await checkVivaPQuestion(
      questions,
      nosDetails.practicalMPQ,
      nosDetails.practicalNOQ
    );
    if (!practicalNotExist)
      return { error: true, message: "Practical Marks or count not match with nos" };
   }else if(section=='viva'){
    let vivaNotExist = await checkVivaPQuestion(
      questions,
      nosDetails.vivaMPQ,
      nosDetails.vivaNOQ
    );
    if (!vivaNotExist)
      return { error: true, message: "Viva Marks or count not match with nos" };

   }
 
};

module.exports.bulkUploadQuestionsInQB = async (req, res) => {
  try {
    let { question_bank_id } = req.body;

    const { error } = validatebulkUpload2(req.body);
    let nosDatails;
    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );

    const isExistquestionBank = await questionbankModel.findById(
      question_bank_id
    );

    // console.log("qbId Details",isExistquestionBank )
    if (!isExistquestionBank)
      return errorResponse(
        res,
        400,
        responseMessage.question_bankId_not_found,
        responseMessage.question_bankId_not_found
      );
   
    if (isExistquestionBank.section === "Theory") {
      let { nos, jobRole, section, nosId ,jobLevel, version } = isExistquestionBank;
      console.log("nosName", nos);
      //let jobRole = isExistquestionBank.jobRole;
      //console.log("nosName,jobRole",nosName,jobRole)
      console.log('jobRole-->', jobRole)
      console.log('section-->', section)
      const { nosData } = await nosModel.findOne({
        // $and: [{ jobRole }, { section }],
        $and: [{ jobRole }, { section }, {'nosData.level': jobLevel}, {'nosData.version': version}],
      });
      console.log('nosData',nosData)
      // nosDatails = nosData.find((item) => item.NOS == nos && item.level === jobLevel && item.version === version );
      nosDatails = nosData.find((item) => item._id == nosId);
      console.log('nosDetails',nosDatails)
      //let nosMed = batchData._id.toString();

      //====>END<=====
      let workbook = reader.readFile(req.file.path);
      let sheet_name_list = workbook.SheetNames;
      let xlData = reader.utils.sheet_to_json(
        workbook.Sheets[sheet_name_list[0]]
      );

      let requiredHeaders = ['Question', 'Difficulty Level', 'Marks'];
      if (xlData.some(value => !requiredHeaders.every(header => Object.keys(value).includes(header)))) {
        return errorResponse(res, 400, 'Invalid excel sheet', 'Required headers are missing');
      }

      //---->END<------
      let errors;
      let questions = [];
      xlData.map(async (value) => {
        // let serialNo = value["serial No"]
        let questionText = value["Question"];
        let difficulty_level = value["Difficulty Level"].trim();
        const rawAnswer = value["Answer"]?.replace(/\s/g, "");
        const answerArray = rawAnswer?.split(",");
        const answerArr = answerArray || [];
        const answer = answerArr.map((item) => ({ rawAnswer: item }));
        let marks = value["Marks"];
        let options = [];

        // Check and include all columns starting with "Option"
        // let flag = false
        for (const [key, optionValue] of Object.entries(value)) {
          if (key.startsWith("Option")) {
            // if(key === "OptionA" || key === "OptionB"){
            //     flag = true
            // }
            // const optionValueCheck = optionValue.trim()
            // if(optionValueCheck){
              options.push({
                optionKey: key,
                optionValue: (optionValue.toString())?.trim(),
              });
            // }

            
          }
        }

        // if(!flag){
        //   errors = { message : 'optionA or optionB is missing'}
        // }

        // Validation here

        const validationResults = validateBulkuploadQB({
          difficulty_level,
          marks,
          questionText,
          //options,
          rawAnswer,
        });

        // const {error } = validationResults;
        // if(error){
        //   errors = error;
        //   return false
        //  // throw new Error(`${error.message}`)
        // }
        const { value1, error } = validationResults;
        if (error) {
          errors = error;
          return false;
          // throw new Error(`${error.message}`)
        }

        questions.push({
          questionText: questionText,
          options: options,
          difficulty_level: difficulty_level,
          // jobRole:jobRole,
          answer: answer,
          marks: marks,
          question_bank_id: question_bank_id,
        });
      });

      if (errors) {
        await fs.unlink(req.file.path);
        return errorResponse(
          res,
          400,
          responseMessage.something_wrong,
          errors.message //'Please check your Excel sheet for valid input fields. Make sure you have the required fields with the necessary values.' errors.message //nos: errors._original.NOS,
        );
      }
      let removeQuestions=new Set();
      //check if question is exists or not
      for (let [index ,item] of questions.entries()) {
        const isQuestionExist = await Question.findOne({
          question_bank_id,
          //jobRole:jobRole,
          questionText: item.questionText,
        });
        console.log(isQuestionExist)
        if (isQuestionExist){
          removeQuestions.add(index);
        }
          
      }
      let existingQuestionCountCheck={
        exEasyNoQ:0,
        exMediumNoQ:0,
        exDifficultNoQ:0,

      };
      questions= questions.filter((item,index)=>!removeQuestions.has(index));
      console.log('removequestion',questions,removeQuestions)
      //update easy question
       existingQuestionCountCheck.exEasyNoQ = await Question.countDocuments({
        question_bank_id,
        difficulty_level:"Easy"
      })||0;
      existingQuestionCountCheck.exMediumNoQ = await Question.countDocuments({
        question_bank_id,
        difficulty_level:"Medium"
      })||0;
      existingQuestionCountCheck.exDifficultNoQ= await Question.countDocuments({
        question_bank_id,
        difficulty_level:"Difficult"
      })||0;
      console.log('nosDetails>>>>>>>>>>',nosDatails)
      let nosCheckDetails = await nosValidationCheck(nosDatails,section, questions,existingQuestionCountCheck);
      console.log('nosCheckDetails',nosCheckDetails)
      if(nosCheckDetails?.error){
          return errorResponse(
            res,
            400,
            responseMessage.request_invalid,
            nosCheckDetails.message
          );
      }
     
      if (questions.length > 0) {
        await fs.unlink(req.file.path);
        const response = await Question.insertMany(questions);
        const existingQuestionCount = await Question.countDocuments({
          question_bank_id
        });
        if (response) {
          const updatedQuestionCount = existingQuestionCount;  //+ response.length;

          // Update the questionCount in the questionbank model
          const updatedQuestionBank = await questionbankModel.findByIdAndUpdate(
            question_bank_id,
            { questionCount: updatedQuestionCount },
            { new: true }
          );

          for (let i = 0; i < response.length; i++) {
            const question = response[i];
            const options = question.options;

            question.answer = question.answer.map((answerObj) => {
              const rawAnswer = answerObj.rawAnswer;

              const extractedLetter = rawAnswer.toLowerCase();
              const option = options.find(
                (opt) =>
                  opt.optionKey.toLowerCase() === `option${extractedLetter}`
              );
              if (option) {
                answerObj.answerId = option._id;
              }

              return answerObj;
            });

            // Update the question with updated answer objects
            await question.save();
          }

          return sendResponse(res, 200, "Question uploaded successfully", {
            questions: response,
            questionCount: updatedQuestionCount,
          });
        } else {
          return errorResponse(
            (res,
            400,
            "Error in uploading the questions",
            "Error in uploading the questions")
          );
        }
      } else {
        await fs.unlink(req.file.path);
        return errorResponse(
          res,
          400,
          "Can not insert empty file atleast one questions should be there.",
          "Can not insert empty file atleast one questions should be there."
        );
      }
    } else if (isExistquestionBank.section === "viva") {

      let { nos, jobRole, section, nosId, jobLevel, version } = isExistquestionBank;
      console.log('jobRole',jobRole,section)
      // const { nosData } = await nosVivaModel.findOne({ jobRole });
      const { nosData } = await nosVivaModel.findOne({
        $and: [{ jobRole }, {'nosData.level': jobLevel}, {'nosData.version': version}],
      });

      console.log('nosData',nosData)

      nosDatails = nosData.find((item) => item._id == nosId);
      let workbook = reader.readFile(req.file.path);
      let sheet_name_list = workbook.SheetNames;
      let xlData = reader.utils.sheet_to_json(
        workbook.Sheets[sheet_name_list[0]]
      );

      let requiredHeaders = ['Question', 'Answer', 'Marks'];
      if (xlData.some(value => !requiredHeaders.every(header => Object.keys(value).includes(header)))) {
        return errorResponse(res, 400, 'Invalid excel sheet', 'Required headers are missing');
      }

      if (xlData.length < 1) {
        await fs.unlink(req.file.path);
        return errorResponse(
          res,
          400,
          responseMessage.can_not_insert_empty_file,
          responseMessage.can_not_insert_empty_file
        );
      }

      let errors;
      let questions = [];
      xlData.map(async (item) => {
        let questionText = item["Question"]; //? item["Question"] : "";//let questionText = value["Question"];
        let answer = item["Answer"]; //? item["Answer"] : "";
        let marks = item["Marks"]; //? item["Marks"] : "";

        const validationResults = validateVivaBulkuploadQB({
          questionText,
          answer,
          marks,
        });

        const { valueViva, error } = validationResults;
        if (error) {
          errors = error;
          return false;
          // throw new Error(`${error.message}`)
        }

        questions.push({
          question_bank_id: question_bank_id,
          questionText: questionText, //Question,//questionText, //item.Question,
          answer: answer,
          marks: marks,
        });
      });

      if (errors) {
        await fs.unlink(req.file.path);
        return errorResponse(
          res,
          400,
          responseMessage.something_wrong,
          errors.message //'Please check your Excel sheet for valid input fields. Make sure you have the required fields with the necessary values.' errors.message //nos: errors._original.NOS,
        );
      }
       const questionBankDetails=await questionbankModel.findById(question_bank_id)
       console.log('nosDetails>>>>>>>>>>',nosDatails)
      let nosCheckDetails = await nosValidationCheck(nosDatails,section, questions);
      console.log('nosCheckDetails',nosCheckDetails)
      if(questionBankDetails.questionCount==0 && nosCheckDetails?.error){
          return errorResponse(
            res,
            400,
            responseMessage.request_invalid,
            nosCheckDetails.message
          );
      }
      if (questions.length > 0) {
        // await fs.unlink(req.file.path);
        let removeQuestions=new Set();
        for (let [index,item] of questions.entries()) {
          const isQuestionExist = await vivaModel.findOne({
            question_bank_id,
            questionText: item.questionText,
          });
          if (isQuestionExist)
              removeQuestions.add(index)
           
        }
        questions= questions.filter((item,index)=>!removeQuestions.has(index)) 
        const existingQuestionCount = await vivaModel.countDocuments({
          question_bank_id,
        });

        let questionAddSection = [...questions];
        let questionWithSection = await questionAddSection.map((item) => {
          return {
            ...item,
          };
        });

        const saveQuestion = await vivaModel.insertMany(questionWithSection);

        if (saveQuestion) {
          await fs.unlink(req.file.path);
          const updatedQuestionCount =
            existingQuestionCount + saveQuestion.length;

          // Update the questionCount in the questionbank model
          const updatedQuestionBank = await questionbankModel.findByIdAndUpdate(
            question_bank_id,
            { questionCount: updatedQuestionCount },
            { new: true }
          );

          return sendResponse(
            res,
            200,
            responseMessage.question_create,
            { questions: saveQuestion, questionCount: updatedQuestionCount }
            //saveQuestion
          );
        } else {
          await fs.unlink(req.file.path);
          return errorResponse(
            res,
            400,
            responseMessage.question_not_create,
            responseMessage.errorMessage
          );
        }
      } else {
        await fs.unlink(req.file.path);
        return errorResponse(
          res,
          400,
          "Can not insert empty file atleast one questions should be there.",
          responseMessage.errorMessage
        );
      }
    } else if (isExistquestionBank.section === "practical") {
      // let { nosName, jobRole, section, nosId } = isExistquestionBank;
      // const { nos } = await nosVivaModel.findOne({
      //   $and: [{ jobRole }, { section }],
      // });


      let { nos, jobRole, section, nosId, jobLevel, version } = isExistquestionBank;
      console.log('jobRole',jobRole,section)
      // const { nosData } = await nosVivaModel.findOne({ jobRole });
      const { nosData } = await nosVivaModel.findOne({
        $and: [{ jobRole }, {'nosData.level': jobLevel}, {'nosData.version': version}],
      });

      console.log('nosData>>>>>>>>>>',nosData)
      nosDatails = nosData.find((item) =>  item._id == nosId);
      let workbook = reader.readFile(req.file.path);
      let sheet_name_list = workbook.SheetNames;
      let xlData = reader.utils.sheet_to_json(
        workbook.Sheets[sheet_name_list[0]]
      );

      let requiredHeaders = ['Question', 'Answer', 'Marks'];
      if (xlData.some(value => !requiredHeaders.every(header => Object.keys(value).includes(header)))) {
        return errorResponse(res, 400, 'Invalid excel sheet', 'Required headers are missing');
      }

      if (xlData.length < 1) {
        await fs.unlink(req.file.path);
        return errorResponse(
          res,
          400,
          responseMessage.can_not_insert_empty_file,
          responseMessage.can_not_insert_empty_file
        );
      }

      let errors;
      let questions = [];
      xlData.map(async (item, index) => {
        let questionText = item["Question"]; //? item["Question"] : "";
        let answer = item["Answer"]; //? item["Answer"] : "";
        let marks = item["Marks"]; //? item["Marks"] : "";

        const validationResults = validateVivaBulkuploadQB({
          questionText,
          answer,
          marks,
        });

        const { valueViva, error } = validationResults;
        if (error) {
          errors = error;
          return false;
          // throw new Error(`${error.message}`)
        }
        questions.push({
          question_bank_id: question_bank_id,
          questionText: questionText, //item.Question,
          answer: answer,
          marks: marks,
        });
      });

      if (errors) {
        await fs.unlink(req.file.path);
        return errorResponse(
          res,
          400,
          responseMessage.something_wrong,
          errors.message //'Please check your Excel sheet for valid input fields. Make sure you have the required fields with the necessary values.' errors.message //nos: errors._original.NOS,
        );
      }
      let nosCheckDetails = await nosValidationCheck(nosDatails,section, questions);
      console.log('nosCheckDetails',nosCheckDetails)
      if(nosCheckDetails?.error){
          return errorResponse(
            res,
            400,
            responseMessage.request_invalid,
            nosCheckDetails.message
          );
      }

      if (questions.length > 0) {
        let removeQuestions=new Set();
        for (let [index,item] of questions.entries()) {
          const isQuestionExist = await practicalModel.findOne({
            question_bank_id,
            questionText: item.questionText,
          });
          if (isQuestionExist)
            removeQuestions.add(index)
        
        }
       questions=questions.filter((item,index)=>!removeQuestions.has(index));
        const existingQuestionCount = await practicalModel.countDocuments({
          question_bank_id,
        });

        let questionAddSection = [...questions];
        let questionWithSection = await questionAddSection.map((item) => {
          return {
            ...item,
          };
        });

        const saveQuestion = await practicalModel.insertMany(
          questionWithSection
        );

        if (saveQuestion) {
          await fs.unlink(req.file.path);
          const updatedQuestionCount =
            existingQuestionCount + saveQuestion.length;

          // Update the questionCount in the questionbank model
          const updatedQuestionBank = await questionbankModel.findByIdAndUpdate(
            question_bank_id,
            { questionCount: updatedQuestionCount },
            { new: true }
          );

          return sendResponse(
            res,
            200,
            responseMessage.question_create,
            { questions: saveQuestion, questionCount: updatedQuestionCount }
            //saveQuestion
          );
        } else {
          await fs.unlink(req.file.path);
          return errorResponse(
            res,
            400,
            responseMessage.question_not_create,
            responseMessage.errorMessage
          );
        }
      } else {
        await fs.unlink(req.file.path);
        return errorResponse(
          res,
          400,
          "Can not insert empty file atleast one questions should be there.",
          responseMessage.errorMessage
        );
      }
    } else {
      await fs.unlink(req.file.path);
      return errorResponse(
        res,
        400,
        "Upload valid section file",
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    console.log('error',error)
    await fs.unlink(req.file.path);
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

function validatecreateQuestion(body) {
  try {
    const questionSchema = Joi.object({
      difficulty_level: Joi.string().required(),
      //   marks: Joi.string().regex(/^\d+$/).greater(0).required().messages({
      //     "any.required": "Marks is required",
      //     "string.pattern.base": "Marks must be a positive integer",
      //     "number.greater": "Marks must be greater than 0",
      //     "number.base": "Marks must be a number"
      // }),
      marks: Joi.number().greater(0).required().messages({
        "any.required": "Marks is required",
        "number.greater": "Marks must be greater than 0",
        // "number.min": "Marks must be at least 1 character long.",
        // "number.max": "Marks cannot be longer than 100.",
        "number.base": "Marks must be a number",
      }),
      options: Joi.array().empty(""),
      //marks: Joi.number().integer().min(1).required(), // Assuming marks should be a positive integer
      answer: Joi.string().empty(""),
      questionText: Joi.string().required(),
      questionImgKey: Joi.string().empty(""),
      isTrueFalse: Joi.boolean(),
    });

    const schema = Joi.object({
      question_bank_id: Joi.string().required(),
      questions: Joi.array().items(questionSchema).min(1), // Assuming at least one question is required
    });

    return schema.validate(body);
  } catch (err) {
    console.log(err);
  }
  // try {
  //   const schema = Joi.object({
  //     question_bank_id: Joi.string().required(),
  //     questions: Joi.array()//.max(255),
  //   });
  //   return schema.validate(body);
  // } catch (err) {
  //   console.log(err);
  // }
}

// function validateUpdateQuestion(data) {
//   try {
//     const schema = Joi.object({
//       question_bank_id: Joi.string().required(),
//       questions: Joi.array(),//.max(10),
//     });
//     return schema.validate(data);
//   } catch (err) {
//     console.log(err);
//   }
// }
function validateUpdateQuestion(data) {
  try {
    const questionSchema = Joi.object({
      difficulty_level: Joi.string()
        .required()
        .valid("Easy", "Medium", "Difficult")
        .messages({
          "any.required": "Difficulty level is required",
          "string.base": "Difficulty level must be a string",
          "any.only":
            "Invalid difficulty level. Must be one of: Easy, Medium, Difficult",
        }),
      marks: Joi.number().greater(0).required().messages({
        "any.required": "Marks is required",
        "number.greater": "Marks must be greater than 0",
        "number.base": "Marks must be a number",
      }),
      options: Joi.array(),
      answer: Joi.string().required(),
      questionText: Joi.string().required(),
      questionImgKey: Joi.string().empty(""),
      isTrueFalse: Joi.boolean(),
    });

    const schema = Joi.object({
      question_bank_id: Joi.string().required(),
      questions: Joi.array().items(questionSchema).min(1), // Assuming at least one question is required
    });

    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
}

function validateUpdateVivaQuestion(data) {
  try {
    const questionSchema = Joi.object({
      marks: Joi.number().greater(0).required().messages({
        "any.required": "Marks is required",
        "number.greater": "Marks must be greater than 0",
        // "number.min": "Marks must be at least 1 character long.",
        // "number.max": "Marks cannot be longer than 100.",
        "number.base": "Marks must be a number",
      }),
      answer: Joi.string().required(),
      questionText: Joi.string().required(),
      questionImgKey: Joi.string().empty(""),
    });
    const schema = Joi.object({
      question_bank_id: Joi.string().required(),
      questions: Joi.array().items(questionSchema).min(1), // Assuming at least one question is required
    });

    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
}

function validateUpdatePracticalQuestion(data) {
  try {
    const questionSchema = Joi.object({
      marks: Joi.number().greater(0).required().messages({
        "any.required": "Marks is required",
        "number.greater": "Marks must be greater than 0",
        // "number.min": "Marks must be at least 1 character long.",
        // "number.max": "Marks cannot be longer than 100.",
        "number.base": "Marks must be a number",
      }),
      answer: Joi.string().required(),
      questionText: Joi.string().required(),
      questionImgKey: Joi.string().empty(""),
    });

    const schema = Joi.object({
      question_bank_id: Joi.string().required(),
      questions: Joi.array().items(questionSchema).min(1), // Assuming at least one question is required
    });

    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
}

function validateStatusChange(body) {
  try {
    const schema = Joi.object({
      question_id: Joi.string().required(),
      status: Joi.string().required(),
    });
    return schema.validate(body);
  } catch (err) {
    console.log(err);
  }
}

const validatebulkUploadVivaqb = (data) => {
  try {
    const schema = Joi.object({
      question_bank_id: Joi.string().required(),
    });
    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
};

function validateBulkuploadQB(body) {
  try {
    const schema = Joi.object({
      difficulty_level: Joi.string()
        .trim()
        .required()
        .valid("Easy", "Medium", "Difficult")
        .messages({
          "any.required": "Difficulty level is required",
          "string.base": "Difficulty level must be a string",
          "any.only":
            "Invalid difficulty level. Must be one of: Easy, Medium, Difficult",
        }),
      //questionText: Joi.string().min(2).max(255).required().messages({
      questionText: Joi.string().required().messages({
        "any.required": "Question is required.",
        // "string.min": "Question must be at least 2 character long.",
        // "string.max": "Question cannot be longer than 555 characters.",
        "string.base": "Question must be a string.",
      }),
      //   marks: Joi.string().regex(/^\d+$/).greater(0).required().messages({
      //     "any.required": "Marks is required",
      //     "string.pattern.base": "Marks must be a positive integer",
      //     "number.greater": "Marks must be greater than 0",
      //     "number.base": "Marks must be a number"
      // }),
      marks: Joi.number().greater(0).required().messages({
        "any.required": "Marks is required",
        "number.greater": "Marks must be greater than 0",
        "number.base": "Marks must be a number",
      }),
      //   options: Joi.array().items(
      //     Joi.object({
      //       optionKey: Joi.string().required().messages({
      //         "any.required": "Option key is required.",
      //         "string.base": "Option key must be a string.",
      //       }),
      //     optionValue: Joi.alternatives(
      //       Joi.string().trim().min(1).required().messages({
      //           "any.required": "Option value is required.",
      //           "string.base": "Option value must be a string.",
      //           "string.min": "Option value must not be empty.",
      //       }),
      //       Joi.number().required().messages({
      //           "any.required": "Option value is required.",
      //           "number.base": "Option value must be a number.",
      //       }),
      //       Joi.boolean().required().messages({
      //         "any.required": "Option value is required.",
      //         "boolean.base": "Option value must be a boolean.",
      //       })
      //    )
      //  .custom((value, helpers) => {
      //       // Check if it's a string before calling trim
      //       const trimmedValue = typeof value === 'string' ? value.trim() : value;

      //       if (typeof trimmedValue === 'string' && !trimmedValue) {
      //           return helpers.message({
      //               custom: "Option value must not be empty.",
      //           });
      //       }

      //       return trimmedValue;
      //   })

      //     })
      //   ),
      rawAnswer: Joi.string().trim().empty("").messages({
        "any.required": "Answer is required",
        // "string.min": "Answer must be at least 1 character long.",
        // "string.max": "Answer cannot be longer than 10 characters.",
        "string.base": "Answer must be a string",
      }),

      //   question_bank_id: question_bank_id,
    });
    return schema.validate(body);
  } catch (err) {
    console.log(err);
  }
}

function validateVivaBulkuploadQB(body) {
  try {
    const schema = Joi.object({
      questionText: Joi.string().required().messages({
        "any.required": "Question is required.",
        // "string.min": "Question must be at least 2 character long.",
        // "string.max": "Question cannot be longer than 555 characters.",
        "string.base": "Question must be a string.",
      }),
      //   marks: Joi.string().regex(/^\d+$/).greater(0).required().messages({
      //     "any.required": "Marks is required",
      //     "string.pattern.base": "Marks must be a positive integer",
      //     "number.greater": "Marks must be greater than 0",
      //     "number.base": "Marks must be a number"
      // }),
      marks: Joi.number().greater(0).required().messages({
        "any.required": "Marks is required",
        "number.greater": "Marks must be greater than 0",
        // "number.min": "Marks must be at least 1 character long.",
        // "number.max": "Marks cannot be longer than 255 characters.",
        "number.base": "Marks must be a number",
      }),

      answer: Joi.string().empty("").messages({
        "any.required": "Answer is required",
        // "string.min": "Answer must be at least 2 character long.",
        // "string.max": "Answer cannot be longer than 255 characters.",
        "string.base": "Answer must be a string",
      }),

      //   question_bank_id: question_bank_id,
    });
    return schema.validate(body);
  } catch (err) {
    console.log(err);
  }
}

module.exports.moreLangBulkUploadQuestionTheory = async (req, res) => {
  try {
    let { question_bank_id } = req.body;

    const requiredHeaders = ['Question ID', 'Question', 'Language'];

    console.log("questionbank id-->", question_bank_id);

    const isExistquestionBank = await questionbankModel.findById(
      question_bank_id
    );
    if (!isExistquestionBank)
      return errorResponse(
        res,
        400,
        responseMessage.question_bankId_not_found,
        responseMessage.question_bankId_not_found
      );
 
    let workbook = reader.readFile(req.file.path);
    let sheet_name_list = workbook.SheetNames;
    let xlData = reader.utils.sheet_to_json(
      workbook.Sheets[sheet_name_list[0]]
    );
 
  if (xlData.some(value => !requiredHeaders.every(header => Object.keys(value).includes(header)))) {
    return errorResponse(res, 400, 'Invalid excel sheet', 'Required headers are missing');
  }

    let errors;
    let questions = [];

    xlData.map((value) => {
      let questionId = value["Question ID"];
      let questionText = value["Question"];
      let language = value["Language"];
      let options = [];

      for (const [key, optionValue] of Object.entries(value)) {
        if (key.startsWith("Option")) {
          options.push({
            optionKey: key,
            optionValue: optionValue,
          });
        }
      }

      questions.push({
        questionId: questionId,
        questionText: questionText,
        language: language,
        options: options,
      });
    });

    console.log("questions-->", questions);

    const duplicate = await Promise.all(
      questions.map((item) =>
        Question.findOne({
          $and: [
            { _id: item.questionId },
            { "lang.questionId": item.questionId },
            { "lang.language": item.language },
          ],
        })
      )
    );

    if (duplicate.every((result) => result !== null)) {
      console.log("duplicate--->", duplicate);
      const duplicateIds = duplicate.map((item) => item?._id);
      await fs.unlink(req?.file?.path);
      return errorResponse(
        res,
        400,
        "These questions already exist with provided language",
        duplicateIds
      );
    }

    const response = await Promise.all(
      questions.map((item) =>
        Question.updateOne({ _id: item.questionId }, { $push: { lang: item } })
      )
    );

    isExistquestionBank.secondaryLanguage = true;
    await isExistquestionBank.save();

    await fs.unlink(req?.file?.path);
    return sendResponse(res, 200, "Got Data", response);
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

module.exports.downloadMoreLangExcelFile = async (req, res) => {
  try {
    const questionBankId = req.params.id;
    if (!questionBankId) {
      return errorResponse(
        res,
        400,
        "no questionBankId provided",
        "no questionBankId provided"
      );
    }



    const isExistquestionBank = await questionbankModel.findById(
      questionBankId
    );
    if (!isExistquestionBank) {
      return errorResponse(
        res,
        400,
        responseMessage.question_bankId_not_found,
        responseMessage.question_bankId_not_found
      );
    }

    let questions = await Question.find({ question_bank_id: questionBankId });

    questions = questions.map(question=> { 
        if(question.questionText.startsWith('<p><img')){
            return {...JSON.parse(JSON.stringify(question)), questionText: ""}
        }else{ 
          return question
        }
    })

    console.log('question-->', questions)
    const workbook = reader.utils.book_new();
    const worksheetData = [];

    let maxOptionsCount = 0;
    questions.forEach((question) => {
      maxOptionsCount = Math.max(maxOptionsCount, question.options?.length);
    });

    // added validation for language dropdown
    const validation = {
      type: "list",
      formula1: '"Hindi,Tamil,Telugu"',
      showDropDown: true,
      allowBlank: false,
    };


    // Headers
    const headers = [
      "Question ID",
      "Default Question",
      ...Array.from(
        { length: maxOptionsCount },
        (_, i) => `Default Option ${String.fromCharCode(65 + i)}`
      ),
      "Language",
      "Question",
      ...Array.from(
        { length: maxOptionsCount },
        (_, i) => `Option${String.fromCharCode(65 + i)}`
      ),
    ];
    worksheetData.push(headers);

    // Logic for adding data into the excel sheet
    questions.forEach((question) => {
      // Created a row for the default language question and options
      const defaultLanguageRow = [
        question._id.toString(),
        question.questionText,
        ...question.options.map((opt) => opt.optionValue),
      ];

      // Filling the row with empty strings if there are fewer options than the max
      while (defaultLanguageRow.length < headers.length) {
        defaultLanguageRow.push("");
      }

      // Add the default language row to the worksheet data
      worksheetData.push(defaultLanguageRow);
    });
    
    // Convert the data to a worksheet and append it to the workbook
    const worksheet = reader.utils.aoa_to_sheet(worksheetData);
    reader.utils.book_append_sheet(workbook, worksheet, "Questions");

    // Generated a temporary file path
    const tempFilePath = require("path").join(
      require("os").tmpdir(),
      "Questions.xlsx"
    );

    // Write workbook to the file
    reader.writeFile(workbook, tempFilePath);

    // Set the headers for the response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Questions.xlsx"`
    );

    
    // Send the file for download
    res.sendFile(tempFilePath, (err) => {
      if (err) {
        console.error(err);
        errorResponse(res, 500, responseMessage.something_wrong, err.message);
      } else {
        //  delete the temp file after sending
        require("fs").unlink(tempFilePath, (err) => {
          if (err) console.error(err);
        });
      }
    });
  } catch (error) {
    console.error(error);
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

//downloadExcelFileMoreLangPracticalViva

module.exports.downloadExcelFileMoreLangPracticalViva = async (req, res) => {
  try {
    const questionBankId = req.params.id;
    if (!questionBankId) {
      return errorResponse(
        res,
        400,
        "no questionBankId provided",
        "no questionBankId provided"
      );
    }

    const section = req.params.section;
    if (!section) {
      return errorResponse(
        res,
        400,
        "no section provided",
        "no section provided"
      );
    }

    const isExistquestionBank = await questionbankModel.findById(
      questionBankId
    );
    if (!isExistquestionBank) {
      return errorResponse(
        res,
        400,
        responseMessage.question_bankId_not_found,
        responseMessage.question_bankId_not_found
      );
    }

    let questions;
    if (section === "practical") {
      questions = await practicalModel.find({
        question_bank_id: questionBankId,
      });
      if (questions.length < 1)
        return errorResponse(
          res,
          400,
          "No primary question found",
          "No primary question found"
        );
    } else if (section === "viva") {
      questions = await vivaModel.find({ question_bank_id: questionBankId });
      if (questions.length < 1)
        return errorResponse(
          res,
          400,
          "No primary question found",
          "No primary question found"
        );
    } else {
      return errorResponse(
        res,
        400,
        "Not provided valid section",
        "Not provided valid section"
      );
    }

    const workbook = reader.utils.book_new();
    const worksheetData = [];

    // let maxOptionsCount = 0;
    // questions.forEach(question => {
    //   maxOptionsCount = Math.max(maxOptionsCount, question.options.length);
    // });

    // Headers
    const headers = [
      "Question ID",
      "Default Question",
      "Default Answer",
      // ...Array.from({ length: maxOptionsCount }, (_, i) => `Default Option ${String.fromCharCode(65 + i)}`),
      "Language",
      "Question",
      "Answer",
      // ...Array.from({ length: maxOptionsCount }, (_, i) => `Option${String.fromCharCode(65 + i)}`)
    ];
    worksheetData.push(headers);

    // Logic for adding data into the excel sheet
    questions.forEach((question) => {
      // Created a row for the default language question and options
      const defaultLanguageRow = [
        question._id.toString(),
        question.questionText,
        question.answer,
        // ...question.options.map(opt => opt.optionValue),
      ];

      // Filling the row with empty strings if there are fewer options than the max
      while (defaultLanguageRow.length < headers.length) {
        defaultLanguageRow.push("");
      }

      // Add the default language row to the worksheet data
      worksheetData.push(defaultLanguageRow);
    });

    // Convert the data to a worksheet and append it to the workbook
    const worksheet = reader.utils.aoa_to_sheet(worksheetData);
    reader.utils.book_append_sheet(workbook, worksheet, "Questions");

    // Generated a temporary file path
    const tempFilePath = require("path").join(
      require("os").tmpdir(),
      "Questions.xlsx"
    );

    // Write workbook to the file
    reader.writeFile(workbook, tempFilePath);

    // Set the headers for the response
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="Questions.xlsx"`
    );

    // Send the file for download
    res.sendFile(tempFilePath, (err) => {
      if (err) {
        console.error(err);
        errorResponse(res, 500, responseMessage.something_wrong, err.message);
      } else {
        //  delete the temp file after sending
        require("fs").unlink(tempFilePath, (err) => {
          if (err) console.error(err);
        });
      }
    });
  } catch (error) {
    console.error(error);
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

module.exports.moreLangBulkUploadQuestionPracticalViva = async (req, res) => {
  try {
    let { question_bank_id } = req.body;

    const requiredHeaders = ['Question ID', 'Question', 'Language', 'Answer'];

    const isExistquestionBank = await questionbankModel.findById(
      question_bank_id
    );
    if (!isExistquestionBank)
      return errorResponse(
        res,
        400,
        responseMessage.question_bankId_not_found,
        responseMessage.question_bankId_not_found
      );

    const section = req.params.section;
    if (!section) {
      return errorResponse(
        res,
        400,
        "no section provided",
        "no section provided"
      );
    }

    let workbook = reader.readFile(req.file.path);
    let sheet_name_list = workbook.SheetNames;
    let xlData = reader.utils.sheet_to_json(
      workbook.Sheets[sheet_name_list[0]]
    );
  
   
  if (xlData.some(value => !requiredHeaders.every(header => Object.keys(value).includes(header)))) {
    return errorResponse(res, 400, 'Invalid excel sheet', 'Required headers are missing');
  }

    let errors;
    let questions = [];

    xlData.map((value) => {
      let questionId = value["Question ID"];
      let questionText = value["Question"];
      let language = value["Language"];
      let answer = value["Answer"];
      // let options = []

      // for (const [key, optionValue] of Object.entries(value)) {

      //   if (key.startsWith('Option')) {
      //         options.push({
      //           optionKey: key,
      //           optionValue: optionValue,
      //         });
      //   }
      // }

      questions.push({
        questionId: questionId,
        questionText: questionText,
        language: language,
        // options: options,
        answer: answer,
      });
    });

    if (section === "practical") {
      // checking if primary question exist or not
      const existed = await Promise.all(
        questions.map((item) =>
          practicalModel.findOne({
            $and: [
              { _id: item.questionId },
              { question_bank_id: question_bank_id },
            ],
          })
        )
      );

      if (existed.some((result) => result === null)) {
        // const existedIds = existed.map(item=> item?._id)
        await fs.unlink(req?.file?.path);
        return errorResponse(
          res,
          400,
          "These questions are not available as primary",
          "not existed"
        );
      }

      const duplicate = await Promise.all(
        questions.map((item) =>
          practicalModel.findOne({
            $and: [
              { _id: item.questionId },
              { "lang.questionId": item.questionId },
              { "lang.language": item.language },
            ],
          })
        )
      );

      if (duplicate.every((result) => result !== null)) {
        console.log("duplicate--->", duplicate);
        const duplicateIds = duplicate.map((item) => item?._id);
        await fs.unlink(req?.file?.path);
        return errorResponse(
          res,
          400,
          "These questions already exist with provided language",
          duplicateIds
        );
      }

      const response = await Promise.all(
        questions.map((item) =>
          practicalModel.updateOne(
            { _id: item.questionId },
            { $push: { lang: item } }
          )
        )
      );

      isExistquestionBank.secondaryLanguage = true;
      await isExistquestionBank.save();

      await fs.unlink(req?.file?.path);
      return sendResponse(res, 200, "Got Data", response);
    } else if (section === "viva") {
      // checking if primary question exist or not
      const existed = await Promise.all(
        questions.map((item) =>
          vivaModel.findOne({
            $and: [
              { _id: item.questionId },
              { question_bank_id: question_bank_id },
            ],
          })
        )
      );

      if (existed.some((result) => result === null)) {
        // const existedIds = existed.map(item=> item?._id)
        await fs.unlink(req?.file?.path);
        return errorResponse(
          res,
          400,
          "These questions are not available as primary",
          "not existed"
        );
      }

      const duplicate = await Promise.all(
        questions.map((item) =>
          vivaModel.findOne({
            $and: [
              { _id: item.questionId },
              { "lang.questionId": item.questionId },
              { "lang.language": item.language },
            ],
          })
        )
      );

      if (duplicate.every((result) => result !== null)) {
        const duplicateIds = duplicate.map((item) => item?._id);
        await fs.unlink(req?.file?.path);
        return errorResponse(
          res,
          400,
          "These questions already exist with provided language",
          duplicateIds
        );
      }

      const response = await Promise.all(
        questions.map((item) =>
          vivaModel.updateOne(
            { _id: item.questionId },
            { $push: { lang: item } }
          )
        )
      );

      isExistquestionBank.secondaryLanguage = true;
      await isExistquestionBank.save();

      await fs.unlink(req?.file?.path);
      return sendResponse(res, 200, "Got Data", response);
    } else {
      return errorResponse(
        res,
        400,
        "Not provided valid section",
        "Not provided valid section"
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

module.exports.qbStatus = async (req, res) => {
  try {
    const questionBankId = req.params.id;
    const section = req.query.section;

    if (!section)
      return errorResponse(
        res,
        400,
        "Section not provided",
        "Section not provided"
      );

    if (!questionBankId)
      return errorResponse(
        res,
        400,
        "Question bank id is not provided",
        "Question bank id is not provided"
      );

    let isQuestion;

    if (section === "Theory")
      isQuestion = await Question.find({ question_bank_id: questionBankId });
    else if (section === "Viva")
      isQuestion = await vivaModel.find({ question_bank_id: questionBankId });
    else if (section === "Practical")
      isQuestion = await practicalModel.find({
        question_bank_id: questionBankId,
      });
    else {
      return errorResponse(
        res,
        400,
        "Not valid section provided",
        "Not valid section provided"
      );
    }

    return sendResponse(res, 200, "Question Bank length", isQuestion.length);
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};


// module.exports.updateAnswerId = async (req, res) => {
//   try {

//     // const questionId = req.params.id

//     // const question = await Question.findOne({_id: questionId})

//     // const rawAnswer = question.answer[0].rawAnswer;


//     // const extractedLetter = rawAnswer.toLowerCase();

//     // question.options.map(item=>{

//     //     if(item.optionKey.toLowerCase() === `option${extractedLetter}`){

//     //       if(JSON.parse(JSON.stringify(question.answer[0])).hasOwnProperty('answersefId')){
              
//     //       }
//     //       else{

//     //         question.answer[0].answerId = item._id;
//     //       } 
//     //     }
//     // })

//     // const updateQuestion = await question.save()


//     const questions = await Question.find({})

//     questions.forEach(question=> { 

//       question.options.forEach(option=> { 
             
//             switch(option.optionKey){
//               case "1" : option.optionKey = "OptionA"; console.log('optionA updated'); break;
//               case "2" : option.optionKey = "OptionB"; console.log('optionB updated'); break;
//               case "3" : option.optionKey = "OptionC"; console.log('optionC updated'); break;
//               case "4" : option.optionKey = "OptionD"; console.log('optionD updated'); break;
//               default : break;
//             }
//       })

//     })

//     console.log("questions-->", questions)

//     // const allQuestionSaved = await questions.save()


//     return sendResponse(res, 200, "data", questions)

    

    
//   } catch (error) {
//       return errorResponse(res, 500, responseMessage.something_wrong, error.message)
//   }
// }

