const CandidateModel = require("../models/candidate-model");
const BatchModel = require("../models/batch-model");
const CreateAssessmentModel = require("../models/createAssesment-model");
const { faceCaptureService } = require("../services/faceCaptureService");
const { errorResponse, sendResponse } = require("../utils/response");
const responseMessage = require("../utils/responseMessage");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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


exports.faceCaptureService = async (req) => {
  const service = process.env.FACE_CAPTURE_SERVICE || "ai";

  try {
    let response;

    if (service === "aws") {
      // AWS Rekognition Service
      const awsResponse = await uploadPictureInCollection(req, "face");
      response = {
        data: {
          result: {
            face_count: awsResponse.FaceRecords?.length || 0,
            face_details: awsResponse.FaceRecords || [],
          },
        },
      };
    } else {
      // AI API Service
        let url="https://ai.testing.testaonline.com/api/face-capture"
        // let url="http://127.0.0.1:5000/api/face-capture"
      response = await axios.post(url, {
        pic: req.file.buffer,
      });
    }

    return response;
  } catch (err) {
    console.error("faceCaptureService Error:", err.message);
    throw err;
  }
};
