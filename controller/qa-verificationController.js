const reader = require("xlsx");
const archiver = require("archiver");
const axios = require("axios");
const path = require("path");
const moment = require("moment");
const stream = require("stream");

const qaVerificationModel = require("../models/QAVerification-model"); // Import the schema
const RedisService = require("../utils/redisService");
const { sendResponse, errorResponse } = require("../utils/response");
const { QA_VERIFICATION_ASSESSOR_NAME_LIST } = require("../constants/redis");

const redis = new RedisService("db0");
const { Paginate } = require("../utils/paginate");
const responseMessage = require("../utils/responseMessage");
const qafileModel = require("../models/QAfileUpload-model");
const Candidate = require("../models/candidate-model");
const Batch = require("../models/batch-model");
const { uploadVerificationFile } = require("../utils/s3bucket-qaVerification");
const { getFilter } = require("../utils/custom-validators");
const AssesorModel = require("../models/AssesorModel");
const AssessorNotificationModel = require("../models/assesor-notification-model");
const VerificationTabModel = require("../models/verficationTabModel");
const {
  getCheckFileUrl,
  getQAFileUrl,
  getQAFileListUrl,
  getQAFileUrlByBatch,
  deleteImageFromS3,
  getQAZipFileUrl,
} = require("../utils/s3bucketAccessor");
const Joi = require("joi");
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

//const zip = archiver('zip');
const fs = require("fs-extra");
const { json } = require("express");
const { qaObjectLinks } = require("../utils/qaTabConstant");
const { object } = require("webidl-conversions");
const createAssesorModel = require("../models/AssesorModel");
const {
  generateZipBuffer,
  uploadAuditZipFile,
} = require("../middleware/s3bucket");
const { stampPDF } = require("../middleware/attendancePdfStamp");
const { generateOMRPDF } = require("../utils/omrPdfGenerator");

const buildAttendancePayload = require("../utils/attendance_templates/buildAttendancePayload");
const buildResultPayload = require("../utils/result_templates/buildResultPayload");
const { getPDFByClient } = require("../utils/attendance_templates/pdfService");
const { getResultPDFByClient } = require("../utils/result_templates/resultPdfService");
const CandidateModel = require("../models/candidate-model");
const ExcelJS = require("exceljs");
const OfflineResultModel = require("../models/offlineResult-model");
const OnlineResultModel = require("../models/onlineResult-model");
const OldResultModel = require("../models/oldResult-model");

const formatTime = (timeInExcel) => {
  const hours = Math.floor(timeInExcel * 24); // Extract hours
  const minutes = Math.round((timeInExcel * 24 - hours) * 60); // Extract minutes

  //added new
  // Check if the values are within the valid time range (0 to 1)
  if (
    isNaN(hours) ||
    isNaN(minutes) ||
    hours < 0 ||
    hours > 23 ||
    minutes < 0 ||
    minutes > 59
  ) {
    // console.log(`Invalid time value in column '${columnName}': ${timeInExcel}`);
    return null; // or handle it accordingly based on your requirements
  }

  // Format the time as "hh:mm AM/PM"
  return (
    (hours % 12 || 12) +
    ":" +
    (minutes < 10 ? "0" : "") +
    minutes +
    " " +
    (hours < 12 ? "AM" : "PM")
  );
};

module.exports.uploadVerificationAssessment = async (req, res, next) => {
  try {
    let workbook = reader.readFile(req.file.path);
    let sheet_name_list = workbook.SheetNames;
    let xlData = reader.utils.sheet_to_json(
      workbook.Sheets[sheet_name_list[0]]
    );

    let errors = [];
    let vdata = [];

    // Iterate over the data and collect all errors
    await Promise.all(
      xlData.map(async (value) => {
        try {
          const trimmedBatchId = value["BATCH ID"]?.toString().trim();

          const batchData = await Batch.findOne({ batchId: trimmedBatchId });

          if (!batchData) {
            errors.push(`Batch with ID '${value["BATCH ID"]}' not found`);
            return; // Skip further processing for this entry
          }

          const batchStartDate = batchData.startDate;
          const batchEndDate = batchData.endDate;
          const batchId = batchData.batchId;
          let startDate = moment(`${batchStartDate}`, "DD/MM/YYYY");
          let endDate = moment(`${batchEndDate}`, "DD/MM/YYYY");

          if (!batchData.assignAssessorProctor) {
            errors.push(
              `Assessor has not been assigned to batch ${batchData.batchId}`
            );
            return;
          }

          const assessorData = await AssesorModel.findById(
            batchData.accessorId
          );
          if (!assessorData) {
            errors.push(`Assessor with ID '${value["Assessor Id"]}' not found`);
            return;
          }

          let date = value["Date"];

          if (!moment(date, "DD-MM-YYYY", true).isValid()) {
            errors.push(
              `Invalid date format: '${date}'. Please use 'DD-MM-YYYY'.`
            );
            return;
          }

          let todate = moment(`${date}`, "DD-MM-YYYY");
          if (todate < startDate || todate > endDate) {
            errors.push(
              `Date '${date}' is not within the range of batch date (${batchStartDate} - ${batchEndDate}) of batchId ${batchId}`
            );
            return;
          }

          // Collect valid data for insertion
          vdata.push({
            date: date,
            batchId: batchData?._id.toString(),
            assesorId: assessorData?._id.toString(),
            assessorName: assessorData?.fullName, //value["Assessor Name"],
            checkInTime: formatTime(value["Check- In (Photo)"]),
            checkOutTime: formatTime(value["Check- Out (Photo)"]),
            groupPhotoTime: formatTime(value["Group Photo"]),
            theoryPhotoTime: formatTime(value["Theory Exam Photo"]),
            theoryVideoTime: formatTime(value["Theory Exam Video"]),
            practicalPhotoTime: formatTime(value["Practical Photo"]),
            practicalVideoTime: formatTime(value["Practical Video"]),
            vivaPhotoTime: formatTime(value["Viva Photo"]),
            vivaVideoTime: formatTime(value["Viva Video"]),
            aadharHolding: formatTime(value["Aadhar Holding"]),
            annexureM: formatTime(value["Annexure M"]),
            annexureN: formatTime(value["Annexure N"]),
            assessmentPlan: value["Assessment Plan (Not Applicable)"],
            attendanceSheet: formatTime(value["Attendance Sheet"]),
            summarySheet: formatTime(value["Summary Sheet"]),
            tpUndertaking: formatTime(value["TP Undertaking"]),
            questionPaper: formatTime(value["Question Paper (If Applicable)"]),
            toolListTime: formatTime(value["Tool List (If Applicable)"]),
            toolPhotoTime: formatTime(value["Tool Photo (If Applicable)"]),
            tpFeedback: formatTime(value["TP Feedback (If Applicable)"]),
            audit: value["Audit (If any)"],
            remarks: value["Remarks (If any)"],
          });
        } catch (err) {
          errors.push(
            `Error processing entry for Batch ID: ${value["BATCH ID"]}. ${err.message}`
          );
        }
      })
    );

    // Check if any errors occurred
    if (errors.length > 0) {
      const errorMsg = errors.join(", ");
      await fs.unlink(req.file.path); // clean up uploaded file
      return errorResponse(res, 400, errorMsg, errorMsg);
    }

    // Check for duplicate entries
    for (let i = 0; i < vdata.length; i++) {
      for (let j = i + 1; j < vdata.length; j++) {
        if (
          vdata[i].date === vdata[j].date &&
          vdata[i].batchId === vdata[j].batchId &&
          vdata[i].assesorId === vdata[j].assesorId
        ) {
          await fs.unlink(req.file.path); // clean up uploaded file
          return errorResponse(
            res,
            400,
            "Duplicate entry.",
            `Duplicate entry of batchId in Excel file on date '${vdata[i].date}'`
          );
        }
      }
    }

    // Check for existing NOS in the database
    let existingNOS = [];
    await Promise.all(
      vdata.map(async (row) => {
        const existingNosData = await qaVerificationModel.findOne({
          date: row.date,
          batchId: row.batchId,
          assesorId: row.assesorId,
        });
        if (existingNosData) {
          existingNOS.push(existingNosData);
        }
      })
    );

    if (existingNOS.length > 0) {
      await fs.unlink(req.file.path); // clean up uploaded file
      return errorResponse(
        res,
        400,
        "Duplicate entry in database",
        `Batch already exists with the same date for one or more entries.`
      );
    }

    // Insert valid records
    const response = await qaVerificationModel.insertMany(vdata);

    const manyInsertPromise = await Promise.all(
      response.map((item) => {
        return qafileModel.create({
          batchId: item.batchId,
          assesorId: item.assesorId,
          date: item.date,
          QAverificationTimeStampId: item._id,
        });
      })
    );

    if (response && manyInsertPromise) {
      await fs.unlink(req.file.path); // clean up uploaded file
      return sendResponse(
        res,
        200,
        "Verification file uploaded successfully",
        response
      );
    }
  } catch (error) {
    await fs.unlink(req.file.path); // clean up uploaded file in case of error
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//here if download question sample file
module.exports.downloadVerificationAssessment = (req, res) => {
  const filepath = `public/files/bulkuploadsamplefile`;
  const file = `${filepath}/verificationSample.xlsx`;
  return res.status(200).download(file);
};

module.exports.verificationAssessmentList = async (req, res) => {
  try {
    const { page, limit, skip, sortOrder } = await Paginate(req);
    const {
      from,
      to,
      assessorName,
      search,
      isExport = false,
      dashboardClient = false,
    } = req.query;

    const XLSX = require("xlsx");

    if (isExport) {
      const assessmentDetails = await qaVerificationModel
        .find()
        .populate("batchId assesorId");

      const REQUIRED_DOCUMENT_KEYS = [
        ["checkInPhoto", "checkOutPhoto"],
        ["examcenterPhoto", "examcenterVideo"],
        "groupPhoto",
        ["theoryPhoto", "theoryVideo"],
        ["practicalPhoto", "practicalVideo"],
        ["vivaPhoto", "vivaVideo"],
        "aadharPhoto",
        ["annexureNPhoto", "annexureMPhoto"],
        "tpPhoto",
        "attendenceSheet",
        "toolPhoto",
      ];

      const totalDocuments = REQUIRED_DOCUMENT_KEYS.length;

      const batchIds = assessmentDetails.map((item) => item?.batchId?._id);

      const qafiles = await qafileModel
        .find({ batchId: { $in: batchIds } })
        .lean();
      const countResult = {};

      for (const qafile of qafiles) {
        const batchId = qafile.batchId;
        let uploadedCount = 0;

        for (const field of REQUIRED_DOCUMENT_KEYS) {
          if (Array.isArray(field)) {
            const anyUploaded = field.some(
              (subField) =>
                qafile[subField]?.images?.length > 0 ||
                qafile[subField]?.videos?.length > 0
            );
            if (anyUploaded) uploadedCount += 1;
          } else {
            if (
              qafile[field]?.images?.length > 0 ||
              qafile[field]?.videos?.length > 0
            ) {
              uploadedCount += 1;
            }
          }
        }

        countResult[batchId] = `${uploadedCount}/${totalDocuments}`;
      }

      const formattedData = assessmentDetails.map((item) => {
        const batchId = item?.batchId?._id;
        const documentsCount = countResult[batchId] || `0/${totalDocuments}`;
        return {
          Date: item?.date || "NA",
          BatchId: item?.batchId?.batchId || "NA",
          AssessorName: item?.assesorId?.fullName || "NA",
          CheckIn: item?.checkInTime || "NA",
          CheckOut: item?.checkOutTime || "NA",
          GroupPhoto: item?.groupPhotoTime || "NA",
          TheoryExamPhoto: item?.theoryPhotoTime || "NA",
          TheoryExamVideo: item?.theoryVideoTime || "NA",
          PracticalPhoto: item?.practicalPhotoTime || "NA",
          PracticalVideo: item?.practicalVideoTime || "NA",
          VivaPhoto: item?.vivaPhotoTime || "NA",
          VivaVideo: item?.vivaVideoTime || "NA",
          AadharPhoto: item?.aadharHolding || "NA",
          AnnexureN: item?.annexureN || "NA",
          AnnexureM: item?.annexureM || "NA",
          AttendanceSheet: item?.attendanceSheet || "NA",
          TpUnderTaking: item?.tpUndertaking || "NA",
          SummaryTest: item?.summarySheet || "NA",
          QuestionPaper: item?.questionPaper || "NA",
          ToolsList: item?.toolListTime || "NA",
          ToolsPhoto: item?.toolPhotoTime || "NA",
          TpFeedback: item?.tpFeedback || "NA",
          Audit: item?.audit || "NA",
          Remarks: item?.remarks || "NA",
          DocumentsCount: documentsCount,
          zipKey: item?.zipKey || "NA",
          zipUrl: item?.zipUrl || "NA",
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(formattedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "Verification List");

      const excelBuffer = XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx",
      });

      res.setHeader(
        "Content-Disposition",
        "attachment; filename=assessment-details.xlsx"
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );

      // Send the raw buffer directly
      return res.status(200).send(excelBuffer);
    }

    // Validation
    if (from && !to) {
      return errorResponse(
        res,
        400,
        "To Date is required",
        "To Date is required"
      );
    }
    if (to && !from) {
      return errorResponse(
        res,
        400,
        "From Date is required",
        "From Date is required"
      );
    }

    // Build optimized pipeline
    const pipeline = [];

    //Early filtering
    const initialMatch = {};
    if (from && to) {
      initialMatch.date = {
        $gte: moment(from, "MM-DD-YYYY").format("DD-MM-YYYY"),
        $lte: moment(to, "MM-DD-YYYY").format("DD-MM-YYYY"),
      };
    }
    if (Object.keys(initialMatch).length > 0) {
      pipeline.push({ $match: initialMatch });
    }

    //Compute clientIds consistently (single place)
    let clientIds = [];
    if (req.query?.clientId) {
      clientIds = [new mongoose.Types.ObjectId(req.query.clientId)];
    } else if (
      dashboardClient &&
      req?.user?.email !== "support@radiantinfonet.com"
    ) {
      clientIds = (req?.user?.assigndClients || []).map(
        (c) => new mongoose.Types.ObjectId(c._id || c)
      );
    }

    //Lookup batches with client filter
    pipeline.push(
      {
        $lookup: {
          from: "batches",
          localField: "batchId",
          foreignField: "_id",
          as: "batch",
          pipeline: clientIds.length
            ? [{ $match: { clientId: { $in: clientIds } } }]
            : [],
        },
      },
      { $unwind: { path: "$batch", preserveNullAndEmptyArrays: true } }
    );

    // Ensure client filter applied → drop null batches
    if (clientIds.length > 0) {
      pipeline.push({ $match: { batch: { $ne: null } } });
    }

    //Search filter
    if (search) {
      pipeline.push({
        $match: {
          "batch.batchId": {
            $regex: new RegExp(
              `^${search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`,
              "i"
            ),
          },
        },
      });
    }

    //Lookup assessors
    pipeline.push(
      {
        $lookup: {
          from: "assessors",
          localField: "batch.accessorId",
          foreignField: "_id",
          as: "batch.accessor",
          pipeline: assessorName
            ? [{ $match: { fullName: assessorName } }]
            : [],
        },
      },
      {
        $unwind: { path: "$batch.accessor", preserveNullAndEmptyArrays: true },
      }
    );

    if (assessorName) {
      pipeline.push({ $match: { "batch.accessor": { $ne: null } } });
    }

    // Facet for data + count
    pipeline.push({
      $facet: {
        data: [
          { $sort: sortOrder || { createdAt: -1 } },
          { $skip: skip },
          { $limit: limit },
          {
            $project: {
              _id: 1,
              date: 1,
              isFileUploaded: 1,
              batchId: {
                _id: "$batch._id",
                batchId: "$batch.batchId",
                accessorId: {
                  _id: "$batch.accessor._id",
                  fullName: "$batch.accessor.fullName",
                },
              },
              checkInTime: 1,
              checkOutTime: 1,
              groupPhotoTime: 1,
              theoryPhotoTime: 1,
              theoryVideoTime: 1,
              practicalPhotoTime: 1,
              practicalVideoTime: 1,
              vivaPhotoTime: 1,
              vivaVideoTime: 1,
              aadharHolding: 1,
              annexureM: 1,
              annexureN: 1,
              assessmentPlan: 1,
              attendanceSheet: 1,
              summarySheet: 1,
              tpUndertaking: 1,
              toolListTime: 1,
              toolPhotoTime: 1,
              tpFeedback: 1,
              audit: 1,
              remarks: 1,
              zipKey: 1,
              zipUrl: 1,
            },
          },
        ],
        totalCount: [{ $count: "count" }],
      },
    });

    // Execute aggregation
    const [result] = await qaVerificationModel.aggregate(pipeline);

    const assessmentDetails = result.data;
    const total = result.totalCount[0]?.count || 0;
    const totalPages = Math.ceil(total / limit);

    if (assessmentDetails.length === 0) {
      return sendResponse(res, 200, "No assessment details found", {
        assessmentDetails: [],
        totalPages: 0,
        totalCounts: 0,
      });
    }

    return sendResponse(res, 200, "Assessment details found", {
      assessmentDetails,
      page,
      totalCounts: total,
      totalPages,
    });
  } catch (error) {
    console.error("Error fetching assessment details:", error.message);
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.getFilteredAssessments = async (req, res) => {
  try {
    const { page, limit, skip, sortOrder } = Paginate(req);
    const { assessorName, from, to } = req.query;

    let startUTC;
    let endUTC;

    if (from || to) {
      let startDate = moment(from);
      let endDate = moment(to);
      startUTC = new Date(startDate.toISOString());
      const modifiedenDate = endDate.add(1, "days");

      endUTC = new Date(modifiedenDate.toISOString());
    }

    if (from || to) {
      filterQuery = {
        assessorName,
        createdAt: { $gte: startUTC, $lte: endUTC },
      };
    } else {
      filterQuery = { assessorName: assessorName };
    }

    const totalCounts = await qaVerificationModel.countDocuments(filterQuery);

    const totalPages = Math.ceil(totalCounts / limit);

    const userdemoDetails = await qaVerificationModel
      .find(filterQuery)
      // .select(
      //   "firstName lastName email userRole mobile organisationName status"
      // )
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    if (!userdemoDetails)
      return errorResponse(
        res,
        400,
        responseMessage.user_not_exist,
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, responseMessage.user_found, {
      userdemoDetails,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.assessorNameList = async (req, res) => {
  try {
    const redisKey = QA_VERIFICATION_ASSESSOR_NAME_LIST;

    // ✅ Check Redis cache
    const cachedData = await redis.get(redisKey);

    if (cachedData) {
      return sendResponse(
        res,
        200,
        responseMessage.user_found,
        cachedData,
        true
      );
    }

    const assessorDetails = await qaVerificationModel.aggregate([
      { $match: { assesorId: { $exists: true, $ne: null } } },
      { $group: { _id: "$assesorId" } }, // Remove duplicates
      {
        $lookup: {
          from: "assessors",
          localField: "_id",
          foreignField: "_id",
          as: "assessorInfo",
        },
      },
      { $unwind: "$assessorInfo" },
      {
        $project: {
          _id: "$assessorInfo._id",
          assesorId: {
            _id: "$assessorInfo._id",
            fullName: "$assessorInfo.fullName",
          },
        },
      },
    ]);

    const responseData = {
      assessorDetails,
    };

    // ✅ Cache the response
    await redis.set(redisKey, responseData, process.env.REDIS_DEFAULT_EXPIRY);

    return sendResponse(res, 200, responseMessage.user_found, responseData);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.uploadVerificationCheckFile = async (req, res) => {
  try {
    const { QAverificationTimeStampId } = req.body;

    if (!QAverificationTimeStampId) {
      return errorResponse(
        res,
        400,
        "Something missing in payload",
        "Something missing in payload"
      );
    }

    if (!req.files || (!req.files.checkInPhoto && !req.files.checkOutPhoto)) {
      return errorResponse(
        res,
        401,
        responseMessage.file_not_received,
        responseMessage.file_not_received
      );
    }

    const alreadyExisted = await qafileModel.findOne({
      $and: [{ QAverificationTimeStampId: QAverificationTimeStampId }],
    });

    if (!alreadyExisted)
      return errorResponse(
        res,
        400,
        "no verfication entry found",
        "no verfication entry found"
      );
    const currentDate = new Date();
    let hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // Convert hours to 12-hour format

    const formattedHours = hours < 10 ? `0${hours}` : hours;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    let currentTime = `${formattedHours}:${formattedMinutes} ${ampm}`;

    // Check and handle checkInPhoto files
    let uploadedCheckInImages = [];
    if (req.files.checkInPhoto) {
      const checkInImageIdentifiers = req.files.checkInPhoto.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedCheckInImages = await Promise.all(
        req.files.checkInPhoto.map(async (file, index) => {
          const imageIdentifier = checkInImageIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            Key: `${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            imgKey: imageIdentifier.toString(),
            imgFlag: true,
            imgName: file.originalname,
          };
        })
      );
    }

    // Check and handle checkOutPhoto files
    let uploadedCheckOutImages = [];
    if (req.files.checkOutPhoto) {
      const checkOutImageIdentifiers = req.files.checkOutPhoto.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedCheckOutImages = await Promise.all(
        req.files.checkOutPhoto.map(async (file, index) => {
          const imageIdentifier = checkOutImageIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            Key: `${imageIdentifier}`,
            // Key: `${req.QAverificationTimeStampId}/${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            imgKey: imageIdentifier.toString(),
            imgFlag: true,
            imgName: file.originalname,
          };
        })
      );
    }

    // Create an array of check-in image objects based on the uploaded images
    const checkInImages = uploadedCheckInImages.map((image) => ({
      imgKey: image.imgKey,
      imgFlag: image.imgFlag,
      imgName: image.imgName,
      adminUploaded: true,
      status: "accepted",
    }));

    // Create an array of check-out image objects based on the uploaded images
    const checkOutImages = uploadedCheckOutImages.map((image) => ({
      imgKey: image.imgKey,
      imgFlag: image.imgFlag,
      imgName: image.imgName,
      adminUploaded: true,
      status: "accepted",
    }));

    // Create the 'checkInPhoto' and 'checkOutPhoto' objects for the schema
    const checkInFile = {
      images: checkInImages,
    };

    const checkOutFile = {
      images: checkOutImages,
    };

    // Save the updated data to the database
    let fileDetails;

    checkInImages.forEach((item) => {
      alreadyExisted.checkInPhoto.images.push(item);
    });

    checkOutImages.forEach((item) => {
      alreadyExisted.checkOutPhoto.images.push(item);
    });

    fileDetails = await alreadyExisted.save();

    if (fileDetails) {
      if (req.files.checkInPhoto) {
        verificationEntry = await qaVerificationModel.findOneAndUpdate(
          {
            _id: QAverificationTimeStampId,
            checkInTime: { $eq: "" }, //{ $exists: false } // Check if time is not present
          },
          {
            $set: {
              checkInTime: currentTime,
            },
          },
          {
            new: true,
          }
        );
      }

      if (req.files.checkOutPhoto) {
        verificationEntry = await qaVerificationModel.findOneAndUpdate(
          {
            _id: QAverificationTimeStampId,
            checkOutTime: { $eq: "" }, //{ $exists: false } // Check if groupPhotoTime is not present
          },
          {
            $set: {
              checkOutTime: currentTime,
            },
          },
          {
            new: true,
          }
        );
      }
      changeVerificationFileStatus = await qaVerificationModel.findOneAndUpdate(
        { _id: QAverificationTimeStampId },
        { $set: { isFileUploaded: true } },
        { new: true }
      );

      await updateFileUploadStatus(QAverificationTimeStampId);

      return sendResponse(res, 200, "Files uploaded successfully", fileDetails);
    } else {
      return errorResponse(
        res,
        400,
        "Files not saved",
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, error, error.message);
  }
};

//change status
module.exports.checkFileStatusChange = async (req, res) => {
  try {
    let updateAssessor = { status: false, message: "" };
    const { QAverificationTimeStampId, imageUpdates } = req.body;
    updateAssessor = await updateImageStatuses(
      QAverificationTimeStampId,
      imageUpdates
    );

    let notificationResponse = { status: true, message: "" };
    if (
      imageUpdates[0].objectName !== "checkInPhoto" &&
      imageUpdates[0].objectName !== "checkOutPhoto"
    ) {
      notificationResponse = await makeNoifiction(
        req,
        QAverificationTimeStampId,
        imageUpdates
      );
    }

    if (updateAssessor.status && notificationResponse.status) {
      return sendResponse(res, 200, "Image status updated successfully", {
        updateAssessor,
        notificationResponse,
      });
    } else {
      return errorResponse(res, 400, "something wrong", {
        updateAssessor,
        notificationResponse,
      });
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

async function updateImageStatuses(QAverificationTimeStampId, imageUpdates) {
  try {
    const document = await qafileModel.findOne({
      QAverificationTimeStampId: QAverificationTimeStampId,
    });

    if (!document) {
      throw new Error("Document not found");
    }

    for (const { objectName, imageId, newStatus, fileType } of imageUpdates) {
      const targetObject = document[objectName];

      if (!targetObject) {
        throw new Error(`Object ${objectName} not found`);
      }

      const imageIndex = targetObject[fileType].findIndex((image) =>
        image._id.equals(imageId)
      ); //ObjectId
      if (imageIndex === -1) {
        throw new Error(`Image ${imageId} not found in ${objectName}`);
      }

      //console.log('targetObject[fileType][imageIndex].status-->', targetObject[fileType][imageIndex].status)
      targetObject[fileType][imageIndex].status = newStatus;
    }

    const savedStatus = await document.save();

    if (savedStatus) {
      return { status: true, message: savedStatus };
    } else {
      return { status: false, message: savedStatus };
    }
  } catch (error) {
    console.error("Error updating image statuses:", error.message);
    return { status: false, message: error.message };
  }
}

module.exports.getVerificationFiles = async (req, res) => {
  try {
    const { batchId, assesorId, date, section } = req.query;

    const details = await qafileModel.find({
      $and: [{ batchId: batchId }, { assesorId: assesorId }, { date: date }],
    });

    const response = details.flatMap((item) => {
      if (section) {
        switch (section) {
          case "checkInPhoto":
            return [item["checkInPhoto"], item["checkOutPhoto"]];
            break;

          case "theoryPhoto":
            return [item["theoryPhoto"], item["theoryVideo"]];
            break;

          case "practicalPhoto":
            return [item["practicalPhoto"], item["practicalVideo"]];
            break;

          case "vivaPhoto":
            return [item["vivaPhoto"], item["vivaVideo"]];
            break;

          case "examcenterPhoto":
            return [item["examcenterPhoto"], item["examcenterVideo"]];
            break;

          case "annexureNPhoto":
            return [item["annexureNPhoto"], item["annexureMPhoto"]];
            break;

          case "aadharPhoto":
            return [item["aadharPhoto"]];
            break;

          case "attendenceSheet":
            return [item["attendenceSheet"]];
            break;

          case "toolPhoto":
            return [item["toolPhoto"]];
            break;

          case "tpPhoto":
            return [item["tpPhoto"]];
            break;

          case "otherFile":
            return [item["otherFile"]];
            break;

          case "groupPhoto":
            return [item["groupPhoto"]];

          default:
            return [];
            break;
        }
      }

      return item;
    });

    const finalReponse = await Promise.all(
      response[0].images.map(async (item) => {
        let data = {
          ...JSON.parse(JSON.stringify(item)),
          url: await getQAFileUrl(batchId, item.imgKey),
        };
        return data;
      })
    );

    const superFinalResponse = JSON.parse(JSON.stringify(response));
    superFinalResponse[0].images = finalReponse;

    if (response.length > 1 && section === "checkInPhoto") {
      const finalReponse = await Promise.all(
        response[1].images.map(async (item) => {
          let data = {
            ...JSON.parse(JSON.stringify(item)),
            url: await getQAFileUrl(batchId, item.imgKey),
          };
          return data;
        })
      );

      const superFinalResponse = JSON.parse(JSON.stringify(response));

      superFinalResponse[1].images = finalReponse;
    } else if (response.length > 1) {
      const finalReponse2 = await Promise.all(
        response[1].videos.map(async (item) => {
          let data = {
            ...JSON.parse(JSON.stringify(item)),
            url: await getQAFileUrl2(batchId, item.videoKey),
          };
          return data;
        })
      );

      superFinalResponse[1].videos = finalReponse2;
    }

    return sendResponse(res, 200, "Data get successfully", superFinalResponse);
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

module.exports.getCheckFile = async (req, res) => {
  try {
    const QAverificationTimeStampId = req.params.id;
    const qaCheckData = await qafileModel
      .find({ QAverificationTimeStampId: QAverificationTimeStampId })
      .populate({ path: "batchId", select: "batchId" });

    if (!qaCheckData) {
      return sendResponse(res, 404, "No data found", []);
    }

    const checkInPhoto = qaCheckData.flatMap(
      (data) => data.checkInPhoto.images
    );
    const checkOutPhoto = qaCheckData.flatMap(
      (data) => data.checkOutPhoto.images
    );

    // Check for both theoryPhotos and theoryVideos being empty
    if (!checkInPhoto.length && !checkOutPhoto.length) {
      return sendResponse(res, 200, "Theory files retrieved successfully", []);
    }

    // const checkInPhotoKeys = checkInPhoto.map((photo) => photo.imgKey);
    // const checkOutPhotoKeys = checkOutPhoto.map((photo) => photo.imgKey);

    const checkInPhotoFilesWithUrls = await getQAFileUrl(
      qaCheckData[0],
      // theoryPhotoFileKeys
      checkInPhoto,
      "checkInPhoto"
    );

    const checkOutPhotoFilesWithUrls = await getQAFileUrl(
      qaCheckData[0],
      // theoryVideoFileKeys
      checkOutPhoto,
      "checkOutPhoto"
    );

    const results = {
      checkInUrls: checkInPhotoFilesWithUrls,
      checkOutUrls: checkOutPhotoFilesWithUrls,
    };

    return sendResponse(res, 200, "Files retrieved successfully", results);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.deleteVerificationFile = async (req, res) => {
  try {
    const { batchId, assesorId, date, section } = req.query;
    const details = await qafileModel.find({
      $and: [{ batchId: batchId }, { assesorId: assesorId }, { date: date }],
    });

    if (!details)
      return errorResponse(res, 400, "data not found", "data not found");

    return sendResponse(res, 200, "data", details);
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

module.exports.deleteCheckFileByKey = async (req, res) => {
  try {
    const batchId = req.params.id;
    const keyToDelete = req.body.keyToDelete;
    const qaVerificationTimeStampId = req.body.QAverificationTimeStampId;
    let updateObject = {};
    const qaCheckData = await qafileModel.find({
      QAverificationTimeStampId: QAverificationTimeStampId,
    });
    //const qaCheckData = await qafileModel.find({ batchId: batchId });

    if (!qaCheckData || qaCheckData.length === 0) {
      return errorResponse(res, 404, "No data found", "No data found");
    }

    // Iterate over each document in qaCheckData
    for (const data of qaCheckData) {
      const checkInPhotos = data.checkInPhoto?.images || [];
      const checkOutPhotos = data.checkOutPhoto?.images || [];

      const checkInFileKeys = checkInPhotos.map((photo) => photo.imgKey);
      const checkOutFileKeys = checkOutPhotos.map((photo) => photo.imgKey);

      // Check if the key exists in either checkInPhoto or checkOutPhoto
      const keyExistsInCheckIn = checkInFileKeys.includes(keyToDelete);
      const keyExistsInCheckOut = checkOutFileKeys.includes(keyToDelete);

      if (keyExistsInCheckIn) {
        updateObject.checkInTime = "";
      }
      if (keyExistsInCheckOut) {
        updateObject.checkOutTime = "";
      }

      if (keyExistsInCheckIn || keyExistsInCheckOut) {
        // Delete the key from the database
        const result = await qafileModel.updateMany(
          { batchId: batchId },
          {
            $pull: {
              "checkInPhoto.images": { imgKey: keyToDelete },
              "checkOutPhoto.images": { imgKey: keyToDelete },
            },
          }
        );

        if (result && checkInFileKeys.length === 1) {
          const result2 = await qaVerificationModel.updateOne(
            { _id: qaVerificationTimeStampId },
            updateObject
          );
        }
        // Delete the image from S3
        await deleteImageFromS3(keyToDelete);

        return sendResponse(res, 200, "File deleted successfully", result);
      }
    }

    // If the key is not found in any document
    return errorResponse(res, 404, "Files not found", "Files not found");
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.uploadVerificationGroupFile = async (req, res) => {
  try {
    // Find the JobRole document by _id
    const { QAverificationTimeStampId } = req.body;

    if (!QAverificationTimeStampId) {
      return errorResponse(
        res,
        400,
        "Something missing in payload",
        "Something missing in payload"
      );
    }

    if (!req.files || (!req.files.groupPhoto && !req.files.groupPhoto)) {
      return errorResponse(
        res,
        401,
        responseMessage.file_not_received,
        responseMessage.file_not_received
      );
    }

    const alreadyExisted = await qafileModel.findOne({
      $and: [{ QAverificationTimeStampId: QAverificationTimeStampId }],
    });
    if (!alreadyExisted)
      return errorResponse(
        res,
        400,
        "no verfication entry found",
        "no verfication entry found"
      );

    const currentDate = new Date();
    let hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // Convert hours to 12-hour format

    const formattedHours = hours < 10 ? `0${hours}` : hours;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    let currentTime = `${formattedHours}:${formattedMinutes} ${ampm}`;
    // Check and handle group photo files

    let uploadedGroupImages = [];
    if (req.files.groupPhoto) {
      const groupImageIdentifiers = req.files.groupPhoto.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedGroupImages = await Promise.all(
        req.files.groupPhoto.map(async (file, index) => {
          const imageIdentifier = groupImageIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            //key: `${imageIdentifier}`,
            // Key: `${req.QAverificationTimeStampId}/${imageIdentifier}`,
            Key: `${QAverificationTimeStampId}/${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            imgKey: imageIdentifier.toString(),
            imgFlag: true,
            imgName: file.originalname,
          };
        })
      );
    }

    // Create an array of group image objects based on the uploaded images
    const groupImages = uploadedGroupImages.map((image) => ({
      imgKey: image.imgKey,
      imgFlag: image.imgFlag,
      imgName: image.imgName,
      adminUploaded: true,
      status: "accepted",
    }));
    // Create the 'groupPhoto' objects for the schema
    const groupFile = {
      images: groupImages,
    };

    // Save the updated data to the database
    let fileDetails;

    groupImages.forEach((item) => {
      alreadyExisted.groupPhoto.images.push(item);
    });

    fileDetails = await alreadyExisted.save();

    if (fileDetails) {
      if (req.files.groupPhoto) {
        changeVerificationFileStatus =
          await qaVerificationModel.findOneAndUpdate(
            { _id: QAverificationTimeStampId },
            { $set: { isFileUploaded: true } },
            { new: true }
          );

        verificationEntry = await qaVerificationModel.findOneAndUpdate(
          {
            _id: QAverificationTimeStampId,
            groupPhotoTime: { $eq: "" }, //{ $exists: false } // Check if groupPhotoTime is not present
          },
          {
            $set: {
              groupPhotoTime: currentTime,
            },
          },
          {
            new: true,
          }
        );
      }
      await updateFileUploadStatus(QAverificationTimeStampId);

      return sendResponse(res, 200, "Files uploaded successfully", fileDetails);
    } else {
      return errorResponse(
        res,
        400,
        "Files not saved",
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, error, error.message);
  }
};

//get multiple images on single key
module.exports.getgroupFile = async (req, res) => {
  try {
    const QAverificationTimeStampId = req.params.id;
    const qaDetails = await qafileModel
      .find({ QAverificationTimeStampId: QAverificationTimeStampId })
      .populate({ path: "batchId", select: "batchId" });

    if (!qaDetails || qaDetails.length === 0) {
      //return errorResponse(res, 404, "No data found", "No data found");
      return sendResponse(res, 200, "getting data", []);
    }

    const allGroupPhotos = [];

    // Iterate over each document in qaDetails
    for (const data of qaDetails) {
      const groupPhotos = data.groupPhoto;

      // Check if groupPhoto exists and has images
      if (
        groupPhotos &&
        Array.isArray(groupPhotos.images) &&
        groupPhotos.images.length > 0
      ) {
        // const fileKeys = groupPhotos.images.map((photo) => photo.imgKey);

        const dataWithUrls = await getQAFileUrl(data, groupPhotos.images);

        if (dataWithUrls && dataWithUrls.length > 0) {
          // Filter out files with null URLs (i.e., not uploaded)
          const uploadedFiles = dataWithUrls.filter(
            (file) => file.url !== null
          );

          if (uploadedFiles.length > 0) {
            // Add the files to the result array
            allGroupPhotos.push(...uploadedFiles);
          }
        }
      }
    }

    if (allGroupPhotos.length > 0) {
      return sendResponse(res, 200, "Group photos available", allGroupPhotos);
    } else {
      return sendResponse(res, 200, "getting data", []);
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.deleteGroupFile = async (req, res) => {
  try {
    const batchId = req.params.id;
    const keyToDelete = req.body.keyToDelete; // Key to delete from front-end
    const qaVerificationTimeStampId = req.body.QAverificationTimeStampId;
    let updateObject = {};
    const qaGroupData = await qafileModel.find({
      QAverificationTimeStampId: qaVerificationTimeStampId,
    });
    //const qaGroupData = await qafileModel.find({ batchId: batchId });

    if (!qaGroupData || qaGroupData.length === 0) {
      return errorResponse(res, 404, "No data found", "No data found");
    }

    const deletedDataArray = [];

    // Iterate over each document in qaGroupData
    for (const data of qaGroupData) {
      const groupPhotos = data.groupPhoto?.images || [];

      // Check if groupPhoto exists
      if (!data.groupPhoto || !groupPhotos || groupPhotos.length === 0) {
        continue; // Move to the next document if groupPhoto is missing or empty
      }

      // Check if the key exists in groupPhoto
      const keyExistsInGroup = groupPhotos.some(
        (photo) => photo.imgKey === keyToDelete
      );

      if (keyExistsInGroup) {
        // Delete the image from S3
        updateObject.groupPhotoTime = "";
        await deleteImageFromS3(keyToDelete);

        // Delete the key from the database
        const result = await qafileModel.updateMany(
          { batchId: batchId },
          {
            $pull: {
              "groupPhoto.images": { imgKey: keyToDelete },
            },
          }
        );

        deletedDataArray.push({ key: keyToDelete, result });
        if (result && groupPhotos.length === 1) {
          const result2 = await qaVerificationModel.updateOne(
            { _id: qaVerificationTimeStampId },
            updateObject
          );
        }
      }
    }

    if (deletedDataArray.length === 0) {
      return errorResponse(res, 404, "Files not found", "Files not found");
    }

    return sendResponse(
      res,
      200,
      "Files deleted successfully",
      deletedDataArray
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//upload multiple images/videos in single key
module.exports.uploadVerificationTheoryFile = async (req, res) => {
  try {
    const { QAverificationTimeStampId } = req.body;

    if (!QAverificationTimeStampId) {
      return errorResponse(
        res,
        400,
        "Something missing in payload",
        "Something missing in payload"
      );
    }

    if (!req.files || (!req.files.theoryPhoto && !req.files.theoryVideo)) {
      return errorResponse(
        res,
        401,
        responseMessage.file_not_received,
        responseMessage.file_not_received
      );
    }

    const alreadyExisted = await qafileModel.findOne({
      $and: [{ QAverificationTimeStampId: QAverificationTimeStampId }],
    });

    if (!alreadyExisted)
      return errorResponse(
        res,
        400,
        "no verfication entry found",
        "no verfication entry found"
      );

    const currentDate = new Date();
    let hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // Convert hours to 12-hour format

    const formattedHours = hours < 10 ? `0${hours}` : hours;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    let currentTime = `${formattedHours}:${formattedMinutes} ${ampm}`;
    // Check and handle checkInPhoto files
    let uploadedTheoryImages = [];
    if (req.files.theoryPhoto) {
      const theoryImageIdentifiers = req.files.theoryPhoto.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedTheoryImages = await Promise.all(
        req.files.theoryPhoto.map(async (file, index) => {
          const imageIdentifier = theoryImageIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            //key: `${imageIdentifier}`,
            Key: `${QAverificationTimeStampId}/${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            imgKey: imageIdentifier.toString(),
            imgFlag: true,
            imgName: file.originalname,
          };
        })
      );
    }

    let uploadedTheoryVideos = [];
    if (req.files.theoryVideo) {
      const theoryVideoIdentifiers = req.files.theoryVideo.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedTheoryVideos = await Promise.all(
        req.files.theoryVideo.map(async (file, index) => {
          const imageIdentifier = theoryVideoIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            //key: `${imageIdentifier}`,
            Key: `${QAverificationTimeStampId}/${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            videoKey: imageIdentifier.toString(),
            videoFlag: true,
            videoName: file.originalname,
          };
        })
      );
    }

    const theoryImages = uploadedTheoryImages.map((image) => ({
      imgKey: image.imgKey,
      imgFlag: image.imgFlag,
      imgName: image.imgName,
      adminUploaded: true,
      status: "accepted",
    }));

    // Create an array of check-out image objects based on the uploaded images
    const theoryVideos = uploadedTheoryVideos.map((image) => ({
      videoKey: image.videoKey,
      videoFlag: image.videoFlag,
      videoName: image.videoName,
      adminUploaded: true,
      status: "accepted",
    }));

    // Create the 'checkInPhoto' and 'checkOutPhoto' objects for the schema
    const theoryImageFile = {
      images: theoryImages,
    };

    const theoryVideoFile = {
      videos: theoryVideos,
    };

    // Save the updated data to the database

    let fileDetails;

    theoryImages.forEach((item) => {
      alreadyExisted.theoryPhoto.images.push(item);
    });

    theoryVideos.forEach((item) => {
      alreadyExisted.theoryVideo.videos.push(item);
    });

    fileDetails = await alreadyExisted.save();

    if (fileDetails) {
      if (req.files.theoryPhoto) {
        verificationEntry = await qaVerificationModel.findOneAndUpdate(
          {
            _id: QAverificationTimeStampId,
            theoryPhotoTime: { $eq: "" },
          },
          {
            $set: {
              theoryPhotoTime: currentTime,
            },
          },
          {
            new: true,
          }
        );
      }

      if (req.files.theoryVideo) {
        verificationEntry = await qaVerificationModel.findOneAndUpdate(
          {
            _id: QAverificationTimeStampId,
            theoryVideoTime: { $eq: "" }, //{ $exists: false } // Check if groupPhotoTime is not present
          },
          {
            $set: {
              theoryVideoTime: currentTime,
            },
          },
          {
            new: true,
          }
        );
      }

      changeVerificationFileStatus = await qaVerificationModel.findOneAndUpdate(
        { _id: QAverificationTimeStampId },
        { $set: { isFileUploaded: true } },
        { new: true }
      );

      await updateFileUploadStatus(QAverificationTimeStampId);

      return sendResponse(res, 200, "Files uploaded successfully", fileDetails);
    } else {
      return errorResponse(
        res,
        400,
        "Files not saved",
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, error, error.message);
  }
};

//to check by modified code
module.exports.getTheoryFile = async (req, res) => {
  try {
    const QAverificationTimeStampId = req.params.id;
    const qaTheoryData = await qafileModel
      .find({ QAverificationTimeStampId: QAverificationTimeStampId })
      .populate({ path: "batchId", select: "batchId" });

    if (!qaTheoryData && !qaTheoryData.length) {
      return sendResponse(res, 200, "No data found", []);
    }

    const theoryPhotos = qaTheoryData.flatMap(
      (data) => data.theoryPhoto.images
    );
    const theoryVideos = qaTheoryData.flatMap(
      (data) => data.theoryVideo.videos
    );

    // Check for both theoryPhotos and theoryVideos being empty
    if (!theoryPhotos.length && !theoryVideos.length) {
      return sendResponse(res, 200, "Theory files retrieved successfully", []);
    }

    const theoryPhotoFileKeys = theoryPhotos.map((photo) => photo.imgKey);
    const theoryVideoFileKeys = theoryVideos.map((video) => video.videoKey);

    const theoryPhotoFilesWithUrls = await getQAFileUrl(
      qaTheoryData[0],
      // theoryPhotoFileKeys
      theoryPhotos
    );

    const theoryVideoFilesWithUrls = await getQAFileUrl(
      qaTheoryData[0],
      // theoryVideoFileKeys
      theoryVideos
    );

    const results = {
      theoryPhotoUrls: theoryPhotoFilesWithUrls,
      theoryVideoUrls: theoryVideoFilesWithUrls,
    };

    return sendResponse(
      res,
      200,
      "Theory files retrieved successfully",
      results
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.deleteTheoryFileByKey = async (req, res) => {
  try {
    const batchId = req.params.id;
    const keyToDelete = req.body.keyToDelete;
    const qaVerificationTimeStampId = req.body.QAverificationTimeStampId;
    let updateObject = {};
    const qaTheoryData = await qafileModel.find({
      QAverificationTimeStampId: qaVerificationTimeStampId,
    });
    //const qaTheoryData = await qafileModel.find({ batchId: batchId });

    if (!qaTheoryData || qaTheoryData.length === 0) {
      return errorResponse(res, 404, "No data found", "No data found");
    }

    const theoryPhotos = qaTheoryData.flatMap(
      (data) => data.theoryPhoto.images
    );
    const theoryVideos = qaTheoryData.flatMap(
      (data) => data.theoryVideo.videos
    );

    if (!theoryPhotos && !theoryVideos) {
      return errorResponse(res, 404, "Files not found", "Files not found");
    }

    const theoryPhotoFileKeys = theoryPhotos
      ? theoryPhotos.map((photo) => photo.imgKey)
      : [];
    const theoryVideoFileKeys = theoryVideos
      ? theoryVideos.map((video) => video.videoKey)
      : [];

    // Check if the key exists in either theoryPhoto or theoryVideo
    const keyExistsInTheoryPhoto = theoryPhotoFileKeys.includes(keyToDelete);
    const keyExistsInTheoryVideo = theoryVideoFileKeys.includes(keyToDelete);

    if (!keyExistsInTheoryPhoto && !keyExistsInTheoryVideo) {
      return errorResponse(
        res,
        404,
        "Key not found in theory photos or videos",
        "Key not found in theory photos or videos"
      );
    }

    if (keyExistsInTheoryPhoto) {
      // Set theoryPhotoTime to empty string
      updateObject.theoryPhotoTime = "";
    }

    if (keyExistsInTheoryVideo) {
      // Set theoryVideoTime to empty string
      updateObject.theoryVideoTime = "";
    }

    // Delete the key from the database
    const result = await qafileModel.updateMany(
      { QAverificationTimeStampId: qaVerificationTimeStampId },
      {
        $pull: {
          "theoryPhoto.images": { imgKey: keyToDelete },
          "theoryVideo.videos": { videoKey: keyToDelete },
        },
      }
    );

    if (
      result &&
      (theoryPhotoFileKeys.length === 1 || theoryVideoFileKeys.length === 1)
    ) {
      const result2 = await qaVerificationModel.updateOne(
        { _id: qaVerificationTimeStampId },
        updateObject
      );
    }

    return sendResponse(res, 200, "Theory file deleted successfully", result);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//upload multiple practical photo/videos on single key
module.exports.uploadVerificationPracticalFile = async (req, res) => {
  try {
    const { QAverificationTimeStampId } = req.body;

    if (!QAverificationTimeStampId) {
      return errorResponse(
        res,
        400,
        "Something missing in payload",
        "Something missing in payload"
      );
    }

    if (
      !req.files ||
      (!req.files.practicalPhoto && !req.files.practicalVideo)
    ) {
      return errorResponse(
        res,
        401,
        responseMessage.file_not_received,
        responseMessage.file_not_received
      );
    }

    const alreadyExisted = await qafileModel.findOne({
      $and: [{ QAverificationTimeStampId: QAverificationTimeStampId }],
    });

    if (!alreadyExisted)
      return errorResponse(
        res,
        400,
        "no verfication entry found",
        "no verfication entry found"
      );
    const currentDate = new Date();
    let hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // Convert hours to 12-hour format

    const formattedHours = hours < 10 ? `0${hours}` : hours;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    let currentTime = `${formattedHours}:${formattedMinutes} ${ampm}`;

    // Check and handle checkInPhoto files
    let uploadedPracticalImages = [];
    if (req.files.practicalPhoto) {
      const practicalImageIdentifiers = req.files.practicalPhoto.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedPracticalImages = await Promise.all(
        req.files.practicalPhoto.map(async (file, index) => {
          const imageIdentifier = practicalImageIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            // Key: `${imageIdentifier}`,
            Key: `${QAverificationTimeStampId}/${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            imgKey: imageIdentifier.toString(),
            imgFlag: true,
            imgName: file.originalname,
          };
        })
      );
    }

    let uploadedPracticalVideos = [];
    if (req.files.practicalVideo) {
      const practicalVideoIdentifiers = req.files.practicalVideo.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedPracticalVideos = await Promise.all(
        req.files.practicalVideo.map(async (file, index) => {
          const imageIdentifier = practicalVideoIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            // Key: `${imageIdentifier}`,
            Key: `${QAverificationTimeStampId}/${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            videoKey: imageIdentifier.toString(),
            videoFlag: true,
            videoName: file.originalname,
          };
        })
      );
    }

    const practicalImages = uploadedPracticalImages.map((image) => ({
      imgKey: image.imgKey,
      imgFlag: image.imgFlag,
      imgName: image.imgName,
      adminUploaded: true,
      status: "accepted",
    }));

    // Create an array of check-out image objects based on the uploaded images
    const practicalVideos = uploadedPracticalVideos.map((image) => ({
      videoKey: image.videoKey,
      videoFlag: image.videoFlag,
      videoName: image.videoName,
      adminUploaded: true,
      status: "accepted",
    }));

    // Create the 'checkInPhoto' and 'checkOutPhoto' objects for the schema
    const practicalImageFile = {
      images: practicalImages,
    };

    const practicalVideoFile = {
      videos: practicalVideos,
    };

    let fileDetails;

    practicalImages.forEach((item) => {
      alreadyExisted.practicalPhoto.images.push(item);
    });

    practicalVideos.forEach((item) => {
      alreadyExisted.practicalVideo.videos.push(item);
    });

    fileDetails = await alreadyExisted.save();

    if (fileDetails) {
      if (req.files.practicalPhoto) {
        verificationEntry = await qaVerificationModel.findOneAndUpdate(
          {
            _id: QAverificationTimeStampId,
            practicalPhotoTime: { $eq: "" },
          },
          {
            $set: {
              practicalPhotoTime: currentTime,
            },
          },
          {
            new: true,
          }
        );
      }

      if (req.files.practicalVideo) {
        verificationEntry = await qaVerificationModel.findOneAndUpdate(
          {
            _id: QAverificationTimeStampId,
            practicalVideoTime: { $eq: "" }, //{ $exists: false } // Check if groupPhotoTime is not present
          },
          {
            $set: {
              practicalVideoTime: currentTime,
            },
          },
          {
            new: true,
          }
        );
      }
      changeVerificationFileStatus = await qaVerificationModel.findOneAndUpdate(
        { _id: QAverificationTimeStampId },
        { $set: { isFileUploaded: true } },
        { new: true }
      );
      await updateFileUploadStatus(QAverificationTimeStampId);

      return sendResponse(res, 200, "Files uploaded successfully", fileDetails);
    } else {
      return errorResponse(
        res,
        400,
        "Files not saved",
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, error, error.message);
  }
};

module.exports.getPracticalFile = async (req, res) => {
  try {
    const QAverificationTimeStampId = req.params.id;
    const qaPracticalData = await qafileModel
      .find({ QAverificationTimeStampId: QAverificationTimeStampId })
      .populate({ path: "batchId", select: "batchId" });

    if (!qaPracticalData && qaPracticalData.length === 0) {
      //return errorResponse(res, 404, "No data found", "No data found");
      return sendResponse(res, 200, "getting data", []);
    }

    const practicalPhotos = qaPracticalData.flatMap(
      (data) => data.practicalPhoto.images
    );
    const practicalVideos = qaPracticalData.flatMap(
      (data) => data.practicalVideo.videos
    );

    if (!practicalPhotos.length && !practicalVideos.length) {
      return sendResponse(
        res,
        200,
        "Practical files retrieved successfully",
        []
      );
    }
    // const practicalPhotoFileKeys = practicalPhotos.map((photo) => photo.imgKey);
    // const practicalVideoFileKeys = practicalVideos.map(
    //   (video) => video.videoKey
    // );

    const practicalPhotoFilesWithUrls = await getQAFileUrl(
      qaPracticalData[0], //data1,
      practicalPhotos
    );

    const practicalVideoFilesWithUrls = await getQAFileUrl(
      qaPracticalData[0], //data2,
      practicalVideos
    );

    const results = {
      practicalPhotoUrls: practicalPhotoFilesWithUrls,
      practicalVideoUrls: practicalVideoFilesWithUrls,
    };

    return sendResponse(
      res,
      200,
      "Practical files retrieved successfully",
      results
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.deletePracticalFileByKey = async (req, res) => {
  try {
    const batchId = req.params.id;
    const keyToDelete = req.body.keyToDelete;
    const qaVerificationTimeStampId = req.body.QAverificationTimeStampId;
    let updateObject = {};

    const qaPracticalData = await qafileModel.find({
      QAverificationTimeStampId: qaVerificationTimeStampId,
    });

    // const qaPracticalData = await qafileModel.find({ batchId: batchId });

    if (!qaPracticalData || qaPracticalData.length === 0) {
      return errorResponse(res, 404, "No data found", "No data found");
    }

    const practicalPhotos = qaPracticalData.flatMap(
      (data) => data.practicalPhoto.images
    );
    const practicalVideos = qaPracticalData.flatMap(
      (data) => data.practicalVideo.videos
    );

    if (!practicalPhotos && !practicalVideos) {
      return errorResponse(res, 404, "Files not found", "Files not found");
    }

    const practicalPhotoFileKeys = practicalPhotos
      ? practicalPhotos.map((photo) => photo.imgKey)
      : [];
    const practicalVideoFileKeys = practicalVideos
      ? practicalVideos.map((video) => video.videoKey)
      : [];

    // Check if the key exists in either theoryPhoto or theoryVideo
    const keyExistsInPracticalPhoto =
      practicalPhotoFileKeys.includes(keyToDelete);
    const keyExistsInPracticalVideo =
      practicalVideoFileKeys.includes(keyToDelete);

    if (!keyExistsInPracticalPhoto && !keyExistsInPracticalVideo) {
      return errorResponse(res, 404, "Files not found", "Files not found");
    }

    if (keyExistsInPracticalPhoto) {
      // Set theoryPhotoTime to empty string
      updateObject.practicalPhotoTime = "";
    }

    if (keyExistsInPracticalVideo) {
      // Set theoryVideoTime to empty string
      updateObject.practicalVideoTime = "";
    }

    // Delete the key from the database
    const result = await qafileModel.updateMany(
      { batchId: batchId },
      {
        $pull: {
          "practicalPhoto.images": { imgKey: keyToDelete },
          "practicalVideo.videos": { videoKey: keyToDelete },
        },
      }
    );

    //update time with empty if respective file delete
    if (
      result &&
      (practicalPhotoFileKeys.length === 1 ||
        practicalVideoFileKeys.length === 1)
    ) {
      const result2 = await qaVerificationModel.updateOne(
        { _id: qaVerificationTimeStampId },
        updateObject
      );
      //console.log("Update result:", result2);
    }

    return sendResponse(res, 200, "File deleted successfully", result);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//upload multiple images/videos in single key
module.exports.uploadVerificationVivaFile = async (req, res) => {
  try {
    const { QAverificationTimeStampId } = req.body;

    if (!QAverificationTimeStampId) {
      return errorResponse(
        res,
        400,
        "Something missing in payload",
        "Something missing in payload"
      );
    }

    if (!req.files || (!req.files.vivaPhoto && !req.files.vivaVideo)) {
      return errorResponse(
        res,
        400,
        responseMessage.file_not_received,
        responseMessage.file_not_received
      );
    }

    const alreadyExisted = await qafileModel.findOne({
      $and: [{ QAverificationTimeStampId: QAverificationTimeStampId }],
    });

    if (!alreadyExisted)
      return errorResponse(
        res,
        400,
        "no verfication entry found",
        "no verfication entry found"
      );

    const currentDate = new Date();
    let hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // Convert hours to 12-hour format

    const formattedHours = hours < 10 ? `0${hours}` : hours;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    let currentTime = `${formattedHours}:${formattedMinutes} ${ampm}`;

    // Check and handle practical photos and videos files
    let uploadedVivaImages = [];
    if (req.files.vivaPhoto) {
      const vivaImageIdentifiers = req.files.vivaPhoto.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedVivaImages = await Promise.all(
        req.files.vivaPhoto.map(async (file, index) => {
          const imageIdentifier = vivaImageIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            // Key: `${imageIdentifier}`,
            Key: `${QAverificationTimeStampId}/${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            imgKey: imageIdentifier.toString(),
            imgFlag: true,
            imgName: file.originalname,
          };
        })
      );
    }

    let uploadedVivaVideos = [];
    if (req.files.vivaVideo) {
      const vivaVideoIdentifiers = req.files.vivaVideo.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedVivaVideos = await Promise.all(
        req.files.vivaVideo.map(async (file, index) => {
          const imageIdentifier = vivaVideoIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            // Key: `${imageIdentifier}`,
            Key: `${QAverificationTimeStampId}/${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            videoKey: imageIdentifier.toString(),
            videoFlag: true,
            videoName: file.originalname,
          };
        })
      );
    }

    const vivaImages = uploadedVivaImages.map((image) => ({
      imgKey: image.imgKey,
      imgFlag: image.imgFlag,
      imgName: image.imgName,
      adminUploaded: true,
      status: "accepted",
    }));

    // Create an array of check-out image objects based on the uploaded images
    const vivaVideos = uploadedVivaVideos.map((image) => ({
      videoKey: image.videoKey,
      videoFlag: image.videoFlag,
      videoName: image.videoName,
      adminUploaded: true,
      status: "accepted",
    }));

    // Create the 'checkInPhoto' and 'checkOutPhoto' objects for the schema
    const vivaImageFile = {
      images: vivaImages,
    };

    const vivaVideoFile = {
      videos: vivaVideos,
    };

    // Save the updated data to the databas)

    let fileDetails;

    vivaImages.forEach((item) => {
      alreadyExisted.vivaPhoto.images.push(item);
    });

    vivaVideos.forEach((item) => {
      alreadyExisted.vivaVideo.videos.push(item);
    });

    fileDetails = await alreadyExisted.save();

    if (fileDetails) {
      if (req.files.vivaPhoto) {
        verificationEntry = await qaVerificationModel.findOneAndUpdate(
          {
            _id: QAverificationTimeStampId,
            vivaPhotoTime: { $eq: "" },
          },
          {
            $set: {
              vivaPhotoTime: currentTime,
            },
          },
          {
            new: true,
          }
        );
      }

      if (req.files.vivaVideo) {
        verificationEntry = await qaVerificationModel.findOneAndUpdate(
          {
            _id: QAverificationTimeStampId,
            vivaVideoTime: { $eq: "" }, //{ $exists: false } // Check if groupPhotoTime is not present
          },
          {
            $set: {
              vivaVideoTime: currentTime,
            },
          },
          {
            new: true,
          }
        );
      }

      changeVerificationFileStatus = await qaVerificationModel.findOneAndUpdate(
        { _id: QAverificationTimeStampId },
        { $set: { isFileUploaded: true } },
        { new: true }
      );
      await updateFileUploadStatus(QAverificationTimeStampId);

      return sendResponse(res, 200, "Files uploaded successfully", fileDetails);
    } else {
      return errorResponse(
        res,
        400,
        "Files not saved",
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, error, error.message);
  }
};

module.exports.getVivaFile = async (req, res) => {
  try {
    const QAverificationTimeStampId = req.params.id;
    const qaVivaData = await qafileModel
      .find({ QAverificationTimeStampId: QAverificationTimeStampId })
      .populate({ path: "batchId", select: "batchId" });

    if (!qaVivaData || qaVivaData.length === 0) {
      //return errorResponse(res, 404, "No data found", "No data found");
      return sendResponse(res, 200, "getting data", []);
    }

    const vivaPhotos = qaVivaData.flatMap((data) => data.vivaPhoto.images);
    const vivaVideos = qaVivaData.flatMap((data) => data.vivaVideo.videos);

    if (!vivaPhotos.length && !vivaVideos.length) {
      return sendResponse(res, 200, "Viva files retrieved successfully", []);
    }

    const data1 = qaVivaData[0];
    const vivaPhotoFilesWithUrls = await getQAFileUrl(data1, vivaPhotos);

    const data2 = qaVivaData[0];
    const vivaVideoFilesWithUrls = await getQAFileUrl(data2, vivaVideos);

    const results = {
      vivaPhotoUrls: vivaPhotoFilesWithUrls,
      vivaVideoUrls: vivaVideoFilesWithUrls,
    };

    return sendResponse(res, 200, "Viva files retrieved successfully", results);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.deleteVivaFileByKey = async (req, res) => {
  try {
    const batchId = req.params.id;
    const keyToDelete = req.body.keyToDelete;
    const qaVerificationTimeStampId = req.body.QAverificationTimeStampId;
    let updateObject = {};
    const qaVivaData = await qafileModel.find({
      QAverificationTimeStampId: qaVerificationTimeStampId,
    });
    // const qaVivaData = await qafileModel.find({ batchId: batchId });

    if (!qaVivaData || qaVivaData.length === 0) {
      return errorResponse(res, 404, "No data found", "No data found");
    }

    const vivaPhotos = qaVivaData.flatMap((data) => data.vivaPhoto.images);
    const vivaVideos = qaVivaData.flatMap((data) => data.vivaVideo.videos);

    if (!vivaPhotos && !vivaVideos) {
      return errorResponse(res, 404, "Files not found", "Files not found");
    }

    const vivaPhotoFileKeys = vivaPhotos
      ? vivaPhotos.map((photo) => photo.imgKey)
      : [];
    const vivaVideoFileKeys = vivaVideos
      ? vivaVideos.map((video) => video.videoKey)
      : [];

    // Check if the key exists in either theoryPhoto or theoryVideo
    const keyExistsInVivaPhoto = vivaPhotoFileKeys.includes(keyToDelete);
    const keyExistsInVivaVideo = vivaVideoFileKeys.includes(keyToDelete);

    if (!keyExistsInVivaPhoto && !keyExistsInVivaVideo) {
      return errorResponse(res, 404, "Files not exists ", "Files not exists ");
    }

    //set verification sheet field empty when respective file delete

    if (keyExistsInVivaPhoto) {
      // Set theoryPhotoTime to empty string
      updateObject.vivaPhotoTime = "";
    }

    if (keyExistsInVivaVideo) {
      // Set theoryVideoTime to empty string
      updateObject.vivaVideoTime = "";
    }

    // Delete the key from the database
    const result = await qafileModel.updateMany(
      { batchId: batchId },
      {
        $pull: {
          "vivaPhoto.images": { imgKey: keyToDelete },
          "vivaVideo.videos": { videoKey: keyToDelete },
        },
      }
    );

    //update time with empty if respective file delete
    if (
      result &&
      (vivaPhotoFileKeys.length === 1 || vivaVideoFileKeys.length === 1)
    ) {
      const result2 = await qaVerificationModel.updateOne(
        { _id: qaVerificationTimeStampId },
        updateObject
      );
    }

    return sendResponse(res, 200, "File deleted successfully", result);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//upload multiple images on single key
module.exports.uploadVerificationAadharFile = async (req, res) => {
  try {
    const { QAverificationTimeStampId } = req.body;

    if (!QAverificationTimeStampId) {
      return errorResponse(
        res,
        400,
        "Something missing in payload",
        "Something missing in payload"
      );
    }

    if (!req.files || !req.files.aadharPhoto) {
      return errorResponse(
        res,
        401,
        responseMessage.file_not_received,
        responseMessage.file_not_received
      );
    }

    const alreadyExisted = await qafileModel.findOne({
      $and: [{ QAverificationTimeStampId: QAverificationTimeStampId }],
    });

    if (!alreadyExisted)
      return errorResponse(
        res,
        400,
        "no verfication entry found",
        "no verfication entry found"
      );

    const currentDate = new Date();
    let hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // Convert hours to 12-hour format

    const formattedHours = hours < 10 ? `0${hours}` : hours;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    let currentTime = `${formattedHours}:${formattedMinutes} ${ampm}`;

    // Check and handle Aadhar photo files
    let uploadedAadharImages = [];
    if (req.files.aadharPhoto) {
      const aadharImageIdentifiers = req.files.aadharPhoto.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedAadharImages = await Promise.all(
        req.files.aadharPhoto.map(async (file, index) => {
          const imageIdentifier = aadharImageIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            //Key: `${imageIdentifier}`,
            Key: `${QAverificationTimeStampId}/${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            imgKey: imageIdentifier.toString(),
            imgFlag: true,
            imgName: file.originalname,
          };
        })
      );
    }

    // Create an array of group image objects based on the uploaded images
    const aadharImages = uploadedAadharImages.map((image) => ({
      imgKey: image.imgKey,
      imgFlag: image.imgFlag,
      imgName: image.imgName,
      adminUploaded: true,
      status: "accepted",
    }));

    // Create the 'groupPhoto' objects for the schema
    const aadharFile = {
      images: aadharImages,
    };

    // Save the updated data to the database
    let fileDetails;
    aadharImages.forEach((item) => {
      alreadyExisted.aadharPhoto.images.push(item);
    });

    fileDetails = await alreadyExisted.save();

    if (fileDetails) {
      if (req.files.aadharPhoto) {
        verificationEntry = await qaVerificationModel.findOneAndUpdate(
          {
            _id: QAverificationTimeStampId,
            aadharHolding: { $eq: "" }, //{ $exists: false } // Check if groupPhotoTime is not present
          },
          {
            $set: {
              aadharHolding: currentTime,
            },
          },
          {
            new: true,
          }
        );
      }
      changeVerificationFileStatus = await qaVerificationModel.findOneAndUpdate(
        { _id: QAverificationTimeStampId },
        { $set: { isFileUploaded: true } },
        { new: true }
      );
      await updateFileUploadStatus(QAverificationTimeStampId);

      return sendResponse(res, 200, "Files uploaded successfully", fileDetails);
    } else {
      return errorResponse(
        res,
        400,
        "Files not saved",
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, error, error.message);
  }
};

module.exports.getAadharFile = async (req, res) => {
  try {
    const QAverificationTimeStampId = req.params.id;
    const qaTheoryData = await qafileModel
      .find({ QAverificationTimeStampId: QAverificationTimeStampId })
      .populate({ path: "batchId", select: "batchId" });

    if (!qaTheoryData || qaTheoryData.length === 0) {
      return errorResponse(res, 200, "No data found", []);
    }

    const allAadharPhotos = [];

    // Iterate over each document in qaDetails
    for (const data of qaTheoryData) {
      const aadharPhotos = data.aadharPhoto;

      // Check if aadharPhotos exists and has images
      if (
        aadharPhotos &&
        Array.isArray(aadharPhotos.images) &&
        aadharPhotos.images.length > 0
      ) {
        // const fileKeys = aadharPhotos.images.map((photo) => photo.imgKey);
        const dataWithUrls = await getQAFileUrl(data, aadharPhotos.images);

        if (dataWithUrls && dataWithUrls.length > 0) {
          // Filter out files with null URLs (i.e., not uploaded)
          const uploadedFiles = dataWithUrls.filter(
            (file) => file.url !== null
          );

          if (uploadedFiles.length > 0) {
            // Add the files to the result array
            allAadharPhotos.push(...uploadedFiles);
          }
        }
      }
    }

    if (allAadharPhotos.length > 0) {
      return sendResponse(res, 200, "Aadhar photos available", allAadharPhotos);
    } else {
      return errorResponse(
        res,
        200,
        "No Aadhar photos with valid URLs found",
        []
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.deleteAadharFileByKey = async (req, res) => {
  try {
    const batchId = req.params.id;
    const keyToDelete = req.body.keyToDelete; // Assuming the key comes from the request body
    // const qaAadharData = await qafileModel.find({ batchId: batchId });
    const qaVerificationTimeStampId = req.body.QAverificationTimeStampId;
    let updateObject = {};
    const qaAadharData = await qafileModel.find({
      QAverificationTimeStampId: qaVerificationTimeStampId,
    });

    if (!qaAadharData || qaAadharData.length === 0) {
      return errorResponse(res, 404, "No data found", "No data found");
    }

    // Initialize an array to collect results
    const results = [];

    // Iterate over each document in qaAadharData
    for (const data of qaAadharData) {
      const aadharPhotos = data.aadharPhoto?.images || [];

      // Check if aadharPhoto exists
      if (!data.aadharPhoto || !aadharPhotos || aadharPhotos.length === 0) {
        continue; // Move to the next document if aadharPhoto is missing or empty
      }

      // Check if the keyToDelete exists in the document
      const keyExists = aadharPhotos.some(
        (photo) => photo.imgKey === keyToDelete
      );

      if (keyExists) {
        // Set theoryPhotoTime to empty string
        updateObject.aadharHolding = "";
      }
      if (!keyExists) {
        continue; // Move to the next document if the keyToDelete is not found
      }

      // Delete the specified key from S3
      await deleteImageFromS3(keyToDelete);

      // Delete the key from the database
      const result = await qafileModel.updateOne(
        { _id: data._id },
        {
          $pull: {
            "aadharPhoto.images": { imgKey: keyToDelete },
          },
        }
      );

      // Collect the result for each document
      results.push(result);
      if (results && aadharPhotos.length === 1) {
        const result2 = await qaVerificationModel.updateOne(
          { _id: qaVerificationTimeStampId },
          updateObject
        );
      }
    }

    // If no documents have aadharPhoto with the specified key
    if (results.length === 0) {
      return errorResponse(
        res,
        404,
        `Key ${keyToDelete} not found in Aadhar photos`,
        `Key ${keyToDelete} not found in Aadhar photos`
      );
    }

    // Return the response with collected results
    return sendResponse(res, 200, "Files deleted successfully", results);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//for uploading multiple images in siungle key
module.exports.uploadAnnexureFile = async (req, res) => {
  try {
    const { QAverificationTimeStampId } = req.body;

    if (!QAverificationTimeStampId) {
      return errorResponse(
        res,
        400,
        "Something missing in payload",
        "Something missing in payload"
      );
    }

    if (!req.files || (!req.files.annexureN && !req.files.annexureM)) {
      return errorResponse(
        res,
        401,
        responseMessage.file_not_received,
        responseMessage.file_not_received
      );
    }

    const alreadyExisted = await qafileModel.findOne({
      $and: [{ QAverificationTimeStampId: QAverificationTimeStampId }],
    });

    if (!alreadyExisted)
      return errorResponse(
        res,
        400,
        "no verfication entry found",
        "no verfication entry found"
      );

    const currentDate = new Date();
    let hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // Convert hours to 12-hour format

    const formattedHours = hours < 10 ? `0${hours}` : hours;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    let currentTime = `${formattedHours}:${formattedMinutes} ${ampm}`;

    // Check and handle checkInPhoto files
    let uploadedAnnexureNImages = [];
    if (req.files.annexureN) {
      const annexureNIdentifiers = req.files.annexureN.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedAnnexureNImages = await Promise.all(
        req.files.annexureN.map(async (file, index) => {
          const imageIdentifier = annexureNIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            //Key: `${imageIdentifier}`,
            Key: `${QAverificationTimeStampId}/${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            imgKey: imageIdentifier.toString(),
            imgFlag: true,
            imgName: file.originalname,
          };
        })
      );
    }

    // Check and handle checkOutPhoto files
    let uploadedAnnexureMImages = [];
    if (req.files.annexureM) {
      const annexureMImageIdentifiers = req.files.annexureM.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedAnnexureMImages = await Promise.all(
        req.files.annexureM.map(async (file, index) => {
          const imageIdentifier = annexureMImageIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            //Key: `${imageIdentifier}`,
            Key: `${QAverificationTimeStampId}/${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            imgKey: imageIdentifier.toString(),
            imgFlag: true,
            imgName: file.originalname,
          };
        })
      );
    }

    // Create an array of check-in image objects based on the uploaded images
    const annexureNImages = uploadedAnnexureNImages.map((image) => ({
      imgKey: image.imgKey,
      imgFlag: image.imgFlag,
      imgName: image.imgName,
      adminUploaded: true,
      status: "accepted",
    }));

    // Create an array of check-out image objects based on the uploaded images
    const annexureMImages = uploadedAnnexureMImages.map((image) => ({
      imgKey: image.imgKey,
      imgFlag: image.imgFlag,
      imgName: image.imgName,
      adminUploaded: true,
      status: "accepted",
    }));

    // Create the 'checkInPhoto' and 'checkOutPhoto' objects for the schema
    const annexureNFile = {
      images: annexureNImages,
    };

    const annexureMFile = {
      images: annexureMImages,
    };

    let fileDetails;

    annexureNImages.forEach((item) => {
      alreadyExisted.annexureNPhoto.images.push(item);
    });

    annexureMImages.forEach((item) => {
      alreadyExisted.annexureMPhoto.images.push(item);
    });

    fileDetails = await alreadyExisted.save();

    if (fileDetails) {
      if (req.files.annexureN) {
        verificationEntry = await qaVerificationModel.findOneAndUpdate(
          {
            _id: QAverificationTimeStampId,
            annexureN: { $eq: "" },
          },
          {
            $set: {
              annexureN: currentTime,
            },
          },
          {
            new: true,
          }
        );
      }

      if (req.files.annexureM) {
        verificationEntry = await qaVerificationModel.findOneAndUpdate(
          {
            _id: QAverificationTimeStampId,
            annexureM: { $eq: "" },
          },
          {
            $set: {
              annexureM: currentTime,
            },
          },
          {
            new: true,
          }
        );
      }
      changeVerificationFileStatus = await qaVerificationModel.findOneAndUpdate(
        { _id: QAverificationTimeStampId },
        { $set: { isFileUploaded: true } },
        { new: true }
      );
      await updateFileUploadStatus(QAverificationTimeStampId);

      return sendResponse(res, 200, "Files uploaded successfully", fileDetails);
    } else {
      return errorResponse(
        res,
        400,
        "Files not saved",
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, error, error.message);
  }
};

module.exports.getAnnexureFile = async (req, res) => {
  try {
    const QAverificationTimeStampId = req.params.id;
    const qaAnnexureData = await qafileModel
      .find({ QAverificationTimeStampId: QAverificationTimeStampId })
      .populate({ path: "batchId", select: "batchId" });

    if (!qaAnnexureData || qaAnnexureData.length === 0) {
      //return errorResponse(res, 404, "No data found", "No data found");
      return sendResponse(res, 200, "getting data", []);
    }

    const annexureNPhotos = qaAnnexureData.flatMap(
      (data) => data.annexureNPhoto.images
    );
    const annexureMPhotos = qaAnnexureData.flatMap(
      (data) => data.annexureMPhoto.images
    );

    if (
      (!annexureNPhotos || annexureNPhotos.length === 0) &&
      (!annexureMPhotos || annexureMPhotos.length === 0)
    ) {
      return sendResponse(res, 200, "Files retrieved successfully", []);
    }

    // const annexureNFileKeys = annexureNPhotos.map((photo) => photo.imgKey);
    // const annexureMFileKeys = annexureMPhotos.map((photo) => photo.imgKey);

    // Use a function to get URLs based on file keys
    const getFilesWithUrls = async (data, fileKeys) => {
      if (!fileKeys || fileKeys.length === 0) {
        return [];
      }

      // Implement getQAFileUrl based on your requirements
      return await getQAFileUrl(data, fileKeys);
    };

    const annexureNFilesWithUrls = await getFilesWithUrls(
      qaAnnexureData[0],
      annexureNPhotos
    );
    const annexureMFilesWithUrls = await getFilesWithUrls(
      qaAnnexureData[0],
      annexureMPhotos
    );

    const results = {
      annexureNUrls: annexureNFilesWithUrls,
      annexureMUrls: annexureMFilesWithUrls,
    };

    return sendResponse(res, 200, "Files retrieved successfully", results);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.deleteAnnexureFileByKey = async (req, res) => {
  try {
    const batchId = req.params.id;
    const keyToDelete = req.body.keyToDelete;
    const qaVerificationTimeStampId = req.body.QAverificationTimeStampId;
    let updateObject = {};
    const qaAnnexureData = await qafileModel.find({
      QAverificationTimeStampId: qaVerificationTimeStampId,
    });

    //const qaAnnexureData = await qafileModel.find({ batchId: batchId });

    if (!qaAnnexureData || qaAnnexureData.length === 0) {
      return errorResponse(res, 404, "No data found", "No data found");
    }

    // Iterate over each document in qaCheckData
    for (const data of qaAnnexureData) {
      const annexureNPhotos = data.annexureNPhoto?.images || [];
      const annexureMPhotos = data.annexureMPhoto?.images || [];

      const annexureNFileKeys = annexureNPhotos.map((photo) => photo.imgKey);
      const annexureMFileKeys = annexureMPhotos.map((photo) => photo.imgKey);

      // Check if the key exists in either checkInPhoto or checkOutPhoto
      const keyExistsInAnnexuresN = annexureNFileKeys.includes(keyToDelete);
      const keyExistsInAnnexureM = annexureMFileKeys.includes(keyToDelete);

      //set verification sheet field empty when respective file delete
      if (keyExistsInAnnexuresN) {
        // Set theoryPhotoTime to empty string
        updateObject.annexureN = "";
      }

      if (keyExistsInAnnexureM) {
        // Set theoryVideoTime to empty string
        updateObject.annexureM = "";
      }

      if (keyExistsInAnnexuresN || keyExistsInAnnexureM) {
        // Delete the key from the database
        const result = await qafileModel.updateMany(
          { batchId: batchId },
          {
            $pull: {
              "annexureNPhoto.images": { imgKey: keyToDelete },
              "annexureMPhoto.images": { imgKey: keyToDelete },
            },
          }
        );

        if (
          result &&
          (annexureNFileKeys.length === 1 || annexureMFileKeys.length === 1)
        ) {
          const result2 = await qaVerificationModel.updateOne(
            { _id: qaVerificationTimeStampId },
            updateObject
          );
        }
        // Delete the image from S3
        await deleteImageFromS3(keyToDelete);

        return sendResponse(res, 200, "File deleted successfully", result);
      }
    }

    // If the key is not found in any document
    return errorResponse(res, 404, "Files not found", "Files not found");
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.uploadVerificationAttendenceFile = async (req, res) => {
  try {
    // Find the JobRole document by _id
    const { QAverificationTimeStampId } = req.body;

    if (!QAverificationTimeStampId) {
      return errorResponse(
        res,
        400,
        "Something missing in payload",
        "Something missing in payload"
      );
    }

    if (!req.files || !req.files.attendenceSheet) {
      return errorResponse(
        res,
        401,
        responseMessage.file_not_received,
        responseMessage.file_not_received
      );
    }

    const alreadyExisted = await qafileModel.findOne({
      $and: [{ QAverificationTimeStampId: QAverificationTimeStampId }],
    });

    if (!alreadyExisted)
      return errorResponse(
        res,
        400,
        "no verfication entry found",
        "no verfication entry found"
      );

    const currentDate = new Date();
    let hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // Convert hours to 12-hour format

    const formattedHours = hours < 10 ? `0${hours}` : hours;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    let currentTime = `${formattedHours}:${formattedMinutes} ${ampm}`;
    // Check and handle Attendence sheet files
    let uploadedAttendanceFile = [];
    if (req.files.attendenceSheet) {
      const attendanceIdentifiers = req.files.attendenceSheet.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedAttendanceFile = await Promise.all(
        req.files.attendenceSheet.map(async (file, index) => {
          const imageIdentifier = attendanceIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            // Key: `${imageIdentifier}`,
            Key: `${QAverificationTimeStampId}/${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            imgKey: imageIdentifier.toString(),
            imgFlag: true,
            imgName: file.originalname,
          };
        })
      );
    }

    // Create an array of attendance sheet objects based on the uploaded files
    const attendanceSheet = uploadedAttendanceFile.map((file) => ({
      imgKey: file.imgKey,
      imgFlag: file.imgFlag,
      imgName: file.imgName,
      adminUploaded: true,
      status: "accepted",
    }));

    // Create the 'attendenceSheet' object for the schema
    const attendenceFile = {
      images: attendanceSheet,
    };

    // Save the updated data to the database
    let fileDetails;
    attendanceSheet.forEach((item) => {
      alreadyExisted.attendenceSheet.images.push(item);
    });

    fileDetails = await alreadyExisted.save();

    if (fileDetails) {
      if (req.files.attendenceSheet) {
        verificationEntry = await qaVerificationModel.findOneAndUpdate(
          { _id: QAverificationTimeStampId },
          { $set: { attendanceSheet: currentTime } },
          { new: true }
        );
        // verificationEntry = await qaVerificationModel.findOneAndUpdate(
        //   {
        //     _id: QAverificationTimeStampId,
        //     attendanceSheet: { $eq: '' }
        //   },
        //   {
        //     $set: {
        //       attendanceSheet: currentTime
        //     }
        //   },
        //   {
        //     new: true
        //   }
        // );
      }

      changeVerificationFileStatus = await qaVerificationModel.findOneAndUpdate(
        { _id: QAverificationTimeStampId },
        { $set: { isFileUploaded: true } },
        { new: true }
      );
      await updateFileUploadStatus(QAverificationTimeStampId);

      return sendResponse(res, 200, "Files uploaded successfully", fileDetails);
    } else {
      return errorResponse(
        res,
        400,
        "Files not saved",
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, error, error.message);
  }
};

//get multiple images on single key
module.exports.getAttendenceFile = async (req, res) => {
  try {
    const QAverificationTimeStampId = req.params.id;
    const qaAttendenceData = await qafileModel
      .find({ QAverificationTimeStampId: QAverificationTimeStampId })
      .populate({ path: "batchId", select: "batchId" });

    if (!qaAttendenceData || qaAttendenceData.length === 0) {
      //return errorResponse(res, 404, "No data found", "No data found");
      return sendResponse(res, 200, "getting data", []);
    }

    const attendenceSheet = qaAttendenceData.flatMap(
      (data) => data.attendenceSheet.images
    );

    if (
      !attendenceSheet ||
      !Array.isArray(attendenceSheet) ||
      attendenceSheet.length === 0
    ) {
      return sendResponse(
        res,
        200,
        "Attendence Sheet retrieved successfully",
        []
      );
    }

    const data = qaAttendenceData[0];
    const attendenceFilesWithUrls = await getQAFileUrl(data, attendenceSheet);

    const results = {
      attendenceUrls: attendenceFilesWithUrls,
    };

    return sendResponse(
      res,
      200,
      "Attendence Sheet retrieved successfully",
      results
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.getUploadededFilesCount = async (req, res) => {
  try {
    let { ids } = req.query;
    ids = JSON.parse(ids);

    if (!ids || !Array.isArray(ids) || !ids?.length) {
      return errorResponse(
        res,
        400,
        "Please provide batches id",
        "Please provide batches id"
      );
    }
    const objectIds = ids.map((id) => mongoose.Types.ObjectId(id));
    const countResult = {};
    const fileFields = [
      ["checkInPhoto", "checkOutPhoto"],
      ["examcenterPhoto", "examcenterVideo"],
      "groupPhoto",
      ["theoryPhoto", "theoryVideo"],
      ["practicalPhoto", "practicalVideo"],
      ["vivaPhoto", "vivaVideo"],
      "aadharPhoto",
      ["annexureNPhoto", "annexureMPhoto"],
      "tpPhoto",
      "attendenceSheet",
      "toolPhoto",
    ];

    const qafiles = await qafileModel
      .find({ batchId: { $in: objectIds } })
      .lean();

    if (!qafiles) {
      return res.status(404).json({ message: "Record not found" });
    }
    for (const qafile of qafiles) {
      let uploadedCount = 0;
      for (const field of fileFields) {
        if (Array.isArray(field)) {
          // If the field is a pair of fields, check both for uploaded files
          for (const subField of field) {
            if (
              qafile[subField]?.images?.length ||
              qafile[subField]?.videos?.length
            ) {
              uploadedCount += 1;
              break;
            }
          }
        } else {
          if (qafile[field]?.images?.length || qafile[field]?.videos?.length) {
            uploadedCount += 1;
          }
        }
      }
      countResult[qafile.batchId] = uploadedCount;
    }
    const totalFields = fileFields.length;

    // Send the response in the "X/11" format
    sendResponse(res, 200, "Successfully getting counts", {
      countResult,
      totalFields,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

// module.exports.deleteAttendenceFileByKey = async (req, res) => {
//   try {
//     const batchId = req.params.id;
//     const keyToDelete = req.body.keyToDelete;

//     const qaAttendenceData = await qafileModel.find({ batchId: batchId });
//     if (!qaAttendenceData || qaAttendenceData.length === 0) {
//       return errorResponse(res, 404, "No data found", "No data found");
//     }

//     // Initialize arrays to store photo keys and files with URLs
//     const attendenceFileKeys = [];
//     const attendenceFilesWithUrls = [];

//     // Iterate over each document in qaAttendenceData
//     for (const data of qaAttendenceData) {
//       const attendenceSheet = data.attendenceSheet?.images || [];

//       // Check if attendenceSheet exists
//       if (
//         !data.attendenceSheet ||
//         !attendenceSheet ||
//         attendenceSheet.length === 0
//       ) {
//         continue; // Move to the next document if attendenceSheet is missing or empty
//       }

//       // Push keys to array
//       attendenceFileKeys.push(...attendenceSheet.map((photo) => photo.imgKey));

//       // Get files with URLs for each photo type
//       const attendenceSheetFiles = await getQAFileUrl(data, attendenceFileKeys);

//       // Push files with URLs to array
//       attendenceFilesWithUrls.push(...attendenceSheetFiles);
//     }

//     // Check if the key exists in attendenceSheet
//     const keyExistsInAttendenceSheet = attendenceFileKeys.includes(keyToDelete);

//     if (!keyExistsInAttendenceSheet) {
//       return errorResponse(res, 404, "Files not found", "Files not found");
//     }

//     // Delete the key from the database
//     const result = await qafileModel.updateMany(
//       { batchId: batchId },
//       {
//         $pull: {
//           "attendenceSheet.images": { imgKey: keyToDelete },
//         },
//       }
//     );

//     // Delete the image from S3
//     await deleteImageFromS3(keyToDelete);

//     return sendResponse(res, 200, "Files deleted successfully", result);
//   } catch (error) {
//     return errorResponse(res, 500, responseMessage.errorMessage, error.message);
//   }
// };

module.exports.deleteAttendenceFileByKey = async (req, res) => {
  try {
    const batchId = req.params.id;
    const keyToDelete = req.body.keyToDelete;
    const qaVerificationTimeStampId = req.body.QAverificationTimeStampId;
    let updateObject = {};
    const qaAttendenceData = await qafileModel.find({
      QAverificationTimeStampId: qaVerificationTimeStampId,
    });

    // const qaAttendenceData = await qafileModel.find({ batchId: batchId });
    if (!qaAttendenceData || qaAttendenceData.length === 0) {
      return errorResponse(res, 404, "No data found", "No data found");
    }

    // Initialize arrays to store photo keys and files with URLs
    const results = [];
    //const attendenceFilesWithUrls = [];

    // Iterate over each document in qaAttendenceData
    for (const data of qaAttendenceData) {
      const attendenceSheet = data.attendenceSheet?.images || [];

      // Check if attendenceSheet exists
      if (
        !data.attendenceSheet ||
        !attendenceSheet ||
        attendenceSheet.length === 0
      ) {
        continue; // Move to the next document if attendenceSheet is missing or empty
      }

      const attendenceFileKeys = attendenceSheet.map((photo) => photo.imgKey);

      const keyExistsInAttendenceSheet =
        attendenceFileKeys.includes(keyToDelete);

      // If the key is not found in any document
      if (!keyExistsInAttendenceSheet) {
        return errorResponse(res, 404, "Key not found ", "Key not found ");
      }

      if (keyExistsInAttendenceSheet) {
        updateObject.attendanceSheet = "";
        // Delete the key from the database
        const result = await qafileModel.updateMany(
          { QAverificationTimeStampId: qaVerificationTimeStampId },
          {
            $pull: {
              "attendenceSheet.images": { imgKey: keyToDelete },
            },
          }
        );

        // Delete the image from S3
        await deleteImageFromS3(keyToDelete);

        // Collect the result for each document
        results.push(result);

        if (results && attendenceFileKeys.length === 1) {
          const result2 = await qaVerificationModel.updateOne(
            { _id: qaVerificationTimeStampId },
            updateObject
          );

          //console.log("result2===>",result2)
        }
      }
    }

    return sendResponse(res, 200, "Files deleted successfully", results);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.uploadVerificationToolsFile = async (req, res) => {
  try {
    // Find the JobRole document by _id
    const { QAverificationTimeStampId } = req.body;

    if (!QAverificationTimeStampId) {
      return errorResponse(
        res,
        400,
        "Something missing in payload",
        "Something missing in payload"
      );
    }

    if (!req.files || !req.files.toolPhoto) {
      return errorResponse(
        res,
        401,
        responseMessage.file_not_received,
        responseMessage.file_not_received
      );
    }

    const alreadyExisted = await qafileModel.findOne({
      $and: [{ QAverificationTimeStampId: QAverificationTimeStampId }],
    });

    if (!alreadyExisted)
      return errorResponse(
        res,
        400,
        "no verfication entry found",
        "no verfication entry found"
      );

    const currentDate = new Date();
    let hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // Convert hours to 12-hour format

    const formattedHours = hours < 10 ? `0${hours}` : hours;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    let currentTime = `${formattedHours}:${formattedMinutes} ${ampm}`;
    // Check and handle tool photo files
    let uploadedToolImages = [];
    if (req.files.toolPhoto) {
      const toolImageIdentifiers = req.files.toolPhoto.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedToolImages = await Promise.all(
        req.files.toolPhoto.map(async (file, index) => {
          const imageIdentifier = toolImageIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            // Key: `${imageIdentifier}`,
            Key: `${QAverificationTimeStampId}/${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            imgKey: imageIdentifier.toString(),
            imgFlag: true,
            imgName: file.originalname,
          };
        })
      );
    }

    // Create an array of tool image objects based on the uploaded images
    const toolImages = uploadedToolImages.map((image) => ({
      imgKey: image.imgKey,
      imgFlag: image.imgFlag,
      imgName: image.imgName,
      adminUploaded: true,
      status: "accepted",
    }));

    // Create the 'toolPhoto' objects for the schema
    const toolFile = {
      images: toolImages,
    };

    // Save the updated data to the database
    let fileDetails;
    toolImages.forEach((item) => {
      alreadyExisted.toolPhoto.images.push(item);
    });

    fileDetails = await alreadyExisted.save();

    if (fileDetails) {
      if (req.files.toolPhoto) {
        verificationEntry = await qaVerificationModel.findOneAndUpdate(
          {
            _id: QAverificationTimeStampId,
            toolPhotoTime: { $eq: "" },
          },
          {
            $set: {
              toolPhotoTime: currentTime,
            },
          },
          {
            new: true,
          }
        );
      }

      changeVerificationFileStatus = await qaVerificationModel.findOneAndUpdate(
        { _id: QAverificationTimeStampId },
        { $set: { isFileUploaded: true } },
        { new: true }
      );
      await updateFileUploadStatus(QAverificationTimeStampId);

      return sendResponse(res, 200, "Files uploaded successfully", fileDetails);
    } else {
      return errorResponse(
        res,
        400,
        "Files not saved",
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, error, error.message);
  }
};

module.exports.getToolFile = async (req, res) => {
  try {
    const QAverificationTimeStampId = req.params.id;
    const qaToolData = await qafileModel
      .find({ QAverificationTimeStampId: QAverificationTimeStampId })
      .populate({ path: "batchId", select: "batchId" });

    if (!qaToolData || qaToolData.length === 0) {
      //return errorResponse(res, 404, "No data found", "No data found");
      return sendResponse(res, 200, "getting data", []);
    }

    const toolsPhoto = qaToolData.flatMap((data) => data.toolPhoto.images);

    if (!toolsPhoto || !Array.isArray(toolsPhoto) || toolsPhoto.length === 0) {
      return sendResponse(res, 200, "Tools photo get successfully", []);
    }

    // const toolKeys = toolsPhoto.map((photo) => photo.imgKey);

    const data = qaToolData[0];
    const toolFilesWithUrls = await getQAFileUrl(data, toolsPhoto);

    const results = {
      toolUrls: toolFilesWithUrls,
    };

    return sendResponse(res, 200, "Tools photo get successfully", results);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.uploadVerificationExamcenterFile = async (req, res) => {
  try {
    const { QAverificationTimeStampId } = req.body;

    if (!QAverificationTimeStampId) {
      return errorResponse(
        res,
        400,
        "Something missing in payload",
        "Something missing in payload"
      );
    }

    if (
      !req.files ||
      (!req.files.examcenterPhoto && !req.files.examcenterVideo)
    ) {
      return errorResponse(
        res,
        401,
        responseMessage.file_not_received,
        responseMessage.file_not_received
      );
    }

    const alreadyExisted = await qafileModel.findOne({
      $and: [{ QAverificationTimeStampId: QAverificationTimeStampId }],
    });

    if (!alreadyExisted)
      return errorResponse(
        res,
        400,
        "no verfication entry found",
        "no verfication entry found"
      );

    // Check and handle exam center photo and videos files
    let uploadedExamCenterImages = [];
    if (req.files.examcenterPhoto) {
      const examCenterImageIdentifiers = req.files.examcenterPhoto.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedExamCenterImages = await Promise.all(
        req.files.examcenterPhoto.map(async (file, index) => {
          const imageIdentifier = examCenterImageIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            //Key: `${imageIdentifier}`,
            Key: `${QAverificationTimeStampId}/${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            imgKey: imageIdentifier.toString(),
            imgFlag: true,
            imgName: file.originalname,
          };
        })
      );
    }

    let uploadedExamCenterVideos = [];
    if (req.files.examcenterVideo) {
      const examCenterVideoIdentifiers = req.files.examcenterVideo.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedExamCenterVideos = await Promise.all(
        req.files.examcenterVideo.map(async (file, index) => {
          const imageIdentifier = examCenterVideoIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            // Key: `${imageIdentifier}`,
            Key: `${QAverificationTimeStampId}/${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            videoKey: imageIdentifier.toString(),
            videoFlag: true,
            videoName: file.originalname,
          };
        })
      );
    }

    const examCenterImages = uploadedExamCenterImages.map((image) => ({
      imgKey: image.imgKey,
      imgFlag: image.imgFlag,
      imgName: image.imgName,
      adminUploaded: true,
      status: "accepted",
    }));

    // Create an array of check-out image objects based on the uploaded images
    const examCenterVideos = uploadedExamCenterVideos.map((image) => ({
      videoKey: image.videoKey,
      videoFlag: image.videoFlag,
      videoName: image.videoName,
      adminUploaded: true,
      status: "accepted",
    }));

    const examCenterImageFile = {
      images: examCenterImages,
    };

    const examCenterVideoFile = {
      videos: examCenterVideos,
    };

    let fileDetails;
    examCenterImages.forEach((item) => {
      alreadyExisted.examcenterPhoto.images.push(item);
    });

    examCenterVideos.forEach((item) => {
      alreadyExisted.examcenterVideo.videos.push(item);
    });

    fileDetails = await alreadyExisted.save();

    if (fileDetails) {
      changeVerificationFileStatus = await qaVerificationModel.findOneAndUpdate(
        { _id: QAverificationTimeStampId },
        { $set: { isFileUploaded: true } },
        { new: true }
      );
      await updateFileUploadStatus(QAverificationTimeStampId);

      return sendResponse(res, 200, "Files uploaded successfully", fileDetails);
    } else {
      return errorResponse(
        res,
        400,
        "Files not saved",
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, error, error.message);
  }
};

module.exports.getExamcenterFile = async (req, res) => {
  try {
    const QAverificationTimeStampId = req.params.id;
    const qaExmcenterData = await qafileModel
      .find({ QAverificationTimeStampId: QAverificationTimeStampId })
      .populate({ path: "batchId", select: "batchId" });

    if (!qaExmcenterData && !qaExmcenterData.length) {
      return sendResponse(res, 200, "No data found", []);
    }

    const examcenterPhotos = qaExmcenterData.flatMap(
      (data) => data.examcenterPhoto.images
    );
    const examcenterVideos = qaExmcenterData.flatMap(
      (data) => data.examcenterVideo.videos
    );

    // Check for both theoryPhotos and theoryVideos being empty
    if (!examcenterPhotos.length && !examcenterVideos.length) {
      return sendResponse(
        res,
        200,
        "Exam center files retrieved successfully",
        []
      );
    }

    // const examcenterPhotoFileKeys = examcenterPhotos.map((photo) => photo.imgKey);
    // const examcenterVideoFileKeys = examcenterVideos.map((video) => video.videoKey);

    const examcenterPhotoFilesWithUrls = await getQAFileUrl(
      qaExmcenterData[0],
      examcenterPhotos
    );

    const examcenterVideoFilesWithUrls = await getQAFileUrl(
      qaExmcenterData[0],
      examcenterVideos
    );

    const results = {
      examcenterPhotoUrls: examcenterPhotoFilesWithUrls,
      examcenterVideoUrls: examcenterVideoFilesWithUrls,
    };

    return sendResponse(
      res,
      200,
      "Exam center files retrieved successfully",
      results
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.deleteExamcenterFileByKey = async (req, res) => {
  try {
    const batchId = req.params.id;
    const keyToDelete = req.body.keyToDelete;
    const qaVerificationTimeStampId = req.body.QAverificationTimeStampId;
    let updateObject = {};
    const qaExamcenterData = await qafileModel.find({
      QAverificationTimeStampId: qaVerificationTimeStampId,
    });
    // const qaExamcenterData = await qafileModel.find({ batchId: batchId });

    if (!qaExamcenterData || qaExamcenterData.length === 0) {
      return errorResponse(res, 404, "No data found", "No data found");
    }

    const examcenterPhotos = qaExamcenterData.flatMap(
      (data) => data.examcenterPhoto.images
    );
    const examcenterVideos = qaExamcenterData.flatMap(
      (data) => data.examcenterVideo.videos
    );

    if (!examcenterPhotos && !examcenterVideos) {
      return errorResponse(res, 404, "Files not found", "Files not found");
    }

    const examcenterPhotoFileKeys = examcenterPhotos
      ? examcenterPhotos.map((photo) => photo.imgKey)
      : [];
    const examcenterVideoFileKeys = examcenterVideos
      ? examcenterVideos.map((video) => video.videoKey)
      : [];

    // Check if the key exists in either examCenterPhoto or examCenterVideo
    const keyExistsInExamcenterPhoto =
      examcenterPhotoFileKeys.includes(keyToDelete);
    const keyExistsInExamcenterVideo =
      examcenterVideoFileKeys.includes(keyToDelete);

    if (!keyExistsInExamcenterPhoto && !keyExistsInExamcenterVideo) {
      return errorResponse(
        res,
        404,
        "Key not found in exam center photos or videos",
        "Key not found in exam center photos or videos"
      );
    }

    //set verification sheet field empty when respective file delete

    if (keyExistsInExamcenterPhoto) {
      // Set theoryPhotoTime to empty string
      updateObject.examCenterPhotoTime = "";
    }

    if (keyExistsInExamcenterVideo) {
      // Set theoryVideoTime to empty string
      updateObject.examCenterVideoTime = "";
    }

    // Delete the key from the database
    const result = await qafileModel.updateMany(
      { batchId: batchId },
      {
        $pull: {
          "examcenterPhoto.images": { imgKey: keyToDelete },
          "examcenterVideo.videos": { videoKey: keyToDelete },
        },
      }
    );

    //update time with empty if respective file delete
    if (
      result &&
      (examcenterPhotoFileKeys.length === 1 ||
        examcenterVideoFileKeys.length === 1)
    ) {
      const result2 = await qaVerificationModel.updateOne(
        { _id: qaVerificationTimeStampId },
        updateObject
      );
      console.log("Update result:", result2);
    }

    return sendResponse(res, 200, "Files deleted successfully", result);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//=====/tpDeclaration file=====/
module.exports.uploadVerificationTpFile = async (req, res) => {
  try {
    // Find the JobRole document by _id
    const { QAverificationTimeStampId } = req.body;

    if (!QAverificationTimeStampId) {
      return errorResponse(
        res,
        400,
        "Something missing in payload",
        "Something missing in payload"
      );
    }

    if (!req.files || (!req.files.tpPhoto && !req.files.tpPhoto)) {
      return errorResponse(
        res,
        401,
        responseMessage.file_not_received,
        responseMessage.file_not_received
      );
    }

    const alreadyExisted = await qafileModel.findOne({
      $and: [{ QAverificationTimeStampId: QAverificationTimeStampId }],
    });

    if (!alreadyExisted)
      return errorResponse(
        res,
        400,
        "no verfication entry found",
        "no verfication entry found"
      );

    const currentDate = new Date();
    let hours = currentDate.getHours();
    const minutes = currentDate.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12; // Convert hours to 12-hour format

    const formattedHours = hours < 10 ? `0${hours}` : hours;
    const formattedMinutes = minutes < 10 ? `0${minutes}` : minutes;

    let currentTime = `${formattedHours}:${formattedMinutes} ${ampm}`;

    let uploadedTpImages = [];
    if (req.files.tpPhoto) {
      const groupImageIdentifiers = req.files.tpPhoto.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedTpImages = await Promise.all(
        req.files.tpPhoto.map(async (file, index) => {
          const imageIdentifier = groupImageIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            // Key: `${imageIdentifier}`,
            Key: `${QAverificationTimeStampId}/${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            imgKey: imageIdentifier.toString(),
            imgFlag: true,
            imgName: file.originalname,
          };
        })
      );
    }

    // Create an array of group image objects based on the uploaded images
    const tpImages = uploadedTpImages.map((image) => ({
      imgKey: image.imgKey,
      imgFlag: image.imgFlag,
      imgName: image.imgName,
      adminUploaded: true,
      status: "accepted",
    }));

    // Create the 'groupPhoto' objects for the schema
    const tpFile = {
      images: tpImages,
    };

    // Save the updated data to the database
    let fileDetails;
    tpImages.forEach((item) => {
      alreadyExisted.tpPhoto.images.push(item);
    });

    fileDetails = await alreadyExisted.save();

    if (fileDetails) {
      if (req.files.tpPhoto) {
        verificationEntry = await qaVerificationModel.findOneAndUpdate(
          {
            _id: QAverificationTimeStampId,
            tpUndertaking: { $eq: "" },
          },
          {
            $set: {
              tpUndertaking: currentTime,
            },
          },
          {
            new: true,
          }
        );
      }
      changeVerificationFileStatus = await qaVerificationModel.findOneAndUpdate(
        { _id: QAverificationTimeStampId },
        { $set: { isFileUploaded: true } },
        { new: true }
      );
      await updateFileUploadStatus(QAverificationTimeStampId);

      return sendResponse(res, 200, "Files uploaded successfully", fileDetails);
    } else {
      return errorResponse(
        res,
        400,
        "Files not saved",
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, error, error.message);
  }
};

module.exports.getTpFile = async (req, res) => {
  try {
    const QAverificationTimeStampId = req.params.id;
    const tpData = await qafileModel
      .find({ QAverificationTimeStampId: QAverificationTimeStampId })
      .populate({ path: "batchId", select: "batchId" });

    if (!tpData || tpData.length === 0) {
      //return errorResponse(res, 404, "No data found", "No data found");
      return sendResponse(res, 200, "getting data", []);
    }

    const tpPhoto = tpData.flatMap((data) => data.tpPhoto.images);

    if (!tpPhoto || !Array.isArray(tpPhoto) || tpPhoto.length === 0) {
      return sendResponse(res, 200, "File get successfully", []);
    }

    // const tpKeys = tpPhoto.map((photo) => photo.imgKey);

    const data = tpData[0];
    const tpFilesWithUrls = await getQAFileUrl(data, tpPhoto);

    const results = {
      tpUrls: tpFilesWithUrls,
    };

    return sendResponse(res, 200, "File get successfully", results);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.deleteTpFileByKey = async (req, res) => {
  try {
    const batchId = req.params.id;
    const keyToDelete = req.body.keyToDelete;
    const qaVerificationTimeStampId = req.body.QAverificationTimeStampId;
    let updateObject = {};
    const tpData = await qafileModel.find({
      QAverificationTimeStampId: qaVerificationTimeStampId,
    });
    // const tpData = await qafileModel.find({ batchId: batchId });

    if (!tpData || tpData.length === 0) {
      return errorResponse(res, 404, "No data found", "No data found");
    }

    // Initialize an array to collect results
    const results = [];

    // Iterate over each document in qaToolData
    for (const data of tpData) {
      const tpPhotos = data.tpPhoto?.images || [];

      // Check if toolPhoto exists
      if (!data.tpPhoto || !tpPhotos || tpPhotos.length === 0) {
        continue; // Move to the next document if toolPhoto is missing or empty
      }

      const tpFileKeys = tpPhotos.map((photo) => photo.imgKey);

      // Check if the key exists in toolPhotos
      const keyExistsInTpPhotos = tpFileKeys.includes(keyToDelete);

      if (keyExistsInTpPhotos) {
        updateObject.tpUndertaking = "";
        // Delete the key from the database
        const result = await qafileModel.updateMany(
          { batchId: batchId },
          {
            $pull: {
              "tpPhoto.images": { imgKey: keyToDelete },
            },
          }
        );

        // Delete the image from S3
        await deleteImageFromS3(keyToDelete);

        // Collect the result for each document
        results.push(result);
        if (results && tpFileKeys.length === 1) {
          const result2 = await qaVerificationModel.updateOne(
            { _id: qaVerificationTimeStampId },
            updateObject
          );
        }
      }
    }

    // If the key is not found in any document
    if (results.length === 0) {
      return errorResponse(
        res,
        404,
        "Key not found in Tp photos",
        "Key not found in Tp photos"
      );
    }

    // Return the response with collected results
    return sendResponse(res, 200, "Files deleted successfully", results);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//=====/others file=====/

module.exports.uploadVerificationOtherFile = async (req, res) => {
  try {
    const { QAverificationTimeStampId } = req.body;

    if (!QAverificationTimeStampId) {
      return errorResponse(
        res,
        400,
        "Something missing in payload",
        "Something missing in payload"
      );
    }

    if (!req.files || !req.files.otherFile) {
      return errorResponse(
        res,
        401,
        responseMessage.file_not_received,
        responseMessage.file_not_received
      );
    }

    const alreadyExisted = await qafileModel.findOne({
      $and: [{ QAverificationTimeStampId: QAverificationTimeStampId }],
    });

    if (!alreadyExisted)
      return errorResponse(
        res,
        400,
        "no verfication entry found",
        "no verfication entry found"
      );

    // Check and handle other files
    let uploadedOtherFiles = [];
    if (req.files.otherFile) {
      const otherIdentifiers = req.files.otherFile.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedOtherFiles = await Promise.all(
        req.files.otherFile.map(async (file, index) => {
          const imageIdentifier = otherIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            // Key: `${imageIdentifier}`,
            Key: `${QAverificationTimeStampId}/${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            imgKey: imageIdentifier.toString(),
            imgFlag: true,
            imgName: file.originalname,
          };
        })
      );
    }

    // Create an array of other file objects based on the uploaded files
    const otherFiles = uploadedOtherFiles.map((file) => ({
      imgKey: file.imgKey,
      imgFlag: file.imgFlag,
      imgName: file.imgName,
      adminUploaded: true,
      status: "accepted",
    }));

    // Create the 'otherFile' object for the schema
    const otherFile = {
      images: otherFiles,
    };

    // Save the updated data to the database
    let fileDetails;

    otherFiles.forEach((item) => {
      alreadyExisted.otherFile.images.push(item);
    });

    fileDetails = await alreadyExisted.save();

    if (fileDetails) {
      changeVerificationFileStatus = await qaVerificationModel.findOneAndUpdate(
        { _id: QAverificationTimeStampId },
        { $set: { isFileUploaded: true } },
        { new: true }
      );
      await updateFileUploadStatus(QAverificationTimeStampId);
      return sendResponse(res, 200, "Files uploaded successfully", fileDetails);
    } else {
      return errorResponse(
        res,
        400,
        "Files not saved",
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, error.message, error.message);
  }
};

module.exports.getOtherFile = async (req, res) => {
  try {
    // const batchId = req.params.id;
    // const otherData = await qafileModel.find({ batchId: batchId });

    const QAverificationTimeStampId = req.params.id;
    const otherData = await qafileModel
      .find({ QAverificationTimeStampId: QAverificationTimeStampId })
      .populate({ path: "batchId", select: "batchId" });

    if (!otherData || otherData.length === 0) {
      //return errorResponse(res, 404, "No data found", "No data found");
      return sendResponse(res, 200, "getting data", []);
    }

    const otherFile = otherData.flatMap((data) => data.otherFile.images);

    if (!otherFile || !Array.isArray(otherFile) || otherFile.length === 0) {
      return sendResponse(res, 200, "Files get successfully", []);
    }

    // const otherKeys = otherFile.map((photo) => photo.imgKey);

    const data = otherData[0];
    const otherFilesWithUrls = await getQAFileUrl(data, otherFile);

    const results = {
      otherUrls: otherFilesWithUrls,
    };

    return sendResponse(res, 200, "Files get successfully", results);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.deleteOtherFileByKey = async (req, res) => {
  try {
    const batchId = req.params.id;
    const keyToDelete = req.body.keyToDelete;

    const otherData = await qafileModel.find({ batchId: batchId });

    if (!otherData || otherData.length === 0) {
      return errorResponse(res, 404, "No data found", "No data found");
    }

    // Initialize an array to collect results
    const results = [];

    // Iterate over each document in qaToolData
    for (const data of otherData) {
      const otherPhotos = data.otherFile?.images || [];

      // Check if toolPhoto exists
      if (!data.otherFile || !otherPhotos || otherPhotos.length === 0) {
        continue; // Move to the next document if toolPhoto is missing or empty
      }

      const otherPhotoFileKeys = otherPhotos.map((photo) => photo.imgKey);

      // Check if the key exists in toolPhotos
      const keyExistsInOtherPhotos = otherPhotoFileKeys.includes(keyToDelete);

      if (keyExistsInOtherPhotos) {
        // Delete the key from the database
        const result = await qafileModel.updateMany(
          { batchId: batchId },
          {
            $pull: {
              "otherFile.images": { imgKey: keyToDelete },
            },
          }
        );

        // Delete the image from S3
        await deleteImageFromS3(keyToDelete);

        // Collect the result for each document
        results.push(result);
      }
    }

    // If the key is not found in any document
    if (results.length === 0) {
      return errorResponse(
        res,
        404,
        "Key not found in Other photos",
        "Key not found in Other photos"
      );
    }

    // Return the response with collected results
    return sendResponse(res, 200, "Files deleted successfully", results);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.deleteToolFileByKey = async (req, res) => {
  try {
    const batchId = req.params.id;
    const keyToDelete = req.body.keyToDelete;
    const qaVerificationTimeStampId = req.body.QAverificationTimeStampId;
    let updateObject = {};
    const qaToolData = await qafileModel.find({
      QAverificationTimeStampId: qaVerificationTimeStampId,
    });

    // const qaToolData = await qafileModel.find({ batchId: batchId });

    if (!qaToolData || qaToolData.length === 0) {
      return errorResponse(res, 404, "No data found", "No data found");
    }

    // Initialize an array to collect results
    const results = [];

    // Iterate over each document in qaToolData
    for (const data of qaToolData) {
      const toolPhotos = data.toolPhoto?.images || [];

      // Check if toolPhoto exists
      if (!data.toolPhoto || !toolPhotos || toolPhotos.length === 0) {
        continue; // Move to the next document if toolPhoto is missing or empty
      }

      const toolPhotoFileKeys = toolPhotos.map((photo) => photo.imgKey);

      // Check if the key exists in toolPhotos
      const keyExistsInToolPhotos = toolPhotoFileKeys.includes(keyToDelete);

      if (keyExistsInToolPhotos) {
        updateObject.toolPhotoTime = "";
        // Delete the key from the database
        const result = await qafileModel.updateMany(
          { batchId: batchId },
          {
            $pull: {
              "toolPhoto.images": { imgKey: keyToDelete },
            },
          }
        );

        // Delete the image from S3
        await deleteImageFromS3(keyToDelete);

        // Collect the result for each document
        results.push(result);

        if (results && toolPhotoFileKeys.length === 1) {
          const result2 = await qaVerificationModel.updateOne(
            { _id: qaVerificationTimeStampId },
            updateObject
          );
        }
      }
    }

    // If the key is not found in any document
    if (results.length === 0) {
      return errorResponse(
        res,
        404,
        "Key not found in Tool photos",
        "Key not found in Tool photos"
      );
    }

    // Return the response with collected results
    return sendResponse(res, 200, "Files deleted successfully", results);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//upload marksheet of viva and practical
module.exports.uploadVerificationVivaPracticalMarksheet = async (req, res) => {
  try {
    const { QAverificationTimeStampId } = req.body;

    if (!QAverificationTimeStampId) {
      return errorResponse(
        res,
        400,
        "Something missing in payload",
        "Something missing in payload"
      );
    }

    if (
      !req.files ||
      (!req.files.vivaMarksheet && !req.files.practicalMarksheet)
    ) {
      return errorResponse(
        res,
        401,
        responseMessage.file_not_received,
        responseMessage.file_not_received
      );
    }

    const alreadyExisted = await qafileModel.findOne({
      $and: [{ QAverificationTimeStampId: QAverificationTimeStampId }],
    });

    if (!alreadyExisted)
      return errorResponse(
        res,
        400,
        "no verfication entry found",
        "no verfication entry found"
      );

    // Check and handle practical photos and videos files
    let uploadedVivaMarksheet = [];
    if (req.files.vivaMarksheet) {
      const vivaMarksheetIdentifiers = req.files.vivaMarksheet.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedVivaMarksheet = await Promise.all(
        req.files.vivaMarksheet.map(async (file, index) => {
          const imageIdentifier = vivaMarksheetIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            //Key: `${imageIdentifier}`,
            Key: `${QAverificationTimeStampId}/${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            imgKey: imageIdentifier.toString(),
            imgFlag: true,
            imgName: file.originalname,
          };
        })
      );
    }

    let uploadedPracticalMarksheet = [];
    if (req.files.practicalMarksheet) {
      const practicalMarksheetIdentifiers = req.files.practicalMarksheet.map(
        () => `${new Date().getTime()}-${Math.random()}`
      );

      uploadedPracticalMarksheet = await Promise.all(
        req.files.practicalMarksheet.map(async (file, index) => {
          const imageIdentifier = practicalMarksheetIdentifiers[index];
          const uploadResult = await uploadVerificationFile({
            buffer: file.buffer,
            // key: `${imageIdentifier}`,
            Key: `${QAverificationTimeStampId}/${imageIdentifier}`,
            mimetype: file.mimetype,
            QAverificationTimeStampId: QAverificationTimeStampId,
          });

          return {
            imgKey: imageIdentifier.toString(),
            imgFlag: true,
            imgName: file.originalname,
          };
        })
      );
    }

    const vivaMarksheet = uploadedVivaMarksheet.map((image) => ({
      imgKey: image.imgKey,
      imgFlag: image.imgFlag,
      imgName: image.imgName,
      adminUploaded: true,
      status: "accepted",
    }));

    // Create an array of check-out image objects based on the uploaded images
    const practicalMarksheet = uploadedPracticalMarksheet.map((image) => ({
      imgKey: image.imgKey,
      imgFlag: image.imgFlag,
      imgName: image.imgName,
    }));

    // Create the 'checkInPhoto' and 'checkOutPhoto' objects for the schema
    const vivaMarksheetFile = {
      images: vivaMarksheet,
    };

    const practicalMarksheetFile = {
      images: practicalMarksheet,
    };

    // Save the updated data to the database
    let fileDetails;

    vivaMarksheet.forEach((item) => {
      alreadyExisted.vivaMarksheet.images.push(item);
    });

    practicalMarksheet.forEach((item) => {
      alreadyExisted.practicalMarksheet.images.push(item);
    });

    fileDetails = await alreadyExisted.save();

    if (fileDetails) {
      await updateFileUploadStatus(QAverificationTimeStampId);

      return sendResponse(res, 200, "Files uploaded successfully", fileDetails);
    } else {
      return errorResponse(
        res,
        400,
        "Files not saved",
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, error, error.message);
  }
};

module.exports.getVivaPracticalMarksheetFile = async (req, res) => {
  try {
    const QAverificationTimeStampId = req.params.id;
    const qaMarksheetData = await qafileModel
      .find({ QAverificationTimeStampId: QAverificationTimeStampId })
      .populate({ path: "batchId", select: "batchId" });

    if (!qaMarksheetData || qaMarksheetData.length === 0) {
      //return errorResponse(res, 404, "No data found", "No data found");
      return sendResponse(res, 200, "getting data", []);
    }

    const vivaMarksheet = qaMarksheetData.flatMap(
      (data) => data.vivaMarksheet.images
    );
    const practicalMarksheet = qaMarksheetData.flatMap(
      (data) => data.practicalMarksheet.images
    );

    if (!vivaMarksheet.length && !vivaMarksheet.length) {
      return sendResponse(res, 200, "files retrieved successfully", []);
    }

    // const vivaMarksheetFileKeys = vivaMarksheet.map((photo) => photo.imgKey);
    // const practicalMarksheetFileKeys = practicalMarksheet.map((photo) => photo.imgKey);

    const data1 = qaMarksheetData[0];
    const vivaMarksheetFilesWithUrls = await getQAFileUrl(data1, vivaMarksheet);

    const data2 = qaMarksheetData[0];
    const practicalMarksheetFilesWithUrls = await getQAFileUrl(
      data2,
      practicalMarksheet
    );

    const results = {
      vivaMarksheetUrls: vivaMarksheetFilesWithUrls,
      practicalMarksheetUrls: practicalMarksheetFilesWithUrls,
    };

    return sendResponse(res, 200, "files retrieved successfully", results);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.deleteVivaPracticalMarksheetFileByKey = async (req, res) => {
  try {
    const batchId = req.params.id;
    const keyToDelete = req.body.keyToDelete;

    const qaMarksheetData = await qafileModel.find({ batchId: batchId });

    if (!qaMarksheetData || qaMarksheetData.length === 0) {
      return errorResponse(res, 404, "No data found", "No data found");
    }

    const vivaMarksheet = qaMarksheetData.flatMap(
      (data) => data.vivaMarksheet.images
    );
    const practicalMarksheet = qaMarksheetData.flatMap(
      (data) => data.practicalMarksheet.images
    );

    if (!vivaMarksheet && !practicalMarksheet) {
      return errorResponse(res, 404, "Files not found", "Files not found");
    }

    const vivaMarksheetFileKeys = vivaMarksheet
      ? vivaMarksheet.map((photo) => photo.imgKey)
      : [];
    const practicalMarksheetFileKeys = practicalMarksheet
      ? practicalMarksheet.map((photo) => photo.imgKey)
      : [];

    // Check if the key exists in either theoryPhoto or theoryVideo
    const keyExistsInVivaMarksheet =
      vivaMarksheetFileKeys.includes(keyToDelete);
    const keyExistsInPractical =
      practicalMarksheetFileKeys.includes(keyToDelete);

    if (!keyExistsInVivaMarksheet && !keyExistsInPractical) {
      return errorResponse(res, 404, "Files not exists ", "Files not exists ");
    }

    // Delete the key from the database
    const result = await qafileModel.updateMany(
      { QAverificationTimeStampId: QAverificationTimeStampId },
      {
        $pull: {
          "vivaMarksheet.images": { imgKey: keyToDelete },
          "practicalMarksheet.images": { imgKey: keyToDelete },
        },
      }
    );

    return sendResponse(res, 200, "File deleted successfully", result);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.addRemark = async (req, res) => {
  try {
    const { error } = await validateAddRemark(req.body);

    if (error) {
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );
    }

    const { QAverificationTimeStampId, description } = req.body;

    // Check if a document with the given batchId already exists
    const existingDocument = await qafileModel.findOne({
      QAverificationTimeStampId: QAverificationTimeStampId,
    });

    if (existingDocument) {
      // Document exists, update the remarks
      existingDocument.remarks = description;

      // Save the updated document
      const updatedDocument = await existingDocument.save();

      // Create a custom response object with only the required fields
      const response = {
        QAverificationTimeStampId: updatedDocument.QAverificationTimeStampId,
        remarks: updatedDocument.remarks,
      };

      //add remark in verification sheet
      const updateRemark = await qaVerificationModel.findOneAndUpdate(
        { _id: QAverificationTimeStampId },
        { $set: { remarks: updatedDocument.remarks } }, //checkOutTime: updateObject.clockOutTime
        { upsert: false }
      );

      console.log("updateRemark==>", updateRemark);

      return sendResponse(res, 200, "Remark updated successfully", response);
    } else {
      // Document doesn't exist, create a new document
      const newRemark = new qafileModel({
        QAverificationTimeStampId: QAverificationTimeStampId,
        remarks: description,
      });

      const saveRemark = await newRemark.save();

      if (saveRemark) {
        // Create a custom response object with only the required fields
        const response = {
          QAverificationTimeStampId: saveRemark.QAverificationTimeStampId,
          remarks: saveRemark.remarks,
        };

        const updateRemark = await qaVerificationModel.findOneAndUpdate(
          { _id: QAverificationTimeStampId },
          { $set: { remarks: saveRemark.remarks } }, //checkOutTime: updateObject.clockOutTime
          { upsert: false }
        );

        console.log("inside else updateRemark");
        return sendResponse(res, 200, "Remark created successfully", response);
      } else {
        return errorResponse(
          res,
          400,
          "Remark not created",
          responseMessage.errorMessage
        );
      }
    }
  } catch (err) {
    return errorResponse(res, 500, responseMessage.errorMessage, err.message);
  }
};

module.exports.getRemark = async (req, res) => {
  try {
    const QAverificationTimeStampId = req.params.id;

    const remarkDetail = await qafileModel
      //.findOne({ batchId: batchId }) //, remarks: { $exists: true, $ne: "" } }) // Filter only documents with 'remarks'
      .findOne({ QAverificationTimeStampId: QAverificationTimeStampId })
      .select("remarks");

    if (!remarkDetail)
      // return sendResponse(res, 200, "getting Remark", remarkDetail);
      return errorResponse(
        res,
        400,
        "No Remark found",
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, "Remark found", remarkDetail);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.createZipForBatch = async (req, res) => {
  try {
    const batchId = req.params.id;
    const qaFiles = await qafileModel
      .find({ batchId: batchId })
      .populate({ path: "batchId", select: "batchId" });
    console.log("qaFiles==>", qaFiles);
    if (!qaFiles || qaFiles.length === 0) {
      return errorResponse(res, 404, "No data found", "No data found");
    }

    const batchName = qaFiles[0].batchId?.batchId;

    const s3Urls = [];
    for (const data of qaFiles) {
      const fileTypes = [
        "checkInPhoto",
        "checkOutPhoto",
        "groupPhoto",
        "theoryPhoto",
        "theoryVideo",
        "practicalPhoto",
        "practicalVideo",
        "vivaPhoto",
        "vivaVideo",
        "aadharPhoto",
        "annexureNPhoto",
        "annexureMPhoto",
        "attendenceSheet",
        "toolPhoto",
        "examcenterPhoto",
        "examcenterVideo",
        "tpPhoto",
        "otherFile",
        "vivaMarksheet",
        "practicalMarksheet",
      ];
      for (const fileType of fileTypes) {
        if (data[fileType]) {
          if (Array.isArray(data[fileType].images)) {
            console.log("fileType===>", fileType);
            const fileKeys = data[fileType].images.map((photo) => photo.imgKey);
            //console.log("fileKeys==>",fileKeys)
            const dataWithUrls = await getQAZipFileUrl(
              data,
              fileKeys,
              fileType
            );
            console.log("dataWithUrls photo==>", dataWithUrls);
            for (let i = 0; i < dataWithUrls.length; i++) {
              s3Urls.push({ url: dataWithUrls[i].url, extension: "jpg" });
            }
          } else if (Array.isArray(data[fileType].videos)) {
            const fileKeys = data[fileType].videos.map(
              (video) => video.videoKey
            );
            const dataWithUrls = await getQAZipFileUrl(
              data,
              fileKeys,
              fileType
            );
            console.log("dataWithUrls video==>", dataWithUrls);
            for (let i = 0; i < dataWithUrls.length; i++) {
              s3Urls.push({ url: dataWithUrls[i].url, extension: "mp4" });
            }
          }
        }
      }
    }

    //------>END-TOOLS<------
    console.log("s3Urls===>", s3Urls);
    // Check if there are any URLs to download
    if (s3Urls.length === 0) {
      return errorResponse(res, 404, "No URLs found", "No URLs found");
    }

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    const zipFileName = `${batchName}.zip`; //batchId;

    const output = fs.createWriteStream(zipFileName);

    archive.on("end", () => {
      console.log("Archive finalized.");
    });

    archive.on("error", (err) => {
      // console.error("Error creating archive:", err);
      res.status(500).send("Error creating ZIP archive");
    });

    archive.pipe(output);
    // archive.pipe(res);

    const downloadAndAddToArchive = async (url, archive, fileName) => {
      if (url != undefined) {
        const response = await axios.get(url, { responseType: "stream" });
        archive.append(response.data, { name: fileName });
      }
    };

    const downloadPromises = s3Urls.map((item, index) => {
      const fileName = `file${index + 1}.${item.extension}`; //`file${index + 1}${fileExtension}`;//`file${index + 1}.jpg`;
      return downloadAndAddToArchive(item.url, archive, fileName);
    });
    //console.log("downloadPromises===>",downloadPromises)
    Promise.all(downloadPromises)
      .then(async () => {
        await archive.finalize();
        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${zipFileName}`
        );
        const fileStream = fs.createReadStream(zipFileName);

        fileStream.on("error", (err) => {
          return errorResponse(res, 500, "Error downloading zip file");
        });
        fileStream.pipe(res);
      })
      .catch((error) => {
        console.error("Error downloading files:", error);
      });
  } catch (error) {
    return errorResponse(res, 500, "Something went wrong", error.message);
  }
};

function validateAddRemark(body) {
  try {
    const schema = Joi.object({
      QAverificationTimeStampId: Joi.string().empty(""),
      description: Joi.string().empty(""),
    });
    return schema.validate(body);
  } catch (err) {
    console.log(err);
  }
}

function qaVerificationSchema(body) {
  try {
    const schema = Joi.object({
      Date: Joi.string().required(),
      batchId: Joi.string().required(),
      assessorName: Joi.string().required(),
      checkIn: Joi.string().required(),
      checkOut: Joi.string().required(),
      groupPhoto: Joi.string().required(),
      theoryPhoto: Joi.string().required(),
      theoryVideo: Joi.string().required(),
      practicalPhoto: Joi.string().required(),
      practicalVideo: Joi.string().required(),
      vivaPhoto: Joi.string().required(),
      vivaVideo: Joi.string().required(),
      aadharPhoto: Joi.string().required(),
      annexureM: Joi.string().required(),
      annexureN: Joi.string().required(),
      assessmentPlan: Joi.string().required(),
      attendenceSheet: Joi.string().required(),
      summaryTest: Joi.string().required(),
      tpUndertaking: Joi.string().required(),
      questionPaper: Joi.string().required(),
      toolList: Joi.string().required(),
      toolsPhoto: Joi.string().required(),
      tpFeedback: Joi.string().required(),
      audit: Joi.string().required(),
      remarks: Joi.string().required(),
    });
    return schema.validate(body);
  } catch (err) {
    console.log(err);
  }
}

//  function validateVerificationAssessment(body) {
//    try {
//       const schema = Joi.object({
//          date: Joi.string().empty(""),
//            //.messages({
// //         //   "any.required": "Date is required.",
// //         //   "string.base": "Date must be a string.",
// //         //   "string.empty": "Date cannot be empty.",
// //         // }),
// //         batchId: Joi.string().required().messages({
// //           "any.required": "Batch is required.",
// //           "string.base": "Batch must be a string.",
// //           "string.empty": "Batch cannot be empty.",
// //         }),
// //         // assessorName: Joi.string().required().messages({
// //         //   "any.required": "Assessor name is required.",
// //         //   "string.min": "Assessor must be at least 2 character long.",
// //         //   "string.max": "Assessor cannot be longer than 255 characters.",
// //         //   "string.base": "Assessor name must be a string.",
// //         //   "string.empty": "Assessor cannot be empty.",
// //         // }),
// //         // checkInTime: Joi.string().required().messages({
// //         //   "any.required": "Check In time is required.",
// //         //   "string.base": "Check In time must be a string.",
// //         //   "string.empty": "Check In time cannot be empty.",
// //         // }),
// //         // checkOutTime: Joi.string().required().messages({
// //         //   "any.required": "Check Out time is required.",
// //         //   "string.base": "Check Out must be a string.",
// //         //   "string.empty": "Check out time cannot be empty.",
// //         // }),
// //         // groupPhotoTime: Joi.string().required().messages({
// //         //   "any.required": "Group phot time is required.",
// //         //   "string.base": "Group photo time must be a string.",
// //         //   "string.empty": "Group photo time cannot be empty.",
// //         // }),
// //         // theoryPhotoTime: Joi.string().required().messages({
// //         //   "any.required": "Theory photo time is required.",
// //         //   "string.base": "Theory photo time must be a string.",
// //         //   "string.empty": "Theory photo time cannot be empty.",
// //         // }),
// //         // theoryVideoTime: Joi.string().required().messages({
// //         //   "any.required": "Theory video time is required.",
// //         //   "string.base": "Theory video time must be a string.",
// //         //   "string.empty": "Theory video time cannot be empty."
// //         // }),
// //         // practicalPhotoTime: Joi.string().required().messages({
// //         //   "any.required": "Practical photo time is required.",
// //         //   "string.base": "Practical photo time must be a string.",
// //         //   "string.empty": "Practical photo time cannot be empty."
// //         // }),
// //         // practicalVideoTime: Joi.string().required().messages({
// //         //   "any.required": "Practical video time is required.",
// //         //   "string.base": "Practical video time must be a string.",
// //         //   "string.empty":"Practical video time cannot be empty."
// //         // }),
// //         // vivaPhotoTime: Joi.string().required().messages({
// //         //   "any.required": "Viva photo time is required.",
// //         //   "string.base": "Viva photo time must be a string.",
// //         //   "string.empty":"Viva photo time cannot be empty."
// //         // }),
// //         // vivaVideoTime: Joi.string().required().messages({
// //         //   "any.required": "Viva video time is required.",
// //         //   "string.base": "Viva video time must be a string.",
// //         //   "string.empty":"Viva video time cannot be empty."
// //         // }),
// //         // aadharHolding: Joi.string().required().messages({
// //         //   "any.required": "Aadhar is required.",
// //         //   "string.base": "Aadhar must be a string.",
// //         //   "string.empty":"Aadhar cannot be empty."
// //         // }),
// //         // annexureM: Joi.string().required().messages({
// //         //   "any.required": "Annexure M is required.",
// //         //   "string.base": "Annexure M must be a string.",
// //         //   "string.empty":"Annexure M cannot be empty."
// //         // }),
// //         // annexureN: Joi.string().required().messages({
// //         //   "any.required": "Annexure N is required.",
// //         //   "string.base": "Annexure N must be a string.",
// //         //   "string.empty":"Annexure N cannot be empty."
// //         // }),
// //         // assessmentPlan: Joi.string().required().messages({
// //         //   "any.required": "Assessment is required.",
// //         //   "string.base": "Assessment must be a string.",
// //         //   "string.empty":"Assessment cannot be empty."
// //         // }),
// //         // attendanceSheet: Joi.string().required().messages({
// //         //   "any.required": "Attendence is required.",
// //         //   "string.base": "Attendence must be a string.",
// //         //   "string.empty":"Attendence cannot be empty."
// //         // }),
// //         // summarySheet: Joi.string().required().messages({
// //         //   "any.required": "Summary is required.",
// //         //   "string.base": "Summary must be a string.",
// //         //   "string.empty":"Summary cannot be empty."
// //         // }),
// //         // tpUndertaking: Joi.string().required().messages({
// //         //   "any.required": "TP undertaking is required.",
// //         //   "string.base": "TP undertaking must be a string.",
// //         //   "string.empty":"TP undertaking cannot be empty."
// //         // }),
// //         // questionPaper: Joi.string().required().messages({
// //         //   "any.required": "question paper is required.",
// //         //   "string.base": "question paper must be a string.",
// //         //   "string.empty":"question paper cannot be empty."
// //         // }),
// //         // toolListTime: Joi.string().required().messages({
// //         //   "any.required": "Tool list time is required.",
// //         //   "string.base": "Tool list time must be a string.",
// //         //   "string.empty":"Tool list time cannot be empty."
// //         // }),
// //         // toolPhotoTime: Joi.string().required().messages({
// //         //   "any.required": "Tool photo time is required.",
// //         //   "string.base": "Tool photo must be a string.",
// //         //   "string.empty":"Tool photo time cannot be empty."
// //         // }),
// //         // tpFeedback: Joi.string().required().messages({
// //         //   "any.required": "TP feedback is required.",
// //         //   "string.base": "TP feedback must be a string.",
// //         //   "string.empty":"TP feedback time cannot be empty."
// //         // }),
// //         // audit: Joi.string().required().messages({
// //         //   "any.required": "Audit is required.",
// //         //   "string.base": "Audit must be a string.",
// //         //   "string.empty":"Audit cannot be empty."
// //         // }),
// //         // remarks: Joi.string().required().messages({
// //         //   "any.required": "Remarks is required.",
// //         //   "string.min": "Remarks must be at least 3 character long.",
// //         //   "string.max": "Remarks cannot be longer than 255 characters.",
// //         //   "string.base": "Remarks must be a string.",
// //         //   "string.empty":"Remarks cannot be empty."
// //         // }),
//     });
//     return schema.validate(body);
//   } catch (err) {
//     console.log(err);
//   }
// }

const updateFileUploadStatus = async (batchId) => {
  await qaVerificationModel.findOneAndUpdate(
    { batchId: batchId },
    { $set: { isFileUploaded: true } }
  );
};

module.exports.getTimeStampId = async (req, res) => {
  try {
    const { batchId, assesorId, date } = req.query;

    if (!batchId || !assesorId || !date) {
      return errorResponse(
        res,
        400,
        "Something missing in payload",
        "Something missing in payload"
      );
    }

    const alreadyExisted = await qaVerificationModel.findOne({
      $and: [{ batchId: batchId }, { assesorId: assesorId }, { date: date }],
    });

    if (!alreadyExisted) {
      return sendResponse(res, 200, "Not record found..", {});
    }

    return sendResponse(res, 200, "Record found..", alreadyExisted);
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

module.exports.qaSendReminder = async (req, res) => {
  try {
    const {
      message,
      assesorId,
      QAverificationTimeStampId,
      reminderCount = "1",
      intervalTime,
    } = req.body;

    if (!message)
      return errorResponse(
        res,
        400,
        "message not provided",
        "message not provided"
      );

    if (!QAverificationTimeStampId)
      return errorResponse(
        res,
        400,
        "QAverificationTimeStampId not provided",
        "QAverificationTimeStampId not provided"
      );

    if (!assesorId)
      return errorResponse(
        res,
        400,
        "assesorId not provided",
        "assesorId not provided"
      );

    console.log("user-->", req.user._id);

    const existingReminder = await AssessorNotificationModel.findOne({
      QAverificationTimeStampId: QAverificationTimeStampId,
    });

    if (existingReminder) {
      existingReminder.sender = req.user._id;
      existingReminder.title = "Please Upload Files";
      existingReminder.content = message;
      existingReminder.reminderCount = reminderCount;
      existingReminder.intervalTime = intervalTime;

      const savedReminder = await existingReminder.save();
      console.log("existingReminder===>", savedReminder);

      return sendResponse(
        res,
        200,
        "reminder saved successfully",
        savedReminder
      );
    } else {
      const newReminder = new AssessorNotificationModel({
        recipient: assesorId,
        sender: req.user._id,
        title: "Please Upload Files",
        content: message,
        type: "reminder",
        reminderCount: reminderCount,
        intervalTime: intervalTime,
        QAverificationTimeStampId: QAverificationTimeStampId,
      });

      const savedReminder = await newReminder.save();
      console.log("newReminder===>", savedReminder);

      return sendResponse(
        res,
        200,
        "reminder saved successfully",
        savedReminder
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

module.exports.qaGetReminder = async (req, res) => {
  try {
    const QAverificationTimeStampId = req.params.id;

    if (!QAverificationTimeStampId)
      return errorResponse(
        res,
        400,
        "QAverificationTimeStampId not provided",
        "QAverificationTimeStampId not provided"
      );

    const existingReminder = await AssessorNotificationModel.findOne({
      QAverificationTimeStampId: QAverificationTimeStampId,
    });

    if (!existingReminder) {
      return sendResponse(res, 200, "No message", "");
    } else {
      return sendResponse(
        res,
        200,
        "reminder saved successfully",
        existingReminder
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

const makeNoifiction = async (req, QAverificationTimeStampId, imageUpdates) => {
  try {
    const qaFileDetails = await qafileModel.findOne({
      QAverificationTimeStampId: QAverificationTimeStampId,
    });
    const qaTabDetails = await VerificationTabModel.findOne({
      batchId: qaFileDetails.batchId,
      assesorId: qaFileDetails.assesorId,
    });
    let tabData;
    qaObjectLinks.forEach(async (item) => {
      if (item.objectName === imageUpdates[0].objectName) {
        let tab = qaTabDetails.tabs.find(
          (tabItem) => tabItem.tabName === item.tabName
        );
        tabData = {
          tabUrl: item.tabUrl,
          tabId: tab._id,
          tabName: item.tabName,
        };
      }
    });

    // const link = `https://testing-assessor.testaonline.com/batch/${qaFileDetails.batchId}/assessment/activities/${tabData.tabUrl}/${tabData.tabId}/${QAverificationTimeStampId}`
    const link = `/batch/${qaFileDetails.batchId}/assessment/activities/${tabData.tabUrl}/${tabData.tabId}/${QAverificationTimeStampId}`;

    if (imageUpdates[0].newStatus === "rejected") {
      const notification = new AssessorNotificationModel({
        recipient: qaFileDetails.assesorId,
        sender: req.user._id,
        title: "Document rejected",
        content: `${tabData.tabName} has rejected, please re-upload`,
        type: "alert",
        link: link,
        QAverificationTimeStampId: QAverificationTimeStampId,
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

module.exports.deleteTimeStampEntry = async (req, res) => {
  try {
    const timeStampId = req.params.id;

    if (!timeStampId) {
      return errorResponse(
        res,
        400,
        "Time Stamp Id not provided",
        "Time Stamp Id not provided"
      );
    }

    const isDeleted = await qaVerificationModel.deleteOne({ _id: timeStampId });

    if (isDeleted?.deletedCount === 1) {
      const qaFileDetails = await qafileModel.findOne({
        QAverificationTimeStampId: timeStampId,
      });
      const isAllFileDeleted = await deleteQaFileFromBucket(
        timeStampId,
        qaFileDetails
      );
      if (isAllFileDeleted.status) {
        const isDeleted = await qafileModel.deleteOne({
          QAverificationTimeStampId: timeStampId,
        });

        if (isDeleted?.deletedCount === 1) {
          // ✅ Invalidate cache after successful deletion
          await redis.destroy(QA_VERIFICATION_ASSESSOR_NAME_LIST);

          return sendResponse(
            res,
            200,
            "Entry deleted successfully",
            "Entry deleted successfully"
          );
        }
      } else {
        return errorResponse(
          res,
          500,
          responseMessage.something_wrong,
          isAllFileDeleted.error
        );
      }
    }

    return errorResponse(
      res,
      400,
      responseMessage.something_wrong,
      "Error in entry deletion"
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

const deleteQaFileFromBucket = async (timeStampId, qaFileDetails) => {
  try {
    const cleanObj = JSON.parse(JSON.stringify(qaFileDetails));

    const fileKeysobj = [];
    Object.keys(cleanObj).map((item) => {
      if (
        typeof cleanObj[item] === "object" &&
        !Array.isArray(cleanObj[item])
      ) {
        Object.keys(cleanObj[item]).map((section) => {
          if (cleanObj[item][section].length > 0) {
            cleanObj[item][section].map((obj) => {
              const customObj = {
                section: item,
                key: obj.imgKey ? obj.imgKey : obj.videoKey,
              };
              fileKeysobj.push(customObj);
            });
          }
        });
      }
    });

    const s3Res = await Promise.all(
      fileKeysobj.map((item) => {
        if (
          item.section === "checkInPhoto" ||
          item.section === "checkOutPhoto"
        ) {
          return deleteImageFromS3(item.key);
        } else {
          return deleteImageFromS3(`${timeStampId}/${item.key}`);
        }
      })
    );

    return { status: true, data: s3Res };
  } catch (error) {
    return { status: false, error: error.message };
  }
};

//////////   TO CREATE AUDIT DATA ZIP without chunk data //////////
module.exports.createAuditDataZip1 = async (req, res) => {
  try {
    const batchId = req.params.id;

    const qaFiles = await qafileModel
      .find({ batchId })
      .populate({ path: "batchId", select: "batchId batchMode" });

    if (!qaFiles || qaFiles.length === 0) {
      return errorResponse(res, 404, "No data found", "No data found");
    }

    const batchName = qaFiles[0].batchId?.batchId || `Batch_${batchId}`;
    const batchMode = (qaFiles[0].batchId?.batchMode || "").toLowerCase();

    const s3Urls = [];

    // FOLDER STRUCTURE MAP
    let folderMap = {
      annexureMPhoto: { main: "Documents", sub: "Annexure M" },
      annexureNPhoto: { main: "Documents", sub: "Annexure N" },
      tpPhoto: { main: "Documents", sub: "TP Undertaking" },
      attendenceSheet: { main: "Documents", sub: "Attendance Sheet" },
      vivaMarksheet: { main: "Documents", sub: "Result Sheet" },

      examcenterPhoto: {
        main: "Photo Evidence",
        sub: "Assessor’s Centre Photo",
      },
      groupPhoto: {
        main: "Photo Evidence",
        sub: "Group Photo with Assessor’s Pic",
      },
      aadharPhoto: {
        main: "Photo Evidence",
        sub: "Photo of Candidates with Aadhar Holdings",
      },
      theoryPhoto: { main: "Photo Evidence", sub: "Theory Photos" },
      practicalPhoto: { main: "Photo Evidence", sub: "Practical Photos" },
      vivaPhoto: { main: "Photo Evidence", sub: "Viva Photos" },

      theoryVideo: { main: "Video Evidence", sub: "Theory Videos" },
      practicalVideo: { main: "Video Evidence", sub: "Practical Videos" },
      vivaVideo: { main: "Video Evidence", sub: "Viva Videos" },
      examcenterVideo: { main: "Video Evidence", sub: "Exam Centre Videos" },
    };

    // ONLINE MODE — Remove Assessor’s Centre folder
    if (batchMode === "online") {
      delete folderMap.examcenterPhoto;
    }

    // COLLECT FILE URLs (IMAGES + VIDEOS + DOCS)

    for (const data of qaFiles) {
      const fileTypes = Object.keys(folderMap);

      for (const fileType of fileTypes) {
        if (!data[fileType]) continue;

        const folderInfo = folderMap[fileType];

        // IMAGES
        if (
          Array.isArray(data[fileType].images) &&
          data[fileType].images.length > 0
        ) {
          const keys = data[fileType].images.map((p) => p.imgKey);
          const dataWithUrls = await getQAZipFileUrl(data, keys, fileType);

          for (const f of dataWithUrls) {
            s3Urls.push({
              url: f.url,
              main: folderInfo.main,
              sub: folderInfo.sub,
            });
          }
        }

        // VIDEOS
        if (
          Array.isArray(data[fileType].videos) &&
          data[fileType].videos.length > 0
        ) {
          const keys = data[fileType].videos.map((v) => v.videoKey);
          const dataWithUrls = await getQAZipFileUrl(data, keys, fileType);

          for (const f of dataWithUrls) {
            s3Urls.push({
              url: f.url,
              main: folderInfo.main,
              sub: folderInfo.sub,
            });
          }
        }

        // DOCS
        if (
          Array.isArray(data[fileType].docs) &&
          data[fileType].docs.length > 0
        ) {
          const keys = data[fileType].docs.map((d) => d.docKey);
          const dataWithUrls = await getQAZipFileUrl(data, keys, fileType);

          for (const f of dataWithUrls) {
            s3Urls.push({
              url: f.url,
              main: folderInfo.main,
              sub: folderInfo.sub,
            });
          }
        }
      }
    }

    if (s3Urls.length === 0) {
      return errorResponse(res, 404, "No URLs found", "No URLs found");
    }

    // 🔥 ZIP CREATION
    const archive = archiver("zip", { zlib: { level: 9 } });
    const zipFileName = `${batchName}.zip`;
    const output = fs.createWriteStream(zipFileName);

    archive.pipe(output);

    // CREATE EMPTY FOLDERS (EVEN IF FILES NOT PRESENT)

    for (const key of Object.keys(folderMap)) {
      const { main, sub } = folderMap[key];
      const folderPath = `${batchName}/${main}/${sub}/`;
      archive.append(null, { name: folderPath });
    }

    // Detect extension based on content-type
    const getExtension = (contentType) => {
      if (!contentType) return "bin";

      if (contentType.includes("pdf")) return "pdf";
      if (contentType.includes("jpeg")) return "jpg";
      if (contentType.includes("jpg")) return "jpg";
      if (contentType.includes("png")) return "png";
      if (contentType.includes("mp4")) return "mp4";

      if (
        contentType.includes("spreadsheet") ||
        contentType.includes("officedocument.spreadsheetml")
      )
        return "xlsx";

      if (contentType.includes("ms-excel")) return "xls";

      if (contentType.includes("csv") || contentType.includes("text/csv"))
        return "csv";

      if (contentType.includes("msword")) return "doc";
      if (contentType.includes("officedocument.wordprocessingml"))
        return "docx";

      return "bin";
    };

    // DOWNLOAD FILES + DETECT EXT + ADD TO ZIP

    for (let i = 0; i < s3Urls.length; i++) {
      try {
        const item = s3Urls[i];
        const response = await axios.get(item.url, { responseType: "stream" });

        const contentType = response.headers["content-type"];
        const ext = getExtension(contentType);
        const cleanName = item.sub.replace(/[^a-zA-Z0-9 _-]/g, "").trim();
        const filePath = `${batchName}/${item.main}/${item.sub}/${cleanName}.${ext}`;

        archive.append(response.data, { name: filePath });
      } catch (err) {
        console.log("Skipping file:", err.message);
      }
    }

    await archive.finalize();

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename=${zipFileName}`);

    fs.createReadStream(zipFileName).pipe(res);
  } catch (error) {
    return errorResponse(res, 500, "Something went wrong", error.message);
  }
};

////////////   TO CREATE AUDIT DATA ZIP with chunk data //////////
module.exports.createAuditDataZip2 = async (req, res) => {
  try {
    const batchId = req.params.id;

    const qaFiles = await qafileModel
      .find({ batchId })
      .populate({ path: "batchId", select: "batchId batchMode" });

    if (!qaFiles || qaFiles.length === 0) {
      return errorResponse(res, 404, "No data found", "No data found");
    }

    const batchName = qaFiles[0].batchId?.batchId || `Batch_${batchId}`;
    const batchMode = (qaFiles[0].batchId?.batchMode || "").toLowerCase();

    const s3Urls = [];

    // TEMPLATE FOLDER MAP

    let folderMap = {
      annexureMPhoto: { main: "Documents", sub: "Annexure M" },
      annexureNPhoto: { main: "Documents", sub: "Annexure N" },
      tpPhoto: { main: "Documents", sub: "TP Undertaking" },
      attendenceSheet: { main: "Documents", sub: "Attendance Sheet" },
      vivaMarksheet: { main: "Documents", sub: "Result Sheet" },

      examcenterPhoto: {
        main: "Photo Evidence",
        sub: "Assessor’s Centre Photo",
      },
      groupPhoto: {
        main: "Photo Evidence",
        sub: "Group Photo with Assessor’s Pic",
      },
      aadharPhoto: {
        main: "Photo Evidence",
        sub: "Photo of Candidates with Aadhar Holdings",
      },
      theoryPhoto: { main: "Photo Evidence", sub: "Theory Photos" },
      practicalPhoto: { main: "Photo Evidence", sub: "Practical Photos" },
      vivaPhoto: { main: "Photo Evidence", sub: "Viva Photos" },

      theoryVideo: { main: "Video Evidence", sub: "Theory Videos" },
      practicalVideo: { main: "Video Evidence", sub: "Practical Videos" },
      vivaVideo: { main: "Video Evidence", sub: "Viva Videos" },
      examcenterVideo: { main: "Video Evidence", sub: "Exam Centre Videos" },
    };

    // Online Case — Remove exam center photo

    if (batchMode === "online") {
      delete folderMap.examcenterPhoto;
    }

    // Collect all S3 file URLs

    for (const data of qaFiles) {
      for (const fileType of Object.keys(folderMap)) {
        const folderInfo = folderMap[fileType];
        if (!data[fileType]) continue;

        // Images
        if (Array.isArray(data[fileType].images)) {
          const keys = data[fileType].images.map((p) => p.imgKey);
          const list = await getQAZipFileUrl(data, keys, fileType);
          list.forEach((f) => s3Urls.push({ url: f.url, ...folderInfo }));
        }

        // Videos
        if (Array.isArray(data[fileType].videos)) {
          const keys = data[fileType].videos.map((v) => v.videoKey);
          const list = await getQAZipFileUrl(data, keys, fileType);
          list.forEach((f) => s3Urls.push({ url: f.url, ...folderInfo }));
        }

        // Docs
        if (Array.isArray(data[fileType].docs)) {
          const keys = data[fileType].docs.map((d) => d.docKey);
          const list = await getQAZipFileUrl(data, keys, fileType);
          list.forEach((f) => s3Urls.push({ url: f.url, ...folderInfo }));
        }
      }
    }

    if (s3Urls.length === 0) {
      return errorResponse(res, 404, "No URLs found", "No URLs found");
    }

    // Create ZIP (Streaming)

    const archive = archiver("zip", { zlib: { level: 9 } });
    const zipFileName = `${batchName}.zip`;
    const output = fs.createWriteStream(zipFileName);

    archive.pipe(output);

    // 🔥 Create all folders (even if empty)

    for (const k of Object.keys(folderMap)) {
      const { main, sub } = folderMap[k];
      archive.append(null, { name: `${batchName}/${main}/${sub}/` });
    }
    // Extension detect helper

    const getExtension = (contentType) => {
      if (!contentType) return "bin";

      if (contentType.includes("pdf")) return "pdf";
      if (contentType.includes("jpeg")) return "jpg";
      if (contentType.includes("jpg")) return "jpg";
      if (contentType.includes("png")) return "png";
      if (contentType.includes("mp4")) return "mp4";

      if (
        contentType.includes("spreadsheet") ||
        contentType.includes("officedocument.spreadsheetml")
      )
        return "xlsx";

      if (contentType.includes("ms-excel")) return "xls";

      if (contentType.includes("csv") || contentType.includes("text/csv"))
        return "csv";

      if (contentType.includes("msword")) return "doc";
      if (contentType.includes("officedocument.wordprocessingml"))
        return "docx";

      return "bin";
    };

    // Chunker (20 per batch)

    const chunkArray = (arr, size) => {
      const out = [];
      for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
      }
      return out;
    };

    const chunks = chunkArray(s3Urls, 20);

    // Process chunks parallel + stream append

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (item, index) => {
          try {
            const resp = await axios.get(item.url, { responseType: "stream" });
            const ext = getExtension(resp.headers["content-type"]);
            const cleanName = item.sub.replace(/[^a-zA-Z0-9 _-]/g, "").trim();

            // const filePath = `${batchName}/${item.main}/${item.sub}/${cleanName}_${Date.now()}_${index}.${ext}`;
            const filePath = `${batchName}/${item.main}/${item.sub}/${cleanName}.${ext}`;
            archive.append(resp.data, { name: filePath });
          } catch (err) {
            console.log("Skipping file:", err.message);
          }
        })
      );
    }

    await archive.finalize();

    // Send ZIP file as response (Download)

    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename=${zipFileName}`);

    fs.createReadStream(zipFileName).pipe(res);
  } catch (error) {
    return errorResponse(res, 500, "Something went wrong", error.message);
  }
};

/////////  TO CREATE AUDIT DATA ZIP AND SAVE ON S3 /////////////

module.exports.createAuditDataZip3 = async (req, res) => {
  try {
    const batchId = req.params.id;

    const qaFiles = await qafileModel
      .find({ batchId })
      .populate({ path: "batchId", select: "batchId batchMode zipUrl" });

    if (!qaFiles || qaFiles.length === 0) {
      return errorResponse(res, 404, "No data found", "No data found");
    }

    const batchDoc = qaFiles[0].batchId;
    const batchName = batchDoc?.batchId || `Batch_${batchId}`;
    const batchMode = (batchDoc?.batchMode || "").toLowerCase();

    // If already exists → return S3 ZIP URL
    if (batchDoc.zipUrl) {
      return res.json({
        success: true,
        message: "ZIP already generated",
        zipUrl: batchDoc.zipUrl,
      });
    }

    const s3Urls = [];

    // TEMPLATE FOLDER MAP
    let folderMap = {
      annexureMPhoto: { main: "Documents", sub: "Annexure M" },
      annexureNPhoto: { main: "Documents", sub: "Annexure N" },
      tpPhoto: { main: "Documents", sub: "TP Undertaking" },
      attendenceSheet: { main: "Documents", sub: "Attendance Sheet" },
      vivaMarksheet: { main: "Documents", sub: "Result Sheet" },

      examcenterPhoto: {
        main: "Photo Evidence",
        sub: "Assessor’s Centre Photo",
      },
      groupPhoto: {
        main: "Photo Evidence",
        sub: "Group Photo with Assessor’s Pic",
      },
      aadharPhoto: {
        main: "Photo Evidence",
        sub: "Photo of Candidates with Aadhar Holdings",
      },
      theoryPhoto: { main: "Photo Evidence", sub: "Theory Photos" },
      practicalPhoto: { main: "Photo Evidence", sub: "Practical Photos" },
      vivaPhoto: { main: "Photo Evidence", sub: "Viva Photos" },

      theoryVideo: { main: "Video Evidence", sub: "Theory Videos" },
      practicalVideo: { main: "Video Evidence", sub: "Practical Videos" },
      vivaVideo: { main: "Video Evidence", sub: "Viva Videos" },
      examcenterVideo: { main: "Video Evidence", sub: "Exam Centre Videos" },
    };

    if (batchMode === "online") {
      delete folderMap.examcenterPhoto;
    }

    // COLLECT S3 SIGNED URLS
    for (const data of qaFiles) {
      for (const fileType of Object.keys(folderMap)) {
        if (!data[fileType]) continue;

        const folderInfo = folderMap[fileType];

        // IMAGES
        if (Array.isArray(data[fileType].images)) {
          const keys = data[fileType].images.map((i) => i.imgKey);
          const urls = await getQAZipFileUrl(data, keys, fileType);
          urls.forEach((u) => s3Urls.push({ ...folderInfo, url: u.url }));
        }

        // VIDEOS
        if (Array.isArray(data[fileType].videos)) {
          const keys = data[fileType].videos.map((v) => v.videoKey);
          const urls = await getQAZipFileUrl(data, keys, fileType);
          urls.forEach((u) => s3Urls.push({ ...folderInfo, url: u.url }));
        }

        // DOCS
        if (Array.isArray(data[fileType].docs)) {
          const keys = data[fileType].docs.map((d) => d.docKey);
          const urls = await getQAZipFileUrl(data, keys, fileType);
          urls.forEach((u) => s3Urls.push({ ...folderInfo, url: u.url }));
        }
      }
    }

    if (s3Urls.length === 0) {
      return errorResponse(res, 404, "No URLs found", "No URLs found");
    }

    // PREPARE FOLDERS & FILE STREAMS FOR ZIP BUFFER
    const filesList = {
      folders: [],
      files: [],
    };

    // Create all folders
    for (const key of Object.keys(folderMap)) {
      const { main, sub } = folderMap[key];
      filesList.folders.push(`${batchName}/${main}/${sub}/`);
    }

    // Helper to detect extension
    const getExtension = (contentType) => {
      if (!contentType) return "bin";

      contentType = contentType.toLowerCase();

      if (contentType.includes("pdf")) return "pdf";
      if (contentType.includes("jpeg") || contentType.includes("jpg"))
        return "jpg";
      if (contentType.includes("png")) return "png";
      if (contentType.includes("mp4")) return "mp4";
      if (contentType.includes("spreadsheet") || contentType.includes("excel"))
        return "xlsx";
      if (contentType.includes("csv")) return "csv";
      if (contentType.includes("word")) return "docx";

      return "bin";
    };

    // CHUNKING
    const chunkArray = (arr, size) => {
      const output = [];
      for (let i = 0; i < arr.length; i += size) {
        output.push(arr.slice(i, i + size));
      }
      return output;
    };

    const chunks = chunkArray(s3Urls, 20);
    let counter = 1;

    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (item) => {
          try {
            const resp = await axios.get(item.url, { responseType: "stream" });
            const ext = getExtension(resp.headers["content-type"]);

            const clean = item.sub.replace(/[^a-zA-Z0-9 _-]/g, "").trim();
            const filePath = `${batchName}/${item.main}/${
              item.sub
            }/${clean}_${counter++}.${ext}`;

            filesList.files.push({
              path: filePath,
              stream: resp.data,
            });
          } catch (err) {
            console.log("Skipping file:", err.message);
          }
        })
      );
    }

    // Generate ZIP buffer in memory
    const zipBuffer = await generateZipBuffer(batchName, filesList);

    // Upload ZIP buffer to S3
    const zipKey = `audit_zips/${batchName}_${Date.now()}.zip`;

    const uploadInfo = await uploadAuditZipFile(zipBuffer, zipKey);

    // Update EVERY QA record of this batch
    await qafileModel.updateMany(
      { batchId: batchId },
      {
        $set: {
          zipUrl: uploadInfo.location,
          zipKey: uploadInfo.key,
          zipCreatedAt: new Date(),
        },
      }
    );

    return res.json({
      success: true,
      message: "ZIP generated & uploaded",
      zipUrl: uploadInfo.location,
    });
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Something went wrong", error.message);
  }
};

///////////  TO CREATE AUDIT DATA ZIP SAVE ON S3 URL AND NOW ATTENDENCE SHEET PDF STAMP ADD /////////////

module.exports.createAuditDataZip = async (req, res) => {
  try {
    const batchId = req.params.id;

    const qaFiles = await qafileModel
      .find({ batchId })
      .populate({ path: "batchId", select: "batchId batchMode zipUrl" });

    if (!qaFiles || qaFiles.length === 0) {
      return errorResponse(res, 404, "No data found", "No data found");
    }

    const batchDoc = qaFiles[0].batchId;
    const batchName = batchDoc?.batchId || `Batch_${batchId}`;
    const batchMode = (batchDoc?.batchMode || "").toLowerCase();

    // Agar pehle se ZIP bana hua hai to wahi de do
    if (batchDoc.zipUrl) {
      return res.json({
        success: true,
        message: "ZIP already generated",
        zipUrl: batchDoc.zipUrl,
      });
    }

    const s3Urls = [];

    // TEMPLATE FOLDER MAP
    let folderMap = {
      annexureMPhoto: { main: "Documents", sub: "Annexure M" },
      annexureNPhoto: { main: "Documents", sub: "Annexure N" },
      tpPhoto: { main: "Documents", sub: "TP Undertaking" },
      attendenceSheet: { main: "Documents", sub: "Attendance Sheet" }, // <- yahi pe stamp lagega
      vivaMarksheet: { main: "Documents", sub: "Result Sheet" },

      examcenterPhoto: {
        main: "Photo Evidence",
        sub: "Assessor’s Centre Photo",
      },
      groupPhoto: {
        main: "Photo Evidence",
        sub: "Group Photo with Assessor’s Pic",
      },
      aadharPhoto: {
        main: "Photo Evidence",
        sub: "Photo of Candidates with Aadhar Holdings",
      },
      theoryPhoto: { main: "Photo Evidence", sub: "Theory Photos" },
      practicalPhoto: { main: "Photo Evidence", sub: "Practical Photos" },
      vivaPhoto: { main: "Photo Evidence", sub: "Viva Photos" },

      theoryVideo: { main: "Video Evidence", sub: "Theory Videos" },
      practicalVideo: { main: "Video Evidence", sub: "Practical Videos" },
      vivaVideo: { main: "Video Evidence", sub: "Viva Videos" },
      examcenterVideo: { main: "Video Evidence", sub: "Exam Centre Videos" },
    };

    // Online case me examcenterPhoto nahi chahiye
    if (batchMode === "online") {
      delete folderMap.examcenterPhoto;
    }

    // S3 SIGNED URLS collect
    for (const data of qaFiles) {
      for (const fileType of Object.keys(folderMap)) {
        if (!data[fileType]) continue;

        const folderInfo = folderMap[fileType];

        // IMAGES
        if (Array.isArray(data[fileType].images)) {
          const keys = data[fileType].images.map((i) => i.imgKey);
          const urls = await getQAZipFileUrl(data, keys, fileType);
          urls.forEach((u) =>
            s3Urls.push({
              main: folderInfo.main,
              sub: folderInfo.sub,
              url: u.url,
              type: fileType,
            })
          );
        }

        // VIDEOS
        if (Array.isArray(data[fileType].videos)) {
          const keys = data[fileType].videos.map((v) => v.videoKey);
          const urls = await getQAZipFileUrl(data, keys, fileType);
          urls.forEach((u) =>
            s3Urls.push({
              main: folderInfo.main,
              sub: folderInfo.sub,
              url: u.url,
              type: fileType,
            })
          );
        }

        // DOCS
        if (Array.isArray(data[fileType].docs)) {
          const keys = data[fileType].docs.map((d) => d.docKey);
          const urls = await getQAZipFileUrl(data, keys, fileType);
          urls.forEach((u) =>
            s3Urls.push({
              main: folderInfo.main,
              sub: folderInfo.sub,
              url: u.url,
              type: fileType,
            })
          );
        }
      }
    }

    // Prepare files list for zipGenerator
    const filesList = {
      folders: [],
      files: [],
    };

    // Saare folders hamesha banenge (even if empty)
    for (const key of Object.keys(folderMap)) {
      const { main, sub } = folderMap[key];
      filesList.folders.push(`${batchName}/${main}/${sub}/`);
    }

    // Agar koi file hi nahi → empty ZIP bhi banana hai
    if (s3Urls.length === 0) {
      const zipBufferEmpty = await generateZipBuffer(batchName, filesList);
      const emptyZipKey = `audit_zips/${batchName}_${Date.now()}_EMPTY.zip`;
      const emptyUpload = await uploadAuditZipFile(zipBufferEmpty, emptyZipKey);

      await qaVerificationModel.updateMany(
        { batchId: batchId },
        {
          $set: {
            zipUrl: emptyUpload.location,
            zipKey: emptyUpload.key,
            zipCreatedAt: new Date(),
          },
        }
      );

      return res.json({
        success: true,
        message: "Empty ZIP generated (no files found)",
        zipUrl: emptyUpload.location,
      });
    }

    // Content-Type se extension nikalne ka helper
    const getExtension = (contentType = "") => {
      contentType = contentType.toLowerCase();

      if (contentType.includes("pdf")) return "pdf";
      if (contentType.includes("jpeg")) return "jpg";
      if (contentType.includes("jpg")) return "jpg";
      if (contentType.includes("png")) return "png";
      if (contentType.includes("mp4")) return "mp4";

      if (
        contentType.includes("spreadsheet") ||
        contentType.includes("officedocument.spreadsheetml")
      )
        return "xlsx";

      if (contentType.includes("ms-excel")) return "xls";

      if (contentType.includes("csv") || contentType.includes("text/csv"))
        return "csv";

      if (contentType.includes("msword")) return "doc";
      if (contentType.includes("officedocument.wordprocessingml"))
        return "docx";

      return "bin";
    };

    // Chunk utility
    const chunkArray = (arr, size) => {
      const out = [];
      for (let i = 0; i < arr.length; i += size) {
        out.push(arr.slice(i, i + size));
      }
      return out;
    };

    const chunks = chunkArray(s3Urls, 20);
    const stampPath = "public/stamp.png"; // stamp
    let counter = 1;

    // Sab files ko download karke filesList.files me dalna
    for (const chunk of chunks) {
      await Promise.all(
        chunk.map(async (item) => {
          try {
            const resp = await axios.get(item.url, {
              responseType: "arraybuffer",
            });

            const contentType = resp.headers["content-type"] || "";
            const ext = getExtension(contentType);

            const cleanName = item.sub.replace(/[^a-zA-Z0-9 _-]/g, "").trim();
            const filePath = `${batchName}/${item.main}/${
              item.sub
            }/${cleanName}_${counter++}.${ext}`;

            let fileBuffer = Buffer.from(resp.data);

            // Attendance Sheet + pdf hai → stampPDF use karo
            if (item.type === "attendenceSheet" && ext === "pdf") {
              try {
                fileBuffer = await stampPDF(fileBuffer, stampPath);
              } catch (e) {
                console.log("Stamping failed, using original PDF:", e.message);
              }
            }

            filesList.files.push({
              path: filePath,
              stream: fileBuffer, // Buffer directly
            });
          } catch (err) {
            console.log("Skipping file due to error:", err.message);
          }
        })
      );
    }

    // ZIP buffer
    const zipBuffer = await generateZipBuffer(batchName, filesList);

    // S3 me ZIP upload
    const zipKey = `audit_zips/${batchName}_${Date.now()}.zip`;
    const uploadInfo = await uploadAuditZipFile(zipBuffer, zipKey);

    await qaVerificationModel.updateMany(
      { batchId: batchId },
      {
        $set: {
          zipUrl: uploadInfo.location,
          zipKey: uploadInfo.key,
          zipCreatedAt: new Date(),
        },
      }
    );

    return sendResponse(res, 200, "ZIP generated & uploaded", {
      zipUrl: uploadInfo.location,
    });
  } catch (error) {
    console.log(error);
    return errorResponse(res, 500, "Something went wrong", error.message);
  }
};

exports.downloadAttendance = async (req, res) => {
  try {
    const batchId = req.params.id;
    const batch = await Batch.findOne({ _id: batchId })
      .populate("jobRole clientId examCenterId accessorId questionPaper.qpCode")
      .populate({
        path: "examCenterId",
        populate: {
          path: "trainingPartner",
          model: "trainingPartner",
        },
      })
      .lean();
    if (!batch) {
      return res.status(404).json({ message: "Batch Not Found" });
    }
    const candidates = await Candidate.find({ batchId })
      .select(
        "candidateId aadharNo name mobile fatherName candidateType eligibility"
      )
      .lean();

    if (!candidates.length) {
      return res
        .status(404)
        .json({ message: "No candidates found for this batch" });
    }

    const payload = buildAttendancePayload(batch, candidates);
    const client =
      batch.clientId?.clientcode || batch.clientId?.clientname || "default";
    const safeName = client.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${safeName}_attendance.pdf`;
    const pdf = await getPDFByClient(client, payload);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.setHeader("Content-Length", pdf.length);
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Disposition, Content-Length"
    );

    res.end(pdf);
    console.log("📄 PDF Successfully Delivered!");
  } catch (err) {
    console.log(" ERROR →", err);
    res.status(500).send("PDF generation failed");
  }
};

exports.downloadResultSheet = async (req, res) => {
  try {
    const batchId = req.params.id;
    const batch = await Batch.findOne({ _id: batchId })
      .populate("jobRole clientId examCenterId accessorId questionPaper.qpCode")
      .populate({
        path: "examCenterId",
        populate: {
          path: "trainingPartner",
          model: "trainingPartner",
        },
      })
      .lean();
    if (!batch) {
      return res.status(404).json({ message: "Batch Not Found" });
    }
    const candidates = await Candidate.find({ batchId })
      .select(
        "candidateId aadharNo name mobile fatherName candidateType eligibility"
      )
      .lean();

    if (!candidates.length) {
      return res
        .status(404)
        .json({ message: "No candidates found for this batch" });
    }

    const payload = buildResultPayload(batch, candidates);
    const client =
    batch.clientId?.clientcode || batch.clientId?.clientname || "default";
    const safeName = client.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${safeName}_result.pdf`;
    const pdf = await getResultPDFByClient(client, payload);

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.setHeader("Content-Length", pdf.length);
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Disposition, Content-Length"
    );

    res.end(pdf);
    console.log("📄 PDF Successfully Delivered!");
  } catch (err) {
    console.log(" ERROR →", err);
    res.status(500).send("PDF generation failed");
  }
};

async function addResultHeader1(workbook, ws, batchDetails, stats) {
    const widths = [
        12,18,18,22,22,18,18,18,18,18,18,18,
        18,18,18,18,18,18,18,18,18,18,18,18,
        18,18,18,20,20,12,12,12,12,12
    ];
    widths.forEach((w, i) => ws.getColumn(i + 1).width = w);

    const center = { horizontal: "center", vertical: "middle", wrapText: true };
    const border = { top:{style:"thin"}, bottom:{style:"thin"}, left:{style:"thin"}, right:{style:"thin"} };
    const bgColor = { type:"pattern", pattern:"solid", fgColor:{argb:"DCE6F2"} };

    // ========= ROW 1 =========
    ws.mergeCells("A1:AE1");
    ws.getCell("A1").value = "RESULT SHEET";
    ws.getCell("A1").font = { bold:true, size:20 };
    ws.getCell("A1").alignment = center;
    ws.getCell("A1").border = border;
    ws.getCell("A1").fill = { type:"pattern", pattern:"solid", fgColor:{argb:"FFDDE7C8"} };

    // ========= LEFT LOGO =========
    const thsc = workbook.addImage({ 
      filename: path.resolve(__dirname, "../public/thsc-logo.jpg"),
        extension: "jpg",
    });
    ws.mergeCells("A2:A4");
    ws.getCell("A2:A4").border = border;
    ws.addImage(thsc, { tl:{col:0.2,row:1.9}, ext:{width:80,height:100} });

    // ========= ROW 2 =========
    ws.mergeCells("B2"); ws.getCell("B2").value = "Name of Assessing Body :"; ws.getCell("B2").font = {bold:true}; ws.getCell("B2").alignment = center; ws.getCell("B2").border = border; ws.getCell("B2").fill = bgColor;
    ws.mergeCells("C2"); ws.getCell("C2").value = "Radiant Infonet Pvt Ltd."; ws.getCell("C2").alignment = center; ws.getCell("C2").border = border;

    ws.mergeCells("D2:H2"); ws.getCell("D2").value = "Assessment Date :"; ws.getCell("D2").font = {bold:true}; ws.getCell("D2").alignment = center; ws.getCell("D2").border = border;ws.getCell("D2").fill = bgColor;
    ws.mergeCells("I2:M2"); ws.getCell("I2").value = batchDetails?.startDate || ""; ws.getCell("I2").alignment = center; ws.getCell("I2").border = border;

    ws.mergeCells("N2:S2"); ws.getCell("N2").value = "Address of Testing Center :"; ws.getCell("N2").font = {bold:true}; ws.getCell("N2").alignment = center; ws.getCell("N2").border = border; ws.getCell("N2").fill = bgColor;
    ws.mergeCells("T2:Z2"); ws.getCell("T2").value = batchDetails?.testingCenter || "ACADEMY OF TECHNOLOGY MANAGEMENT AND SCIENCE village-Achejja Hapur bypass Hapur"; ws.getCell("T2").alignment = center; ws.getCell("T2").border = border;

    // ========= RIGHT INDEX =========
    ws.mergeCells("AA2:AE5");
    ws.getCell("AA2").value =
        `RESULT INDEX\n\nTotal: ${stats.total}\nPass: ${stats.pass}\nFail: ${stats.fail}\nAbsent: ${stats.absent}`;
    ws.getCell("AA2").alignment = center;
    ws.getCell("AA2").font = { bold:true, size:14 };
    ws.getCell("AA2").border = border;

    const radiant = workbook.addImage({ 
        filename: path.resolve(__dirname, "../public/radiant-logo.svg"),
        extension: "svg",
    });
    ws.addImage(radiant, { tl:{col:26.4,row:2.2}, ext:{width:85,height:90} });

    // ========= ROW 3 =========
    ws.mergeCells("B3"); ws.getCell("B3").value = "Name & Contact of Assessor :"; ws.getCell("B3").font = {bold:true}; ws.getCell("B3").alignment = center; ws.getCell("B3").border = border;ws.getCell("B3").fill = bgColor;
    ws.mergeCells("C3"); ws.getCell("C3").value = batchDetails?.assessorName || "Dharmender Singh Bhadouria/9654757388"; ws.getCell("C3").alignment = center; ws.getCell("C3").border = border;

    ws.mergeCells("D3:H3"); ws.getCell("D3").value = "No. of Candidates :"; ws.getCell("D3").font = {bold:true}; ws.getCell("D3").alignment = center; ws.getCell("D3").border = border;ws.getCell("D3").fill = bgColor;
    ws.mergeCells("I3:M3"); ws.getCell("I3").value = stats.total; ws.getCell("I3").alignment = center; ws.getCell("I3").border = border;

    ws.mergeCells("N3:S3"); ws.getCell("N3").value = "Batch ID :"; ws.getCell("N3").font = {bold:true}; ws.getCell("N3").alignment = center; ws.getCell("N3").border = border; ws.getCell("N3").fill = bgColor;
    ws.mergeCells("T3:Z3"); ws.getCell("T3").value = batchDetails?.batchId || ""; ws.getCell("T3").alignment = center; ws.getCell("T3").border = border;

    // ========= ROW 4 =========
    ws.mergeCells("B4"); ws.getCell("B4").value = "Scheme Name :"; ws.getCell("B4").font = {bold:true}; ws.getCell("B4").alignment = center; ws.getCell("B4").border = border; ws.getCell("B4").fill = bgColor;
    ws.mergeCells("C4"); ws.getCell("C4").value = batchDetails?.scheme || "PMKVY-4.0-CSCM STT-Skill India Center"; ws.getCell("C4").alignment = center; ws.getCell("C4").border = border;

    ws.mergeCells("D4:H4"); ws.getCell("D4").value = "Name of Training Provider :"; ws.getCell("D4").font = {bold:true}; ws.getCell("D4").alignment = center; ws.getCell("D4").border = border; ws.getCell("D4").fill = bgColor;  
    ws.mergeCells("I4:M4"); ws.getCell("I4").value = batchDetails?.trainingProvider || " PARMARTH EDUCATIONAL TRUST"; ws.getCell("I4").alignment = center; ws.getCell("I4").border = border;

    ws.mergeCells("N4:S4"); ws.getCell("N4").value = "Course Name & Level :"; ws.getCell("N4").font = {bold:true}; ws.getCell("N4").alignment = center; ws.getCell("N4").border = border; ws.getCell("N4").fill = bgColor;
    ws.mergeCells("T4:Z4"); ws.getCell("T4").value = batchDetails?.courseName || "Food Styling Photographer  & 4"; ws.getCell("T4").alignment = center; ws.getCell("T4").border = border;

}

async function addResultHeader(workbook, ws, batchDetails, stats) {

  // ================= COLUMN WIDTHS =================
  const widths = [
    12,18,18,18,18,18,18,18,18,18,18,18,
    18,18,18,18,18,18,18,18,18,18,18,18,
    18,18,18,18,18,12,12,12,12,12
  ];
  widths.forEach((w, i) => ws.getColumn(i + 1).width = w);

  // ================= COMMON STYLES =================
  const center = { horizontal: "center", vertical: "middle", wrapText: true };
  const border = {
    top:{style:"thin"}, bottom:{style:"thin"},
    left:{style:"thin"}, right:{style:"thin"}
  };
  const labelFill = {
    type:"pattern", pattern:"solid",
    fgColor:{argb:"FFDCE6F2"}
  };

  // ================= ROW 1 : TITLE =================
  ws.mergeCells("A1:AG1");
  ws.getCell("A1").value = "RESULT SHEET";
  ws.getCell("A1").font = { bold:true, size:20 };
  ws.getCell("A1").alignment = center;
  ws.getCell("A1").border = border;
  ws.getCell("A1").fill = {
    type:"pattern", pattern:"solid",
    fgColor:{argb:"FFDDE7C8"}
  };
  ws.getRow(1).height = 55;

  // ================= THSC LOGO =================
  const thsc = workbook.addImage({
    filename: path.resolve(__dirname, "../public/thsc-logo.jpg"),
    extension: "jpg",
  });
  ws.mergeCells("A2:A4");
  ws.addImage(thsc, { tl:{col:0.2,row:1.9}, ext:{width:80,height:100} });
  ws.getCell("A2").border = border;

  // ================= ROW 2 =================
  ws.mergeCells("B2:C2");
  ws.getCell("B2").value = "Name of Assessing Body :";
  ws.getCell("B2").font = { bold:true };
  ws.getCell("B2").alignment = center;
  ws.getCell("B2").border = border;
  ws.getCell("B2").fill = labelFill;

  ws.mergeCells("D2:E2");
  ws.getCell("D2").value = "Radiant Infonet Pvt Ltd.";
  ws.getCell("D2").alignment = center;
  ws.getCell("D2").border = border;

  ws.mergeCells("F2:H2");
  ws.getCell("F2").value = "Assessment Date :";
  ws.getCell("F2").font = { bold:true };
  ws.getCell("F2").alignment = center;
  ws.getCell("F2").border = border;
  ws.getCell("F2").fill = labelFill;

  ws.mergeCells("I2:K2");
  ws.getCell("I2").value = batchDetails?.startDate || "";
  ws.getCell("I2").alignment = center;
  ws.getCell("I2").border = border;

  ws.mergeCells("L2:N2");
  ws.getCell("L2").value = "Address of Testing Center :";
  ws.getCell("L2").font = { bold:true };
  ws.getCell("L2").alignment = center;
  ws.getCell("L2").border = border;
  ws.getCell("L2").fill = labelFill;

  ws.mergeCells("O2:Y2");
  ws.getCell("O2").value =
    batchDetails?.testingCenter ||
    "ACADEMY OF TECHNOLOGY MANAGEMENT AND SCIENCE village-Achejja Hapur bypass Hapur";
  ws.getCell("O2").alignment = center;
  ws.getCell("O2").border = border;

  ws.getRow(2).height = 55;

  // ================= RESULT INDEX (RIGHT) =================
  ws.mergeCells("Z2:AC2");
  ws.getCell("Z2").value = "RESULT INDEX";
  ws.getCell("Z2").font = { bold: true, size: 20 };
  ws.getCell("Z2").alignment = center;
  ws.getCell("Z2").border = border;
  ws.getCell("Z2").fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FFC3D69B" } // green
  };
  ws.getRow(2).height = 55;

// Logo (Z + AA)
ws.mergeCells("Z3:AA6");
ws.getCell("Z3").border = border;

const radiant = workbook.addImage({
  filename: path.resolve(__dirname, "../public/radiant-logo.svg"),
  extension: "svg",
});
ws.addImage(radiant, {
  tl: { col: 25.1, row: 2.8 }, 
  ext: { width: 120, height: 120 }
});

  const resultIndexRows = [
    ["Total", stats.total],
    ["Pass", stats.pass],
    ["Fail", stats.fail],
    ["Absent", stats.absent],
  ];

  resultIndexRows.forEach(([label, value], i) => {
    const r = 3 + i;

    // Label (AB–AC)
    ws.mergeCells(`AB${r}:AC${r}`);
    ws.getCell(`AB${r}`).value = label;
    ws.getCell(`AB${r}`).font = { bold: true };
    ws.getCell(`AB${r}`).alignment = center;
    ws.getCell(`AB${r}`).border = border;
    ws.getCell(`AB${r}`).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFE6EFF7" }
    };

    // Value (AC ONLY)
    ws.getCell(`AC${r}`).value = value;
    ws.getCell(`AC${r}`).font = { bold: true };
    ws.getCell(`AC${r}`).alignment = center;
    ws.getCell(`AC${r}`).border = border;

    ws.getRow(r).height = 32;
  });


  // ================= ROW 3 =================
  ws.mergeCells("B3:C3");
  ws.getCell("B3").value = "Name & Contact of Assessor :";
  ws.getCell("B3").font = { bold:true };
  ws.getCell("B3").alignment = center;
  ws.getCell("B3").border = border;
  ws.getCell("B3").fill = labelFill;

  ws.mergeCells("D3:E3");
  ws.getCell("D3").value =
    batchDetails?.assessorName || "Dharmender Singh Bhadouria / 9654757388";
  ws.getCell("D3").alignment = center;
  ws.getCell("D3").border = border;

  ws.mergeCells("F3:H3");
  ws.getCell("F3").value = "No. of Candidates :";
  ws.getCell("F3").font = { bold:true };
  ws.getCell("F3").alignment = center;
  ws.getCell("F3").border = border;
  ws.getCell("F3").fill = labelFill;

  ws.mergeCells("I3:K3");
  ws.getCell("I3").value = stats.total;
  ws.getCell("I3").alignment = center;
  ws.getCell("I3").border = border;

  ws.mergeCells("L3:N3");
  ws.getCell("L3").value = "Batch ID :";
  ws.getCell("L3").font = { bold:true };
  ws.getCell("L3").alignment = center;
  ws.getCell("L3").border = border;
  ws.getCell("L3").fill = labelFill;

  ws.mergeCells("O3:Y3");
  ws.getCell("O3").value = batchDetails?.batchId || "";
  ws.getCell("O3").alignment = center;
  ws.getCell("O3").border = border;

  ws.getRow(3).height = 55;

  // ================= ROW 4 =================
  ws.mergeCells("B4:C4");
  ws.getCell("B4").value = "Scheme Name :";
  ws.getCell("B4").font = { bold:true };
  ws.getCell("B4").alignment = center;
  ws.getCell("B4").border = border;
  ws.getCell("B4").fill = labelFill;

  ws.mergeCells("D4:E4");
  ws.getCell("D4").value =
    batchDetails?.scheme || "PMKVY-4.0-CSCM STT-Skill India Center";
  ws.getCell("D4").alignment = center;
  ws.getCell("D4").border = border;

  ws.mergeCells("F4:H4");
  ws.getCell("F4").value = "Name of Training Provider :";
  ws.getCell("F4").font = { bold:true };
  ws.getCell("F4").alignment = center;
  ws.getCell("F4").border = border;
  ws.getCell("F4").fill = labelFill;

  ws.mergeCells("I4:K4");
  ws.getCell("I4").value =
    batchDetails?.trainingProvider || "PARMARTH EDUCATIONAL TRUST";
  ws.getCell("I4").alignment = center;
  ws.getCell("I4").border = border;

  ws.mergeCells("L4:N4");
  ws.getCell("L4").value = "Course Name & Level :";
  ws.getCell("L4").font = { bold:true };
  ws.getCell("L4").alignment = center;
  ws.getCell("L4").border = border;
  ws.getCell("L4").fill = labelFill;

  ws.mergeCells("O4:Y4");
  ws.getCell("O4").value =
    batchDetails?.courseName || "Food Styling Photographer – Level 4";
  ws.getCell("O4").alignment = center;
  ws.getCell("O4").border = border;

  ws.getRow(4).height = 55;
  ws.getRow(5).height = 28; // RESULT INDEX overflow
}




exports.downloadExcelOnlineByBatchWithMarksAudit = async (req, res) => {
  try {
    const batchId = req.params.batchId;
    if (!batchId)
      return errorResponse(
        res,
        400,
        "no batchid provided",
        "no batchid provided"
      );

        // Fetch Batch Details
        const batchDetails = await Batch.findById(batchId).populate({
            path: "questionPaper.multipleJobRole.jobRoleId",
            select: "jobRole",
        });

        // --- 1. Calculate Assessment Timing Logic ---
        let assessmentEndTimestamp = 0;
        if (batchDetails?.endDate && batchDetails?.endTime) {
            const dateParts = batchDetails.endDate.split('/');
            // Assumes DD/MM/YYYY
            const isoDateString = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
            const time24Hour = convertTimeTo24Hour(batchDetails.endTime);
            const endDateTimeString = `${isoDateString}T${time24Hour}`;
            assessmentEndTimestamp = new Date(endDateTimeString).getTime();
        }
        const currentTimestamp = new Date().getTime();
        const isAssessmentPeriodOver = currentTimestamp > assessmentEndTimestamp && assessmentEndTimestamp !== 0;
        const query = { batchId: req?.params?.batchId };

        const candidateList = await CandidateModel.find(query, {
            rawPassword: 0,
            password: 0,
        }).populate({
            path: "batchId",
            select: "batchId",
        });

        // ==========================================
        // SCENARIO 2: SINGLE JOB ROLE (Or General Fallback)
        // ==========================================
        if (candidateList.length > 0) {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("New Sheet");
            const baseHeaderFill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFC3D69B" } 
            };

            const nosHeaderFill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFE6E0EC" } // #E6E0EC
            };

            const subHeaderFill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFE7EFF9" } // light blue
            };

            const commonBorder = {
              top: { style: "thin" },
              left: { style: "thin" },
              bottom: { style: "thin" },
              right: { style: "thin" }
            };

            const centerAlign = {
              horizontal: "center",
              vertical: "middle",
              wrapText: true
            };

            const assessorFill = {
              type: "pattern",
              pattern: "solid",
              fgColor: { argb: "FFC3D69B" } 
            };


            await addResultHeader(workbook, worksheet, batchDetails, {
                total: candidateList.length,
                pass: 'pass',
                fail: 'Fail',
                absent: 'Absent'
            });
            const HEADER_END_ROW = 6;
            const TABLE_HEADER_ROW = HEADER_END_ROW + 1; // 7
            const TABLE_SUB_HEADER_ROW = HEADER_END_ROW + 2; // 8
            let allResults = await OnlineResultModel.find({ batch_mongo_id: batchId })
                .populate({
                    path: "batch_mongo_id",
                    select: " ",
                    populate: [
                        { path: "jobRole", select: "jobRole" },
                        { path: "questionPaper.multipleJobRole.jobRoleId", select: "jobRole" },
                    ],
                })
                .sort({ updatedAt: -1 })
                .lean();

          // Remove duplicates and keep only the latest updated one
          let allOnineResult = [];
          let seenCandidates = new Set();

          for (let result of allResults) {
            if (!seenCandidates.has(result.candidateId)) {
              allOnineResult.push(result);
              seenCandidates.add(result.candidateId);
            }
          }

      allOnineResult = allOnineResult.map((result) => {
        if (result.nosResult && Array.isArray(result.nosResult)) {
          result.nosResult = result.nosResult.sort((a, b) =>
            a.nosName.localeCompare(b.nosName)
          );
        }
        return result;
      });

      let jobRole;
      const transformedData = allOnineResult.map((item, index) => {
        if (item.batch_mongo_id.questionPaper.isMultiJobRole) {
          jobRole = item.batch_mongo_id.questionPaper.multipleJobRole
            .map((item) => item.jobRoleId.jobRole)
            .join(",");
        } else {
          jobRole = item.batch_mongo_id.jobRole.jobRole;
        }

        let singleCandidateData = {
          candidateId: item.candidateId,
          candidateName: item.candidateName,
          batchId: item.batchId,
          jobRole,
          sno: index + 1,
          totalScore: item.obtainedGrandTotalMarks,
          percentage: item.percentage,
          passfail: item.result,
        };

        item.nosResult.forEach((item) => {
          const nos = item.nosName.replace(/[\r\n]+/g, "");

          const newData = {
            theory: {
              marks: item.theoryMarks,
              obtainedMarks: item.obtainedTheoryMarks,
            },
            practical: {
              marks: item.practicalMarks,
              obtainedMarks: item.obtainedPracticalMarks,
            },
            viva: {
              marks: item.vivaMarks,
              obtainedMarks: item.obtainedVivaMarks,
            },
          };
          
          if (!singleCandidateData[nos]) {
            singleCandidateData[nos] = newData;
          } else {
            const existing = singleCandidateData[nos];

            // For theory
            if (existing.theory.marks === 0 && newData.theory.marks !== 0) {
              existing.theory.marks = newData.theory.marks;
            }
            if (
              existing.theory.obtainedMarks === 0 &&
              newData.theory.obtainedMarks !== 0
            ) {
              existing.theory.obtainedMarks = newData.theory.obtainedMarks;
            }

            // For practical
            if (
              existing.practical.marks === 0 &&
              newData.practical.marks !== 0
            ) {
              existing.practical.marks = newData.practical.marks;
            }
            if (
              existing.practical.obtainedMarks === 0 &&
              newData.practical.obtainedMarks !== 0
            ) {
              existing.practical.obtainedMarks =
                newData.practical.obtainedMarks;
            }

            // For viva
            if (existing.viva.marks === 0 && newData.viva.marks !== 0) {
              existing.viva.marks = newData.viva.marks;
            }
            if (
              existing.viva.obtainedMarks === 0 &&
              newData.viva.obtainedMarks !== 0
            ) {
              existing.viva.obtainedMarks = newData.viva.obtainedMarks;
            }
          }
        });

        return singleCandidateData;
        
      });
      
      const baseHeaders = [
        { header: "S.No", key: "sno", width: 10 },
        { header: "Batch ID", key: "batchId", width: 15 },
        { header: "Job Role", key: "jobRole", width: 20 },
        { header: "Candidate ID", key: "candidateId", width: 15 },
        { header: "Candidate Name", key: "candidateName", width: 20 },
        { header: "Attendance", key: "attendance", width: 20 },
      ];

      const subjects = Object.keys(transformedData[0]).filter(
        (key) =>
          !baseHeaders.some((header) => header.key === key) &&
          !["totalScore", "percentage", "passfail"].includes(key)
      );

      const columns = baseHeaders.concat(
        subjects.flatMap((subject) => {
          return ["Theory", "Practical", "Viva"].map((detail) => {
            return {
              header: `${detail}`,
              key: `${subject}${detail}`,
              width: 15,
            };
          });
        })
      );

      const assessorStartCol = baseHeaders.length + subjects.length * 3 + 1;

    columns.splice(
      assessorStartCol - 1,
      0,
      { header: "Theory Total", key: "assessorTheory", width: 14 },
      { header: "Practical Total", key: "assessorPractical", width: 16 },
      { header: "Viva Total", key: "assessorViva", width: 14 }
    );

      columns.push(
        { header: "Total Score", key: "totalScore", width: 12 },
        { header: "Percentage", key: "percentage", width: 12 },
        { header: "Pass/Fail", key: "passfail", width: 12 }
      );

      worksheet.columns = columns;

      let currentColumn = baseHeaders.length + 1;

      subjects.forEach((subject) => {
        const startColumn = currentColumn;
        const endColumn = startColumn + 2;

        worksheet.mergeCells(
          TABLE_HEADER_ROW,
          startColumn,
          TABLE_HEADER_ROW,
          endColumn
        );
        const nosCell = worksheet.getCell(TABLE_HEADER_ROW, startColumn);
        nosCell.value = subject;
        nosCell.font = { bold: true };
        nosCell.fill = nosHeaderFill;
        nosCell.alignment = centerAlign;
        nosCell.border = commonBorder;
        
        worksheet.getCell(TABLE_HEADER_ROW, startColumn).value = subject;
        worksheet.getCell(TABLE_HEADER_ROW, startColumn).font = { bold: true };
        worksheet.getCell(TABLE_HEADER_ROW, startColumn).fill = nosHeaderFill;
        worksheet.getCell(TABLE_HEADER_ROW, startColumn).alignment = centerAlign;
        worksheet.getCell(TABLE_HEADER_ROW, startColumn).border = commonBorder;



        ["Theory", "Practical", "Viva"].forEach((detail, index) => {
        const subCell = worksheet.getCell(
          TABLE_SUB_HEADER_ROW,
          startColumn + index
        );

        subCell.value = detail;
        subCell.font = { bold: true };
        subCell.fill = subHeaderFill;
        subCell.alignment = centerAlign;
        subCell.border = commonBorder;
      });

        currentColumn += 3;
      });

      

      
        baseHeaders.forEach((header, index) => {
        const colIndex = index + 1;
        worksheet.getCell(TABLE_HEADER_ROW, colIndex).fill = baseHeaderFill;
        worksheet.getCell(TABLE_HEADER_ROW, colIndex).border = commonBorder;

        worksheet.getCell(TABLE_HEADER_ROW, colIndex).value = header.header;
        worksheet.getCell(TABLE_HEADER_ROW, colIndex).font = { bold: true };
        worksheet.getCell(TABLE_HEADER_ROW, colIndex).alignment = {
          horizontal: "center",
          vertical: "middle"
        };
      });

      // ===== MARKS BY ASSESSORS HEADER =====

        // Main title
        worksheet.mergeCells(
          TABLE_HEADER_ROW,
          assessorStartCol,
          TABLE_HEADER_ROW,
          assessorStartCol + 2
        );

        const assessorHeaderCell = worksheet.getCell(
          TABLE_HEADER_ROW,
          assessorStartCol
        );

        assessorHeaderCell.value = "Marks by Assessors";
        assessorHeaderCell.font = { bold: true };
        assessorHeaderCell.fill = baseHeaderFill;
        assessorHeaderCell.alignment = centerAlign;
        assessorHeaderCell.border = commonBorder;

        // Sub headers
        ["Theory Total", "Practical Total", "Viva Total"].forEach((title, i) => {
          const cell = worksheet.getCell(
            TABLE_SUB_HEADER_ROW,
            assessorStartCol + i
          );
          cell.value = title;
          cell.font = { bold: true };
          cell.fill = subHeaderFill;
          cell.alignment = centerAlign;
          cell.border = commonBorder;
        });


      // ===== ADD LAST 3 COLUMN HEADERS (Total / % / PassFail) =====
        const totalScoreCol = assessorStartCol + 3;
        const gradeCol = totalScoreCol + 3;
        worksheet.getCell(TABLE_HEADER_ROW, totalScoreCol).fill = nosHeaderFill;
        worksheet.getCell(TABLE_HEADER_ROW, totalScoreCol + 1).fill = nosHeaderFill;
        worksheet.getCell(TABLE_HEADER_ROW, totalScoreCol + 2).fill = nosHeaderFill;

        worksheet.getCell(TABLE_HEADER_ROW, totalScoreCol).border = commonBorder;
        worksheet.getCell(TABLE_HEADER_ROW, totalScoreCol + 1).border = commonBorder;
        worksheet.getCell(TABLE_HEADER_ROW, totalScoreCol + 2).border = commonBorder;

        worksheet.getCell(TABLE_HEADER_ROW, totalScoreCol).value = "Total Score";
        worksheet.getCell(TABLE_HEADER_ROW, totalScoreCol).font = { bold: true };
        worksheet.getCell(TABLE_HEADER_ROW, totalScoreCol).alignment = {
          horizontal: "center",
          vertical: "middle"
        };
        worksheet.mergeCells(
          TABLE_HEADER_ROW,
          totalScoreCol,
          TABLE_SUB_HEADER_ROW,
          totalScoreCol
        );

        worksheet.getCell(TABLE_HEADER_ROW, totalScoreCol + 1).value = "Percentage";
        worksheet.getCell(TABLE_HEADER_ROW, totalScoreCol + 1).font = { bold: true };
        worksheet.getCell(TABLE_HEADER_ROW, totalScoreCol + 1).alignment = {
          horizontal: "center",
          vertical: "middle"
        };
        worksheet.mergeCells(
          TABLE_HEADER_ROW,
          totalScoreCol + 1,
          TABLE_SUB_HEADER_ROW,
          totalScoreCol + 1
        );

        worksheet.getCell(TABLE_HEADER_ROW, totalScoreCol + 2).value = "Pass/Fail";
        worksheet.getCell(TABLE_HEADER_ROW, totalScoreCol + 2).font = { bold: true };
        worksheet.getCell(TABLE_HEADER_ROW, totalScoreCol + 2).alignment = {
          horizontal: "center",
          vertical: "middle"
        };
        worksheet.mergeCells(
          TABLE_HEADER_ROW,
          totalScoreCol + 2,
          TABLE_SUB_HEADER_ROW,
          totalScoreCol + 2
        );

        worksheet.getCell(TABLE_HEADER_ROW, gradeCol).value = "Grade";
        worksheet.getCell(TABLE_HEADER_ROW, gradeCol).font = { bold: true };
        worksheet.getCell(TABLE_HEADER_ROW, gradeCol).alignment = centerAlign;
        worksheet.getCell(TABLE_HEADER_ROW, gradeCol).border = commonBorder;
        worksheet.getCell(TABLE_HEADER_ROW, gradeCol).fill = nosHeaderFill;

        worksheet.mergeCells(
          TABLE_HEADER_ROW,
          gradeCol,
          TABLE_SUB_HEADER_ROW,
          gradeCol
        );

      

      let writtenTotalMarks = new Set();

      transformedData.forEach((user, index) => {
        let totalMarksRowValues = { sno: index + 1 };
        const percent = parseFloat(user.percentage) || 0;
        
        let obtainedMarksRowValues = {
          sno: index + 1,
          candidateName: user.candidateName,
          candidateId: user.candidateId,
          batchId: user.batchId,
          jobRole: user.jobRole || "NA",
          totalScore: user.totalScore,
          percentage: parseFloat(user.percentage),
          passfail: user.passfail,
          grade: calculateGrade(percent),
          attendance: "Attended",
        };
        
        // ===== MARKS BY ASSESSOR CALCULATION =====
        let theorySum = 0;
        let practicalSum = 0;
        let vivaSum = 0;

        let assessorTheoryTotal = 0;
        let assessorPracticalTotal = 0;
        let assessorVivaTotal = 0;

        subjects.forEach((subject) => {
          theorySum += user[subject]?.theory?.obtainedMarks || 0;
          practicalSum += user[subject]?.practical?.obtainedMarks || 0;
          vivaSum += user[subject]?.viva?.obtainedMarks || 0;
        });
        
        const assessorTotalScore = theorySum + practicalSum + vivaSum;

        // Push values in row
        obtainedMarksRowValues[`assessorTheory`] = theorySum;
        obtainedMarksRowValues[`assessorPractical`] = practicalSum;
        obtainedMarksRowValues[`assessorViva`] = vivaSum;

        

        subjects.forEach((subject) => {
            assessorTheoryTotal += user[subject]?.theory?.marks || 0;
            assessorPracticalTotal += user[subject]?.practical?.marks || 0;
            assessorVivaTotal += user[subject]?.viva?.marks || 0;
          ["Theory", "Practical", "Viva"].forEach((detail) => {
            const keyForTotalMarks = `${subject}${detail}`;
            if (!writtenTotalMarks.has(keyForTotalMarks)) {
              totalMarksRowValues[keyForTotalMarks] =
                user[subject][detail.toLowerCase()]["marks"];
              writtenTotalMarks.add(keyForTotalMarks);
            }
            obtainedMarksRowValues[keyForTotalMarks] =
              user[subject]?.[detail.toLowerCase()]?.["obtainedMarks"] ?? "NA";
          });
        });

        if (index === 0) {
          const totalMarksRow = {
            ...totalMarksRowValues,
            assessorTheory: assessorTheoryTotal,
            assessorPractical: assessorPracticalTotal,
            assessorViva: assessorVivaTotal,
            totalScore: user.totalScore || "",
            percentage: user.percentage || "",
          };
          delete totalMarksRow.sno;
          worksheet.addRow(totalMarksRow);
        }

        worksheet.addRow(obtainedMarksRowValues);
      });

            // 4. Process Absent/Not Submitted (Single Sheet)
            candidateList.forEach((candidate) => {
                if (!allOnineResult.some((result) => result.candidateId === candidate.candidateId)) {

                    // --- Logic for Status ---
                    let statusText = "Not Attended";
                    let resultText = "Fail";
                    let percentageText = "0%";
                    let totalScoreText = "0";

                    if (!candidate.isAssessmentStarted && isAssessmentPeriodOver) {
                        statusText = "Absent";
                        resultText = "Absent";
                        percentageText = "";
                        totalScoreText = "";
                    } else if (!candidate.isTestSubmitted) {
                        statusText = "Not Attended";
                        if (!candidate.isAssessmentStarted && !isAssessmentPeriodOver) {
                            resultText = "Not Attempted";
                        } else {
                            resultText = "Not Submitted";
                        }
                        percentageText = "";
                        totalScoreText = "";
                    }

                    const absentCandidateRow = {
                        sno: transformedData.length + 1,
                        candidateName: candidate.name,
                        candidateId: candidate?.candidateId ?? "",
                        batchId: allOnineResult[0]?.batchId ?? "",
                        jobRole: jobRole,
                        totalScore: totalScoreText,
                        percentage: percentageText,
                        passfail: resultText,
                        attendance: statusText,
                    };

                    subjects.forEach((subject) => {
                        ["Theory", "Practical", "Viva"].forEach((detail) => {
                            const keyForTotalMarks = `${subject}${detail}`;
                            if (!writtenTotalMarks.has(keyForTotalMarks)) {
                                absentCandidateRow[keyForTotalMarks] = 0;
                                writtenTotalMarks.add(keyForTotalMarks);
                            }
                            absentCandidateRow[keyForTotalMarks] = 0;
                        });
                    });
                    transformedData.push(absentCandidateRow);
                    worksheet.addRow(absentCandidateRow);
                }
            });

        worksheet.mergeCells(`A${TABLE_HEADER_ROW}:A${TABLE_SUB_HEADER_ROW}`);
        worksheet.mergeCells(`B${TABLE_HEADER_ROW}:B${TABLE_SUB_HEADER_ROW}`);
        worksheet.mergeCells(`C${TABLE_HEADER_ROW}:C${TABLE_SUB_HEADER_ROW}`);
        worksheet.mergeCells(`D${TABLE_HEADER_ROW}:D${TABLE_SUB_HEADER_ROW}`);
        worksheet.mergeCells(`E${TABLE_HEADER_ROW}:E${TABLE_SUB_HEADER_ROW}`);
        worksheet.mergeCells(`F${TABLE_HEADER_ROW}:F${TABLE_SUB_HEADER_ROW}`);
        worksheet.getRow(TABLE_HEADER_ROW).height = 55;
        worksheet.getRow(TABLE_SUB_HEADER_ROW).height = 32;
        worksheet.getRow(TABLE_HEADER_ROW).alignment = centerAlign;
        worksheet.getRow(TABLE_SUB_HEADER_ROW).alignment = centerAlign;

        const firstDataRow = TABLE_SUB_HEADER_ROW + 1;
        const lastDataRow = worksheet.lastRow.number;

        for (let row = firstDataRow; row <= lastDataRow; row++) {
          for (let col = assessorStartCol; col <= assessorStartCol + 2; col++) {
            const cell = worksheet.getCell(row, col);
            cell.fill = assessorFill;
            cell.border = commonBorder;
            cell.alignment = centerAlign;
          }
        }

      worksheet.columns.forEach((column) => {
        if (column.width < 12) {
          column.width = 12;
        }
      });

      const buffer = await workbook.xlsx.writeBuffer();

      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="CandidateResults.xlsx"'
      );

      res.send(buffer);
        } else {
          return errorResponse(res, 400, "No Candidate Found");
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



function convertTimeTo24Hour(timeStr) {
    if (!timeStr) return "00:00:00";
    // Example: "05:00PM" -> ["05:00", "PM"]
    const [time, modifier] = timeStr.toUpperCase().split(/(AM|PM)/);
    let [hours, minutes] = time.split(':');
    if (hours === '12') {
        hours = '00';
    }
    if (modifier === 'PM') {
        hours = parseInt(hours, 10) + 12;
    }
    // Ensure hours and minutes are two digits
    hours = String(hours).padStart(2, '0');
    minutes = minutes ? String(minutes).padStart(2, '0') : '00';
    // Return in "HH:MM:00" format
    return `${hours}:${minutes}:00`;
}
function calculateGrade(percentage) {
  if (!percentage || percentage <= 0) return "";

  if (percentage >= 85) return "A";
  if (percentage >= 70) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 1)  return "D";

  return "";
}

exports.downloadOMRSheet = async (req, res) => {
  try {
    const batchId = req.params.id;
    const batch = await Batch.findOne({ _id: batchId })
      .populate("jobRole clientId examCenterId accessorId questionPaper.qpCode")
      .populate({
        path: "examCenterId",
        populate: {
          path: "trainingPartner",
          model: "trainingPartner",
        },
      })
      .lean();
    if (!batch) {
      return res.status(404).json({ message: "Batch Not Found" });
    }
    const candidates = await Candidate.find({ batchId })
      .select(
        "candidateId aadharNo name mobile fatherName candidateType eligibility"
      )
      .lean();

    if (!candidates.length) {
      return res
        .status(404)
        .json({ message: "No candidates found for this batch" });
    }

    const client = batch.clientId?.clientcode || batch.clientId?.clientname || "default";
    const safeName = client.replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${safeName}_OMR.pdf`;
    const pdf = await generateOMRPDF();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=${fileName}`);
    res.setHeader("Content-Length", pdf.length);
    res.setHeader(
      "Access-Control-Expose-Headers",
      "Content-Disposition, Content-Length"
    );

    res.end(pdf);
    console.log("📄 PDF Successfully Delivered!");
  } catch (err) {
    console.log(" ERROR →", err);
    res.status(500).send("PDF generation failed");
  }
};