const CandidateModel = require("../models/candidate-model");
const BatchModel = require("../models/batch-model");
const CreateAssessmentModel = require("../models/createAssesment-model");
const { faceCaptureService } = require("../services/faceCaptureService");
const { errorResponse, sendResponse } = require("../utils/response");
const responseMessage = require("../utils/responseMessage");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
// const { JWT_SECRET } = require("../config/keys");
const SetModel = require("../models/setsModel");
const QuestionModel = require("../models/question");
const OnlineResultModel = require("../models/onlineResult-model");
const AnswerModel = require("../models/answerModel");
const CandidateReportModel = require("../models/candidateReport");
const fs = require("fs/promises");
const RekognitionCollectionModel = require("../models/awsImgRekoginitionCollectionModel");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const Joi = require("joi");
const _ = require("lodash");
const SchemeModel = require("../models/scheme-model");
const instructionModel = require("../models/instruction-model");
const {
  RekognitionClient,
  SearchFacesCommand,
  IndexFacesCommand,
  CreateCollectionCommand,
  DetectTextCommand,
  CompareFacesCommand,
} = require("@aws-sdk/client-rekognition");
const { fromBase64 } = require("@aws-sdk/util-base64");

const moment = require('moment');
const axios = require('axios');
const FormData = require("form-data");
const { Readable } = require("stream")

const {
    AWS_ACCESS_KEY_ID,
    AWS_ACCESS_KEY_SECRET,
    AWS_BUCKET_NAME,
    AWS_REGION,
    JWT_SECRET,
  } = require("../config/envProvider");
const { path } = require("pdfkit");
const optimizeBuffer = require("../utils/optimizeBuffer");

const rekognitionClient = new RekognitionClient({
  credentials: {
    accessKeyId: AWS_ACCESS_KEY_ID,
    secretAccessKey: AWS_ACCESS_KEY_SECRET,
  },

  region: AWS_REGION,
});

function formatTime(seconds) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  const formattedHours = String(hours).padStart(2, "0");
  const formattedMinutes = String(minutes).padStart(2, "0");
  const formattedSeconds = String(remainingSeconds).padStart(2, "0");

  return `${formattedHours}:${formattedMinutes}:${formattedSeconds}`;
}

// exports.startTimer = async (io, req, res) => {

//   if (typeof io.on === 'function') {
//     console.log('io is a Socket.IO server instance');
//   } else {
//     console.log('io is not a Socket.IO server instance');
//   }

//   try {

//     const candidateId = req.params.id
//     const candidate = await CandidateModel.findOne({_id: candidateId}).populate('batchId')
//     if(!candidate) return errorResponse(res, 400, "Candidate Not Found", "Candidate Not Found")
//     const examDuration = parseInt(candidate.batchId.questionPaper.sectionTable[0].examDuration.split('m')[0])

//     // const durationInMinutes = examDuration || 61 ;
//     // const totalSeconds = candidate.remainingSeconds || durationInMinutes * 60;

//     const durationInMinutes = 1
//     const totalSeconds =  durationInMinutes * 60;

//     let count = 0;
//     let remainingSecondsStorage = {};
//     let userId

//     io.on('connection', (socket) => {
//       console.log(`A user connected ${socket.handshake.auth.userId}`);
//       userId = socket.handshake.auth.userId;

//       const remainingSeconds = remainingSecondsStorage[userId] || totalSeconds - count;
//       io.to(socket.id).emit('timer', { time: formatTime(remainingSeconds) })

//       const timer = setInterval(() => {
//         count++;

//         if (count <= totalSeconds) {

//           remainingSecondsStorage[userId] = totalSeconds - count;
//           io.to(socket.id).emit('timer', { time: formatTime(remainingSecondsStorage[userId]) });

//         } else {
//           io.emit('timerCompleted');
//           clearInterval(timer);
//           console.log('inside else')
//         }
//       }, 1000);

//       socket.on('disconnect', async() => {
//         console.log('A user disconnected');
//         clearInterval(timer);
//         candidate.remainingSeconds = remainingSecondsStorage[userId]
//         await candidate.save()
//       });
//     });

//     setInterval(async ()=>{
//       candidate.remainingSeconds = remainingSecondsStorage[userId]
//       await candidate.save()
//     }, 120000)

//     return sendResponse(res, 200, "timer started successfully", "timer started successfully")

//   } catch (error) {
//     return errorResponse(res, 500, responseMessage.something_wrong, error.message);
//   }

// }

const uploadFile = async (req, key) => {
  try {
    const s3 = new S3Client({
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_ACCESS_KEY_SECRET,
      },
      region: AWS_REGION,
    });
    const optimizedBuffer = await optimizeBuffer(req.file.buffer, req.file.mimetype);
    const fileData = {
      Bucket: AWS_BUCKET_NAME,
      Key: key,
      Body: optimizedBuffer,
      ContentType: req.file.mimetype,
    };

    const command = new PutObjectCommand(fileData);

    const fileuploadedData = await s3.send(command);
    if (fileuploadedData.$metadata.httpStatusCode === 200) {
      return {
        key: key,
        statusCode: fileuploadedData.$metadata.httpStatusCode,
      };
    } else {
      return { fileuploadedData };
    }
  } catch (error) {
    return error.message;
  }
};

exports.captureCandidateBrowserDetails = async (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    if (!candidateId)
      return errorResponse(res, 400, "no candidate id provided");

    const { latitude, longitude, userIP, browserName } = req.body;

    if (!latitude || !longitude || !userIP || !browserName) {
      return errorResponse(
        res,
        400,
        "something is missing in payload",
        "something is missing in payload"
      );
    }

    const user = await CandidateModel.findById(candidateId);

    if (!user)
      return errorResponse(
        res,
        400,
        responseMessage.no_user_found,
        responseMessage.no_user_found
      );

    user.ipAddress = userIP;
    user.browser = browserName;
    user.latitude = latitude;
    user.longitude = longitude;
    await user.save();

    return sendResponse(
      res,
      200,
      "Candidate Broswer details captured successfully",
      "Candidate Broswer details captured successfully"
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

const deleteFile = async (key) => {
  try {
    const s3 = new S3Client({
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_ACCESS_KEY_SECRET,
      },
      region: AWS_REGION,
    });

    const deleteParams = {
      Bucket: AWS_BUCKET_NAME,
      Key: key,
    };

    const command = new DeleteObjectCommand(deleteParams);
    const deletedData = await s3.send(command);
    if (deletedData.$metadata.httpStatusCode === 204) {
      return {
        key,
        statusCode: deletedData.$metadata.httpStatusCode,
        message: "File deleted successfully",
      };
    } else {
      return {
        key,
        statusCode: deletedData.$metadata.httpStatusCode,
        message: "Unexpected status code during delete",
      };
    }
  } catch (error) {
    return { error: error.message };
  }
};

const compareFaces = (candidateId) => {
  return new Promise(async (resolve, reject) => {
    const params = {
      SourceImage: {
        S3Object: {
          Bucket: "testa-new",
          Name: `${candidateId}_face`,
        },
      },
      TargetImage: {
        S3Object: {
          Bucket: "testa-new",
          Name: `${candidateId}_id`,
        },
      },
      SimilarityThreshold: 20,
    };

    const command = new CompareFacesCommand(params);

    try {
      const response = await rekognitionClient.send(command);
      resolve(response);
    } catch (err) {
      reject(err);
    }
  });
};

// exports.loginStudents = async (req, res) => {
//     try {

//         const { userName , password} = req.body
//         if(!userName && !password)
//             return sendResponse(res, 400, responseMessage.request_payload_invalid)

//         const user = await CandidateModel.findOne({userName: userName}) // userName is candidateId

//         if(!user)
//             return errorResponse(res, 400, responseMessage.no_user_found, responseMessage.no_user_found)

//         const batch = await BatchModel.findOne({_id: user.batchId})
//         if(!batch) return errorResponse(res, 400, "no batch details found...")

//         //if batch is inactive candidate can't login
//         if(!batch.status) {
//             return errorResponse(res, 400, "Batch is not active", responseMessage.batch_not_active)
//         }

//         if(batch.batchMode === "offline") {
//           return errorResponse(res, 400, "Oops! You are registered for offline exam", "Oops! You are registered for offline exam")
//         }

//         const loginAttempt = parseInt(batch?.proctoring?.wrongLogin?.noOfWrongLogin) -  parseInt(user.wrongLogin)
//         if(loginAttempt <= 0 && batch?.proctoring?.wrongLogin?.wrongLoginStatus){
//           return errorResponse(res, 400, "login attempts over", "login attempts over")
//         }

//         const isPasswordValid = await bcrypt.compare(password, user.password)
//         if(!isPasswordValid){

//           const updatedCount = await CandidateModel.findOneAndUpdate({_id: user._id}, { $inc : { wrongLogin: 1 } }, {new:true})

//           const loginAttemptLeft = parseInt(batch?.proctoring?.wrongLogin?.noOfWrongLogin) -  parseInt(updatedCount.wrongLogin)

//           return errorResponse(res, 400, responseMessage.wrong_password,
//                     {message: responseMessage.wrong_password, loginAttemptLeft:loginAttemptLeft})
//         }

//         // resetting the wrongLogin count
//         await CandidateModel.findOneAndUpdate({_id: user._id}, { $set : { wrongLogin: 0 } })
//         if(!user.status){
//           return errorResponse(res, 400, responseMessage.user_not_enabled,
//           responseMessage.user_not_enabled)
//         }

//         if(!batch.proctoring.isAutoLogout && user.token){
//             return errorResponse(res, 400, responseMessage.logged_in_another_device,
//             responseMessage.logged_in_another_device)
//         }

//         // assessment already submitted
//         const alreadySubmitted = await AnswerModel.findOne({ $and: [ {candidateId:user._id}, {batchId: user.batchId}, {isAssessmentSubmited: true} ] })
//         if(alreadySubmitted) {
//             const response = {
//                 candidateId: alreadySubmitted?.candidateId,
//                 setId: alreadySubmitted?.setId,
//                 assessmentId: alreadySubmitted?.assessmentId,
//                 batchId: alreadySubmitted?.batchId,
//                 isAssessmentSubmited: alreadySubmitted?.isAssessmentSubmited,
//                 isResumed: alreadySubmitted?.isResumed,
//                 is24HoursPassed: alreadySubmitted?.is24HoursPassed,
//                 isRestarted: alreadySubmitted?.isRestarted,
//                 noAnswerSaved: alreadySubmitted?.noAnswerSaved,
//             }
//             return sendResponse(res, 200, "assessment has already been submitted", response)
//         }

//         const startDate = batch.startDate
//         const endDate = batch.endDate
//         const startTime = batch.startTime
//         const endTime = batch.endTime

//         const momentStartDate = moment(startDate, "DD/MM/YYYY")
//         const momentEndDate = moment(endDate, "DD/MM/YYYY").endOf('day')
//         const momentStartTime = moment(startTime, "HH:mmA")
//         const momentEndTime = moment(endTime, "HH:mmA")

//         const currentDate = moment();
//         const currentTime = moment();

//         const isDateInRange = currentDate.isBetween(momentStartDate, momentEndDate, null, '[]');
//         const isTimeInRange = currentTime.isBetween(momentStartTime, momentEndTime, null, '[]');

//         if (isDateInRange && isTimeInRange) {

//             // getting the assessment details
//             const assessment = await CreateAssessmentModel.findOne({batch_id: user.batchId})

//             if(!assessment) return errorResponse(res, 400, "no assessment found...")

//             const set = await SetModel.findOne({_id: assessment.set_id[0]})

//             const rawQuestion = await QuestionModel.findOne({_id: set?.question_id[0]})
//             //const rawQuestion = await QuestionModel.findOne({_id: "65a128cda1e29564b93524ba"})
//             let uniqueLanguages

//             if(JSON.parse(JSON.stringify(rawQuestion)).hasOwnProperty('lang')){

//               const languages = rawQuestion.lang?.map(item=>item?.language)

//               uniqueLanguages = [...new Set(languages)]
//             }
//             else{
//               uniqueLanguages = []
//             }

//             const shouldResume = await AnswerModel.findOne({ $and: [ {candidateId:user._id}, {batchId: user.batchId}, {isAssessmentSubmited: false} ] })

//             // const status = user?.steps?.every(item => item?.isCompleted===true)

//             function generateRandomString(length = 10) {
//               const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
//               let result = '';
//               for (let i = 0; i < length; i++) {
//                 const randomIndex = Math.floor(Math.random() * characters.length);
//                 result += characters[randomIndex];
//               }
//               return result;
//             }

//             const randomSecret = generateRandomString()

//             const response = {
//                 uniqueLanguages: uniqueLanguages,
//                 assessment: assessment,
//                 batchDetails: batch,
//                 ...JSON.parse(JSON.stringify(user)),
//                 resumeStatus: shouldResume ? true: false,
//                 // resumeStatus: status || false,
//                 candidate_token : jwt.sign({ candidateId: user._id }, randomSecret, { expiresIn: "1d"} ),
//                 // parsedValue: { momentStartDate, momentEndDate, momentStartTime, momentEndTime, currentDate, currentTime },
//                 // rawValue: { startDate, endDate, startTime, endTime},
//                 message: "The current date and time are inside the specified range."
//             }
//             delete response.password
//             delete response.rawPassword

//             const steps = [
//               { screen: "1", isCompleted: true },
//               { screen: "2", isCompleted: false },
//               { screen: "3", isCompleted: false },
//               { screen: "4", isCompleted: false },
//               { screen: "5", isCompleted: false },
//             ]

//             if(user.loginTime == null){
//               user.steps = steps
//             }

//             //capturing resume time
//             if(user.allStepsCompletedStatus){
//               user.resumeTime = new Date()
//             }

//             user.loginTime = new Date()
//             user.token = true
//             user.tokenSecret = randomSecret

//             const userUpdated = await user.save()
//             if(userUpdated){

//               response.userUpdated = JSON.parse(JSON.stringify(userUpdated))

//               return sendResponse(res, 200, "Candidate login successfully", response )
//             }

//             return errorResponse(res, 400, "Error in login", "Error in login")

//         } else {

//             return errorResponse(res, 400, 'The current date and time are outside of assessment date and time', { parsedValue: { momentStartDate, momentEndDate,
//                 momentStartTime, momentEndTime, currentDate, currentTime }, rawValue: {startDate, endDate, startTime, endTime} })
//         }

//     } catch (error) {
//         return errorResponse( res, 500, responseMessage.something_wrong, error.message )
//     }
// }

exports.loginStudents = async (req, res) => {

  try {
    const { token = null } = req.body;
    let userName = null;
    let password = null;
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        const candidateId = decoded.candidateId;
        const batchId = decoded.batchId;

        // Parallel fetch with lean() and selected fields only
        const [user, batch] = await Promise.all([
          CandidateModel.findById(candidateId)
            .select("userName rawPassword")
            .lean(),
          BatchModel.findById(batchId).select("endDate endTime").lean(),
        ]);

        if (!batch) return errorResponse(res, 400, "no batch found");
        if (!user) return errorResponse(res, 400, "no user found");

        const startDateTime = moment(`${batch.startDate} ${batch.startTime}`, "DD/MM/YYYY hh:mmA").valueOf();

        if(startDateTime > Date.now()) {
          return errorResponse(res, 400, "Batch is not started yet");
        }

        const endDateTime = moment(
          `${batch.endDate} ${batch.endTime}`,
          "DD/MM/YYYY hh:mmA"
        ).valueOf();

        if (endDateTime < Date.now()) {
          return errorResponse(res, 400, "Batch is expired");
        }

        userName = user.userName;
        password = user.rawPassword;
      } catch (error) {
        return errorResponse(res, 400, "Invalid token");
      }
    } else {
      userName = req.body.userName;
      password = req.body.password;
    }

    if (!userName && !password) {
      return sendResponse(res, 400, responseMessage.request_payload_invalid);
    }

    const user = await CandidateModel.findOne({ userName: userName }).lean();

    if (!user) {
      return errorResponse(
        res,
        400,
        responseMessage.INVALID_USERNAME_PASSWORD,
        responseMessage.INVALID_USERNAME_PASSWORD
      );
    }

    const batch = await BatchModel.findById(user.batchId).lean();

    if (!batch) return errorResponse(res, 400, "no batch details found...");

    //if batch is inactive candidate can't login
    if (!batch.status) {
      return errorResponse(
        res,
        400,
        "Batch is not active",
        responseMessage.batch_not_active
      );
    }

    if (batch.batchMode === "offline") {
      return errorResponse(
        res,
        400,
        "Oops! You are registered for offline exam",
        "Oops! You are registered for offline exam"
      );
    }

    const loginAttempt =
      parseInt(batch?.proctoring?.wrongLogin?.noOfWrongLogin) -
      parseInt(user.wrongLogin);
    if (loginAttempt <= 0 && batch?.proctoring?.wrongLogin?.wrongLoginStatus) {
      return errorResponse(
        res,
        400,
        "login attempts over",
        "login attempts over"
      );
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      // Update wrong login count asynchronously (don't block response)
      setImmediate(async () => {
        try {
          await CandidateModel.findByIdAndUpdate(user._id, {
            $inc: { wrongLogin: 1 },
          });
        } catch (error) {
          console.error("Error updating wrong login count:", error);
        }
      });

      // const loginAttemptLeft = loginAttempt - 1;
      return errorResponse(res, 400, responseMessage.INVALID_USERNAME_PASSWORD, {
        message: responseMessage.INVALID_USERNAME_PASSWORD,
        // loginAttemptLeft: loginAttemptLeft,
      });
    }

    if (!user.status) {
      return errorResponse(
        res,
        400,
        responseMessage.user_not_enabled,
        responseMessage.user_not_enabled
      );
    }

    if (!batch.proctoring.isAutoLogout && user.token) {
      return errorResponse(
        res,
        400,
        responseMessage.logged_in_another_device,
        responseMessage.logged_in_another_device
      );
    }

    const [alreadySubmitted, assessment] = await Promise.all([
      AnswerModel.findOne({
        candidateId: user._id,
        batchId: user.batchId,
        isAssessmentSubmited: true,
      }).lean(),
      CreateAssessmentModel.findOne({
        batch_id: user.batchId,
      }).lean(),
    ]);

    if (alreadySubmitted) {
      const response = {
        candidateId: alreadySubmitted?.candidateId,
        setId: alreadySubmitted?.setId,
        assessmentId: alreadySubmitted?.assessmentId,
        batchId: alreadySubmitted?.batchId,
        isAssessmentSubmited: alreadySubmitted?.isAssessmentSubmited,
        isResumed: alreadySubmitted?.isResumed,
        is24HoursPassed: alreadySubmitted?.is24HoursPassed,
        isRestarted: alreadySubmitted?.isRestarted,
        noAnswerSaved: alreadySubmitted?.noAnswerSaved,
      };
      return sendResponse(
        res,
        200,
        "assessment has already been submitted",
        response
      );
    }

    const currentMoment = moment();
    const startDateTime = moment(
      `${batch.startDate} ${batch.startTime}`,
      "DD/MM/YYYY hh:mmA"
    );
    const endDateTime = moment(
      `${batch.endDate} ${batch.endTime}`,
      "DD/MM/YYYY hh:mmA"
    );

    const isInValidTimeRange = currentMoment.isBetween(
      startDateTime,
      endDateTime,
      null,
      "[]"
    );

    if(!isInValidTimeRange) {
      return errorResponse(res, 400, 'The current date and time are outside of assessment date and time');
    }

    if (isInValidTimeRange) {
      // getting the assessment details
      const assessment = await CreateAssessmentModel.findOne({
        batch_id: user.batchId,
      }).select('-practicalQuestion_id -vivaQuestion_id');

      if (!assessment) return errorResponse(res, 400, "no assessment found...");

      const set = await SetModel.findOne({ _id: assessment.set_id[0] });

      const rawQuestion = await QuestionModel.findOne({
        _id: set?.question_id[0],
      });
      //const rawQuestion = await QuestionModel.findOne({_id: "65a128cda1e29564b93524ba"})
      let uniqueLanguages;

      if (JSON.parse(JSON.stringify(rawQuestion)).hasOwnProperty("lang")) {
        const languages = rawQuestion.lang?.map((item) => item?.language);

        uniqueLanguages = [...new Set(languages)];
      } else {
        uniqueLanguages = [];
      }

      const shouldResume = await AnswerModel.findOne({
        $and: [
          { candidateId: user._id },
          { batchId: user.batchId },
          { isAssessmentSubmited: false },
        ],
      });

      // const status = user?.steps?.every(item => item?.isCompleted===true)

      function generateRandomString(length = 10) {
        const characters =
          "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        for (let i = 0; i < length; i++) {
          const randomIndex = Math.floor(Math.random() * characters.length);
          result += characters[randomIndex];
        }
        return result;
      }

      const randomSecret = generateRandomString();

      const response = {
        uniqueLanguages: uniqueLanguages,
        assessment: assessment,
        batchDetails: batch,
        ...JSON.parse(JSON.stringify(user)),
        resumeStatus: shouldResume ? true : false,
        // resumeStatus: status || false,
        candidate_token: jwt.sign({ candidateId: user._id }, randomSecret, {
          expiresIn: "1d",
        }),
        // parsedValue: { momentStartDate, momentEndDate, momentStartTime, momentEndTime, currentDate, currentTime },
        // rawValue: { startDate, endDate, startTime, endTime},
        message: "The current date and time are inside the specified range.",
      };
      delete response.password;
      delete response.rawPassword;
      delete response.tokenSecret;

      const steps = [
        { screen: "1", isCompleted: true },
        { screen: "2", isCompleted: false },
        { screen: "3", isCompleted: false },
        { screen: "4", isCompleted: false },
        { screen: "5", isCompleted: false },
      ];

      if (user.loginTime == null) {
        user.steps = steps;
      }

      //capturing resume time
      if (user.allStepsCompletedStatus) {
        user.resumeTime = new Date();
      }

      user.loginTime = new Date();
      user.token = true;
      user.tokenSecret = randomSecret;
      const userUpdated = await CandidateModel.findByIdAndUpdate(user._id, user, { new: true });
      if (userUpdated) {
        delete userUpdated["token"];
        delete userUpdated["tokenSecret"];
        const { rawPassword, password, tokenSecret, ...rest  } = JSON.parse(JSON.stringify(userUpdated));

        response.userUpdated = rest

        

        return sendResponse(res, 200, "Candidate login successfully", response);
      }

      return errorResponse(res, 400, "Error in login", "Error in login");
    }

    if (!assessment) return errorResponse(res, 400, "no assessment found...");

    const [set, shouldResume] = await Promise.all([
      SetModel.findById(assessment.set_id[0]).select("question_id").lean(),
      AnswerModel.findOne({
        candidateId: user._id,
        batchId: user.batchId,
        isAssessmentSubmited: false,
      }).lean(),
    ]);

    let uniqueLanguages = [];
    if (set && set.question_id && set.question_id[0]) {
      const rawQuestion = await QuestionModel.findById(set.question_id[0])
        .select("lang")
        .lean();

      if (rawQuestion && rawQuestion.lang) {
        const languages = rawQuestion.lang?.map((item) => item?.language);
        uniqueLanguages = [...new Set(languages)];
      }
    }
    function generateRandomString(length = 10) {
      const characters =
        "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
      let result = "";
      for (let i = 0; i < length; i++) {
        const randomIndex = Math.floor(Math.random() * characters.length);
        result += characters[randomIndex];
      }
      return result;
    }

    const randomSecret = generateRandomString();
    const candidate_token = jwt.sign({ candidateId: user._id }, randomSecret, {
      expiresIn: "1d",
    });

    const response = {
      uniqueLanguages: uniqueLanguages,
      assessment: assessment,
      batchDetails: batch,
      ...user,
      resumeStatus: !!shouldResume,
      candidate_token,
      message: "The current date and time are inside the specified range.",
    };

    // Remove sensitive data
    delete response.password;
    delete response.rawPassword;

    const steps = [
      { screen: "1", isCompleted: true },
      { screen: "2", isCompleted: false },
      { screen: "3", isCompleted: false },
      { screen: "4", isCompleted: false },
      { screen: "5", isCompleted: false },
    ];

    const updateData = {
      loginTime: new Date(),
      token: true,
      tokenSecret: randomSecret,
      wrongLogin: 0, // Reset wrong login count on successful login
    };

    if (user.loginTime == null) {
      updateData.steps = steps;
    }

    if (user.allStepsCompletedStatus) {
      updateData.resumeTime = new Date();
    }

    const userUpdated = await CandidateModel.findByIdAndUpdate(
      user._id,
      { $set: updateData },
      { new: true }
    ).lean();

    if (userUpdated) {
      response.userUpdated = userUpdated;
    }


    return sendResponse(res, 200, "Candidate login successfully", response);
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.logoutCandidate = async (req, res) => {
  try {
    const user = await CandidateModel.findOne({ _id: req.user._id });
    if (!user)
      return errorResponse(res, 400, "user not found", "user not found");
    user.token = false;
    user.logoutTime = new Date();
    const updatedToken = await user.save();
    if (!updatedToken)
      return errorResponse(
        res,
        400,
        "error in logging out",
        "error in logging out"
      );

    return sendResponse(
      res,
      200,
      "sucessfully logged out",
      "successfully logged out"
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

exports.uploadFaceCapture = async (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    if (!candidateId)
      return errorResponse(res, 400, "no candidate id provided");

    if (!req.file) return errorResponse(res, 400, "no file provided");

    if (
      req.file.mimetype !== "image/jpeg" &&
      req.file.mimetype !== "image/png"
    ) {
      return errorResponse(
        res,
        400,
        responseMessage.wrong_file_type,
        responseMessage.file_type_should_be
      );
    }

    // const response = await uploadPictureInCollection(req, "face")
    // const response = await axios.post(
    //   "https://ai.testing.testaonline.com/api/face-capture",
    //   {
    //     pic: req.file.buffer,
    //   }
    // );
    const response = await faceCaptureService(req);
    if (response?.data?.result?.face_count === 0)
      return errorResponse(res, 400, "Face not detected");

    const key = `${req.params.candidateId}_face`;
    const data = await uploadFile(req, key);

    if (data.statusCode === 200) {
      // const stepperUpdated = await CandidateModel.findOneAndUpdate(
      //   { _id: candidateId },
      //   {
      //     $set: { 'steps.$[elem].isCompleted': true },
      //     $inc: { totalStepsCompleted: 1 }
      //   },
      //   { new: true,
      //     arrayFilters: [{ 'elem.screen': "2" }]
      //   },
      // )

      // const stepperUpdated = await CandidateModel.update(
      //   { _id: candidateId , "steps.screen": "2"},
      //   { $set : { "steps.isCompleted": true }, $inc: { totalStepsCompleted: 1 } },
      // )

      const stepperUpdated = await CandidateModel.findOneAndUpdate(
        { _id: candidateId, "steps.screen": "2" },
        { $set: { "steps.$.isCompleted": true } },
        { new: true }
      ).select("-password -rawPassword -aadharNo -passwordReset -passwordResetTime -ipAddress -email -mobile -tokenSecret -token -latitude -longitude");

      const responseData = {
        response: {
          FaceRecords: response?.data?.result?.face_details,
        },
        data: data,
        stepperUpdated: stepperUpdated,
      };
      return sendResponse(res, 200, "Face Captured Successfully", responseData);
    } else {
      return errorResponse(res, 400, responseMessage.image_upload_failed, data);
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

exports.uploadIdCapture = async (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    if (!candidateId)
      return errorResponse(res, 400, "no candidate id provided");

    if (!req.file) return errorResponse(res, 400, "no file provided");

    if (
      req.file.mimetype !== "image/jpeg" &&
      req.file.mimetype !== "image/png"
    ) {
      return errorResponse(
        res,
        400,
        responseMessage.wrong_file_type,
        responseMessage.file_type_should_be
      );
    }

    const candidate = await CandidateModel.findOne({
      _id: candidateId,
    }).populate({ path: "batchId", select: "proctoring.faceRecognition" });

    if (
      !candidate.batchId?.proctoring?.faceRecognition ||
      candidate.faceRecognition.adminApproved
    ) {
      const response = await uploadPictureInCollection(req, "Id");
      if (!response) return errorResponse(res, 400, "unable to verfiy image");

      const regex = /^\d{4} \d{4} \d{4}$/;
      // const detectedText = response.TextDetections.map(item => item.DetectedText).filter(str => regex.test(str) && str.Confidence > 90)
      const detectedText = response.TextDetections.map((item) => {
        let obj = {
          text: item.DetectedText,
          confidence: item.Confidence,
        };
        return obj;
      }).filter((item) => {
        return regex.test(item.text) && item.confidence > 92;
      });

      response.TextDetections = detectedText;

      const key = `${req.params.candidateId}_id`;
      const data = await uploadFile(req, key);

      if (data.statusCode === 200 && response.TextDetections.length > 0) {
        const stepperUpdated = await CandidateModel.findOneAndUpdate(
          { _id: candidateId, "steps.screen": "3" },
          { $set: { "steps.$.isCompleted": true } },
          { new: true }
        ).select("-password -rawPassword -aadharNo -passwordReset -passwordResetTime -ipAddress -email -mobile -tokenSecret -token -latitude -longitude");

        return sendResponse(res, 200, "Aadhar captured successfully", {
          response,
          data,
          stepperUpdated,
        });
      } else {
        return errorResponse(
          res,
          400,
          responseMessage.image_upload_failed,
          data
        );
      }
    } else {
      const response = await uploadPictureInCollection(req, "Id");
      if (!response) return errorResponse(res, 400, "unable to verfiy image");

      const regex = /^\d{4} \d{4} \d{4}$/;
      const registeredCandidateName = candidate?.name?.toLowerCase();
      // const detectedText = response.TextDetections.map(item => item.DetectedText).filter(str => regex.test(str) && str.Confidence > 90)
      const detectedAadharNo = response.TextDetections.map((item) => {
        let obj = {
          text: item.DetectedText,
          confidence: item.Confidence,
        };
        return obj;
      }).filter((item) => {
        return regex.test(item.text) && item.confidence > 92;
      });
      const compareCandidateName = response.TextDetections.map((item) => {
        let obj = {
          text: item.DetectedText,
          confidence: item.Confidence,
        };
        return obj;
      }).filter((item) => {
        return item.text.toLowerCase() === registeredCandidateName;
      });

      response.TextDetections = detectedAadharNo;

      const key = `${req.params.candidateId}_id`;
      const data = await uploadFile(req, key);

      if (
        data.statusCode === 200 &&
        compareCandidateName?.length > 0
        // detectedAadharNo?.length > 0 &&
      ) {
        // call compare faces function
        const comparisonData = await compareFaces(req.params.candidateId);

        // if I get any error from the compare faces function we'll delete the image from s3 and send the
        // error response to the frontend

        // return sendResponse(
        //   res,
        //   200,
        //   "Aadhar captured successfully",
        //   comparisonData
        // );

        if (comparisonData.FaceMatches[0]?.Similarity >= 20) {
          if (detectedAadharNo?.length > 0) {
            const stepperUpdated = await CandidateModel.findOneAndUpdate(
              { _id: candidateId, "steps.screen": "3" },
              {
                $set: {
                  "steps.$.isCompleted": true,
                  faceMatchStatus: "Matched",
                },
              },
              { new: true }
            );

            return sendResponse(res, 200, "Aadhar captured successfully", {
              response,
              data,
              stepperUpdated,
              comparisonData,
            });
          } else {
            return errorResponse(res, 400, "Aadhar no not visible ", {
              data,
              comparisonData,
            });
          }
        } else {
          const isDeleted = await deleteFile(key);
          const faceMatchUpdated = await CandidateModel.findByIdAndUpdate(
            { _id: candidateId },
            {
              $set: { faceMatchStatus: "Not Matched" },
            },
            {
              new: true,
            }
          );

          return errorResponse(res, 400, "Face not matched", {
            data,
            comparisonData,
          });
        }
      } else {
        return errorResponse(res, 400, "Name not matched", data);
      }
    }
  } catch (error) {
    const key = `${req.params.candidateId}_id`;
    await deleteFile(key);
    if (error.Code === "InvalidParameterException") {
      return errorResponse(
        res,
        400,
        "Human face is not visible in ID",
        error.message
      );
    }
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.getAssessment = async (req, res) => {
  try {
    const batchId = req.params.id;
    const candidateId = req.params.candidateId;
    if (!batchId) return errorResponse(res, 400, "no batch id provided");
    if (!candidateId)
      return errorResponse(res, 400, "no candidate id provided");

    // assessment already submitted
    const alreadySubmitted = await AnswerModel.findOne({
      $and: [
        { candidateId: candidateId },
        { batchId: batchId },
        { isAssessmentSubmited: true },
      ],
    });
    if (alreadySubmitted) {
      const response = {
        candidateId: alreadySubmitted?.candidateId,
        setId: alreadySubmitted?.setId,
        assessmentId: alreadySubmitted?.assessmentId,
        batchId: alreadySubmitted?.batchId,
        isAssessmentSubmited: alreadySubmitted?.isAssessmentSubmited,
        isResumed: alreadySubmitted?.isResumed,
        is24HoursPassed: alreadySubmitted?.is24HoursPassed,
        isRestarted: alreadySubmitted?.isRestarted,
        noAnswerSaved: alreadySubmitted?.noAnswerSaved,
      };
      return sendResponse(
        res,
        200,
        "assessment has already been submitted",
        response
      );
    }

    const questionList = await AnswerModel.findOne({
      $and: [{ batchId: batchId }, { candidateId: candidateId }],
    });
    if (!questionList) return errorResponse(res, 400, "no question found");
    //to get the count of question status
    const questionStatusCountResponse = questionStatusCount(
      questionList?.questions
    );
    const {
      notAnswered,
      answered,
      notAttempt,
      markForReview,
      answeredMarkForReview,
      totalQuestionCount,
    } = questionStatusCountResponse;

    // make examTime duration based on candidate examTime
    let candidate = await CandidateModel.findOne({
      $and: [{ _id: candidateId }, { batchId: batchId }],
    });

    //console.log("start Time--->", questionList.startTime)
    //console.log("last saved question Time---> ", questionList.lastQuestionSavedTime)
    const timeSpend =
      (questionList?.lastQuestionSavedTime || questionList?.startTime) -
      questionList?.startTime;
    //console.log("spend Time ---> ", timeSpend)

    // getting the batch details
    const batch = await BatchModel.findOne({ _id: batchId });
    if (!batch) return errorResponse(res, 400, "no batch details found...");

    //console.log("examDuration--->", batch?.questionPaper?.sectionTable[0]?.examDuration)

    const data = {
      spendTime: timeSpend,
      examDuration:
        batch?.questionPaper?.sectionTable[0]?.examDuration || "60min",
    };
    const remainingTime = await getRemainingTime(data);

    // const rawQuestion = await QuestionModel.findOne({_id: "65a128cda1e29564b93524ba"})
    const rawQuestion = await QuestionModel.findOne({
      _id: questionList.questions[0]._id,
    });

    const languages = rawQuestion.lang?.map((item) => item?.language);

    let uniqueLanguages = [...new Set(languages)];

    const sanitizedQuestions = questionList.questions.map((question) => {
      return {
        ...question.toObject(),
        questionText: undefined,
        secondaryQuestionText: undefined,
        questionImgKey: undefined,
        options: question.options.map((option) => ({
          ...option.toObject(),
          optionKey: undefined,
          optionImgKey: undefined,
          optionUrl: undefined,
          optionValue:undefined,
          secondaryOptionValue:undefined,
        })),
      };
    });

    // update questionList
    const sanitizedQuestionList = {
      ...questionList.toObject(),
      questions: sanitizedQuestions,
    };

return sendResponse(res, 200, "assessment details", {
  uniqueLanguages,
  questionList:sanitizedQuestionList,
  notAnswered,
  answered,
  notAttempt,
  markForReview,
  answeredMarkForReview,
  totalQuestionCount,
  remainingTime: remainingTime ? remainingTime : "",
});

  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

const getRemainingTime = async (data, res) => {
  const { spendTime, examDuration } = data;
  const assignedTime2 = parseAssignedTime(examDuration, res);
  let remainingTime = assignedTime2 - spendTime;

  const remainingHours = Math.floor(remainingTime / 3600000);
  remainingTime %= 3600000;
  const remainingMinutes = Math.floor(remainingTime / 60000);
  remainingTime %= 60000;
  const remainingSeconds = Math.floor(remainingTime / 1000);

  return `${remainingHours}:${remainingMinutes}:${remainingSeconds}`;
};

function parseAssignedTime(assignedTimeString, res) {
  const match = assignedTimeString.match(/(\d+)(min|hr)/);
  if (!match) {
    return errorResponse(res, 400, "Invalid assignedTime format");
  }
  const value = parseInt(match[1]);
  const unit = match[2];
  if (unit === "min") {
    return value * 60000; // 1 minute = 60000 milliseconds
  } else if (unit === "hr") {
    return value * 3600000; // 1 hour = 3600000 milliseconds
  } else {
    return errorResponse(res, 400, "Invalid unit in assignedTime");
  }
}

exports.getSingleQuestion = async (req, res) => {
  try {
    const batchId = req.params.id;
    const candidateId = req.params.candidateId;
    const questionId = req.params.questionId;
    if (!batchId) return errorResponse(res, 400, "no batch id provided");
    if (!candidateId)
      return errorResponse(res, 400, "no candidate id provided");
    if (!questionId) return errorResponse(res, 400, "no question id provided");

    // assessment already submitted
    const alreadySubmitted = await AnswerModel.findOne({
      $and: [
        { candidateId: candidateId },
        { batchId: batchId },
        { isAssessmentSubmited: true },
      ],
    });
    if (alreadySubmitted) {
      const response = {
        candidateId: alreadySubmitted?.candidateId,
        setId: alreadySubmitted?.setId,
        assessmentId: alreadySubmitted?.assessmentId,
        batchId: alreadySubmitted?.batchId,
        isAssessmentSubmited: alreadySubmitted?.isAssessmentSubmited,
        isResumed: alreadySubmitted?.isResumed,
        is24HoursPassed: alreadySubmitted?.is24HoursPassed,
        isRestarted: alreadySubmitted?.isRestarted,
        noAnswerSaved: alreadySubmitted?.noAnswerSaved,
      };
      return sendResponse(
        res,
        200,
        "assessment has already been submitted",
        response
      );
    }

    let questionList = await AnswerModel.findOne({
      $and: [{ batchId: batchId }, { candidateId: candidateId }],
    });

    if (!questionList) return errorResponse(res, 400, "no question found");

    //  console.log("start Time--->", questionList.startTime)
    // console.log("last saved question Time---> ", questionList.lastQuestionSavedTime)
    const timeSpend =
      (questionList?.lastQuestionSavedTime || new Date()) -
      questionList?.startTime;
    console.log("spend Time ---> ", timeSpend);

    // getting the batch details
    const batch = await BatchModel.findOne({ _id: batchId });
    if (!batch) return errorResponse(res, 400, "no batch details found...");

    const data = {
      spendTime: timeSpend,
      examDuration:
        batch?.questionPaper?.sectionTable[0]?.examDuration || "60min",
    };
    const remainingTime = await getRemainingTime(data);
    // console.log("remainingTime--->", remainingTime)

    //to get the count of question status
    const questionStatusCountResponse = questionStatusCount(
      questionList?.questions
    );
    const {
      notAnswered,
      answered,
      notAttempt,
      markForReview,
      answeredMarkForReview,
      totalQuestionCount,
    } = questionStatusCountResponse;

    const singleQuestion = questionList.questions.filter(
      (item) => item._id?.toString() === questionId?.toString()
    );

    const rawQuestion = await QuestionModel.findOne({
      _id: singleQuestion[0]._id,
    });
    // console.log("rawQuestion--->", rawQuestion);

    const secondaryLanguageQuestion = rawQuestion?.lang?.find(
      (item) => item?.language === questionList?.currentSecondaryLanguage
    );

    const data2 = await Promise.all(
      singleQuestion[0]?.options?.map(async (item) => {
        secondaryLanguageQuestion?.options?.forEach((secondaryItem) => {
          if (secondaryItem?.optionKey === item?.optionKey) {
            item = {
              ...JSON.parse(JSON.stringify(item)),
              secondaryOptionValue: secondaryItem?.optionValue,
            };
          }
        });

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

    let newQuestion = [
      {
        questionStatus: singleQuestion[0].questionStatus,
        _id: singleQuestion[0]._id,
        questionText: singleQuestion[0].questionText,
        secondaryQuestionText: secondaryLanguageQuestion?.questionText,
        questionImgKey: singleQuestion[0].questionImgKey,
        marks: singleQuestion[0].marks,
        serialNo: singleQuestion[0].serialNo,
        question_bank_id: singleQuestion[0].question_bank_id,
        options: data2,
      },
    ];

    questionList.questions = newQuestion;

    return sendResponse(res, 200, "single question", {
      questionList,
      notAnswered,
      answered,
      notAttempt,
      markForReview,
      answeredMarkForReview,
      totalQuestionCount,
      remainingTime: remainingTime ? remainingTime : "",
    });
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.startAssessment = async (req, res) => {
  try {
    const batchId = req.params.id;
    if (!batchId) return errorResponse(res, 400, "no batch id provided");

    // get assessment details
    const assessment = await CreateAssessmentModel.findOne({
      batch_id: batchId,
    });
    if (!assessment) return errorResponse(res, 400, "no assessment found...");

    const user = await CandidateModel.findOne({ _id: req.params.candidateId });
    if (!user)
      return errorResponse(
        res,
        400,
        responseMessage.no_user_found,
        responseMessage.no_user_found
      );

    const randomSetId = await getRandomItem(assessment.set_id);
    //console.log('randomSetId-->', randomSetId)
    const questionIds = await SetModel.findById(randomSetId);
    // console.log("questionIds--->", questionIds);
    if (!questionIds)
      return errorResponse(
        res,
        400,
        "No question found in set",
        "No question found in set"
      );

    // console.log("questionIds--->", questionIds.question_id.length);
    const createQuestions = await QuestionModel.find({
      _id: { $in: questionIds.question_id },
    });

    // const inputQuestionIds = questionIds.question_id
    //   .map((item) => item?.toString())
    //   .sort();
    // const returnedQuestionIds = createQuestions
    //   .map((item) => item._id?.toString())
    //   .sort();

    console.log("createQuestions-->", createQuestions.length);
    // console.log('createQuestion--->', createQuestions)
    //console.log('createQuestions-->', createQuestions)
    if (!createQuestions)
      return errorResponse(
        res,
        400,
        "no question found in question collection"
      );
    // assessment already submitted
    const alreadySubmitted = await AnswerModel.findOne({
      $and: [
        { candidateId: user._id },
        { batchId: batchId },
        { isAssessmentSubmited: true },
      ],
    });
    if (alreadySubmitted)
      return sendResponse(
        res,
        200,
        "assessment has already been submitted",
        alreadySubmitted
      );

    // first time question saved in answer model
    const existingAnswerSet = await AnswerModel.findOne({
      $and: [{ candidateId: user._id }, { batchId: batchId }],
    });
    if (existingAnswerSet)
      return sendResponse(
        res,
        200,
        "assessment for this candiate has already been started",
        existingAnswerSet
      );

    //questionSuffling before save for a particular candidate
    const batch = await BatchModel.findOne({ _id: batchId });
    let shuffledQuestion;

    if (batch.questionPaper.suffleQuestion) {
      const shuffle = (array) => {
        return array.sort(() => Math.random() - 0.5);
      };
      shuffledQuestion = shuffle(createQuestions);
    }

    // const examDurationString = batch.questionPaper.sectionTable[0].examDuration.split('m')[0]
    const examDurationString = batch?.questionPaper?.sectionTable
      .filter((item) => item.sectionName === "theory")[0]
      ?.examDuration.split("m")[0];
    const milliseconds = convertMinutesToMilliseconds(examDurationString);

    const shuffle = (array) => {
      return array.sort(() => Math.random() - 0.5);
    };

    if (shuffledQuestion) {
      // adding serial No in each question

      if (batch.questionPaper.optionRandom) {
        shuffledQuestion &&
          shuffledQuestion?.forEach((question, index) => {
            question.serialNo = index + 1;
            question.options = shuffle(question.options);
          });
      }

      shuffledQuestion &&
        shuffledQuestion?.forEach((question, index) => {
          question.serialNo = index + 1;
        });

      const newAnswerSet = new AnswerModel({
        candidateId: user._id,
        assessmentId: assessment._id,
        batchId: assessment.batch_id,
        setId: questionIds._id,
        questions: shuffledQuestion.sort(function (a, b) {
          return a - b;
        }),
        startTime: new Date(),
        startMilliseconds: milliseconds,
        remainingMiliseconds: milliseconds,
        lastQuestionId: shuffledQuestion.sort(function (a, b) {
          return a - b;
        })[0]?._id,
      });

      const savedAssessmentInAnswerModelFirstTime = await newAnswerSet.save();
      if (!savedAssessmentInAnswerModelFirstTime)
        return errorResponse(
          res,
          400,
          "error in question saving the answers collection"
        );

        const { questions , ...response } = JSON.parse(JSON.stringify(savedAssessmentInAnswerModelFirstTime))

      return sendResponse(
        res,
        200,
        "Assessment started successfully",
        response
      );
    } else {
      if (batch.questionPaper.optionRandom) {
        createQuestions &&
          createQuestions?.forEach((question, index) => {
            question.serialNo = index + 1;
            question.options = shuffle(question.options);
          });
      }

      createQuestions &&
        createQuestions?.forEach((question, index) => {
          question.serialNo = index + 1;
        });

      const newAnswerSet = new AnswerModel({
        candidateId: user._id,
        assessmentId: assessment._id,
        batchId: assessment.batch_id,
        setId: questionIds._id,
        questions: createQuestions.sort(function (a, b) {
          return a - b;
        }),
        startTime: new Date(),
        startMilliseconds: milliseconds,
        remainingMiliseconds: milliseconds,
        lastQuestionId: createQuestions.sort(function (a, b) {
          return a - b;
        })[0]?._id,
      });

      const savedAssessmentInAnswerModelFirstTime = await newAnswerSet.save();
      if (!savedAssessmentInAnswerModelFirstTime)
        return errorResponse(
          res,
          400,
          "error in question saving the answers collection"
        );

        const { questions , ...response } = JSON.parse(JSON.stringify(savedAssessmentInAnswerModelFirstTime))

      return sendResponse(
        res,
        200,
        "Assessment successfully started",
        response
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

function convertMinutesToMilliseconds(minutesString) {
  const minutes = parseInt(minutesString);

  if (isNaN(minutes)) {
    throw new Error("Invalid numeric value in minutes string");
  }

  const milliseconds = minutes * 60 * 1000;
  return milliseconds;
}

exports.saveQuestion = async (req, res) => {
  try {
    const batchId = req.params.id;
    const candidateId = req.params.candidateId;
    const questionId = req.params.questionId;
    if (!batchId) return errorResponse(res, 400, "no batch id provided");
    if (!candidateId)
      return errorResponse(res, 400, "no candidate id provided");
    if (!questionId) return errorResponse(res, 400, "no question id provided");

    // assessment already submitted
    const alreadySubmitted = await AnswerModel.findOne({
      $and: [
        { candidateId: candidateId },
        { batchId: batchId },
        { isAssessmentSubmited: true },
      ],
    });
    if (alreadySubmitted) {
      const response = {
        candidateId: alreadySubmitted?.candidateId,
        setId: alreadySubmitted?.setId,
        assessmentId: alreadySubmitted?.assessmentId,
        batchId: alreadySubmitted?.batchId,
        isAssessmentSubmited: alreadySubmitted?.isAssessmentSubmited,
        isResumed: alreadySubmitted?.isResumed,
        is24HoursPassed: alreadySubmitted?.is24HoursPassed,
        isRestarted: alreadySubmitted?.isRestarted,
        noAnswerSaved: alreadySubmitted?.noAnswerSaved,
      };
      return sendResponse(
        res,
        200,
        "assessment has already been submitted",
        response
      );
    }

    const questionPayload = req.body;
    // const { questionText, ...filteredQuestionPayload } = questionPayload;

    const updatedAnswer = await AnswerModel.findOneAndUpdate(
      {
        candidateId: candidateId,
        batchId: batchId,
        "questions._id": questionId,
      },
      {
        // $set: { 'questions.$[questionElem]': filteredQuestionPayload ,
        //           lastQuestionId: questionId,
        //           lastQuestionSavedTime: new Date()}
        $set: {
          "questions.$[questionElem].marks": questionPayload.marks,
          "questions.$[questionElem].options": questionPayload.options,
          "questions.$[questionElem].questionImgKey":
            questionPayload.questionImgKey,
          "questions.$[questionElem].questionStatus":
            questionPayload.questionStatus,
          "questions.$[questionElem].question_bank_id":
            questionPayload.question_bank_id,
          "questions.$[questionElem].secondaryQuestionText":
            questionPayload.secondaryQuestionText,
          "questions.$[questionElem].serialNo": questionPayload.serialNo,
          "questions.$[questionElem]._id": questionPayload._id,
          lastQuestionId: questionId,
          lastQuestionSavedTime: new Date(),
        },
      },
      { new: true, arrayFilters: [{ "questionElem._id": questionId }] }
    );

    if (updatedAnswer) {
      const singleQuestion = updatedAnswer.questions.filter(
        (item) => item._id?.toString() === questionId?.toString()
      );

      updatedAnswer.questions = singleQuestion;
      return sendResponse(res, 200, "one question updated:", updatedAnswer);
    } else {
      return errorResponse(
        res,
        400,
        "Answer not found or Question not found in the array."
      );
    }
  } catch (error) {
    console.log("error-->", error);
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.submitAssessment = async (req, res) => {
  try {
    const batchId = req.params.id;
    const candidateId = req.params.candidateId;
    //const questionId = req.params.questionId
    if (!batchId) return errorResponse(res, 400, "no batch id provided");
    if (!candidateId)
      return errorResponse(res, 400, "no candidate id provided");

    const existingResult = await CandidateReportModel.findOne({
      $and: [{ batchId: batchId }, { candidateId: candidateId }],
    });
    if (existingResult)
      return errorResponse(
        res,
        400,
        "this assessment has already been sumbmitted for this candidate"
      );

    const correctAnswers = [];
    const wrongAnswers = [];
    let totalMarks;
    let numberOfQuestion;
    let notAttemptQuestion = 0;
    let attemptQuestion = 0;
    let marksObtained = 0;
    let correctAnswer;
    let wrongAnswer;
    let obtainedPercentage = 0;

    let correctOptionIdsArray = [];
    let chooseOptionArray = [];

    // question answered by candidate
    const questionList = await AnswerModel.findOne({
      $and: [{ batchId: batchId }, { candidateId: candidateId }],
    });
    // console.log("questionList--->", questionList)
    const questionIds = await SetModel.findById(questionList?.setId);
    // raw questions
    const rawQuestion = await QuestionModel.find({
      _id: { $in: questionIds?.question_id },
    });
    // return sendResponse(res, 200, "data", {questionList, questionIds, rawQuestion})
    questionList.questions.forEach((question) => {
      // to count the attempted question
      if (!question.questionStatus.notAttempt) {
        attemptQuestion = attemptQuestion + 1;
      }

      if (question.questionStatus.notAttempt) {
        notAttemptQuestion = notAttemptQuestion + 1;
      }

      if (
        question.questionStatus.answered ||
        question.questionStatus.answeredMarkForReview
      ) {
        const correspondingQuestion = rawQuestion.find(
          (item) => item._id?.toString() === question._id?.toString()
        );

        if (correspondingQuestion) {
          const correctOptionIds = correspondingQuestion.answer.map(
            (answerObj) => {
              correctOptionIdsArray.push(answerObj.answerId?.toString());
              return answerObj.answerId?.toString();
            }
          );

          const choosenOption = question.options.filter(
            (option) => option.isSelect
          );
          chooseOptionArray.push(choosenOption);
          //return sendResponse (res, 200, 'got options', { correctOptionIds, choosenOption})

          if (choosenOption.length != correctOptionIds.length) {
            wrongAnswers.push(question._id?.toString());
          } else {
            const isAnswerCorrect = choosenOption.every((option) =>
              correctOptionIds.includes(option._id?.toString())
            );

            if (isAnswerCorrect) {
              correctAnswers.push(question._id?.toString());
            } else {
              wrongAnswers.push(question._id?.toString());
            }
          }
        }
      }
    });

    // total Marks
    // console.log("rawQuestion--->",rawQuestion)
    totalMarks = rawQuestion?.reduce((accumulator, currentValue) => {
      return accumulator + currentValue.marks;
    }, 0);

    numberOfQuestion = rawQuestion?.length;

    rawQuestion.forEach((question) => {
      correctAnswers?.forEach((answer) => {
        if (question._id?.toString() === answer?.toString()) {
          marksObtained = marksObtained + parseFloat(question.marks);
        }
      });
    });

    // console.log("marksObtained--->", marksObtained)
    // console.log("totalMarks--->", totalMarks)

    if (isNaN(marksObtained) || isNaN(totalMarks) || totalMarks === 0) {
      // Handle the case where either marksObtained or totalMarks is NaN or totalMarks is 0
      obtainedPercentage = 0;
    } else {
      obtainedPercentage = ((marksObtained / totalMarks) * 100).toFixed(2);
    }

    // console.log("obtainedPercentage--->", obtainedPercentage)
    wrongAnswer = wrongAnswers?.length;
    correctAnswer = correctAnswers?.length;

    //return sendResponse(res, 200, {wrongAnswers, correctAnswers, correctOptionIdsArray, chooseOptionArray})
    // {questionList, rawQuestion}

    const batchDetails = await BatchModel.findOne({ _id: batchId }).populate({path: "schemeId", select: "schemeName"});

    let passingPercentage =
      batchDetails?.questionPaper?.passingPercentage || 60;

    const newCandidateReport = new CandidateReportModel({
      numberOfQuestion: numberOfQuestion,
      notAttemptQuestion: notAttemptQuestion,
      passingPercentage: passingPercentage,
      percentageScored: `${obtainedPercentage}%`,
      passedStatus: obtainedPercentage >= passingPercentage ? "Pass" : "Fail",
      totalObtainMarks: marksObtained.toFixed(2),
      attemptQuestion: attemptQuestion,
      correctAnswer: correctAnswer,
      wrongAnswer: wrongAnswer,
      candidateId: candidateId,
      batchId: batchId,
      totalMarks: totalMarks,
      correctAnswerIds: correctAnswers,
      wrongAnswerIds: wrongAnswers,
    });

    const reportSaved = await newCandidateReport.save();
    if (!reportSaved)
      return errorResponse(res, 400, "error in saving assessment report");

    // call the function to save in onlineResult model here
    const onlineResultPayload = await onlineResultUploadHanlder(candidateId);
    const newOnlineResult = new OnlineResultModel(onlineResultPayload);
    const onlineResultSaved = await newOnlineResult.save();

    //update the isAssessmentSubmitted status
    const updatedAssessmentStatusInAnswer = await AnswerModel.findOneAndUpdate(
      { candidateId: candidateId, batchId: batchId },
      { $set: { isAssessmentSubmited: true, endTime: new Date() } },
      { new: true }
    );

    const updatedAssessmentStatusInCandidate =
      await CandidateModel.findOneAndUpdate(
        { _id: candidateId, batchId: batchId },
        { $set: { isTestSubmitted: true } },
        { new: true }
      );

    if (
      updatedAssessmentStatusInAnswer &&
      updatedAssessmentStatusInCandidate &&
      onlineResultSaved
    ) {
      const response = batchDetails?.schemeId?.schemeName === "MOCK" ? reportSaved : null;
      return sendResponse(res, 200, "successfully submitted assessment", {
         reportSaved: response,
      });
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

exports.saveAssessmentFeedback = async (req, res) => {
  try {
    // const { trainerQuality,
    //         trainerMaterialQuality,
    //         infrastructureQuality,
    //         counselingMentoring,
    //         trainingEffectiveness,
    //         comments

    //         } = req.body

    const batchId = req.params.id;
    const candidateId = req.params.candidateId;
    if (!batchId) return errorResponse(res, 400, "no batch id provided");
    if (!candidateId)
      return errorResponse(res, 400, "no candidate id provided");

    const candidateReport = await CandidateReportModel.findOne({
      $and: [{ batchId: batchId }, { candidateId: candidateId }],
    });
    if (!candidateReport)
      return errorResponse(res, 400, "no candidate report found");

    // const feedbackData = { trainerQuality,
    //     trainerMaterialQuality,
    //     infrastructureQuality,
    //     counselingMentoring,
    //     trainingEffectiveness,
    //     comments
    // }

    const feedbackData = req.body;
    candidateReport.assessmentFeedback = feedbackData;

    const feedbackSaved = await candidateReport.save();
    if (!feedbackSaved)
      return errorResponse(res, 400, "error while saving feedback");

    // Object.keys(feedbackData).map(item=>{
    //   switch (feedbackData[item]) {
    //     case 'Very Good':
    //       feedbackData[item] = 100
    //       break;
    //     case 'Good':
    //       feedbackData[item] = 80
    //       break;
    //     case 'Average':
    //       feedbackData[item] = 60
    //       break;
    //     case 'Poor':
    //       feedbackData[item] = 40
    //       break;
    //     case 'Very Poor':
    //       feedbackData[item] = 20
    //       break;
    //     default:
    //       feedbackData[item] = 0
    //   }
    // })

    // const sum = Object.keys(feedbackData).reduce((acc, curr)=>{
    //       return acc += feedbackData[curr]
    // }, 0)

    // const percentage = Math.floor(sum / 5).toString()

    // await OnlineResultModel.findOneAndUpdate(
    //   {candidate_mongo_id:candidateId, batch_mongo_id:batchId},
    //   {$set: { feedbackPercentage: percentage , comment: feedbackData.comment}}
    // )

    return sendResponse(res, 200, "assessment feedback saved successfully");
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

async function getRandomItem(array) {
  const randomIndex = Math.floor(Math.random() * array.length);
  return array[randomIndex];
}

const questionStatusCount = (questions) => {
  let notAttempt = questions?.length;
  let answered = 0;
  let notAnswered = 0;
  let markForReview = 0;
  let answeredMarkForReview = 0;

  questions?.forEach((question) => {
    if (question.questionStatus.answered) {
      answered++;
    }
    if (question.questionStatus.notAnswered) {
      notAnswered++;
    }
    if (question.questionStatus.markForReview) {
      markForReview++;
    }
    if (question.questionStatus.answeredMarkForReview) {
      answeredMarkForReview++;
    }
  });

  let totalCount =
    answered + notAnswered + markForReview + answeredMarkForReview;
  if (notAttempt <= 0) {
    return {
      notAnswered,
      answered,
      notAttempt: 0,
      markForReview,
      answeredMarkForReview,
      totalQuestionCount: questions.length,
    };
  } else {
    notAttempt = notAttempt - totalCount;

    return {
      notAnswered,
      answered,
      notAttempt,
      markForReview,
      answeredMarkForReview,
      totalQuestionCount: questions.length,
    };
  }
};

exports.createCollection = async (req, res) => {
  try {
    const { collectionName } = req.body;
    const createCollectionResult = await rekognitionClient.send(
      new CreateCollectionCommand({
        CollectionId: collectionName,
      })
    );

    if (!createCollectionResult)
      return errorResponse(res, 400, "unable to create collection in aws");

    const newCollection = new RekognitionCollectionModel({
      name: collectionName,
    });
    const collection = await newCollection.save();

    if (!collection)
      return errorResponse(res, 400, "unable to save collection in db");

    return sendResponse(res, 200, "collection successfully created", {
      createCollectionResult,
      collection,
    });
  } catch (err) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      err.message
    );
  }
};

const validatePictureInCollction = async (req) => {
  try {
    // Recognize faces
    const recognizeResult = await rekognitionClient.send(
      new SearchFacesCommand({
        CollectionId: "myFaceCollection",
        FaceMatchThreshold: 0,
        FaceId: "ee4227b0-c715-42b6-b1f1-b1fb372c4534",
        //   Image: {
        //     Bytes: fromBase64(req.file.buffer.toString('base64')),
        //   },
        MaxFaces: 10,
      })
    );

    console.log("recognizeResult--->", recognizeResult);

    let recognitionResponse = "";
    if (
      recognizeResult.FaceMatches &&
      recognizeResult.FaceMatches.length > 0 &&
      recognizeResult.FaceMatches[0].Face
    ) {
      const jsn = JSON.stringify(recognizeResult.FaceMatches[0].Face);
      recognitionResponse = `Json output: ${jsn} || Confidence: ${recognizeResult.FaceMatches[0].Face.Confidence.toString()} Match: ${recognizeResult.FaceMatches[0].Similarity.toString()}`;
    } else {
      recognitionResponse = "Not recognized";
    }

    console.log("recognitionResponse--->", recognitionResponse);

    return { recognitionResponse, recognizeResult };
  } catch (error) {
    console.log("error --> ", error.message);
  }
};

const uploadPictureInCollection = async (req, captureType) => {
  try {
    let imageSaveResponse;
    if (captureType === "face") {
      const customImageId = req.file.originalname
        .split(".")[0]
        .replace(/\s/g, "");
      imageSaveResponse = await rekognitionClient.send(
        new IndexFacesCommand({
          CollectionId: "thirdCollection",
          DetectionAttributes: ["ALL"],
          ExternalImageId: customImageId,
          Image: {
            Bytes: fromBase64(req.file.buffer.toString("base64")),
          },
        })
      );
    } else {
      const customImageId = req.file.originalname
        .split(".")[0]
        .replace(/\s/g, "");
      imageSaveResponse = await rekognitionClient.send(
        new DetectTextCommand({
          CollectionId: "thirdCollection",
          DetectionAttributes: ["ALL"],
          ExternalImageId: customImageId,
          Image: {
            Bytes: fromBase64(req.file.buffer.toString("base64")),
          },
        })
      );
    }

    return imageSaveResponse;
  } catch (error) {
    console.log("error--> ", error.message);
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

const onlineResultUploadHanlder = async (candidateId) => {
  try {
    const candidateResult = await AnswerModel.findOne({
      candidateId: candidateId,
    }).populate([
      { path: "questions.question_bank_id", select: "" },
      { path: "candidateId", select: ["candidateId", "name"] },
      {
        path: "batchId",
        select: ["batchId", "questionPaper"],
        populate: { path: "jobRole", select: "jobRole" },
      },
    ]);

    const candidateReport = await CandidateReportModel.findOne({
      candidateId: candidateId,
    });

    let nosWiseTheoryMarks = {};

    candidateResult.questions.forEach((question) => {
      const nos = question.question_bank_id?.nos;
      const marks = question.marks;

      if (nos) {
        if (!nosWiseTheoryMarks[nos]) {
          nosWiseTheoryMarks[nos] = {
            theory: { marks: 0, obtainedMarks: 0 },
            practical: { marks: 0, obtainedMarks: 0 },
            viva: { marks: 0, obtainedMarks: 0 },
          };
        }

        // Always add marks to the 'theory' part
        nosWiseTheoryMarks[nos].theory.marks += marks;
      }
    });

    if (
      candidateResult.candidateId?._id.toString() ===
      candidateReport.candidateId.toString()
    ) {
      candidateResult.questions.forEach((question) => {
        if (candidateReport.correctAnswerIds?.includes(question._id)) {
          const nos = question.question_bank_id?.nos;
          const marks = question.marks;

          if (nos && nosWiseTheoryMarks[nos]) {
            // Accumulate obtainedMarks in the 'theory' part
            nosWiseTheoryMarks[nos].theory.obtainedMarks += marks;
          }
        }
      });
    } else {
      console.log("No candidate ID matched");
    }

    let totalTheoryMarks = 0;
    let totalPracticalMarks = 0;
    let totalVivaMarks = 0;
    let obtainedTotalTheoryMarks = 0;
    let obtainedTotalPracticalMarks = 0;
    let obtainedTotalVivaMarks = 0;

    const nosResult = Object.keys(nosWiseTheoryMarks).map((nosName) => {
      const { theory, practical, viva } = nosWiseTheoryMarks[nosName];

      let totalMarks = theory.marks + practical.marks + viva.marks;
      let totalObtainedMarks =
        theory.obtainedMarks + practical.obtainedMarks + viva.obtainedMarks;

      //calculating total Marks
      totalTheoryMarks += theory.marks;
      obtainedTotalTheoryMarks += theory.obtainedMarks;

      totalPracticalMarks += practical.marks;
      obtainedTotalPracticalMarks += practical.obtainedMarks;

      totalVivaMarks += viva.marks;
      obtainedTotalVivaMarks += viva.obtainedMarks;

      return {
        nosName,

        theoryMarks: theory.marks,
        obtainedTheoryMarks: theory.obtainedMarks,

        practicalMarks: practical.marks,
        obtainedPracticalMarks: practical.obtainedMarks,

        vivaMarks: viva.marks,
        obtainedVivaMarks: viva.obtainedMarks,

        totalMarks: totalMarks,
        totalObtainedMarks: totalObtainedMarks,
      };
    });

    const grandTotalMarks =
      totalTheoryMarks + totalPracticalMarks + totalVivaMarks;
    const obtainedGrandTotalMarks =
      obtainedTotalTheoryMarks +
      obtainedTotalPracticalMarks +
      obtainedTotalVivaMarks;
    const percentage = (
      (obtainedGrandTotalMarks / grandTotalMarks) *
      100
    ).toFixed(2);

    const nosWiseResultItem = {
      nosResult,
      candidateId: candidateResult.candidateId.candidateId,
      candidate_mongo_id: candidateResult.candidateId._id,
      candidateName: candidateResult.candidateId?.name,
      batchId: candidateResult.batchId?.batchId,
      batch_mongo_id: candidateResult.batchId?._id,
      totalTheoryMarks,
      totalPracticalMarks,
      totalVivaMarks,
      obtainedTotalTheoryMarks,
      obtainedTotalPracticalMarks,
      obtainedTotalVivaMarks,
      grandTotalMarks,
      obtainedGrandTotalMarks,
      percentage: percentage,
      result:
        percentage >= candidateResult.batchId?.questionPaper?.passingPercentage
          ? "Pass"
          : "Fail",
    };

    return nosWiseResultItem;
  } catch (error) {
    console.log("error-->", error.message);
  }
};

exports.candidateBasicInputs = async (req, res) => {
  try {
    const candidateId = req.params.candidateId;
    const { gender, dob, aadharNo, email = null, mobile = null, fatherName = null } = req.body;

    const { error, value } = validateCandidateDetails(req.body);
    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );

    const candidate = await CandidateModel.findOne({ _id: candidateId }).select("-password -rawPassword -aadharNo -email -mobile -tokenSecret -token -latitude -longitude");
    if (!candidate)
      return errorResponse(
        res,
        400,
        "No candidate found",
        "No candidate found"
      );

    const existingAadhar = await CandidateModel.findOne({
      $and: [{ aadharNo: aadharNo }, { batchId: candidate.batchId }],
    });
    if (existingAadhar)
      return errorResponse(
        res,
        400,
        "Aadhar Number already exist",
        "Aadhar Number already exist"
      );

    candidate.gender = gender;
    candidate.dob = dob;
    candidate.aadharNo = aadharNo;

    if (email) {
      candidate.email = email;
    }
    if (mobile) {
      candidate.mobile = mobile;
    }
    if (fatherName) {
      candidate.fatherName = fatherName;
    }

    const updateCandidate = await candidate.save();
    
    if (updateCandidate) {
      const stepperUpdated = await CandidateModel.findOneAndUpdate(
        { _id: candidateId, "steps.screen": "4" },
        { $set: { "steps.$.isCompleted": true } },
        { new: true }
      ).select("-password -rawPassword -aadharNo -passwordReset -passwordResetTime -ipAddress -email -mobile -tokenSecret -token -latitude -longitude");

      return sendResponse(res, 200, "saved basic inputs ", {
        updateCandidate,
        stepperUpdated,
      });
    }

    return errorResponse(
      res,
      400,
      "error while saving basic inputs",
      "error while saving basic inputs"
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

function validateCandidateDetails(data) {
  try {
    const schema = Joi.object({
      fatherName: Joi.string().trim().allow(""),
      aadharNo: Joi.string().trim().required(),
      dob: Joi.string().trim().required(),
      email: Joi.string().trim().allow(""),
      mobile: Joi.string().trim().allow(""),
      gender: Joi.string()
        .trim()
        .valid("male", "female", "transgender", "notSpecify")
        .required(),
    });

    return schema.validate(data);
  } catch (err) {
    return err;
  }
}

exports.saveTime = async (req, res) => {
  try {
    const batchId = req.params.batchId;
    if (!batchId) return errorResponse(res, 400, "no batch id provided");

    const candidateId = req.params.candidateId;
    if (!candidateId)
      return errorResponse(res, 400, "no candidate id provided");

    const payloadRemainingMiliseconds = req.body.remainingMiliseconds;
    if (!payloadRemainingMiliseconds)
      return errorResponse(
        res,
        400,
        responseMessage.something_wrong,
        "remaining miliseconds not provided"
      );

    // first time question saved in answer model
    const existingCandidate = await AnswerModel.findOne({
      $and: [{ batchId: batchId }, { candidateId: candidateId }],
    });
    if (!existingCandidate)
      return errorResponse(res, 400, "no candidate found");

    existingCandidate.remainingMiliseconds = payloadRemainingMiliseconds;
    const updatedMiliseconds = await existingCandidate.save();

    if (updatedMiliseconds) {
      return sendResponse(
        res,
        200,
        "successfully saved time",
        updatedMiliseconds
      );
    } else {
      return errorResponse(res, 400, "error in time", "error in time");
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

exports.suspiciousActivity = async (req, res) => {
  try {
    const batchId = req.params.batchId;
    if (!batchId) return errorResponse(res, 400, "no batch id provided");

    const candidateId = req.params.candidateId;
    if (!candidateId)
      return errorResponse(res, 400, "no candidate id provided");

    const batch = await BatchModel.findOne({ _id: batchId });
    if (!batch) return errorResponse(res, 400, "no batch details found...");

    console.log("batch-->", batch.proctoring.browserExit);

    if (!batch?.proctoring?.browserExit?.browserExitAlert)
      return sendResponse(res, 200, "Suspicious Activity is disabled", {
        suspiciousActivityLeft: 1,
      });

    const updatedCount = await CandidateModel.findOneAndUpdate(
      { _id: candidateId },
      { $inc: { suspiciousActivity: 1, allSuspiciousActivity: 1 } },
      { new: true }
    );
    console.log("updatedCount--->", updatedCount.suspiciousActivity);
    if (updatedCount) {
      if (
        parseInt(batch?.proctoring?.browserExit?.noOfBrowserExit) <
        parseInt(updatedCount.suspiciousActivity)
      ) {
        const res = await CandidateModel.findOneAndUpdate(
          { _id: candidateId },
          { $set: { status: false } }
        );
      }

      const suspiciousAttempts =
        parseInt(batch?.proctoring?.browserExit?.noOfBrowserExit) -
        parseInt(updatedCount.suspiciousActivity);

      return sendResponse(res, 200, "successfully saved suspicious activity", {
        suspiciousActivityLeft: suspiciousAttempts,
      });
    } else {
      return errorResponse(
        res,
        400,
        "error in updated suspicious activity count",
        "error in updated suspicious activity count"
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

exports.currentSecondaryLanguage = async (req, res) => {
  try {
    const batchId = req.params.batchId;
    if (!batchId) return errorResponse(res, 400, "no batch id provided");

    const candidateId = req.params.candidateId;
    if (!candidateId)
      return errorResponse(res, 400, "no candidate id provided");

    const secondaryLanguage = req.body.secondaryLanguage;
    if (!secondaryLanguage)
      return errorResponse(
        res,
        400,
        responseMessage.something_wrong,
        "Secondary Language not provided"
      );

    // first time question saved in answer model
    const existingCandidate = await AnswerModel.findOne({
      $and: [{ batchId: batchId }, { candidateId: candidateId }],
    });
    if (!existingCandidate)
      return errorResponse(res, 400, "no candidate found");

    existingCandidate.currentSecondaryLanguage = secondaryLanguage;
    const updatedSecondaryLanguage = await existingCandidate.save();

    if (updatedSecondaryLanguage) {
      return sendResponse(
        res,
        200,
        "successfully changed secondary language",
        `Secondary language changed to ${secondaryLanguage}`
      );
    } else {
      return errorResponse(
        res,
        400,
        "error in changing secondary language",
        "error in changing secondary language"
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

exports.instructionStepApi = async (req, res) => {
  try {
    const candidateId = req.params.candidateId;

    const candidate = await CandidateModel.findOne({ _id: candidateId });
    if (!candidate)
      return errorResponse(
        res,
        400,
        "No candidate found",
        "No candidate found"
      );
    const CSR_SCHEME_ID = process.env.CSR_SCHEME_ID;
    const schemeDetails = await SchemeModel.findById(CSR_SCHEME_ID);
    let stepperUpdated = undefined;
    if (schemeDetails && CSR_SCHEME_ID) {
      stepperUpdated = await CandidateModel.findOneAndUpdate(
        { _id: candidateId, "steps.screen": "4" },
        { $set: { "steps.$.isCompleted": true } },
        { new: true }
      );
      stepperUpdated = await CandidateModel.findOneAndUpdate(
        { _id: candidateId, "steps.screen": "5" },
        { $set: { "steps.$.isCompleted": true } },
        { new: true }
      );
    } else {
      stepperUpdated = await CandidateModel.findOneAndUpdate(
        { _id: candidateId, "steps.screen": "5" },
        { $set: { "steps.$.isCompleted": true } },
        { new: true }
      );
    }
    if (stepperUpdated) {
      const status = stepperUpdated?.steps?.every(
        (item) => item?.isCompleted === true
      );

      if (status) {
        const updateAllSteps = await CandidateModel.findOneAndUpdate(
          { _id: candidateId },
          { $set: { allStepsCompletedStatus: true, isAssessmentStarted:true } },
          { new: true }
        ).select('-rawPassword -password');

        const finalResponse = { 
          _id: updateAllSteps._id,
          batchId: updateAllSteps.batchId,
          allStepsCompletedStatus: updateAllSteps.allStepsCompletedStatus,
          steps: updateAllSteps.steps,
        };

        return sendResponse(res, 200, "5th step hit", {
          response: finalResponse,
        });
      } else {
        const updateAllSteps = await CandidateModel.findOneAndUpdate(
          { _id: candidateId },
          { $set: { allStepsCompletedStatus: false } },
          { new: true }
        ).select('-rawPassword -password -tokenSecret -token');

        const finalResponse = {
          _id: updateAllSteps._id,
          batchId: updateAllSteps.batchId,
          allStepsCompletedStatus: updateAllSteps.allStepsCompletedStatus,
          steps: updateAllSteps.steps,
        };

        return sendResponse(res, 200, "5th step hit", {
          response: finalResponse,
        });
      }
    }

    const finalResponse = {
      _id: stepperUpdated._id,
      batchId: stepperUpdated.batchId,
      allStepsCompletedStatus: stepperUpdated.allStepsCompletedStatus,
      steps: stepperUpdated.steps,
    };

    return sendResponse(res, 200, "5th step hit", { response: finalResponse });
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.currentSecondaryLanguage = async (req, res) => {
  try {
    const batchId = req.params.batchId;
    if (!batchId) return errorResponse(res, 400, "no batch id provided");

    const candidateId = req.params.candidateId;
    if (!candidateId)
      return errorResponse(res, 400, "no candidate id provided");

    const secondaryLanguage = req.body.secondaryLanguage;
    if (!secondaryLanguage)
      return errorResponse(
        res,
        400,
        responseMessage.something_wrong,
        "Secondary Language not provided"
      );

    // first time question saved in answer model
    const existingCandidate = await AnswerModel.findOne({
      $and: [{ batchId: batchId }, { candidateId: candidateId }],
    });
    if (!existingCandidate)
      return errorResponse(res, 400, "no candidate found");

    existingCandidate.currentSecondaryLanguage = secondaryLanguage;
    const updatedSecondaryLanguage = await existingCandidate.save();

    if (updatedSecondaryLanguage) {
      return sendResponse(
        res,
        200,
        "successfully changed secondary language",
        `Secondary language changed to ${secondaryLanguage}`
      );
    } else {
      return errorResponse(
        res,
        400,
        "error in changing secondary language",
        "error in changing secondary language"
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

// exports.instructionStepApi = async (req, res) => {
//   try {
//     const candidateId = req.params.candidateId;

//     const candidate = await CandidateModel.findOne({ _id: candidateId });
//     if (!candidate)
//       return errorResponse(
//         res,
//         400,
//         "No candidate found",
//         "No candidate found"
//       );
//     const CSR_SCHEME_ID = process.env.CSR_SCHEME_ID;
//     const schemeDetails = await SchemeModel.findById(CSR_SCHEME_ID);
//     let stepperUpdated = undefined;
//     if (schemeDetails && CSR_SCHEME_ID) {
//       stepperUpdated = await CandidateModel.findOneAndUpdate(
//         { _id: candidateId, "steps.screen": "4" },
//         { $set: { "steps.$.isCompleted": true } },
//         { new: true }
//       );
//       stepperUpdated = await CandidateModel.findOneAndUpdate(
//         { _id: candidateId, "steps.screen": "5" },
//         { $set: { "steps.$.isCompleted": true } },
//         { new: true }
//       );
//     } else {
//       stepperUpdated = await CandidateModel.findOneAndUpdate(
//         { _id: candidateId, "steps.screen": "5" },
//         { $set: { "steps.$.isCompleted": true } },
//         { new: true }
//       );
//     }
//     if (stepperUpdated) {
//       const status = stepperUpdated?.steps?.every(
//         (item) => item?.isCompleted === true
//       );

//       if (status) {
//         const updateAllSteps = await CandidateModel.findOneAndUpdate(
//           { _id: candidateId },
//           { $set: { allStepsCompletedStatus: true } },
//           { new: true }
//         );

//         return sendResponse(res, 200, "5th step hit", {
//           response: updateAllSteps,
//         });
//       } else {
//         const updateAllSteps = await CandidateModel.findOneAndUpdate(
//           { _id: candidateId },
//           { $set: { allStepsCompletedStatus: false } },
//           { new: true }
//         );

//         return sendResponse(res, 200, "5th step hit", {
//           response: updateAllSteps,
//         });
//       }
//     }

//     return sendResponse(res, 200, "5th step hit", { response: stepperUpdated });
//   } catch (error) {
//     return errorResponse(
//       res,
//       500,
//       responseMessage.something_wrong,
//       error.message
//     );
//   }
// };

module.exports.getInstructionListById = async (req, res) => {
  try {
    const instructionId = req.params.id;

    const instructionDetail = await instructionModel.findById(instructionId);

    if (!instructionDetail)
      return errorResponse(
        res,
        400,
        responseMessage.instructionId_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(
      res,
      200,
      responseMessage.instruction_found,
      instructionDetail
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.compareFace = async (req, res) => {

  try {
  
   const capturedImageKey = `${req.user?._id.toString()}_face`
   const capturedUrl = await getFileUrl(capturedImageKey)
   const capturedImageArrayBuffer = await axios.get(capturedUrl, { responseType: "arraybuffer" })
   const capturedImageBuffer = Buffer.from(capturedImageArrayBuffer.data, "binary");
   const streamBuffer = Readable.from(capturedImageBuffer)

    const formData = new FormData();

    // Get files from Multer and append directly to formData
    formData.append("image1", streamBuffer, {
      filename: 'image',
      contentType: capturedImageArrayBuffer['headers']['content-type'],
    });

    formData.append("image2", req.files['liveImage'][0].buffer, {
      filename: req.files['liveImage'][0].originalname,
      contentType: req.files['liveImage'][0].mimetype,
    });

    const response = await axios.post("https://ai.testing.testaonline.com/api/compare-images", formData, {
      headers: {
        ...formData.getHeaders(), 
      },
    });
    
    if(response?.data?.is_match) {
      return sendResponse(res, 200, null);
    } else {
      await CandidateModel.findOneAndUpdate({ _id: req.user?._id?.toString() }, { $inc: { suspiciousActivity: 1 } } )
      return sendResponse(res, 200, "You are face is not matching to our system");
    }
   
  } catch (error) {
    console.log('error', error.message);
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};


exports.getSingleCandidateQuestionReport = async (req, res) => {
  try {
    const query = {
      batchId: req?.params?.batchId,
      isTestSubmitted: true,
      _id: req?.params?.candidateId,
    };

    const candidateList = await CandidateModel.find(query, {
      rawPassword: 0,
      password: 0,
    }).populate([
      {
        path: "batchId",
        populate: [
          { path: "clientId" },
          { path: "jobRole" },
          { path: "questionPaper.multipleJobRole.jobRoleId" },
        ],
      },
    ]);

    const sectionTable = candidateList?.[0]?.batchId?.questionPaper?.sectionTable || [];

    if (candidateList.length > 0) {
      const candidateIds = candidateList.map(candidate => candidate._id);
      const candidateResult = await CandidateReportModel.find({
        candidateId: { $in: candidateIds },
      });

      const answerDetail = await AnswerModel.findOne({
        batchId: req?.params?.batchId,
        candidateId: req?.params?.candidateId,
      });

      if (!answerDetail) {
        return errorResponse(
          res,
          400,
          "No result found for this candidate.",
          "No result found for this candidate."
        );
      }

      let candiateReport;
      candidateList.forEach((candidate) => {
        candidateResult.forEach((result) => {
          if (candidate._id.toString() === result.candidateId.toString()) {
            const candidateDetail = JSON.parse(JSON.stringify(candidate));
            const candidateResult = JSON.parse(JSON.stringify(result));
            candiateReport = { ...candidateDetail, ...candidateResult };
          }
        });
      });

      // Extract only the required fields
      const {
        correctAnswer,
        wrongAnswer,
        numberOfQuestion,
        passingPercentage,
      } = candiateReport || {};

      const notAttemptQuestion = numberOfQuestion - ( correctAnswer + wrongAnswer ) 

      let percentageScored = candiateReport?.percentageScored;
      if (typeof percentageScored === "string") {
        percentageScored = percentageScored.replace('%', '');
      }

      //Convert examDuration minutes to milliseconds
      const theorySection = sectionTable.find(
        (section) => section.sectionName?.toLowerCase() === "theory"
      );

      let examDurationInMilliseconds = 0;
      if (theorySection?.examDuration?.endsWith('min')) {
        const minutes = parseInt(theorySection.examDuration.replace('min', '')) || 0;
        examDurationInMilliseconds = minutes * 60 * 1000;
      }
  
  
    // Calculate time spent 
let spentTimeMilliSeconds = 0;
if (answerDetail.startTime && answerDetail.endTime) {
  spentTimeMilliSeconds =
    new Date(answerDetail.endTime).getTime() -
    new Date(answerDetail.startTime).getTime();
  if (spentTimeMilliSeconds < 0) spentTimeMilliSeconds = 0;
}
      
      const finalSpentTime = spentTimeMilliSeconds < 0 ? 0 : spentTimeMilliSeconds;

      return sendResponse(res, 200, "Candidate Report", {
        candidateReport: {
          correctAnswer,
          wrongAnswer,
          notAttemptQuestion,
          percentageScored,
          numberOfQuestion,
          passingPercentage,
          startTime: answerDetail.startTime,
          endTime: answerDetail.endTime,
          totalTime: examDurationInMilliseconds,  
          spentTime: finalSpentTime               
        },
      });
    } else {
      return errorResponse(res, 200, "No Candidate Found");
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
