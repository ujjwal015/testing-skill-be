const Question = require("../models/question");
const QuestionModel = require("../models/questionBankModel");
const Section = require("../models/sections");
const Joi = require("@hapi/joi");
const { Paginate } = require("../utils/paginate");
const {getFilter}=require("../utils/custom-validators");
const responseMessage = require("../utils/responseMessage");
const ImageModel = require("../models/imageModel");
const { sendResponse, errorResponse } = require("../utils/response");
const reader = require("xlsx");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs/promises");
const exceljs = require('exceljs');
const os = require("os")
const process = require("process")




module.exports.bulkUpload = async (req, res) => {
  try {
    let { language, questionType,  question_bank_id, section } =
      req.body;
    const { error } = validatebulkUpload(req.body);
    if (error) {
      const fileDelete = await fs.unlink(req.file.path);

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
      workbook.Sheets[sheet_name_list[language]]
    );
    let questions = [];
    xlData.map(async (item, index) => {
      let correctAnswer = item["Correct Answer"] ? item["Correct Answer"] : "";
      let questionMarks = item["Marks"] ? item["Marks"] : "";
      let diffculityLevel = item["Difficulty Level(Easy/Medium/Hard)"]
        ? item["Difficulty Level(Easy/Medium/Hard)"]
        : "";

      questions.push({
        questionText: item.Question,
        questionMarks,
        diffculityLevel,
        correctAnswer: correctAnswer,
        options: [
          { title: item.option1,optionId:1 },
          { title: item.option2,optionId:2 },
          { title: item.option3,optionId:3 },
          { title: item.option4,optionId:4}
        ],
      });
    });
    const details = await QuestionModel.findById(question_bank_id);
    if (details) {
      for (let item of questions) {
        const isQuestionExist = await Question.findOne({
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
      let sectionExist = await Section.findOne({section:section,question_bank_id:question_bank_id});
      let sectionDetails = "";
      if (!sectionExist) {
      let saveSection=await new Section({
                                     section,
                                     question_bank_id,
                                     questionType,
                                     language,
                                     nos:details.nos,
                                     jobRole:details.jobRole
                              }).save()
      sectionDetails=saveSection
      } else {
        sectionDetails = sectionExist;
      }
      let questionAddSection = [...questions];
      let questionWithSection = await questionAddSection.map((item) => {
        return {
          ...item,
          section_id: sectionDetails._id,
        question_bank_id,
        };
      });

      let saveQuestion = await Question.insertMany(questionWithSection);
      if (saveQuestion) {
        const fileDelete = await fs.unlink(req.file.path);

        return sendResponse(
          res,
          200,
          responseMessage.question_create,
          saveQuestion
        );
      } else {
        const fileDelete = await fs.unlink(req.file.path);

        return errorResponse(
          res,
          400,
          responseMessage.question_not_create,
          responseMessage.errorMessage
        );
      }
    } else {
      const fileDelete = await fs.unlink(req.file.path);

      return errorResponse(
        res,
        400,
        responseMessage.job_role_not_found,
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    console.log("err", error);
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};
module.exports.deleteImage=async(req,res)=>{
               try{
                if(req.params.id){
                  const imageDetails=await ImageModel.findOne({imageName:req.params.id});
                  
                if(imageDetails){
                  const imageDeleteSave=  await ImageModel.findByIdAndDelete(imageDetails._id)
                  const fileDelete = await fs.unlink(imageDetails.image_path);
                 return sendResponse(
                    res,
                    200,
                    responseMessage.image_delete,
                    imageDetails
                  )
                  
                }else{
                  return errorResponse(res, 404, responseMessage.errorMessage, responseMessage.image_not_found);
                }
                   
                }
               }catch(error){
                console.log('error',error)
                return errorResponse(res, 500, responseMessage.errorMessage, error.message);
               }
}
module.exports.sectionList = async (req, res) => {
  try {
    let filter= getFilter(req,['section','jobRole','nos']);
    const { page, limit, skip, sortOrder } = Paginate(req);
    let query =filter?filter.query: {};
   
    const totalCounts = await Section.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);
    const sectionDetails = await Section.find(query)
      .populate({path:"question_bank_id",select:"questionBankId questionBankName"})
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    if (!sectionDetails)
      return errorResponse(
        res,
        400,
        responseMessage.section_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, responseMessage.section_found, {
      sectionDetails,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
}
module.exports.changeStatus=async(req,res)=>{
  try{
   const { error } = validateStatusChange(req.body);
if (error)
 return errorResponse(
   res,
   400,
   responseMessage.request_invalid,
   error.message
 );
   const {status,section_id}=req.body;
     let change=(status=='active')?'active':'inactive';
 
     const updateStatus=await Section.findByIdAndUpdate(section_id,{status:change});
     if(updateStatus){
       return sendResponse(res,200,responseMessage.status_change,{status:change})
     }else{
        return errorResponse(
         res,
         400,
         responseMessage.status_not_change,
         responseMessage.errorMessage
       );
     }
  }catch(error){
   console.log('err',error)
   return errorResponse(res, 500, responseMessage.errorMessage, error.message)
  }


}
module.exports.uploadImage = async (req, res) => {
  try {
    // let data = await fs.readFile(req.file.path);

    const imageDetails = await new ImageModel({
      imageName: req.file.filename,
      image_path: req.file.path,
      // img:{
      //   data:data,
      //   contentType:req.file.mimetype
      // },
      imageUrl: `${process.env.backendUrl}/images/${req.file.filename}`
    }).save();
    if (imageDetails) {
      // let imageUrl=`data:image/${imageDetails.img.contentType};7bit,${imageDetails.img.data.toString('7bit')}`
      return sendResponse(
        res,
        200,
        responseMessage.image_upload,
        imageDetails
      );
    } else {
      return errorResponse(
        res,
        400,
        responseMessage.image_not_upload,
        responseMessage.errorMessage
      );
    }

  } catch (error) {
    console.log("err", error);
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
}

module.exports.getQuestionsBySectionId = async (req, res) => {
  try {
    const { page, limit, skip, sortOrder } = await Paginate(req);
    const sectionDetails = await Section.findById(req.query.id);
    let query = { section_id: sectionDetails._id };
    if(req.query.search){
      query={section_id: sectionDetails._id,'questionText':{$regex:new RegExp(req.query.search,'i')}}
    }
    const questions = await Question.find(query)
      .sort(sortOrder)
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
      questionType:sectionDetails.questionType,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};
module.exports.addSection=async(req,res)=>{
       try{
        const { error } = validateSection(req.body);
        if (error)
          return errorResponse(
            res,
            400,
            responseMessage.request_invalid,
            error.message
          );
        const {
          section,
          performanceCriteria,
          isNext,
          nos,
          questionType,
          jobRole,
          question_bank_id,
          language,
        } = req.body;
        if(!mongoose.isValidObjectId(question_bank_id)){
          return errorResponse(
            res,
            400,
            responseMessage.request_invalid,
            "Please fill valid Id"
          );    
        }
        let sectionExist = await Section.findOne({ section: section,question_bank_id:question_bank_id });
    if (!sectionExist) {
      sectionDetails = await new Section({
        section,
        nos,
        questionType,
        jobRole,
        question_bank_id,
        performanceCriteria,
        language,
      }).save();
      return sendResponse(
        res,
        200,
        responseMessage.section_create,
        sectionDetails
      );
    } else {
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        "Section is already created"
      );
    }
  } catch (err) {
    console.log("err", err);
    return errorResponse(res, 500, responseMessage.errorMessage, err.message);
  }
}
module.exports.CreateQuestion = async (req, res) => {
  try {
    const { error } = validateQuestion(req.body);
    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );
    const {
      question_bank_id,
      section_id,
      isNext,
      questions,
    } = req.body;

    if (!isNext)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        "Please fill all fields"
      );
    for (let item of questions) {
      const isQuestionExist = await Question.findOne({
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
    const sectionExist=await Section.findOne({_id:section_id,question_bank_id:question_bank_id}) 
       if(!sectionExist) return errorResponse(res,400,responseMessage.request_invalid,"Section ID or QuestionBank ID not Exist" ); 
    let questionAddSection = [...questions];

    let questionWithSection = await questionAddSection.map((item, index) => {
      let val = Math.floor(1000 + Math.random() * 9000);
      return {
        ...item,
        questionId: val + index,
        section_id: section_id,
        question_bank_id,
      };
    });
    const saveQuestion = await Question.insertMany(questionWithSection);
    if (saveQuestion) {
      return sendResponse(
        res,
        200,
        responseMessage.question_create,
        saveQuestion
      );
    } else {
      return errorResponse(
        res,
        400,
        responseMessage.question_not_create,
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    console.log("err", error);
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};
//this function is used to list all  question
module.exports.dowloadfile = (req, res) => {
  const filepath = `public/files`;
  const file = `${filepath}/sample.xlsx`;
  return res.status(200).download(file);
};
module.exports.QuestionList = async (req, res) => {
  try {
    const { page, limit, skip, sortOrder } = await Paginate(req);
    let query = {};
    const totalCounts = await Question.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);
    const questionDetails = await Question.find({})
      .populate("section_id")
      .populate("question_bank_id")
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

    return sendResponse(res, 200, responseMessage.question_found, {
      questionDetails,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.getUpdateSectiondetail = async (req,res) => {
  try {   
    
       const sectionId = req.params.id;
    
       const sectionDetail = await Section.findById(sectionId);
      
        if(!sectionDetail) return errorResponse(res, 400, "SectionDetail doesn't exists", responseMessage.errorMessage);

      return sendResponse(res, 200, "SectionDetail get data successfully", sectionDetail);

  } catch (error) {
    
      return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};


exports.updateSection = async (req,res) => {

    try {
    
        const sectionId = req.params.id;
        const { error } = validateUpdateSection(req.body);
        if (error)
          return errorResponse(
            res,
            400,
            responseMessage.request_invalid,
            error.message
          );
        
          const {
            section,
            performanceCriteria,
            nos,
            isNext,
            questionType,
            jobRole,
            question_bank_id,
            language,
          } = req.body;

        const sectionDetail = await Section.findById(sectionId);
      
        if(!sectionDetail) return errorResponse(res, 400, "SectionDetail doesn't exists", responseMessage.errorMessage);
        
            const updateSectionlist = await Section.findOneAndUpdate({_id:sectionId},
              { 
                section,
                performanceCriteria,
                nos,
                isNext,
                questionType,
                jobRole,
                question_bank_id,
                language
              },
              {new:true});

            if(!updateSectionlist) 
            return errorResponse(
                res, 
                400, 
                "SectionDetail not able to update", 
                responseMessage.errorMessage);
  
            return sendResponse(res, 200, "SectionDetail update successfully", updateSectionlist);

    } catch (error) {
  
        return errorResponse(res, 500, responseMessage.errorMessage, error.message);
    }
};

exports.removeSection = async (req, res) => {

    try {
  
        let sectionId = req.params.id;
        
        const sectionDetail = await Section.findById(sectionId)
      
        if (!sectionDetail) return errorResponse(res, 400, responseMessage.section_not_found, responseMessage.errorMessage);
        
        const Detail = await Question.deleteMany({section_id:sectionDetail._id})
        //console.log('question delete detail',Detail)
        // check user if found or not 
       
        const result = await Section.deleteOne({_id:sectionId})
        
        // send data to client
        return sendResponse(res, 200, responseMessage.section_list_delete,result);
  
    } catch (error) {
        return errorResponse(res, 500, responseMessage.errorMessage, error.message);
    }
  }

exports.getUpdateQuestiondetail = async (req,res) => {
    try {   
      
         const questionId = req.params.id;
      
         const questionDetail = await Question.findById(questionId);
         
          if(!questionDetail) return errorResponse(res, 400, "QuestionDetail doesn't exists", responseMessage.errorMessage);
  
        return sendResponse(res, 200, "QuestionDetail get data successfully", questionDetail);
  
    } catch (error) {
      
        return errorResponse(res, 500, responseMessage.errorMessage, error.message);
    }
  };

  exports.updateQuestion = async (req,res) => {

    try {
        const questionId = req.params.id;
        const { error } = validateUpdateQuestion(req.body);
        if (error)
          return errorResponse(
            res,
            400,
            responseMessage.request_invalid,
            error.message
          );
        
          const {
          diffculityLevel,
          questionMarks,
          correctAnswer,
          questionText,
          questions,
          options
           } = req.body;

        const questionDetail = await Question.findById(questionId);
      
        if(!questionDetail) return errorResponse(res, 400, "questionDetail doesn't exists", responseMessage.errorMessage);
          
            const updateQuestion = await Question.findOneAndUpdate({_id:questionId},
              {
                diffculityLevel,
                questionMarks,
                correctAnswer,
                questionText,
                questions,
                options
              },
              {new:true});
           
            if(!updateQuestion) 
            return errorResponse(
                res, 
                400, 
                "SectionDetail not able to update", 
                responseMessage.errorMessage);
  
            return sendResponse(res, 200, "SectionDetail update successfully", updateQuestion);

    } catch (error) {
  
        return errorResponse(res, 500, responseMessage.errorMessage, error.message);
    }
};

exports.removeQuestion = async (req, res) => {

  try {

      let questionId = req.params.id;

      const questionDetail = await Question.findById(questionId);
      // check user if found or not 
      if (!questionDetail) return errorResponse(res, 400, responseMessage.question_not_found, responseMessage.errorMessage);

      const result = await Question.deleteOne({_id:questionId})
      // send data to client
      return sendResponse(res, 200, responseMessage.question_delete, result);

  } catch (error) {
      return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
}


function validateStatusChange(body){
  try {
    const schema = Joi.object({
      section_id: Joi.string().required(),
      status: Joi.string().required(),
    });
    return schema.validate(body);
  } catch (err) {
    console.log(err);
  }
}


//this function is used to validate the question schema
function validateSection(data) {
  try {
    const schema = Joi.object({
      questionType: Joi.string().required(),
      question_bank_id: Joi.string().required(),
      isNext: Joi.bool().required(),
      jobRole: Joi.string().required(),
      section: Joi.string().required(),
      nos: Joi.string().trim().required(),
      performanceCriteria: Joi.any(),
      language: Joi.number().required(),
    });
    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
}

function validateUpdateSection(data) {
  try {
    const schema = Joi.object({
      questionType: Joi.string().required(),
      question_bank_id: Joi.string().required(),
      isNext: Joi.bool().required(),
      jobRole: Joi.string().required(),
      section: Joi.string().required(),
      nos: Joi.string().trim().required(),
      performanceCriteria: Joi.any(),
      language: Joi.number().required(),
    });
    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
}

function validateQuestion(data) {
  try {
    const schema = Joi.object({
      section_id: Joi.string().required(),
      question_bank_id: Joi.string().required(),
      isNext: Joi.boolean(),
      questions: Joi.array(),
      options: Joi.array().max(5),
    });
    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
}

function validateUpdateQuestion(data) {
  try {
    const schema = Joi.object({
      diffculityLevel: Joi.string(),
      questionMarks: Joi.number(),
      correctAnswer: Joi.string(),
      questionText: Joi.string(),
      _id:Joi.string(),
      questions: Joi.array(),
      options: Joi.array().max(5),
    });
    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
}

const validatebulkUpload = (data) => {
  try {
    const schema = Joi.object({
      question_bank_id: Joi.string().required(),
      questionType: Joi.string().required(),
      section: Joi.string().required(),
      language: Joi.number().required(),
    });
    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
};

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

module.exports.bulkUploadQuestionsInQuestionBank = async (req, res) => {
  try {

    let { question_bank_id } = req.body;
    
    const { error } = validatebulkUpload2(req.body);

    if (error) return errorResponse(res, 400, responseMessage.request_invalid, error.message)
  

    let workbook = reader.readFile(req.file.path);
    let sheet_name_list = workbook.SheetNames;
    let xlData = reader.utils.sheet_to_json(
      workbook.Sheets[sheet_name_list[0]]
    );

      let questions = []
      xlData.map(value =>{ 
        // let serialNo = value["serial No"]
        let questionText = value["Question"]
        let difficulty_level = value["Difficulty Level"]
        const rawAnswer = value["Answer"]?.replace(/\s/g, '')
        const answerArray = rawAnswer?.split(',')
        const answerArr = answerArray
        const answer = answerArr.map(item=> ({ rawAnswer: item}))

        let marks = value["Marks"] 

        let options = [];
        for (let key in value) {
            if (key.startsWith("Option")) {
                options.push({
                    optionKey: key,
                    optionValue: value[key]
                });
            }
        }
        
        console.log('options-->', options)

        questions.push({
            questionText: questionText, 
            options: options,
            difficulty_level: difficulty_level,
            answer: answer,
            marks:marks,
            question_bank_id: question_bank_id
        })
  
  
      }) 
      const existingQuestionCount = await Question.countDocuments({ question_bank_id });
      if(questions.length > 0){

        const response = await Question.insertMany(questions)

        if(response){
          const updatedQuestionCount = existingQuestionCount + response.length;

          //     // Update the questionCount in the questionbank model
              const updatedQuestionBank = await questionbankModel.findByIdAndUpdate(
              question_bank_id,
              { questionCount: updatedQuestionCount },
              { new: true }
            );

          for (let i = 0; i < response.length; i++) {
            const question = response[i];
            const options = question.options;
  
            question.answer = question.answer.map(answerObj => {
              const rawAnswer = answerObj.rawAnswer;

              const extractedLetter = rawAnswer.toLowerCase();
              const option = options.find(opt => opt.optionKey.toLowerCase() === `option${extractedLetter}`)
              console.log('option--->', option)
              if (option) {
                  answerObj.answerId = option._id;
                  
              }
  
              return answerObj;
            });
  
            // Update the question with updated answer objects
            await question.save(); 
          } 
          

          // const done = await setModel.findOneAndUpdate({_id:setCreationResponse._id}, {isQuestionUploaded: true})
          // if(done){
              return sendResponse(res, 200, "question uploaded successfully", { questions: response, questionCount: updatedQuestionCount } )//response)
          //}
        }
        else{ 
            return errorResponse((res, 400, "error in uploading the questions",
                  "error in uploading the questions"));
        }

      }
      else{ 
        return errorResponse(res, 400, "question array is empty", "question array is empty")
      }

  
       
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.uploadImageFileThroughExcel = async (req, res) =>{

    try {

      await extractImages(req)

    //   if(!req.file.path){
    //       return errorResponse(res, 400, "File not provided", "File not provided")
    //   }

    //   // Load the Excel file
    // const workbook = new exceljs.Workbook();

    // workbook.xlsx.readFile(req.file.path)
    //   .then(() => {
    //     const worksheet = workbook.getWorksheet('New Sheet');
    //     // console.log('imageList--->', worksheet.getImages('image'))


    //     for (const image of worksheet.getImages()) {
    //       console.log('image',image)
    //       console.log('processing image row', image.range.tl.nativeRow, 'col', image.range.tl.nativeCol, 'imageId', image.imageId);
    //       // fetch the media item with the data (it seems the imageId matches up with m.index?)
    //       const img = workbook.model.media.find(m => m.index === image.imageId);
    //       //fs.writeFileSync(`${image.range.tl.nativeRow}.${image.range.tl.nativeCol}.${img.name}.${img.extension}`, img.buffer);
    //     }
        


    //     // worksheet.getImages().forEach(image => {
    //     //   console.log('Image:', image);

    //     //   // Save the image to a file
    //     //   // const imageBuffer = image.buffer;
    //     //   // const imageFileName = `image_${image.imageId}.${image.extension}`;
    //     //   // fs.writeFileSync(imageFileName, imageBuffer);
    //     //   // console.log(`Image saved to ${imageFileName}`);

    //     //   return sendResponse(res, 200, "got image", image)
    //     // });

    //     // console.log('os-->', os.platform())
    //     // console.count()

    //     // console.log('process--->', process.env.USERNAME)
    //   })
    //   .catch(error => {
    //     return errorResponse(res, 400, responseMessage.something_wrong, error.message)
    //   });


      
    } catch (error) {
      return errorResponse(res, 500, responseMessage.something_wrong, error.message)
    }
}

async function extractImages(req) {
  console.log('function call')
  const ExcelJS = require('exceljs');
const workbook = new ExcelJS.Workbook();
const data = await workbook.xlsx.readFile(req.file.path);
 
const worksheet = workbook.worksheets[0];
console.log('image-->',worksheet._workbook)
for (const image of worksheet.getImages()) {
  console.log('image',image)
  console.log('processing image row', image.range.tl.nativeRow, 'col', image.range.tl.nativeCol, 'imageId', image.imageId);
  // fetch the media item with the data (it seems the imageId matches up with m.index?)
  const img = workbook.model.media.find(m => m.index === image.imageId);
  //fs.writeFileSync(`${image.range.tl.nativeRow}.${image.range.tl.nativeCol}.${img.name}.${img.extension}`, img.buffer);
}
}

