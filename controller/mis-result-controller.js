const BatchModel = require("../models/batch-model");
const CandidateModel = require("../models/candidate-model");
const AnswerModel = require("../models/answerModel");
const AnswerOfflineTheoryModel = require('../models/answerModelTheoryOffline');
const CandidateReportOffline = require("../models/candidateReportOffline");
const TheoryFileModel = require("../models/theoryfile-model");
const CandidateReport = require("../models/candidateReport");
const QuestionModel = require("../models/question");
const { sendResponse, errorResponse } = require("../utils/response");
const { getFilter } = require("../utils/custom-validators");
const ExcelJS = require("exceljs");
const { Paginate } = require("../utils/paginate");
const responseMessage = require("../utils/responseMessage");
const { months, monthResponse } = require("../utils/custom-validators");
const mongoose = require("mongoose");
const PracticalReportModel = require("../models/practicalReport");
const OfflineResultModel = require("../models/offlineResult-model");
const OnlineResultModel = require("../models/onlineResult-model");
const OldResultModel = require("../models/oldResult-model");
const createAssesmentModel = require("../models/createAssesment-model");
const SetModel = require("../models/setsModel");
const NosTheory = require("../models/nos-theory-model");
const moment = require("moment");
const fs = require("fs/promises");
const {
  candidate_Appeared_In_Batch,
  candidate_fail_pass_percentage,
  candidate_Appeared_In_Batch_v2,
} = require("../utils/dbQuery");
const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
//const reader = require("xlsx");
const ClientModel = require("../models/client-model");
const {
  AWS_ACCESS_KEY_ID,
  AWS_ACCESS_KEY_SECRET,
  AWS_BUCKET_NAME,
  AWS_REGION,
} = require("../config/envProvider");

const Joi = require("@hapi/joi");
const Vivaquestion = require("../models/vivaQuestion-model");
const practicalQuestion = require("../models/practicalQuestion-model");
const JSZip = require("jszip");
const { Readable } = require("stream");
const Batch = require("../models/batch-model");
const { formatToTwoDecimals } = require("../utils/formatToTwoDecimals");
const { ONLINE_RESULT_BATCH_LIST } = require("../constants/redis");
const RedisService = require("../utils/redisService");

const redis = new RedisService("db0");

// MIS DASHBOARD
exports.misWidgetStats = async (req, res, next) => {
  try {
    const clientId = req.params.clientId;
    // total Batch
    // const totalBatch = await BatchModel.countDocuments({clientId:clientId})
    // const batchData = await BatchModel.find({clientId:clientId})
    const totalBatch = await BatchModel.countDocuments();
    const batchData = await BatchModel.find();
    const batchIds = batchData.map((batch) => batch._id);

    //active batches
    // const activeBatch = await BatchModel.countDocuments({ $and: [ {clientId:clientId}, { status: true } ] })
    const activeBatch = await BatchModel.countDocuments();

    //total Candiates
    const totalCandidates = await CandidateModel.countDocuments({
      batchId: { $in: batchIds },
    });

    //total result generated or total assessment submitted
    const totalResult = await CandidateReport.countDocuments({
      batchId: { $in: batchIds },
    });

    return sendResponse(res, 200, "details available", {
      totalBatch: totalBatch || 0,
      activeBatch: activeBatch || 0,
      totalCandidates: totalCandidates || 0,
      totalResult: totalResult || 0,
    });
  } catch (error) {
    return errorResponse(
      res,
      400,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.resultPercentageStats = async (req, res, next) => {
  // data of all batch if no filter option is selected
  // data of a particular batch if a batch is selected
  // data of list of batches if a date range is selected

  try {
    const clientId = req.params.clientId;
    // const batchId = req.query.batchId
    // const batchData = await BatchModel.find({clientId:clientId})
    const totalBatch = await BatchModel.countDocuments();
    const batchData = await BatchModel.find();
    const batchIds = batchData.map((batch) => batch._id);
    // const query = batchId ? {batchId: batchId} : { batchId: { $in: batchIds } }
    const query = { batchId: { $in: batchIds } };
    const totalCandidates = await CandidateModel.countDocuments(query);

    //total result generated or total assessment submitted
    const candidateResult = await CandidateReport.find(query);

    const passedCandidate = candidateResult.filter(
      (candidate) => candidate.passedStatus === "Pass"
    );
    const failedCandidate = candidateResult.filter(
      (candidate) => candidate.passedStatus === "Fail"
    );

    const candidatesNotAppear =
      totalCandidates - (passedCandidate.length + failedCandidate.length);

    const percentagePassed = (passedCandidate.length / totalCandidates) * 100;
    const percentageFailed = (failedCandidate.length / totalCandidates) * 100;
    const percentageNotAppeared = (candidatesNotAppear / totalCandidates) * 100;

    return sendResponse(res, 200, "batch result percentage", {
      passedCandidate: `${percentagePassed.toFixed(2)}%`,
      failedCandidate: `${percentageFailed.toFixed(2)}%`,
      notGivenTest: `${percentageNotAppeared.toFixed(2)}%`,
      totalCandidates: totalCandidates || 0,
    });
  } catch (error) {
    return errorResponse(
      res,
      400,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.batchByMonth = async (req, res, next) => {
  try {
    const clientId = req.params.clientId;
    const response = await BatchModel.aggregate([
      // { $match: {clientId: mongoose.Types.ObjectId(clientId)}},
      { $project: { month: { $month: "$createdAt" } } },
      {
        $group: {
          _id: "$month",
          monthNumber: { $first: "$month" },
          value: { $sum: 1 },
        },
      },
    ]);

    // maping response month no with months name
    console.log("response-->", response);
    monthResponse.forEach((value) => {
      response.map((data) => {
        if (data.monthNumber === value.monthNo) {
          value.value = data.value;
        }
      });
    });

    if (!response) {
      return errorResponse(
        res,
        404,
        "no batch details found",
        "no batch details found"
      );
    }

    return sendResponse(res, 200, "batch by month", monthResponse);
  } catch (error) {
    return errorResponse(
      res,
      400,
      responseMessage.something_wrong,
      error.message
    );
  }
};

// RESULT

module.exports.resultBatchList = async (req, res) => {
  try {
    let filter = getFilter(req, ["batchId"], true);

    const from = req?.query?.from;
    const to = req?.query?.to;

    const { page, limit, skip, sortOrder } = Paginate(req);
    sortOrder["-id"] = -1;

    let query = filter ? filter.query : {};

    if (from || to) {
      const fromDate = new Date(from);
      const formattedfromDate = fromDate.toISOString();

      const rawToDate = moment(to);
      const rawToDate2 = rawToDate.add(1, "days");
      const toDate = new Date(rawToDate2);
      const formattedToDate = toDate.toISOString();
      query["createdAt"] = { $gte: formattedfromDate, $lte: formattedToDate };
    }

    query = { ...query, batchMode: "online" };
    const totalCounts = await BatchModel.countDocuments(query);

    const totalPages = Math.ceil(totalCounts / limit);

    const batchDetails = await BatchModel.find(query)
      .populate([
        { path: "clientId", select: "" },
        { path: "jobRole", select: "jobRole" },
        { path: "accessorId", select: "" },
      ])
      .populate({
        path: "questionPaper.multipleJobRole.jobRoleId",
        select: "",
      })
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);
    if (!batchDetails)
      return errorResponse(
        res,
        400,
        responseMessage.batch_not_found,
        responseMessage.errorMessage
      );

    let batchList = [];
    batchDetails.forEach((batch) => {
      batchList.push({
        batchId: batch.batchId,
        _id: batch._id,
        mode: batch.batchMode,
        qpCode: batch.jobRole?.qpCode,
        clientName: batch.clientId?.clientname,
        jobRole: batch.jobRole?.jobRole,
        accessorName: batch.accessorId?.fullName || "NA",
        batchSize: batch.batchSize,
        assessmentStartDate: batch.startDate,
        assessmentEndDate: batch.endDate,
        isMultiJobRole: batch.questionPaper.isMultiJobRole,
        multipleJobRole: batch.questionPaper.multipleJobRole,
        isTrainingPartnerSubmittedFeedback: batch.isTrainingPartnerSubmittedFeedback || false,
        isAssessorSubmittedFeedback: batch.isAssessorSubmittedFeedback || false,
      });
    });

    const batchIds = batchList.map((item) => item._id);
    const batchModes = batchList.reduce((acc, item, index) => {
      acc[index] = item.mode;
      return acc;
    }, {});

    // Fetch candidate attendance in bulk
    const candidateAttendanceMap = Object.fromEntries(
      await Promise.all(
        batchIds.map(async (batchId, index) => {
          const result = await candidate_Appeared_In_Batch(
            batchId,
            batchModes[index.toString()]
          );
          return [batchId.toString(), result]; // Ensure batchId is a string
        })
      )
    );

    // Fetch pass/fail percentages in bulk
    const passFailDataMap = {};

    for (const batchId of batchIds) {
      passFailDataMap[batchId.toString()] =
        await candidate_fail_pass_percentage(batchId);
    }

    // Combine results efficiently
    const response = batchList.map((item) => {
      const itemId = item._id.toString(); // Ensure consistent key format

      return {
        ...(item.toObject?.() ?? JSON.parse(JSON.stringify(item))), // Normalize document
        candidate_Appeared_In_Batch: candidateAttendanceMap[itemId] || {
          totalCandidates: 0,
          candidateAttended: 0,
        },
        ...(passFailDataMap[itemId] || {
          passedPercentage: "0.00%",
          failedCandidate: "0/0",
          resultRegenerated: "0/0",
        }),
      };
    });

    return sendResponse(res, 200, responseMessage.batch_found, {
      batchList: response,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.onlineResultBatchList = async (req, res) => {
  try {
    const enableClientFilter = true;
    let filter = getFilter(req, ["batchId"], enableClientFilter);
    const from = req?.query?.from;
    const to = req?.query?.to;
    const search = req?.query?.search?.trim()?.replace(/\s+/g, "_") || "all";

    const { page, limit, skip, sortOrder } = Paginate(req);
    sortOrder["-id"] = -1;

    let query = filter?.query || {};
    if (from || to) {
      const fromDate = new Date(from);
      const formattedFrom = fromDate.toISOString();

      const toDate = moment(to).add(1, "days").toDate();
      const formattedTo = toDate.toISOString();

      query["createdAt"] = { $gte: formattedFrom, $lte: formattedTo };
    }

    query = { ...query, batchMode: "online" };

    if (enableClientFilter && req.user?.assigndClients) {
      clientScope = `user_${req.user.id || req.user._id}`;
    } else {
      clientScope = "all_clients";
    }

    // 2. Build the final Redis key using the dynamic scope
    const redisKey = `${ONLINE_RESULT_BATCH_LIST}:${clientScope}:${
      from || "null"
    }:${to || "null"}:search_${search || "none"}:page_${page}:limit_${limit}`;

    // ✅ Check Redis cache
    const cachedData = await redis.get(redisKey);

    if (cachedData) {
      return sendResponse(
        res,
        200,
        responseMessage.batch_found,
        cachedData,
        true
      );
    }

    const totalCounts = await BatchModel.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);

    const batchDetails = await BatchModel.aggregate([
      { $match: query },
      { $sort: sortOrder },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          batchId: 1,
          batchMode: 1,
          startDate: 1,
          endDate: 1,
          batchSize: 1,
          clientName: "$clientname",
          jobRole: "$jobRoleNames",
          accessorName: "$accessorName",
          isTrainingPartnerSubmittedFeedback: 1,
          isAssessorSubmittedFeedback: 1,
        },
      },
    ]);

    if (!batchDetails?.length)
      return errorResponse(
        res,
        400,
        responseMessage.batch_not_found,
        responseMessage.errorMessage
      );

    const batchList = batchDetails.map((batch) => ({
      _id: batch._id,
      batchId: batch.batchId,
      clientName: batch.clientName,
      jobRole: batch.jobRole,
      assessmentStartDate: batch.startDate,
      assessmentEndDate: batch.endDate,
      accessorName: batch.accessorName || "NA",
      batchSize: batch.batchSize,
      mode: batch.batchMode,
      isAssessorSubmittedFeedback: batch.isAssessorSubmittedFeedback || false,
      isTrainingPartnerSubmittedFeedback:
        batch.isTrainingPartnerSubmittedFeedback || false,
    }));

    const batchIds = batchList.map((item) => item._id.toString());
    const batchModes = Object.fromEntries(
      batchList.map((b, i) => [b._id.toString(), b.mode])
    );

    const candidateAttendanceMap = await candidate_Appeared_In_Batch_v2(
      batchIds,
      batchModes
    );

    const response = batchList.map((item) => {
      const id = item._id.toString();
      return {
        _id: id,
        batchId: item.batchId,
        clientName: item.clientName,
        jobRole: item.jobRole,
        assessmentStartDate: item.assessmentStartDate,
        assessmentEndDate: item.assessmentEndDate,
        accessorName: item.accessorName,
        batchSize: item.batchSize,
        candidate_Appeared_In_Batch: candidateAttendanceMap[id] || 0,
        isAssessorSubmittedFeedback: item.isAssessorSubmittedFeedback || false,
        isTrainingPartnerSubmittedFeedback:
          item.isTrainingPartnerSubmittedFeedback || false,
      };
    });

    const finalResponse = {
      batchList: response,
      page,
      totalCounts,
      totalPages,
    };

    await redis.set(redisKey, finalResponse, process.env.REDIS_DEFAULT_EXPIRY);

    return sendResponse(res, 200, responseMessage.batch_found, finalResponse);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
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

exports.getCandiateResultByBatch = async (req, res) => {
  try {
    let filter = getFilter(req, ["name", "candidateId"]);
    const { page, limit, skip, sortOrder } = Paginate(req);
    sortOrder["_id"] = -1;

    let query = filter ? filter.query : {};
    query = { ...query, batchId: req?.params?.batchId }; // Modified query: remove isTestSubmitted filter

    const batchDetails = await Batch.findById(req?.params?.batchId).populate({
      path: "questionPaper.multipleJobRole.jobRoleId",
      select: "jobRole",
    });

    // Calculate assessment end timestamp using startDate, endDate, startTime, and endTime
    let assessmentEndTimestamp = 0;

    if (batchDetails?.endDate && batchDetails?.endTime) {
      const dateParts = batchDetails.endDate.split('/'); 
      // Reconstruct date string to YYYY-MM-DD (ISO Format)
      // Assumes DD/MM/YYYY: dateParts[0]=Day, dateParts[1]=Month, dateParts[2]=Year
      const isoDateString = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`; 
      
      // Fix time format to 24-hour clock (e.g., 05:00PM -> 17:00:00)
      const time24Hour = convertTimeTo24Hour(batchDetails.endTime);
      
      // Combine into a safe, unambiguous date string
      const endDateTimeString = `${isoDateString}T${time24Hour}`; 
      
      assessmentEndTimestamp = new Date(endDateTimeString).getTime();
    }
    const currentTimestamp = new Date().getTime();
    const isAssessmentPeriodOver = currentTimestamp > assessmentEndTimestamp && assessmentEndTimestamp !== 0; 

    const totalCounts = await CandidateModel.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);

    const candidateList = await CandidateModel.find(query)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .populate([
        {
          path: "batchId",
          populate: [
            { path: "jobRole" },
            {
              path: "questionPaper.multipleJobRole.jobRoleId",
              select: "passingPercentage jobRole qpCode",
            },
          ],
        },
      ]);

    if (candidateList.length > 0) {
      const candidateIds = candidateList.map((candidate) => candidate._id);
      const candidateSectionResult = await OnlineResultModel.aggregate([
        {
          $match: {
            candidate_mongo_id: { $in: candidateIds },
          },
        },
        {
          $sort: {
            updatedAt: -1,
          },
        },
        {
          $group: {
            _id: "$candidate_mongo_id",
            doc: { $first: "$$ROOT" },
          },
        },
        {
          $replaceRoot: {
            newRoot: "$doc",
          },
        },
      ]);

      // Get NOS mapping data based on batch's job roles
      const jobRoleNames = [];
      if (batchDetails.questionPaper.isMultiJobRole) {
        jobRoleNames.push(
          ...batchDetails.questionPaper.multipleJobRole.map(
            (job) => job.jobRoleId.jobRole
          )
        );
      } else {
        jobRoleNames.push(batchDetails.jobRole.jobRole);
      }

      const theoryNosList = await NosTheory.find({
        jobRole: { $in: jobRoleNames },
      });

      const nosToJobRoleMap = {};

      theoryNosList.forEach((theory) => {
        theory.nosData?.forEach((nos) => {
          // Store both the full NOS name and any trimmed version
          const nosName = nos.NOS.replace(/\\n|\n/g, "").trim();
          const trimmedNosName = nosName.trim().replace(/\r\n/g, " ");

          const shortNosName = nosName.split(".")[0];
          nosToJobRoleMap[nosName] = theory.jobRole;
          nosToJobRoleMap[trimmedNosName] = theory.jobRole;
          nosToJobRoleMap[shortNosName] = theory.jobRole;
        });
      });

      let candiateReport = [];
      let sectionTable = [];

      candidateList.forEach((candidate, index) => {
        let sectionStats = {};
        let distMarkwithdiffJobRole = {};

        candidateSectionResult.forEach((result) => {
          if (
            candidate._id.toString() === result.candidate_mongo_id.toString()
          ) {
            // Process distributed marks for different job roles
            if (result.nosResult && result.nosResult.length > 0) {
              // First, let's collect all NOS for each job role
              result.nosResult.forEach((nos) => {
                const nosName = nos.nosName.replace(/\\n|\n/g, "").trim();
                const trimmedNosName = nos.nosName
                  .replace(/\\n|\n/g, "")
                  .trim();
                const shortNosName = nosName.split(".")[0]; // Get just the NOS code

                // Try all possible versions to find a match
                const jobRole =
                  nosToJobRoleMap[nosName] ||
                  nosToJobRoleMap[trimmedNosName] ||
                  nosToJobRoleMap[shortNosName];
                if (jobRole) {
                  if (!distMarkwithdiffJobRole[jobRole]) {
                    distMarkwithdiffJobRole[jobRole] = {
                      jobRoleName: jobRole,
                      obtainedTheoryMarks: 0,
                      obtainedPracticalMarks: 0,
                      obtainedVivaMarks: 0,
                      totalTheoryMarks: 0,
                      totalPracticalMarks: 0,
                      totalVivaMarks: 0,
                      nosList: [],
                    };
                  }

                  // Store all details in nosList
                  const obtainedTheory = formatToTwoDecimals(
                    nos.obtainedTheoryMarks || 0
                  );
                  const obtainedPractical = formatToTwoDecimals(
                    nos.obtainedPracticalMarks || 0
                  );
                  const obtainedViva = formatToTwoDecimals(
                    nos.obtainedVivaMarks || 0
                  );
                  const totalTheory = formatToTwoDecimals(nos.theoryMarks || 0);
                  const totalPractical = formatToTwoDecimals(
                    nos.practicalMarks || 0
                  );
                  const totalViva = formatToTwoDecimals(nos.vivaMarks || 0);

                  // Add NOS with all its details
                  distMarkwithdiffJobRole[jobRole].nosList.push({
                    nosName: nosName,
                    theory: {
                      obtainedMarks: obtainedTheory,
                      totalMarks: totalTheory,
                    },
                    practical: {
                      obtainedMarks: obtainedPractical,
                      totalMarks: totalPractical,
                    },
                    viva: {
                      obtainedMarks: obtainedViva,
                      totalMarks: totalViva,
                    },
                  });

                  // Update total marks
                  distMarkwithdiffJobRole[jobRole].obtainedTheoryMarks +=
                    obtainedTheory;
                  distMarkwithdiffJobRole[jobRole].obtainedTheoryMarks =
                    formatToTwoDecimals(
                      distMarkwithdiffJobRole[jobRole].obtainedTheoryMarks
                    );
                  distMarkwithdiffJobRole[jobRole].obtainedPracticalMarks +=
                    obtainedPractical;
                  distMarkwithdiffJobRole[jobRole].obtainedPracticalMarks =
                    formatToTwoDecimals(
                      distMarkwithdiffJobRole[jobRole].obtainedPracticalMarks
                    );
                  distMarkwithdiffJobRole[jobRole].obtainedVivaMarks +=
                    obtainedViva;
                  distMarkwithdiffJobRole[jobRole].obtainedVivaMarks =
                    formatToTwoDecimals(
                      distMarkwithdiffJobRole[jobRole].obtainedVivaMarks
                    );
                  distMarkwithdiffJobRole[jobRole].totalTheoryMarks +=
                    totalTheory;
                  distMarkwithdiffJobRole[jobRole].totalTheoryMarks =
                    formatToTwoDecimals(
                      distMarkwithdiffJobRole[jobRole].totalTheoryMarks
                    );
                  distMarkwithdiffJobRole[jobRole].totalPracticalMarks +=
                    totalPractical;
                  distMarkwithdiffJobRole[jobRole].totalPracticalMarks =
                    formatToTwoDecimals(
                      distMarkwithdiffJobRole[jobRole].totalPracticalMarks
                    );
                  distMarkwithdiffJobRole[jobRole].totalVivaMarks += totalViva;
                  distMarkwithdiffJobRole[jobRole].totalVivaMarks =
                    formatToTwoDecimals(
                      distMarkwithdiffJobRole[jobRole].totalVivaMarks
                    );
                }
              });

              // Convert to array and add summary
              const distributedMarksArray = Object.values(
                distMarkwithdiffJobRole
              ).map((jobRoleMarks) => {
                return {
                  jobRoleName: jobRoleMarks.jobRoleName,
                  obtainedTheoryMarks: jobRoleMarks.obtainedTheoryMarks,
                  totalTheoryMarks: jobRoleMarks.totalTheoryMarks,
                  obtainedPracticalMarks: jobRoleMarks.obtainedPracticalMarks,
                  totalPracticalMarks: jobRoleMarks.totalPracticalMarks,
                  obtainedVivaMarks: jobRoleMarks.obtainedVivaMarks,
                  totalVivaMarks: jobRoleMarks.totalVivaMarks,
                  nosList: jobRoleMarks.nosList,
                };
              });
              sectionStats = {
                totalTheoryMarks: result?.totalTheoryMarks?.toString() || "0",
                totalPracticalMarks:
                  result?.totalPracticalMarks?.toString() || "0",
                totalVivaMarks: result?.totalVivaMarks?.toString() || "0",
                obtainedTotalTheoryMarks:
                  result?.obtainedTotalTheoryMarks?.toString() || "0",
                obtainedTotalPracticalMarks:
                  result?.obtainedTotalPracticalMarks?.toString() || "0",
                obtainedTotalVivaMarks:
                  result?.obtainedTotalVivaMarks?.toString() || "0",
                result: result?.result || "Not Attempted",
                passedStatus: result?.passedStatus || "Not-attempt",
                percentageScored: result?.percentageScored?.toString() || "0",
                passingPercentage:
                  candidate?.batchId?.questionPaper?.passingPercentage?.toString() ||
                  "0",
                distributedMarks: distributedMarksArray,
                grandTotalMarks: result?.grandTotalMarks.toString() || "0",
                obtainedGrandTotalMarks:
                  result?.obtainedGrandTotalMarks.toString() || "0",
                percentage: result?.percentage.toString() || "0",
              };
            }
          }
        });

        if (index === 0 && candidate.batchId?.questionPaper?.sectionTable) {
          sectionTable = candidate.batchId.questionPaper.sectionTable;
        }

        let { batchId } = candidate;
        let response = {
          batchId: batchId.batchId,
          jobRole: batchId.jobRole?.jobRole,
          name: candidate.name,
          candidateId: candidate.candidateId,
          userName: candidate.userName,
          fatherName: candidate.fatherName,
          _id: candidate._id,
          examDate: batchId.assessmentDate,
          aadharNo: candidate.aadharNo,
          dob: candidate.dob,
          gender: candidate.gender,
          email: candidate.email,
          mobile: candidate.mobile,
        };
        if (!candidate.isAssessmentStarted && isAssessmentPeriodOver) {
          response = {
            ...response,
            result: "Absent", // Clearly mark as Absent
            passedStatus: "Absent", // Use the same status for consistency
            totalTheoryMarks: "",
            // All other result fields should be empty/zeroed
            totalPracticalMarks: "",
            totalVivaMarks: "",
            obtainedTotalTheoryMarks: "",
            obtainedTotalPracticalMarks: "",
            obtainedTotalVivaMarks: "",
            percentageScored: "",
            passingPercentage: "",
            distributedMarks: [],
            grandTotalMarks: "",
            obtainedGrandTotalMarks: "",
            percentage: "",
          };
        } // Check if the candidate has submitted the test
        else if (!candidate.isTestSubmitted) {
          // Create a minimal response for candidates who haven't submitted
          let statusResult = "Not Submitted";
            let statusPassed = "Not-attempt";
            
            if (!candidate.isAssessmentStarted && !isAssessmentPeriodOver) {
              // If they haven't started BUT exam is ONGOING -> Not Attempted
                statusResult = "Not Attempted";
                statusPassed = "Not-attempt";
            }

          response = {
            ...response,
            result: statusResult, // Indicate that the test was not submitted
            totalTheoryMarks: "",
            totalPracticalMarks: "",
            totalVivaMarks: "",
            obtainedTotalTheoryMarks: "",
            obtainedTotalPracticalMarks: "",
            obtainedTotalVivaMarks: "",
            passedStatus:statusPassed,
            percentageScored: "",
            passingPercentage: "",
            distributedMarks: [],
            grandTotalMarks: "",
            obtainedGrandTotalMarks: "",
            percentage: "",
          };
        } else {
          // Process results for candidates who have submitted the test
          candidateSectionResult.forEach((result) => {
            if (
              candidate._id.toString() === result.candidate_mongo_id.toString()
            ) {
              // Process distributed marks for different job roles
              if (result.nosResult && result.nosResult.length > 0) {
                // First, let's collect all NOS for each job role
                result.nosResult.forEach((nos) => {
                  const nosName = nos.nosName.replace(/\\n|\n/g, "").trim();
                  const trimmedNosName = nos.nosName
                    .replace(/\\n|\n/g, "")
                    .trim();
                  const shortNosName = nosName.split(".")[0]; // Get just the NOS code

                  // Try all possible versions to find a match
                  const jobRole =
                    nosToJobRoleMap[nosName] ||
                    nosToJobRoleMap[trimmedNosName] ||
                    nosToJobRoleMap[shortNosName];
                  if (jobRole) {
                    if (!distMarkwithdiffJobRole[jobRole]) {
                      distMarkwithdiffJobRole[jobRole] = {
                        jobRoleName: jobRole,
                        obtainedTheoryMarks: 0,
                        obtainedPracticalMarks: 0,
                        obtainedVivaMarks: 0,
                        totalTheoryMarks: 0,
                        totalPracticalMarks: 0,
                        totalVivaMarks: 0,
                        nosList: [],
                      };
                    }

                    // Store all details in nosList
                    const obtainedTheory = parseFloat(
                      nos.obtainedTheoryMarks || 0
                    );
                    const obtainedPractical = parseFloat(
                      nos.obtainedPracticalMarks || 0
                    );
                    const obtainedViva = parseFloat(nos.obtainedVivaMarks || 0);
                    const totalTheory = parseFloat(nos.theoryMarks || 0);
                    const totalPractical = parseFloat(nos.practicalMarks || 0);
                    const totalViva = parseFloat(nos.vivaMarks || 0);

                    // Add NOS with all its details
                    distMarkwithdiffJobRole[jobRole].nosList.push({
                      nosName: nosName,
                      theory: {
                        obtainedMarks: obtainedTheory,
                        totalMarks: totalTheory,
                      },
                      practical: {
                        obtainedMarks: obtainedPractical,
                        totalMarks: totalPractical,
                      },
                      viva: {
                        obtainedMarks: obtainedViva,
                        totalMarks: totalViva,
                      },
                    });

                    // Update total marks
                    distMarkwithdiffJobRole[jobRole].obtainedTheoryMarks +=
                      obtainedTheory;
                    distMarkwithdiffJobRole[jobRole].obtainedPracticalMarks +=
                      obtainedPractical;
                    distMarkwithdiffJobRole[jobRole].obtainedVivaMarks +=
                      obtainedViva;
                    distMarkwithdiffJobRole[jobRole].totalTheoryMarks +=
                      totalTheory;
                    distMarkwithdiffJobRole[jobRole].totalPracticalMarks +=
                      totalPractical;
                    distMarkwithdiffJobRole[jobRole].totalVivaMarks +=
                      totalViva;
                  }
                });

                // Convert to array and add summary
                const distributedMarksArray = Object.values(
                  distMarkwithdiffJobRole
                ).map((jobRoleMarks) => {
                  return {
                    jobRoleName: jobRoleMarks.jobRoleName,
                    obtainedTheoryMarks: jobRoleMarks.obtainedTheoryMarks,
                    totalTheoryMarks: jobRoleMarks.totalTheoryMarks,
                    obtainedPracticalMarks: jobRoleMarks.obtainedPracticalMarks,
                    totalPracticalMarks: jobRoleMarks.totalPracticalMarks,
                    obtainedVivaMarks: jobRoleMarks.obtainedVivaMarks,
                    totalVivaMarks: jobRoleMarks.totalVivaMarks,
                    nosList: jobRoleMarks.nosList,
                  };
                });

                sectionStats = {
                  totalTheoryMarks: result?.totalTheoryMarks?.toString() || "0",
                  totalPracticalMarks:
                    result?.totalPracticalMarks?.toString() || "0",
                  totalVivaMarks: result?.totalVivaMarks?.toString() || "0",
                  obtainedTotalTheoryMarks:
                    result?.obtainedTotalTheoryMarks?.toString() || "0",
                  obtainedTotalPracticalMarks:
                    result?.obtainedTotalPracticalMarks?.toString() || "0",
                  obtainedTotalVivaMarks:
                    result?.obtainedTotalVivaMarks?.toString() || "0",
                  result: result?.result || "Not Attempted",
                  passedStatus: result?.passedStatus || "Not-attempt",
                  percentageScored: result?.percentageScored?.toString() || "0",
                  passingPercentage:
                    candidate?.batchId?.questionPaper?.passingPercentage?.toString() ||
                    "0",
                  distributedMarks: distributedMarksArray,
                  grandTotalMarks: result?.grandTotalMarks.toString() || "0",
                  obtainedGrandTotalMarks:
                    result?.obtainedGrandTotalMarks.toString() || "0",
                  percentage: result?.percentage.toString() || "0",
                };
              }
            }
          });

          response = {
            ...response,
            ...sectionStats,
            distributedMarks: Object.values(distMarkwithdiffJobRole), // Convert to array format
          };
        }

        candiateReport.push(response);
      });

      return sendResponse(res, 200, "Candidate List", {
        candiateReport,
        sectionTable,
        batch: batchDetails,
        page,
        totalCounts,
        totalPages,
      });
    }
    const batch = await Batch.findById(req?.params?.batchId);
    const data = {};
    if (batch) {
      data["batchName"] = batch.batchId;
    }
    return sendResponse(res, 200, "", data);
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};



exports.singleCandidateResult = async (req, res) => {
  try {
    // console.log(req?.params?.batchId)
    // console.log(req?.params?.candidateId )
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
        populate: {
          path: "clientId jobRole questionPaper.multipleJobRole.jobRoleId",
        },
      },
    ]);

    if (candidateList.length > 0) {
      const candidateIds = await candidateList.map(
        (candidate) => candidate._id
      );
      const candidateResult = await CandidateReport.find({
        candidateId: { $in: candidateIds },
      });
      const answerDetail = await AnswerModel.findOne({
        $and: [
          { batchId: req?.params?.batchId },
          { candidateId: req?.params?.candidateId },
        ],
      });

      if (!answerDetail)
        return errorResponse(
          res,
          400,
          "No result found for this candidate.",
          "No result found for this candidate."
        );
      //to get the count of question status
      const questionStatusCountResponse = questionStatusCount(
        answerDetail?.questions
      );
      const {
        notAnswered,
        answered,
        notAttempt,
        markForReview,
        answeredMarkForReview,
        totalQuestionCount,
      } = questionStatusCountResponse;

      let nosWiseResultList = [];

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

      const questionIds = answerDetail?.questions?.map(
        (question) => question._id
      );

      const rawQuestions = await QuestionModel.find({
        _id: { $in: questionIds },
      });

      let questionWithAnswer = [];
      // answerDetail.questions.map(question=> {
      //         rawQuestions.map(rawQuestion => {
      //             if(question._id.toString() === rawQuestion._id.toString()){
      //                 questionWithAnswer.push({ ...JSON.parse(JSON.stringify(question)), answer: rawQuestion.answer})
      //             }
      //        })
      // })

      answerDetail.questions.map((question) => {
        rawQuestions.map((rawQuestion) => {
          if (question._id.toString() === rawQuestion._id.toString()) {
            const modifiedQuestion = {
              ...JSON.parse(JSON.stringify(question)),
              options: question.options?.sort((a, b) => {
                const keyA = a.optionKey.slice(-1); // Get the last character of optionKey
                const keyB = b.optionKey.slice(-1);
                return keyA.localeCompare(keyB); // Compare based on the last character
              }),
            };

            questionWithAnswer.push({
              ...modifiedQuestion,
              answer: rawQuestion.answer,
            });
          }
        });
      });

      const response = {
        ...JSON.parse(JSON.stringify(answerDetail)),
        questions: questionWithAnswer,
      };

      // loginTime
      // startTime
      // resumeTime
      // endTime
      // passwordResetTime
      // userLogout

      //candidate pic
      // candidate id

      const candidatekeys = [
        `${req?.params?.candidateId}_face`,
        `${req?.params?.candidateId}_id`,
      ];

      const getImageUrls = async () => {
        try {
          const results = await Promise.all(
            candidatekeys.map((key) => getFileUrl(key))
          );
          return results;
        } catch (error) {
          console.error("Error getting image URLs:", error);
        }
      };

      const candidateLogs = {
        loginTime: candidateList[0].loginTime || 0,
        startTime: answerDetail.startTime || 0,
        endTime: answerDetail.endTime || 0,
        resumeTime: candidateList[0].resumeTime || 0,
        passwordResetTime: candidateList[0].passwordResetTime || 0,
        userLogout: candidateList[0].logoutTime || 0,
      };

      const candidateAttendance = await getImageUrls();
      // if(candidateAttendance){
      //     console.log("candidateAttendance--->> ", candidateAttendance)
      // }

      return sendResponse(res, 200, "Candidate List", {
        candidateList,
        candiateReport,
        answerDetail: response,
        candidateLogs,
        candidateAttendance,
        notAnswered,
        answered,
        notAttempt,
        markForReview,
        answeredMarkForReview,
        totalQuestionCount,
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

exports.getCandiateNosWiseResultByBatch = async (req, res) => {
  try {
    let filter = getFilter(req, ["batchId"]);

    const { page, limit, skip, sortOrder } = Paginate(req);

    let query = filter ? filter.query : {};
    query = { ...query, batchId: req?.params?.batchId, isTestSubmitted: true };

    const totalCounts = await CandidateModel.countDocuments(query);

    const totalPages = Math.ceil(totalCounts / limit);

    const candidateList = await CandidateModel.find(query, {
      rawPassword: 0,
      password: 0,
    })
      // .populate([{ path: 'batchId', populate: { path: 'clientId' } }])
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    if (candidateList.length !== 0) {
      const candidateIds = await candidateList.map(
        (candidate) => candidate._id
      );
      //const candidateResult = await AnswerModel.find({ candidateId : { $in : candidateIds }}).populate({path: 'questions.question_bank_id', select: ['nosId', 'nos']})
      const candidateResult = await AnswerModel.find({
        candidateId: { $in: candidateIds },
      }).populate([
        { path: "questions.question_bank_id", select: "" },
        { path: "candidateId", select: ["candidateId", "name"] },
      ]);

      const candidateReport = await CandidateReport.find({
        candidateId: { $in: candidateIds },
      });

      // let questionIds = []
      let nosWiseResultList = [];
      let nosWiseObtainedResultlist = [];

      candidateResult.forEach((candidate) => {
        let nosWiseTheoryMarksOfOneCandidate = {};
        let obtainedMarksAsPerCorrectAnswerIds = {};

        candidate.questions.forEach((question) => {
          //   questionIds.push(question._id)

          if (
            nosWiseTheoryMarksOfOneCandidate.hasOwnProperty(
              question.question_bank_id?.nos
            )
          ) {
            nosWiseTheoryMarksOfOneCandidate[question.question_bank_id?.nos] +=
              question.marks;
          } else {
            nosWiseTheoryMarksOfOneCandidate[question.question_bank_id?.nos] =
              question.marks;
          }
        });

        candidateReport.forEach((item) => {
          if (
            candidate.candidateId?._id.toString() ===
            item.candidateId.toString()
          ) {
            candidate.questions.forEach((question) => {
              if (item.correctAnswerIds?.includes(question._id)) {
                if (
                  obtainedMarksAsPerCorrectAnswerIds.hasOwnProperty(
                    `obtained_${question.question_bank_id?.nos}`
                  )
                ) {
                  obtainedMarksAsPerCorrectAnswerIds[
                    `obtained_${question.question_bank_id?.nos}`
                  ] += question.marks;
                } else {
                  obtainedMarksAsPerCorrectAnswerIds[
                    `obtained_${question.question_bank_id?.nos}`
                  ] = question.marks;
                }
              }
            });
          } else {
            console.log("no candidate id got matched");
          }
        });

        nosWiseResultList.push({
          ...nosWiseTheoryMarksOfOneCandidate,
          candidateId: candidate.candidateId.candidateId,
          name: candidate.candidateId.name,
          _id: candidate.candidateId._id,
        });

        nosWiseObtainedResultlist.push({
          ...obtainedMarksAsPerCorrectAnswerIds,
          candidateId: candidate.candidateId.candidateId,
          name: candidate.candidateId.name,
          _id: candidate.candidateId._id,
        });
      });

      console.log("nosWiseResultList--->", nosWiseResultList);

      //const rawQuestions = await QuestionModel.find({ _id: {$in : questionIds }}).populate('question_bank_id')
      const mergedArray = nosWiseResultList.map((result) => ({
        ...result,
        ...nosWiseObtainedResultlist.find(
          (obtainedResult) => obtainedResult._id === result._id
        ),
      }));

      return sendResponse(res, 200, "candidate nos wish theory marks list", {
        resultList: mergedArray,
        page,
        totalCounts,
        totalPages,
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
  notAttempt = notAttempt - totalCount;

  return {
    notAnswered,
    answered,
    notAttempt,
    markForReview,
    answeredMarkForReview,
    totalQuestionCount: questions?.length,
  };
};

module.exports.resultBatchListOffline = async (req, res) => {
  try {
    let filter = getFilter(req, ["batchId"], true);

    const from = req?.query?.from;
    const to = req?.query?.to;

    const { page, limit, skip, sortOrder } = Paginate(req);

    let query = filter ? filter.query : {};

    if (from || to) {
      const fromDate = new Date(from);
      const formattedfromDate = fromDate.toISOString();

      const rawToDate = moment(to);
      const rawToDate2 = rawToDate.add(1, "days");
      const toDate = new Date(rawToDate2);
      const formattedToDate = toDate.toISOString();
      query["createdAt"] = { $gte: formattedfromDate, $lte: formattedToDate };
    }

    query = { ...query, batchMode: "offline" };

    const totalCounts = await BatchModel.countDocuments(query);

    const totalPages = Math.ceil(totalCounts / limit);

    const batchDetails = await BatchModel.find(query)
      .populate([
        { path: "clientId", select: "" },
        { path: "jobRole", select: "jobRole" },
        { path: "accessorId", select: "" },
      ])
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    if (!batchDetails)
      return errorResponse(
        res,
        400,
        responseMessage.batch_not_found,
        responseMessage.errorMessage
      );

    let batchList = [];
    batchDetails.forEach((batch) => {
      batchList.push({
        batchId: batch.batchId,
        _id: batch._id,
        mode: batch.batchMode,
        clientName: batch.clientId?.clientname,
        jobRole: batch.jobRole?.jobRole,
        accessorName: batch.accessorId?.fullName || "NA",
        batchSize: batch.batchSize,
        assessmentStartDate: batch.startDate,
        assessmentEndDate: batch.endDate,
        isTrainingPartnerSubmittedFeedback: batch.isTrainingPartnerSubmittedFeedback || false,
        isAssessorSubmittedFeedback: batch.isAssessorSubmittedFeedback || false,
      });
    });

    const response = await Promise.all(
      batchList.map(async (item) => {
        const data = await candidate_Appeared_In_Batch(item._id, item.mode);
        return {
          ...JSON.parse(JSON.stringify(item)),
          candidate_Appeared_In_Batch: data,
        };
      })
    );

    return sendResponse(res, 200, responseMessage.batch_found, {
      batchList: response,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.getCandiateResultByBatchOffline = async (req, res) => {
  try {
    let filter = getFilter(req, ["name", "candidateId"]);

    const { page, limit, skip, sortOrder } = Paginate(req);

    let query = filter ? filter.query : {};
    query = { ...query, batchId: req?.params?.batchId };

    const totalCounts = await CandidateModel.countDocuments(query);

    const totalPages = Math.ceil(totalCounts / limit);

    const candidateList = await CandidateModel.find(query, {
      rawPassword: 0,
      password: 0,
    })
      .populate([{ path: "batchId", populate: { path: "jobRole" } }])
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    if (candidateList.length !== 0) {
      const candidateIds = await candidateList.map(
        (candidate) => candidate._id
      );
      const candidateResult = await OfflineResultModel.find({
        candidate_mongo_id: { $in: candidateIds },
      }).populate({
        path: "candidate_mongo_id",
        populate: {
          path: "batchId",
        },
      });

      if (candidateResult.length !== 0) {
        const candidateResultList = [];

        candidateResult.forEach((item) => {
          const response = {
            candidateId: item.candidate_mongo_id.candidateId,
            candidate_mongo_id: item.candidate_mongo_id?._id,
            batchId: item.candidate_mongo_id.batchId.batchId,
            userName: item.candidate_mongo_id?.userName,
            batch_mongo_id: item.batch_mongo_id,
            candidateName: item.candidate_mongo_id.name,

            totalTheoryMarks: item.totalTheoryMarks?.toString(),
            totalPracticalMarks: item.totalPracticalMarks?.toString(),
            totalVivaMarks: item.totalVivaMarks?.toString(),
            obtainedTotalTheoryMarks: item.obtainedTotalTheoryMarks?.toString(),
            obtainedTotalPracticalMarks:
              item.obtainedTotalPracticalMarks?.toString(),
            obtainedTotalVivaMarks: item.obtainedTotalVivaMarks?.toString(),

            grandTotalMarks: item.grandTotalMarks?.toString(),
            obtainedGrandTotalMarks: item.obtainedGrandTotalMarks?.toString(),
            percentage: item.percentage?.toString(),
            result: item.result?.toString(),
          };

          candidateResultList.push(response);
        });

        return sendResponse(res, 200, "Candidate List", {
          candidateResultList,
          page,
          totalCounts,
          totalPages,
        });
      } else {
        return errorResponse(res, 200, "No Candidate Result Found", []);
      }
    } else {
      return errorResponse(res, 200, "No Candidate Found", []);
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

exports.singleCandidateResultOnline = async (req, res) => {
  try {
    const query = {
      batchId: req?.params?.batchId,
      _id: req?.params?.candidateId,
    };

    // Get batch details with expanded job role information
    const batchDetails = await Batch.findById(req?.params?.batchId).populate({
      path: "questionPaper.multipleJobRole.jobRoleId",
      select: "jobRole qpCode level version",
    }).populate(
      {path: "jobRole", select: "jobRole qpCode"}
      
    );
    
    const candidate = await CandidateModel.findOne(query, {
      rawPassword: 0,
      password: 0,
    });

    if (candidate) {
      // Get NOS mapping data based on batch's job roles
      const jobRoleNames = [];
      const jobRoleDetails = new Map(); // Store job role details for lookup

      if (batchDetails.questionPaper.isMultiJobRole) {
        console.log("batchdetails",batchDetails)
        batchDetails.questionPaper.multipleJobRole.forEach(job => {
          jobRoleNames.push(job.jobRoleId.jobRole);
          // Store full job role details
          jobRoleDetails.set(job.jobRoleId.jobRole, {
            qpCode: job.jobRoleId.qpCode,
            level: job.level,
            version: job.version
          });

        });
      } else {
        jobRoleNames.push(batchDetails.jobRole.jobRole);
        jobRoleDetails.set(batchDetails.jobRole.jobRole, {
          qpCode: batchDetails.jobRole.qpCode,
          level: batchDetails.questionPaper.level,
          version: batchDetails.questionPaper.version
        });
      }

      const theoryNosList = await NosTheory.find({
        jobRole: { $in: jobRoleNames }
      });

      const nosToJobRoleMap = {};
      
      theoryNosList.forEach(theory => {
        theory.nosData?.forEach(nos => {
          const nosName = nos.NOS.replace(/\\n|\n/g, "").trim();
          const trimmedNosName = nosName.trim().replace(/\r\n/g, ' ');
          const shortNosName = nosName.split('.')[0];
          nosToJobRoleMap[nosName] = theory.jobRole;
          nosToJobRoleMap[trimmedNosName] = theory.jobRole;
          nosToJobRoleMap[shortNosName] = theory.jobRole;
        });
      });

      const candidateResult = await OnlineResultModel.findOne({
        candidate_mongo_id: candidate._id,
      }).populate("batch_mongo_id");

      if (candidateResult) {
        let distMarkwithdiffJobRole = {};
        
        if (candidateResult.nosResult && candidateResult.nosResult.length > 0) {
          candidateResult.nosResult.forEach(nos => {
            const nosName = nos.nosName.replace(/\\n|\n/g, "").trim();
            const trimmedNosName = nosName.trim().replace(/\r\n/g, ' ');
            const shortNosName = nosName.split('.')[0];
            
            const jobRole = nosToJobRoleMap[nosName] || 
                           nosToJobRoleMap[trimmedNosName] || 
                           nosToJobRoleMap[shortNosName];

            if (!jobRole) {
              console.log("WARNING: No job role found for NOS:", nosName);
              console.log("Available NOS mappings:", Object.keys(nosToJobRoleMap));
            }

            if (jobRole) {
              if (!distMarkwithdiffJobRole[jobRole]) {
                const jobRoleDetail = jobRoleDetails.get(jobRole) || {};
                distMarkwithdiffJobRole[jobRole] = {
                  jobRoleName: jobRole,
                  qpCode: jobRoleDetail.qpCode || '',    
                  level: jobRoleDetail.level || '',     
                  version: jobRoleDetail.version || '', 
                  obtainedTheoryMarks: 0,
                  obtainedPracticalMarks: 0,
                  obtainedVivaMarks: 0,
                  totalTheoryMarks: 0,
                  totalPracticalMarks: 0,
                  totalVivaMarks: 0,
                  nosList: []
                };
              }

              const obtainedTheory = parseFloat(nos.obtainedTheoryMarks || 0);
              const obtainedPractical = parseFloat(nos.obtainedPracticalMarks || 0);
              const obtainedViva = parseFloat(nos.obtainedVivaMarks || 0);
              const totalTheory = parseFloat(nos.theoryMarks || 0);
              const totalPractical = parseFloat(nos.practicalMarks || 0);
              const totalViva = parseFloat(nos.vivaMarks || 0);

              distMarkwithdiffJobRole[jobRole].nosList.push({
                nosName: nosName,
                theory: {
                  obtainedMarks: obtainedTheory,
                  totalMarks: totalTheory
                },
                practical: {
                  obtainedMarks: obtainedPractical,
                  totalMarks: totalPractical
                },
                viva: {
                  obtainedMarks: obtainedViva,
                  totalMarks: totalViva
                }
              });

              distMarkwithdiffJobRole[jobRole].obtainedTheoryMarks += obtainedTheory;
              distMarkwithdiffJobRole[jobRole].obtainedPracticalMarks += obtainedPractical;
              distMarkwithdiffJobRole[jobRole].obtainedVivaMarks += obtainedViva;
              distMarkwithdiffJobRole[jobRole].totalTheoryMarks += totalTheory;
              distMarkwithdiffJobRole[jobRole].totalPracticalMarks += totalPractical;
              distMarkwithdiffJobRole[jobRole].totalVivaMarks += totalViva;
            }
          });
        }

        const distributedMarksArray = Object.values(distMarkwithdiffJobRole);

        return sendResponse(res, 200, "Candidate List", {
          candidateResult: {
            ...candidateResult.toObject(),
            jobRoleWiseDistribution: distributedMarksArray
          }
        });
      } else {
        return errorResponse(res, 400, "No result found for this candidate");
      }
    } else {
      return errorResponse(res, 400, "No Candidate Found");
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.something_wrong, error.message);
  }
};

exports.singleCandidateResultOffline = async (req, res) => {
  try {
    const query = {
      batchId: req?.params?.batchId,
      _id: req?.params?.candidateId,
    };

    const candidateList = await CandidateModel.findOne(query, {
      rawPassword: 0,
      password: 0,
    });

    if (candidateList) {
      const candidateResult = await OfflineResultModel.findOne({
        candidate_mongo_id: candidateList._id,
      })
        .populate({
          path: "batch_mongo_id",
          select: "questionPaper.primaryLanguage batchId",
        })
        .populate({ path: "candidate_mongo_id", select: "name" });
        console.log(candidateResult);
      if (candidateResult) {
        return sendResponse(res, 200, "Candidate List", {
          candidateResult: candidateResult,
        });
      } else {
        return errorResponse(res, 200, "No Candidate Result Found", []);
      }
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

// VIVA - PRACTICAL UPLOAD

exports.onlineResultUpload = async (req, res) => {
  try {
    const workbook = new ExcelJS.Workbook();

    if (!req.body.batch_mongo_Id)
      return errorResponse(res, 400, "no batch mongo id provided");
    if (!req.file) return errorResponse(res, 400, "no excel file provided");

    workbook.xlsx
  .readFile(req.file.path)
  .then(async () => {
    const worksheet = workbook.worksheets?.[0];
    if (!worksheet) {
      // It's good practice to unlink the file before returning an error.
      await fs.unlink(req?.file?.path);
      return errorResponse(res, 400, "Worksheet 'New Sheet' not found.");
    }

    let candidateData = [];
    let validationError = null;

    const checkMarks = (totalMarks, obtainedMarks) => {
      // Treat null or undefined cells as 0
      if (obtainedMarks === null || obtainedMarks === undefined) {
        return 0;
      }

      // Check for "ABSENT" string, case-insensitive
      if (typeof obtainedMarks === "string") {
        if (obtainedMarks.trim().toUpperCase() === "ABSENT") {
          return "ABSENT";
        }
        // Throw error for any other unexpected string
        throw new Error("Invalid mark. Only numbers or 'ABSENT' are allowed.");
      }

      // Check for valid numbers
      if (
        typeof obtainedMarks === "number" &&
        obtainedMarks <= totalMarks &&
        obtainedMarks >= 0
      ) {
        return obtainedMarks;
      } else {
        throw new Error(
          "Obtained Marks cannot be negative or greater than Total Marks."
        );
      }
    };

    // Iterate through rows starting from 4 to skip headers
    for (let rowNum = 4; rowNum <= worksheet.rowCount; rowNum++) {
      if (validationError) break; // Stop processing immediately if an error is found

      const row = worksheet.getRow(rowNum);
      // Skip empty rows
      if (row.values.length === 0) continue;
        
      const rowData = {
        serialNo: row.getCell(1).value,
        candidateId: row.getCell(4).value,
        candidate_mongo_id: row.getCell(5).value,
        candidateName: row.getCell(6).value,
        batchId: row.getCell(2).value,
        batch_mongo_id: req.body.batch_mongo_Id,
      };

      let combinedData = [];

      for (let col = 7; col <= worksheet.columnCount; col += 3) {
        try {
          const totalTheory = worksheet.getCell(`${getExcelLetter(col)}3`).value;
          const totalPractical = worksheet.getCell(`${getExcelLetter(col + 1)}3`).value;
          const totalViva = worksheet.getCell(`${getExcelLetter(col + 2)}3`).value;

          const obtainedTheoryMarks = checkMarks(totalTheory, row.getCell(col).value);
          const obtainedPracticalMarks = checkMarks(totalPractical, row.getCell(col + 1).value);
          const obtainedVivaMarks = checkMarks(totalViva, row.getCell(col + 2).value);

          const values = [obtainedTheoryMarks, obtainedPracticalMarks, obtainedVivaMarks];
          const containsAbsent = values.some((v) => v === "ABSENT");
          const containsNumeric = values.some((v) => typeof v === "number");

          // Ensure a subject's marks are either all numbers or all 'ABSENT'
          if (containsAbsent && containsNumeric) {
            throw new Error(`Row ${rowNum}: Mix of 'ABSENT' and numeric marks is not allowed for a single subject.`);
          }
          
          let totalObtainedMarks;
          if (containsAbsent) {
            totalObtainedMarks = "ABSENT"; // Use a string to flag this NOS for later processing
          } else {
            totalObtainedMarks = obtainedTheoryMarks + obtainedPracticalMarks + obtainedVivaMarks;
          }

          combinedData.push({
            nosName: worksheet.getCell(`${getExcelLetter(col)}1`).value,
            theoryMarks: totalTheory,
            practicalMarks: totalPractical,
            vivaMarks: totalViva,
            obtainedTheoryMarks,
            obtainedPracticalMarks,
            obtainedVivaMarks,
            totalMarks: totalTheory + totalPractical + totalViva,
            totalObtainedMarks,
          });

        } catch (err) {
          validationError = { message: err.message };
          break; // Exit the inner column loop on error
        }
      }
       if (!validationError) {
         candidateData.push({ ...rowData, nosResult: combinedData });
       }
    }

    // If any validation error occurred during row processing, stop and respond.
    if (validationError) {
      throw new Error(validationError.message);
    }
    
    const batchDetails = await BatchModel.findOne({
      _id: req.body.batch_mongo_Id,
    });
     if (!batchDetails) {
        throw new Error("Batch details not found.");
    }
    
    // Separate present and absent candidates
    const presentCandidates = [];
    const absentCandidates = [];
    candidateData.forEach((candidate) => {
      // A candidate is considered totally absent only if every mark is 'ABSENT'
      const isTotallyAbsent = candidate.nosResult.every(
        (nos) => nos.totalObtainedMarks === "ABSENT"
      );

      if (isTotallyAbsent) {
        absentCandidates.push(candidate);
      } else {
        presentCandidates.push(candidate);
      }
    });

    const bulkOperations = [];

    // Process PRESENT candidates
    presentCandidates.forEach((candidate) => {
      const filter = { candidate_mongo_id: candidate.candidate_mongo_id };
      let totalTheoryMarks = 0, totalPracticalMarks = 0, totalVivaMarks = 0;
      let obtainedTotalTheoryMarks = 0, obtainedTotalPracticalMarks = 0, obtainedTotalVivaMarks = 0;

      candidate.nosResult.forEach((nos) => {
        obtainedTotalTheoryMarks += nos.obtainedTheoryMarks;
        obtainedTotalPracticalMarks += nos.obtainedPracticalMarks;
        obtainedTotalVivaMarks += nos.obtainedVivaMarks;
        totalTheoryMarks += nos.theoryMarks;
        totalPracticalMarks += nos.practicalMarks;
        totalVivaMarks += nos.vivaMarks;
        // Correctly calculate total obtained marks for each NOS
        nos.totalObtainedMarks = nos.obtainedTheoryMarks + nos.obtainedPracticalMarks + nos.obtainedVivaMarks;
      });

      const grandTotalMarks = totalTheoryMarks + totalPracticalMarks + totalVivaMarks;
      const obtainedGrandTotalMarks = obtainedTotalTheoryMarks + obtainedTotalPracticalMarks + obtainedTotalVivaMarks;
      const percentage = grandTotalMarks > 0 ? ((obtainedGrandTotalMarks / grandTotalMarks) * 100).toFixed(2) : 0;

      const update = {
        $set: {
          nosResult: candidate.nosResult,
          obtainedTotalTheoryMarks, obtainedTotalPracticalMarks, obtainedTotalVivaMarks,
          totalTheoryMarks, totalPracticalMarks, totalVivaMarks,
          grandTotalMarks, obtainedGrandTotalMarks,
          percentage: parseFloat(percentage),
          result:
            percentage >= batchDetails.questionPaper.passingPercentage
              ? "Pass"
              : "Fail",
        },
      };
      bulkOperations.push({ updateOne: { filter, update } });
    });

    // Process ABSENT candidates (as per offline logic)
    absentCandidates.forEach((candidate) => {
        const filter = { candidate_mongo_id: candidate.candidate_mongo_id };
        const finalNosResult = candidate.nosResult.map(nos => ({
            ...nos,
            obtainedTheoryMarks: 0,
            obtainedPracticalMarks: 0,
            obtainedVivaMarks: 0,
            totalObtainedMarks: 0,
        }));
        const update = {
            $set: {
                nosResult: finalNosResult,
                obtainedTotalTheoryMarks: 0, obtainedTotalPracticalMarks: 0, obtainedTotalVivaMarks: 0,
                totalTheoryMarks: 0, totalPracticalMarks: 0, totalVivaMarks: 0, 
                grandTotalMarks: 0, obtainedGrandTotalMarks: 0,
                percentage: 0,
                result: "Absent",
            },
        };
        bulkOperations.push({ updateOne: { filter, update } });
    });
    
    if (bulkOperations.length === 0) {
      await fs.unlink(req?.file?.path);
      return errorResponse(res, 400, "No valid candidate data found to upload.");
    }

    OnlineResultModel.bulkWrite(bulkOperations)
      .then(async (data) => {
        // A more robust check: operation succeeded if at least one doc was matched or modified.
        if (data.nMatched > 0 || data.nModified > 0) {
          return sendResponse(res, 200, "Result successfully Uploaded", data);
        } else {
          await fs.unlink(req?.file?.path);
          return errorResponse(res, 400, "No candidate records were found to update.");
        }
      })
      .catch((err) => {
        // This catch handles errors from the bulkWrite operation itself
        return errorResponse(res, 400, responseMessage.something_wrong, err.message);
      });
  })
  // This outer catch will handle errors from readFile or any error thrown inside the .then() block
  .catch(async (error) => {
    await fs.unlink(req?.file?.path);
    return errorResponse(res, 500, responseMessage.something_wrong, error.message);
  });
  } catch (error) {
    await fs.unlink(req?.file?.path);
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.offlineResultUpload = async (req, res) => {
    try {
      const workbook = new ExcelJS.Workbook();
  
      if (!req.body.batch_mongo_Id)
        return errorResponse(res, 400, "no batch mongo id provided");
      if (!req.file) return errorResponse(res, 400, "no excel file provided");
  
      await workbook.xlsx.readFile(req.file.path); 
  
      const worksheet = workbook.getWorksheet("New Sheet");
  
      let candidateData = [];
      let rowValidationError = null;
  
      const checkMarks = (totalMarks, obtainedMarks) => {
        if (typeof obtainedMarks === "string") {
          return "ABSENT";
        }
  
        if (obtainedMarks <= totalMarks && obtainedMarks >= 0) {
          return obtainedMarks;
        } else {
          throw Error("Obtained Marks can not be more than Total Marks");
        }
      };
  
      // Fetch the batch from DB first
      const dbBatch = await Batch.findById(req.body.batch_mongo_Id);
      if (!dbBatch) {
        await fs.unlink(req?.file?.path);
      return errorResponse(res, 400, "Batch not found.");
      }
  
      worksheet.eachRow(
        {
          includeEmpty: false,
          from: worksheet.getCell("A4"),
          to: worksheet.rowCount,
        },
        (row, rowNum) => {
          if (rowValidationError) return; // skip if error already found
          const rowData = {
            serialNo: row.getCell(1).value,
            candidateId: row.getCell(4).value,
            candidate_mongo_id: row.getCell(5).value,
            candidateName: row.getCell(6).value,
            batchId: row.getCell(2).value,
            batch_mongo_id: req.body.batch_mongo_Id,
          };
  
       
          let combinedData = [];
  
          for (let col = 7; col <= worksheet.columnCount; col += 3) {
            const theoryObtained = row.getCell(col).value;
            const practicalObtained = row.getCell(col + 1).value;
            const vivaObtained = row.getCell(col + 2).value;
  
            const values = [theoryObtained, practicalObtained, vivaObtained];
  
            const isAbsent = (val) =>
              typeof val === "string" && val.toString().trim().toUpperCase() === "ABSENT";
            const isNumeric = (val) =>
              !isNaN(val) && val !== null && val !== "";
  
            const containsAbsent = values.some(isAbsent);
            const containsNumeric = values.some(isNumeric);
  
            if (containsAbsent && containsNumeric) {
              rowValidationError = {
                status: 400,
                message: `If candidate is absent, enter 'ABSENT' for all marks`,
              };
              return;
              
            }
  
            let data = {
              nosName: worksheet.getCell(`${getExcelLetter(col)}1`).value,
              theoryMarks: worksheet.getCell(`${getExcelLetter(col)}3`).value,
              practicalMarks: worksheet.getCell(`${getExcelLetter(col + 1)}3`).value,
              vivaMarks: worksheet.getCell(`${getExcelLetter(col + 2)}3`).value,
  
              obtainedTheoryMarks: checkMarks(
                worksheet.getCell(`${getExcelLetter(col)}3`).value,
                row.getCell(col).value || 0
              ),
              obtainedPracticalMarks: checkMarks(
                worksheet.getCell(`${getExcelLetter(col + 1)}3`).value,
                row.getCell(col + 1).value || 0
              ),
              
              obtainedVivaMarks: checkMarks(
                worksheet.getCell(`${getExcelLetter(col + 2)}3`).value,
                row.getCell(col + 2).value || 0
              ),
  
              totalMarks:
                worksheet.getCell(`${getExcelLetter(col)}3`).value +
                worksheet.getCell(`${getExcelLetter(col + 1)}3`).value +
                worksheet.getCell(`${getExcelLetter(col + 2)}3`).value,
              totalObtainedMarks:
                row.getCell(col).value +
                row.getCell(col + 1).value +
                row.getCell(col + 2).value,
            };
  
            combinedData.push({ ...data });
          }
  
          candidateData.push({ ...rowData, nosResult: combinedData });
        }
      );
  
      //Now safely check after loop
  if (rowValidationError) {
    await fs.unlink(req?.file?.path).catch(() => {});
    return errorResponse(res, rowValidationError.status, rowValidationError.message);
  }
  
      candidateData.splice(0, 3);

  const invalidBatchRow = candidateData.find(
  (row) => (row.batchId || "").toString().trim() !== dbBatch.batchId.trim()
);

if (invalidBatchRow) {
  await fs.unlink(req?.file?.path).catch(() => {});
  return errorResponse(
    res,
    400,
    "The provided batch ID does not match the expected batch",
    "The provided batch ID does not match the expected batch"
  );
}    
  
      // checking duplicate value in the database
      let errors = {};
  
      const existingEmailResult = await Promise.all(
        candidateData.map((row) => {
          const existingCandidate = OfflineResultModel.findOne({
            $and: [
              { batch_mongo_id: req.body.batch_mongo_Id },
              {
                $or: [
                  { candidate_mongo_id: row.candidate_mongo_id },
                  { candidateId: row.candidateId },
                ],
              },
            ],
          });
          return existingCandidate;
        })
      );
  
      const duplicate = existingEmailResult.every((item) => item === null);
  
      if (!duplicate) {
        existingEmailResult.forEach((value) => {
          if (value) {
            errors = {
              _original: { candidateId: value.candidateId },
              message: "Candidate result has already been uploaded.",
            };
          }
        });
      }
  
      if (Object.entries(errors).length > 0) {
        await fs.unlink(req?.file?.path);
        return errorResponse(res, 400, responseMessage.something_wrong, {
          user: errors._original.candidateId,
          error: errors.message,
        });
      }
  
      const absentCandidatesData = [];
      const checkIfAbsent = (candidateData) => {
        for (let i = candidateData.length - 1; i >= 0; i--) {
          const candidate = candidateData[i];
  
          const isAbsent = candidate.nosResult.every((nos) => {
            return (
              nos.obtainedTheoryMarks.toString().trim().toUpperCase() === "ABSENT" &&
              nos.obtainedPracticalMarks.toString().trim().toUpperCase() === "ABSENT" &&
              nos.obtainedVivaMarks.toString().trim().toUpperCase() === "ABSENT"
            );
          });
  
          if (isAbsent) {
            absentCandidatesData.push(candidate);
            console.log(`${candidate.candidateId} ${candidate.candidateName}`);
            candidateData.splice(i, 1);
          }
        }
      };
  
      checkIfAbsent(candidateData);
  
      const batch = await Batch.findOne({ _id: req.body.batch_mongo_Id });
  
      candidateData.forEach((candidate) => {
        let totalTheoryMarks = 0;
        let totalPracticalMarks = 0;
        let totalVivaMarks = 0;
        let obtainedTotalTheoryMarks = 0;
        let obtainedTotalPracticalMarks = 0;
        let obtainedTotalVivaMarks = 0;
  
        candidate.nosResult.forEach((nos) => {
          obtainedTotalTheoryMarks += nos.obtainedTheoryMarks;
          obtainedTotalPracticalMarks += nos.obtainedPracticalMarks;
          obtainedTotalVivaMarks += nos.obtainedVivaMarks;
  
          totalTheoryMarks += nos.theoryMarks;
          totalPracticalMarks += nos.practicalMarks;
          totalVivaMarks += nos.vivaMarks;
        });
  
        let grandTotalMarks = totalTheoryMarks + totalPracticalMarks + totalVivaMarks;
        let obtainedGrandTotalMarks =
          obtainedTotalTheoryMarks +
          obtainedTotalPracticalMarks +
          obtainedTotalVivaMarks;
        let percentage = ((obtainedGrandTotalMarks / grandTotalMarks) * 100).toFixed(2);
  
        let result = percentage >= batch.questionPaper.passingPercentage ? "Pass" : "Fail";
  
        candidate["obtainedTotalTheoryMarks"] = obtainedTotalTheoryMarks;
        candidate["obtainedTotalPracticalMarks"] = obtainedTotalPracticalMarks;
        candidate["obtainedTotalVivaMarks"] = obtainedTotalVivaMarks;
        candidate["totalTheoryMarks"] = totalTheoryMarks;
        candidate["totalPracticalMarks"] = totalPracticalMarks;
        candidate["totalVivaMarks"] = totalVivaMarks;
        candidate["grandTotalMarks"] = grandTotalMarks;
        candidate["obtainedGrandTotalMarks"] = obtainedGrandTotalMarks;
        (candidate["percentage"] = `${percentage}%`), (candidate["result"] = result);
      });
  
      absentCandidatesData.forEach((candidate) => {
        candidate.nosResult = candidate.nosResult.map((nos) => ({
          ...nos,
          obtainedTheoryMarks: 0,
          obtainedPracticalMarks: 0,
          obtainedVivaMarks: 0,
          totalObtainedMarks: 0,
        }));
        candidate["obtainedTotalTheoryMarks"] = 0;
        candidate["obtainedTotalPracticalMarks"] = 0;
        candidate["obtainedTotalVivaMarks"] = 0;
        candidate["totalTheoryMarks"] = 0;
        candidate["totalPracticalMarks"] = 0;
        candidate["totalVivaMarks"] = 0;
        candidate["grandTotalMarks"] = 0;
        candidate["obtainedGrandTotalMarks"] = 0;
        (candidate["percentage"] = `0%`), (candidate["result"] = "Absent");
      });
  
      const session = await OfflineResultModel.startSession();
      session.startTransaction();
      if (absentCandidatesData.length) {
        await OfflineResultModel.insertMany(absentCandidatesData, { session });
      }
  
      if (candidateData.length) {
        await OfflineResultModel.insertMany(candidateData, { session });
      }
  
      await session.commitTransaction();
      session.endSession();
  
      await fs.unlink(req?.file?.path);
      return sendResponse(res, 200, "Result successfully Uploaded");
    } catch (error) {
      await fs.unlink(req?.file?.path).catch(() => {}); // to prevent ENOENT if already deleted
      return errorResponse(
        res,
        500,
        responseMessage.something_wrong,
        error.message
      );
    }
  };

function getExcelLetter(columnIndex) {
  let letter = "";
  while (columnIndex > 0) {
    const remainder = (columnIndex - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    columnIndex = Math.floor((columnIndex - 1) / 26);
  }
  return letter;
}

exports.downloadExcelOnlineByBatch = async (req, res) => {
  try {
    const batchId = req.params.batchId;
    if (!batchId)
      return errorResponse(
        res,
        400,
        "no batchid provided",
        "no batchid provided"
      );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("New Sheet");

    const query = { batchId: req?.params?.batchId, isTestSubmitted: true };

    const candidateList = await CandidateModel.find(query, {
      rawPassword: 0,
      password: 0,
    });

    if (candidateList.length > 0) {
      const candidateIds = candidateList.map((candidate) => candidate._id);
      let candidateResultRaw = await AnswerModel.find({
        candidateId: { $in: candidateIds },
      }).populate([
        { path: "questions.question_bank_id", select: "" },
        { path: "candidateId", select: ["candidateId", "name"] },
        {
          path: "batchId",
          select: "batchId",
          populate: { path: "jobRole", select: "jobRole" },
        },
      ]);

      const checkDuplicates = {};
      candidateResultRaw = candidateResultRaw.filter(candidate => {
        if(checkDuplicates[candidate.candidateId._id.toString()]) {
          return false;
        }else {
          checkDuplicates[candidate.candidateId._id.toString()] = 1;
          return true;
        }
      });

      let candidateReport = await CandidateReport.find({
        candidateId: { $in: candidateIds },
      });

      const checkDuplicatesCandidateReport = {};
      candidateReport = candidateReport.filter(candidate => {
        if(checkDuplicatesCandidateReport[candidate.candidateId._id.toString()]) {
          return false;
        }else {
          checkDuplicatesCandidateReport[candidate.candidateId._id.toString()] = 1;
          return true;
        }
      })  

      //getting the viva-practical nos and questions details
      const assessmentDetails = await createAssesmentModel
        .findOne({ batch_id: req?.params?.batchId })
        .populate({
          path: "practicalQuestion_id vivaQuestion_id",
          select: "",
          populate: { path: "question_bank_id" },
        });

      const candidateResult = JSON.parse(JSON.stringify(candidateResultRaw));

      let nosWiseResultList = [];

      candidateResult.forEach((candidate, index) => {
        let nosWiseTheoryMarks = {};
        candidate.questions = [
          ...candidate.questions,
          ...assessmentDetails.practicalQuestion_id,
          ...assessmentDetails.vivaQuestion_id,
        ];
        candidate.questions.forEach((question) => {
          const nos = question.question_bank_id?.nos;

          let theoryMarks = 0;
          let vivaMarks = 0;
          let practicalMarks = 0;

          //for theory
          if (question.question_bank_id.section === "Theory") {
            theoryMarks = question.marks;
            if (!nosWiseTheoryMarks[nos]) {
              nosWiseTheoryMarks[nos] = {
                theory: { marks: theoryMarks, obtainedMarks: 0 },
                practical: { marks: 0, obtainedMarks: 0 },
                viva: { marks: 0, obtainedMarks: 0 },
              };
            } else {
              nosWiseTheoryMarks[nos].theory.marks += theoryMarks;
            }
          }

          // for viva
          if (question.question_bank_id.section === "viva") {
            vivaMarks = question.marks;
            if (!nosWiseTheoryMarks[nos]) {
              nosWiseTheoryMarks[nos] = {
                theory: { marks: 0, obtainedMarks: 0 },
                practical: { marks: 0, obtainedMarks: 0 },
                viva: { marks: Number(vivaMarks), obtainedMarks: 0 },
              };
            } else {
              nosWiseTheoryMarks[nos].viva.marks += Number(vivaMarks);
            }
          }

          // for practical
          if (question.question_bank_id.section === "practical") {
            practicalMarks = question.marks;
            if (!nosWiseTheoryMarks[nos]) {
              nosWiseTheoryMarks[nos] = {
                theory: { marks: 0, obtainedMarks: 0 },
                practical: { marks: Number(practicalMarks), obtainedMarks: 0 },
                viva: { marks: 0, obtainedMarks: 0 },
              };
            } else {
              nosWiseTheoryMarks[nos].practical.marks += Number(practicalMarks);
            }
          }
        });

        candidateReport.forEach((item) => {
          if (
            candidate.candidateId?._id.toString() ===
            item.candidateId.toString()
          ) {
            candidate.questions.forEach((question) => {
              if (item.correctAnswerIds?.includes(question._id)) {
                const nos = question.question_bank_id?.nos;

                let theoryMarks = 0;

                if (question.question_bank_id.section === "Theory") {
                  theoryMarks = question.marks;
                }

                if (nosWiseTheoryMarks[nos]) {
                  // Accumulate obtainedMarks in the 'theory' part
                  nosWiseTheoryMarks[nos].theory.obtainedMarks += theoryMarks;
                }
              }
            });
          } else {
            console.log("No candidate ID matched");
          }
        });

        const nosWiseResultItem = {
          ...nosWiseTheoryMarks,
          candidateId: candidate.candidateId.candidateId,
          testaCandidateId: candidate.candidateId._id,
          candidateName: candidate.candidateId?.name,
          batchId: candidate.batchId?.batchId,
          jobRole: candidate.batchId?.jobRole?.jobRole,
          sno: index + 1,
        };

        nosWiseResultList.push(nosWiseResultItem);
      });

      // logic to append already existed marks
      const populateExistingMarks = (candidate, nosResult) => {
        let updatedCandidate = {};
        Object.keys(candidate).forEach((item) => {
          const newItem = item.replace(/\r\n/g, " ");
          updatedCandidate[newItem] = candidate[item];
        });

        nosResult.forEach((nos) => {
          let nosName = nos.nosName.replace(/\n/g, " ");
          console.log("nos-->", nosName);
          if (updatedCandidate.hasOwnProperty(nosName)) {
            updatedCandidate[nosName].theory.obtainedMarks =
              nos.obtainedTheoryMarks;
            updatedCandidate[nosName].viva.obtainedMarks =
              nos.obtainedVivaMarks;
            updatedCandidate[nosName].practical.obtainedMarks =
              nos.obtainedPracticalMarks;
          }
        });
      };

      const apendExistingResult = async (nosWiseResultList, batchId) => {
        let onlineExistingResult = await OnlineResultModel.find({
          batch_mongo_id: batchId,
        });
        const checkDuplicates = {};
        onlineExistingResult = onlineExistingResult.filter(candidate => {
          if(checkDuplicates[candidate.candidate_mongo_id._id.toString()]) {
            return false;
          }else {
            checkDuplicates[candidate.candidate_mongo_id._id.toString()] = 1;
            return true;
          }
        })
        nosWiseResultList.forEach((item) => {
          let candidateId = item?.candidateId.split("/")[1];
          onlineExistingResult.forEach((innerItem) => {
            if (candidateId === innerItem.candidate_mongo_id.toString()) {
              // we have a candidate result in offline result collection already
              populateExistingMarks(item, innerItem.nosResult);
            }
          });
        });
      };

      await apendExistingResult(nosWiseResultList, batchId);

      const baseHeaders = [
        { header: "S.No", key: "sno", width: 10 },
        { header: "Batch ID", key: "batchId", width: 15 },
        { header: "Job Role", key: "jobRole", width: 20 },
        { header: "Candidate ID", key: "candidateId", width: 15 },
        { header: "Testa Candidate ID", key: "testaCandidateId", width: 20 },
        { header: "Candidate Name", key: "candidateName", width: 20 },
      ];

      const subjects = Object.keys(nosWiseResultList[0]).filter(
        (key) => !baseHeaders.some((header) => header.key === key) 
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

      worksheet.columns = columns;

      let currentColumn = baseHeaders.length + 1;
      subjects.forEach((subject) => {
        const startColumn = currentColumn;
        const endColumn = startColumn + 2;
        worksheet.mergeCells(1, startColumn, 1, endColumn);
        worksheet.getCell(1, startColumn).value = subject;
        worksheet.getCell(1, startColumn).font = { bold: true };
        ["Theory", "Practical", "Viva"].forEach((detail, index) => {
          worksheet.getCell(2, startColumn + index).value = detail;
          worksheet.getCell(2, startColumn + index).font = { bold: true };
        });
        currentColumn += 3;
      });

      let writtenTotalMarks = new Set();

      nosWiseResultList.forEach((user, index) => {
        let totalMarksRowValues = { sno: index + 1 };

        let obtainedMarksRowValues = {
          sno: index + 1,
          candidateName: user.candidateName,
          candidateId: user.candidateId,
          testaCandidateId: user.testaCandidateId,
          batchId: user.batchId,
          jobRole: user.jobRole,
          totalScore: user.totalScore,
          percentage: user.percentage,
          passfail: user.passfail,
          grade: user.grade,
        };

        subjects.forEach((subject) => {
          ["Theory", "Practical", "Viva"].forEach((detail) => {
            const keyForTotalMarks = `${subject}${detail}`;
            if (!writtenTotalMarks.has(keyForTotalMarks)) {
              totalMarksRowValues[keyForTotalMarks] =
                user[subject][detail.toLowerCase()]["marks"];
              writtenTotalMarks.add(keyForTotalMarks);
            }
            obtainedMarksRowValues[keyForTotalMarks] =
              user[subject][detail.toLowerCase()]["obtainedMarks"];
          });
        });

        if (index === 0) {
          const totalMarksRow = {
            ...totalMarksRowValues,
          };
          delete totalMarksRow.sno;
          worksheet.addRow(totalMarksRow);
        }

        worksheet.addRow(obtainedMarksRowValues);
      });

      worksheet.mergeCells("A1:A3");
      worksheet.mergeCells("B1:B3");
      worksheet.mergeCells("C1:C3");
      worksheet.mergeCells("D1:D3");
      worksheet.mergeCells("E1:E3");
      worksheet.mergeCells("F1:F3");

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
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.downloadExcelOnlineByBatchWithMarks = async (req, res) => {
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
        // SCENARIO 1: MULTI JOB ROLE
        // ==========================================
        if (batchDetails?.questionPaper?.isMultiJobRole) {
            let allResults = await OnlineResultModel.find({ batch_mongo_id: batchId })
                .populate({
                    path: "batch_mongo_id",
                    populate: [
                        {
                            path: "questionPaper.multipleJobRole.jobRoleId",
                            select: "jobRole",
                        },
                    ],
                })
                .lean();

            let candidateResults = [];
            let seenCandidates = new Set();

            // Remove duplicates and keep only the latest updated one
            for (let result of allResults) {
                if (!seenCandidates.has(result.candidateId)) {
                    candidateResults.push(result);
                    seenCandidates.add(result.candidateId);
                }
            }

      // sorted NOS alphabetically
      candidateResults = candidateResults.map((result) => {
        if (result.nosResult && Array.isArray(result.nosResult)) {
          result.nosResult = result.nosResult.sort((a, b) =>
            a.nosName.localeCompare(b.nosName)
          );
        }
        return result;
      });

      // Get NOS mapping data
      const theoryNosList = await NosTheory.find({});
      const nosToJobRoleMap = {};

      // Create NOS to Job Role mapping
      // Get job roles from batch details
      const jobRoles = batchDetails.questionPaper.multipleJobRole.map(
        (item) => item.jobRoleId.jobRole
      );

      theoryNosList.forEach((theory) => {
        // Only process if theory's job role matches one from batch details
        if (jobRoles.includes(theory.jobRole)) {
          theory.nosData?.forEach((nos) => {
            const nosName = nos.NOS;
            nosToJobRoleMap[nosName] = theory.jobRole;
          });
        }
      });

            const enrichedCandidateResults = candidateResults.map((result) => {
                const resultObj = JSON.parse(JSON.stringify(result));
                resultObj.nosResult = resultObj.nosResult.map((nos) => {
                    const nosName = nos.nosName.replace(/\\n|\n/g, "").trim();
                    if (nosToJobRoleMap[nosName]) {
                        return {
                            ...nos,
                            jobRole: nosToJobRoleMap[nosName] || "Unknown Job Role",
                            hasTheory: nos.theoryMarks > 0,
                            hasPractical: nos.practicalMarks > 0,
                            hasViva: nos.vivaMarks > 0,
                        };
                    }
                });
                resultObj.nosResult = resultObj.nosResult.filter(Boolean);
                return resultObj;
            });

            const nosResultsByJobRole = {};
            enrichedCandidateResults[0]?.nosResult.forEach((nos) => {
                if (!nosResultsByJobRole[nos.jobRole]) {
                    nosResultsByJobRole[nos.jobRole] = [];
                }
                nosResultsByJobRole[nos.jobRole].push(nos);
            });

      // Create workbooks for each job role
      const jobRoleWorkbooks = {};

      // Create separate workbook for each job role
      Object.keys(nosResultsByJobRole).forEach((jobRole) => {
        const safeJobRole = jobRole.replace(/[*?:\\/\[\]]/g, " ");
        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet(safeJobRole);

        // Base headers
        const headers = [
          "S.No",
          "Candidate ID",
          "Candidate Name",
          "Batch ID",
          "Attendance",
        ];

        // Get NOS for this specific job role
        const jobRoleNOS = nosResultsByJobRole[jobRole];

        // NOS-wise headers
        const nosHeaders = [];
        const nosSubHeaders = [];

        jobRoleNOS.forEach((nos) => {
          const cleanNosName = nos.nosName.replace(/[\r\n\s]+/g, " ").trim();
          nosHeaders.push(cleanNosName, null, null); // nulls for merging
          nosSubHeaders.push("Theory", "Practical", "Viva");
        });

        headers.push(...nosHeaders, "Total Marks", "Percentage", "Result");
        worksheet.addRow(headers);

        // Sub-headers row
        const subHeaderRow = ["", "", "", "", "", ...nosSubHeaders];
        worksheet.addRow(subHeaderRow);

        // Merge NOS name cells
        let colIndex = 6; // Starting after initial columns
        jobRoleNOS.forEach(() => {
          worksheet.mergeCells(1, colIndex, 1, colIndex + 2);
          colIndex += 3;
        });

        let nosLength = 0;
        let mainTotalMarks = 0;
        // Candidate results for this job role
        enrichedCandidateResults.forEach((result, index) => {
          // Filter NOS results for current job role
          const candidateJobRoleNOS = result.nosResult.filter(
            (nos) => nos.jobRole === jobRole
          );
          nosLength = candidateJobRoleNOS.length;
          if (candidateJobRoleNOS.length > 0) {
            const rowData = [
              index + 1,
              result.candidateId,
              result.candidateName,
              result.batchId,
              "Attended",
            ];

            let totalObtained = 0;
            let totalMarks = 0;

            // Marks for each NOS in this job role
            candidateJobRoleNOS.forEach((nos) => {
              rowData.push(
                nos.obtainedTheoryMarks || 0,
                nos.obtainedPracticalMarks || 0,
                nos.obtainedVivaMarks || 0
              );

              totalObtained +=
                (nos.obtainedTheoryMarks || 0) +
                (nos.obtainedPracticalMarks || 0) +
                (nos.obtainedVivaMarks || 0);

              totalMarks +=
                (nos.theoryMarks || 0) +
                (nos.practicalMarks || 0) +
                (nos.vivaMarks || 0);
              mainTotalMarks = totalMarks;
            });

            // Totals
            const percentage = batchDetails?.questionPaper?.passingPercentage;
            const calculatedPercentage = (
              (totalObtained / totalMarks) *
              100
            ).toFixed(2);

            rowData.push(
              `${formatToTwoDecimals(totalObtained)}/${formatToTwoDecimals(
                totalMarks
              )}`,
              `${calculatedPercentage}%`,
              `${
                parseFloat(calculatedPercentage) >= percentage ? "Pass" : "Fail"
              }`
            );

                        worksheet.addRow(rowData);
                    }
                });

                // 2. Process Absent/Not Submitted Candidates (Individual Sheets)
                let absentCandidatesStartIndex = enrichedCandidateResults.length + 1;
                if (candidateList.length) {
                    candidateList.forEach((candidate) => {
                        if (!candidateResults.some((result) => result.candidateId === candidate.candidateId)) {

                            // --- Logic for Status ---
                            let statusText = "Not Attended";
                            let resultText = "Fail";
                            let percentageText = "0%";

                            if (!candidate.isAssessmentStarted && isAssessmentPeriodOver) {
                                statusText = "Absent";
                                resultText = "Absent";
                                percentageText = "";
                            } else if (!candidate.isTestSubmitted) {
                                statusText = "Not Attended";
                                if (!candidate.isAssessmentStarted && !isAssessmentPeriodOver) {
                                    resultText = "Not Attempted";
                                } else {
                                    resultText = "Not Submitted";
                                }
                                percentageText = "";
                            }

                            const rowData = [
                                absentCandidatesStartIndex + 1,
                                candidate.candidateId ?? "N/A",
                                candidate.name ?? "N/A",
                                candidate?.batchId?.batchId ?? "N/A",
                                statusText,
                            ];

              // Marks for each NOS in this job role
              [...Array(nosLength).fill(1)].forEach(() => {
                rowData.push(0, 0, 0);
                totalObtained = 0;
                totalMarks = 0;
              });

                            // Totals
                            rowData.push(
                                resultText === "Absent" || resultText === "Not Attempted" ? "" : `0/${mainTotalMarks}`,
                                percentageText,
                                resultText
                            );

              worksheet.addRow(rowData);
              absentCandidatesStartIndex += 1;
            }
          });
        }

        // Style headers
        worksheet.getRow(1).font = { bold: true };
        worksheet.getRow(2).font = { bold: true };

        // Adjust column widths
        worksheet.columns.forEach((column) => {
          column.width = 15;
        });

        jobRoleWorkbooks[jobRole] = workbook;
      });

      // Generate zip file with all workbooks
      const zip = new JSZip();

      for (const [jobRole, workbook] of Object.entries(jobRoleWorkbooks)) {
        if (!jobRole) continue;

        const buffer = await workbook.xlsx.writeBuffer();
        const safeJobRole = jobRole.replace(/[^a-zA-Z0-9-_]/g, "_");
        zip.file(`${safeJobRole}_Results.xlsx`, buffer);
      }

            // --- Consolidated Workbook Logic ---
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("Consolidated");

      let jobRole;
      const transformedData = candidateResults.map((item, index) => {
        if (item.batch_mongo_id.questionPaper.isMultiJobRole) {
          jobRole = item.batch_mongo_id.questionPaper.multipleJobRole
            .map((item) => item.jobRoleId.jobRole)
            .join(",");
        } else {
          jobRole = item.batch_mongo_id.jobRole.jobRole;
        }

        let candidateData = {
          candidateId: item.candidateId,
          candidateName: item.candidateName,
          batchId: item.batchId,
          jobRole,
          sno: index + 1,
          totalScore: item.obtainedGrandTotalMarks,
          percentage: item.percentage,
          passfail: item.result,
        };

        item.nosResult.forEach((nos) => {
          const nosName = nos.nosName.replace(/[\r\n]+/g, "");
          if (!candidateData[nosName]) {
            candidateData[nosName] = {
              theory: {
                marks: nos.theoryMarks,
                obtainedMarks: nos.obtainedTheoryMarks,
              },
              practical: {
                marks: nos.practicalMarks,
                obtainedMarks: nos.obtainedPracticalMarks,
              },
              viva: {
                marks: nos.vivaMarks,
                obtainedMarks: nos.obtainedVivaMarks,
              },
            };
          }
        });
        return candidateData;
      });

      const consolidateHeaders = [
        { header: "S.No", key: "sno", width: 10 },
        { header: "Candidate ID", key: "candidateId", width: 15 },
        { header: "Candidate Name", key: "candidateName", width: 20 },
        { header: "Batch ID", key: "batchId", width: 15 },
        { header: "Job Role", key: "jobRole", width: 20 },
        { header: "Attendance", key: "attendance", width: 20 },
      ];

      const filteredHeaders = Object.keys(transformedData[0]).filter(
        (key) =>
          !consolidateHeaders.some((header) => header.key === key) &&
          !["totalScore", "percentage", "passfail"].includes(key)
      );

      const columns = consolidateHeaders.concat(
        filteredHeaders.flatMap((subject) => {
          return ["Theory", "Practical", "Viva"].map((detail) => {
            return {
              header: `${detail}`,
              key: `${subject}${detail}`,
              width: 15,
            };
          });
        })
      );

      columns.push(
        { header: "Total Score", key: "totalScore", width: 12 },
        { header: "Percentage", key: "percentage", width: 12 },
        { header: "Pass/Fail", key: "passfail", width: 12 }
      );

      worksheet.columns = columns;

      let currentColumn = consolidateHeaders.length + 1;

      filteredHeaders.forEach((subject) => {
        const startColumn = currentColumn;
        const endColumn = startColumn + 2;
        worksheet.mergeCells(1, startColumn, 1, endColumn);
        worksheet.getCell(1, startColumn).value = subject;
        worksheet.getCell(1, startColumn).font = { bold: true };
        ["Theory", "Practical", "Viva"].forEach((detail, index) => {
          worksheet.getCell(2, startColumn + index).value = detail;
          worksheet.getCell(2, startColumn + index).font = { bold: true };
        });
        currentColumn += 3;
      });

      let writtenTotalMarks = new Set();

      transformedData.forEach((user, index) => {
        let totalMarksRowValues = { sno: index + 1 };

        let obtainedMarksRowValues = {
          sno: index + 1,
          candidateName: user.candidateName,
          candidateId: user.candidateId,
          batchId: user.batchId,
          jobRole: user.jobRole || "NA",
          totalScore: user.totalScore,
          percentage: parseFloat(user.percentage),
          passfail: user.passfail,
          grade: user.grade,
          attendance: "Attended",
        };

        // total marks and obtained marks for each NOS
        filteredHeaders.forEach((subject) => {
          ["Theory", "Practical", "Viva"].forEach((detail) => {
            const keyForTotalMarks = `${subject}${detail}`;
            try {
              if (!writtenTotalMarks.has(keyForTotalMarks)) {
                const marks = user[subject]?.[detail.toLowerCase()]?.["marks"];
                totalMarksRowValues[keyForTotalMarks] = marks ?? "NA";
                writtenTotalMarks.add(keyForTotalMarks);
              }
              const obtainedMarks =
                user[subject]?.[detail.toLowerCase()]?.["obtainedMarks"];
              obtainedMarksRowValues[keyForTotalMarks] = obtainedMarks ?? "NA";
            } catch (err) {
              totalMarksRowValues[keyForTotalMarks] = "NA";
              obtainedMarksRowValues[keyForTotalMarks] = "NA";
            }
          });
        });

                if (index === 0) {
                    const totalMarksRow = { ...totalMarksRowValues };
                    totalMarksRow.candidateName = "Total Marks";
                    delete totalMarksRow.sno;
                    const totalMarksRowNumber = worksheet.addRow(totalMarksRow).number;
                    worksheet.mergeCells(`A${totalMarksRowNumber}:F${totalMarksRowNumber}`);
                    worksheet.getCell(`A${totalMarksRowNumber}`).value = "Total Marks";
                    worksheet.getCell(`A${totalMarksRowNumber}`).font = { bold: true };
                }
                worksheet.addRow(obtainedMarksRowValues);
            });

            // 3. Process Absent/Not Submitted (Consolidated Sheet)
            candidateList.forEach((candidate) => {
                if (!candidateResults.some((result) => result.candidateId === candidate.candidateId)) {

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
                        batchId: candidate?.batchId?.batchId ?? "",
                        jobRole: jobRole,
                        totalScore: totalScoreText,
                        percentage: percentageText,
                        passfail: resultText,
                        attendance: statusText,
                    };
                    transformedData.push(absentCandidateRow);
                    worksheet.addRow(absentCandidateRow);
                }
            });

      worksheet.mergeCells("A1:A2");
      worksheet.getCell("A1").font = { bold: true };
      worksheet.mergeCells("B1:B2");
      worksheet.getCell("B1").font = { bold: true };
      worksheet.mergeCells("C1:C2");
      worksheet.getCell("C1").font = { bold: true };
      worksheet.mergeCells("D1:D2");
      worksheet.getCell("D1").font = { bold: true };
      worksheet.mergeCells("E1:E2");
      worksheet.getCell("E1").font = { bold: true };
      worksheet.mergeCells("F1:F2");
      worksheet.getCell("F1").font = { bold: true };

      worksheet.columns.forEach((column) => {
        if (column.width < 12) {
          column.width = 12;
        }
      });

      const consolidatedBuffer = await workbook.xlsx.writeBuffer();

      zip.file("Consolidated_Results.xlsx", consolidatedBuffer);

      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

      res.setHeader("Content-Type", "application/zip");
      res.setHeader(
        "Content-Disposition",
        'attachment; filename="Results.zip"'
      );
      res.send(zipBuffer);
      return;
    }

        // ==========================================
        // SCENARIO 2: SINGLE JOB ROLE (Or General Fallback)
        // ==========================================
        if (candidateList.length > 0) {
            const workbook = new ExcelJS.Workbook();
            const worksheet = workbook.addWorksheet("New Sheet");

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
        worksheet.mergeCells(1, startColumn, 1, endColumn);
        worksheet.getCell(1, startColumn).value = subject;
        worksheet.getCell(1, startColumn).font = { bold: true };
        ["Theory", "Practical", "Viva"].forEach((detail, index) => {
          worksheet.getCell(2, startColumn + index).value = detail;
          worksheet.getCell(2, startColumn + index).font = { bold: true };
        });
        currentColumn += 3;
      });

      let writtenTotalMarks = new Set();

      transformedData.forEach((user, index) => {
        let totalMarksRowValues = { sno: index + 1 };

        let obtainedMarksRowValues = {
          sno: index + 1,
          candidateName: user.candidateName,
          candidateId: user.candidateId,
          batchId: user.batchId,
          jobRole: user.jobRole || "NA",
          totalScore: user.totalScore,
          percentage: parseFloat(user.percentage),
          passfail: user.passfail,
          grade: user.grade,
          attendance: "Attended",
        };

        subjects.forEach((subject) => {
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

      worksheet.mergeCells("A1:A3");
      worksheet.mergeCells("B1:B3");
      worksheet.mergeCells("C1:C3");
      worksheet.mergeCells("D1:D3");
      worksheet.mergeCells("E1:E3");
      worksheet.mergeCells("F1:F3");

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

exports.downloadExcelOnlineBatch = async (req, res) => {
  try {
    let query = { batchId: req?.params?.batchId };

    const candidateList = await CandidateModel.find(query, {
      rawPassword: 0,
      password: 0,
    }).populate([
      { 
        path: 'batchId', 
        populate: [
          { path: 'jobRole' },
          { path: 'questionPaper.multipleJobRole.jobRoleId', select: 'passingPercentage jobRole qpCode' }
        ] 
      }
    ]);
    
    if (candidateList.length > 0) {
      const candidateIds = candidateList.map(candidate => candidate._id);
      // --- 1. Calculate Assessment Timing Logic (Same as Controller) ---
      const batchDetails = candidateList[0].batchId;
      let assessmentEndTimestamp = 0;

      if (batchDetails?.endDate && batchDetails?.endTime) {
          const dateParts = batchDetails.endDate.split('/');
          const isoDateString = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}`;
          const time24Hour = convertTimeTo24Hour(batchDetails.endTime);
          const endDateTimeString = `${isoDateString}T${time24Hour}`;
          assessmentEndTimestamp = new Date(endDateTimeString).getTime();
      }
      const currentTimestamp = new Date().getTime();
      const isAssessmentPeriodOver = currentTimestamp > assessmentEndTimestamp && assessmentEndTimestamp !== 0;
      
      // Get NOS mapping data
      const theoryNosList = await NosTheory.find({});
      const nosToJobRoleMap = {};
      
      // Get job roles from batch details
      const jobRoles = candidateList[0].batchId.questionPaper.multipleJobRole.map(item => item.jobRoleId.jobRole);

      // NOS to Job Role mapping using the jobRoles array
      theoryNosList.forEach(theory => {
        // Only process if theory's job role matches one from batch details
        if (jobRoles.includes(theory.jobRole)) {
          theory.nosData?.forEach(nos => {
            const nosName = nos.NOS;
            nosToJobRoleMap[nosName] = theory.jobRole;
          });
        }
      });

      const candidateSectionResult = await OnlineResultModel.find({ 
        candidate_mongo_id: { $in: candidateIds }
      });

      let totalObtainedMarksForSingleJob = {};
      let totalMaxMarksForSingleJob = {};
      
      let candidateReport = [];
      let uniqueJobRoles = new Set();

      candidateList.forEach((candidate) => {
        let distMarkwithdiffJobRole = {};
        // Marks for each job role
        candidateSectionResult.forEach(result => {
          if (candidate._id.toString() === result.candidate_mongo_id.toString()) {
            if (result.nosResult && result.nosResult.length > 0) {             
              result.nosResult.forEach(nos => {
                let nosName = nos.nosName.replace(/\\n|\n/g, "").trim();
                if(!jobRoles.length) {
                  totalObtainedMarksForSingleJob[result.candidate_mongo_id.toString()] = (totalObtainedMarksForSingleJob[result.candidate_mongo_id.toString()] || 0) + nos.totalObtainedMarks;
                  totalMaxMarksForSingleJob[result.candidate_mongo_id.toString()] = (totalMaxMarksForSingleJob[result.candidate_mongo_id.toString()] || 0) + nos.totalMarks;
                }
                const jobRole = nosToJobRoleMap[nosName];

                if (jobRole) {
                  uniqueJobRoles.add(jobRole);
                  
                  if (!distMarkwithdiffJobRole[jobRole]) {
                    distMarkwithdiffJobRole[jobRole] = {
                      jobRoleName: jobRole,
                      obtainedTheoryMarks: 0,
                      obtainedPracticalMarks: 0,
                      obtainedVivaMarks: 0,
                      totalTheoryMarks: 0,
                      totalPracticalMarks: 0,
                      totalVivaMarks: 0
                    };
                  }

                  const obtainedTheory = parseFloat(nos.obtainedTheoryMarks || 0);
                  const obtainedPractical = parseFloat(nos.obtainedPracticalMarks || 0);
                  const obtainedViva = parseFloat(nos.obtainedVivaMarks || 0);
                  const totalTheory = parseFloat(nos.theoryMarks || 0);
                  const totalPractical = parseFloat(nos.practicalMarks || 0);
                  const totalViva = parseFloat(nos.vivaMarks || 0);

                  distMarkwithdiffJobRole[jobRole].obtainedTheoryMarks += obtainedTheory;
                  distMarkwithdiffJobRole[jobRole].obtainedPracticalMarks += obtainedPractical;
                  distMarkwithdiffJobRole[jobRole].obtainedVivaMarks += obtainedViva;
                  distMarkwithdiffJobRole[jobRole].totalTheoryMarks += totalTheory;
                  distMarkwithdiffJobRole[jobRole].totalPracticalMarks += totalPractical;
                  distMarkwithdiffJobRole[jobRole].totalVivaMarks += totalViva;
                }
              });
            }
          }
        });

        let { batchId } = candidate;

        let response = {
          batchId: batchId.batchId,
          name: candidate.name,
          candidateId: candidate.candidateId,
          userName: candidate.userName,
          _id: candidate._id,
          examDate: batchId.assessmentDate,
          aadharNo: candidate.aadharNo,
          dob: candidate.dob,
          gender: candidate.gender,
          email: candidate.email,
          mobile: candidate.mobile,
          isTestSubmitted: candidate.isTestSubmitted,
          isAssessmentStarted: candidate.isAssessmentStarted,
          distributedMarks: Object.values(distMarkwithdiffJobRole),
          passingPercentage: candidate?.batchId?.questionPaper?.passingPercentage
        };

        candidateReport.push(response);
      });

      // Create Excel workbook
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Candidate Results");

      // Base columns
      const baseColumns = [
        { header: "S.No", key: "sno", width: 10 },
        { header: "Username", key: "userName", width: 20 },
        { header: "Name", key: "name", width: 25 },
        { header: "Candidate ID (SIP)", key: "candidateId", width: 20 },
        { header: "DOB", key: "dob", width: 15 },
        { header: "Gender", key: "gender", width: 10 },
        { header: "Aadhar No", key: "aadharNo", width: 20 },
        { header: "Mobile No", key: "mobile", width: 15 },
        { header: "Email ID", key: "email", width: 25 },
        { header: "Attendance", key: "attendance", width: 15 }
      ];

      // Columns for each job role
      const jobRoleColumns = Array.from(uniqueJobRoles).flatMap(jobRole => [
        { header: "", key: `${jobRole}_theory`, width: 15 },
        { header: "", key: `${jobRole}_practical`, width: 15 },
        { header: "", key: `${jobRole}_viva`, width: 15 }
      ]);

      const summaryColumns = [
        { header: "Total Marks", key: "totalMarks", width: 15 },
        { header: "Percentage", key: "percentage", width: 15 },
        { header: "Result", key: "result", width: 15 }
      ];

      worksheet.columns = [...baseColumns, ...jobRoleColumns, ...summaryColumns];

      // Style base columns
      baseColumns.forEach((col, index) => {
        const colLetter = getExcelLetter(index + 1);
        worksheet.mergeCells(`${colLetter}1:${colLetter}2`);
        worksheet.getCell(`${colLetter}1`).alignment = { vertical: 'middle', horizontal: 'center' };
        worksheet.getCell(`${colLetter}1`).font = { bold: true };    
      });

      // Style headers
      let currentColumn = baseColumns.length + 1;
      Array.from(uniqueJobRoles).forEach(jobRole => {
        const startCol = getExcelLetter(currentColumn);
        const endCol = getExcelLetter(currentColumn + 2);
        
        worksheet.mergeCells(`${startCol}1:${endCol}1`);
        worksheet.getCell(`${startCol}1`).value = jobRole;
        worksheet.getCell(`${startCol}1`).alignment = { horizontal: 'center' };
        worksheet.getCell(`${startCol}1`).font = { bold: true };

        worksheet.getCell(`${startCol}2`).value = 'Theory';
        worksheet.getCell(`${getExcelLetter(currentColumn + 1)}2`).value = 'Practical';
        worksheet.getCell(`${endCol}2`).value = 'Viva';

        currentColumn += 3;
      });

      // Style summary columns
      summaryColumns.forEach((col, index) => {
        const colLetter = getExcelLetter(currentColumn + index);
        worksheet.mergeCells(`${colLetter}1:${colLetter}2`);
        worksheet.getCell(`${colLetter}1`).value = col.header;
        worksheet.getCell(`${colLetter}1`).alignment = { 
          vertical: 'middle', 
          horizontal: 'center' 
        };
        worksheet.getCell(`${colLetter}1`).font = { bold: true };
      });

      // Data rows
      candidateReport.forEach((candidate, index) => {
                // Determine Logic for Result and Attendance strings
                let attendanceStatus = "Not Attended";
                let resultStatus = "";
                let totalMarksStr = "";
                let percentageStr = "";

                // Logic 1: Absent (Exam over, never started)
                if (!candidate.isAssessmentStarted && isAssessmentPeriodOver) {
                    attendanceStatus = "Absent";
                    resultStatus = "Absent";
                    totalMarksStr = "";
                    percentageStr = "";
                } 
                // Logic 2: Not Submitted (Started but not submitted OR exam ongoing but not started)
                else if (!candidate.isTestSubmitted) {
                    attendanceStatus = "Not Attended"; 
                    // Refined sub-logic for result text
                    if (!candidate.isAssessmentStarted && !isAssessmentPeriodOver) {
                        resultStatus = "Not Attempted";
                    } else {
                        resultStatus = "Not Submitted";
                    }
                    totalMarksStr = "";
                    percentageStr = "";
                } 
                // Logic 3: Submitted (Standard Result)
                else {
                    attendanceStatus = "Attended";
                    // Only calculate marks if submitted
                    let totalObtainedMarks = 0;
                    let totalMaxMarks = 0;

                    candidate.distributedMarks.forEach(jobRoleMarks => {
                        totalObtainedMarks += (
                            jobRoleMarks.obtainedTheoryMarks +
                            jobRoleMarks.obtainedPracticalMarks +
                            jobRoleMarks.obtainedVivaMarks
                        );

                        totalMaxMarks += (
                            jobRoleMarks.totalTheoryMarks +
                            jobRoleMarks.totalPracticalMarks +
                            jobRoleMarks.totalVivaMarks
                        );
                    });

                    if (!jobRoles.length) {
                        totalObtainedMarks = totalObtainedMarksForSingleJob[candidate?._id?.toString()] || 0;
                        totalMaxMarks = totalMaxMarksForSingleJob[candidate?._id?.toString()] || 0;
                    }

                    // Fetch Result Status from DB result (Pass/Fail)
                    const presentCandidate = candidateSectionResult.find(c => c.candidate_mongo_id?.toString() === candidate._id?.toString());
                    if (presentCandidate) {
                        resultStatus = presentCandidate.result;
                    } else {
                        resultStatus = "N/A";
                    }

                    totalMarksStr = `${formatToTwoDecimals(totalObtainedMarks)}/${formatToTwoDecimals(totalMaxMarks)}`;
                    
                    if (totalMaxMarks === 0) {
                        percentageStr = '0%';
                    } else {
                        percentageStr = ((Number(totalObtainedMarks) / Number(totalMaxMarks)) * 100).toFixed(2) + '%';
                    }
                }

                let rowData = {
                    sno: index + 1,
                    userName: candidate.userName,
                    name: candidate.name,
                    candidateId: candidate.candidateId,
                    dob: candidate.dob,
                    gender: candidate.gender,
                    aadharNo: candidate.aadharNo,
                    mobile: candidate.mobile,
                    email: candidate.email,
                    attendance: attendanceStatus, // Uses the logic calculated above
                    totalMarks: totalMarksStr,
                    percentage: percentageStr,
                    result: resultStatus
                };

                // Add distributed marks to row only if Submitted
                if (candidate.isTestSubmitted) {
                    candidate.distributedMarks.forEach(jobRoleMarks => {
                        rowData[`${jobRoleMarks.jobRoleName}_theory`] = jobRoleMarks.obtainedTheoryMarks;
                        rowData[`${jobRoleMarks.jobRoleName}_practical`] = jobRoleMarks.obtainedPracticalMarks;
                        rowData[`${jobRoleMarks.jobRoleName}_viva`] = jobRoleMarks.obtainedVivaMarks;
                    });
                } else {
                    // Empty cells for job role marks if not submitted/absent
                    candidate.distributedMarks.forEach(jobRoleMarks => {
                         rowData[`${jobRoleMarks.jobRoleName}_theory`] = "";
                         rowData[`${jobRoleMarks.jobRoleName}_practical`] = "";
                         rowData[`${jobRoleMarks.jobRoleName}_viva`] = "";
                    });
                }

                worksheet.addRow(rowData);
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
      return errorResponse(res, 400, "No Candidate Found", []);
    }
  } catch (error) {
    console.log("error-->", error);
    return errorResponse(res, 500, responseMessage.something_wrong, error.message);
  }
};

exports.downloadExcelOfflineByBatchWithMarks = async (req, res) => {
  try {
    const batchId = req.params.batchId;
    if (!batchId)
      return errorResponse(
        res,
        400,
        "no batchid provided",
        "no batchid provided"
      );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("New Sheet");

    const query = { batchId: req?.params?.batchId };

    const candidateList = await CandidateModel.find(query, {
      rawPassword: 0,
      password: 0,
    });
    // .populate([{ path: 'batchId', populate: { path: 'clientId' } }])

    if (candidateList.length > 0) {
      const allOnineResult = await OfflineResultModel.find({
        batch_mongo_id: batchId,
      }).populate({
        path: "candidate_mongo_id",
        select: "candidateId name batchId",
        populate: {
          path: "batchId",
          select: "batchId jobRole",
          populate: { path: "jobRole" },
        },
      });

      const transformedData = allOnineResult.map((item, index) => {
        let singleCandidateData = {
          candidateId: item.candidate_mongo_id.candidateId,
          candidateName: item.candidate_mongo_id.name,
          batchId: item.candidate_mongo_id.batchId.batchId,
          jobRole: item.candidate_mongo_id.batchId.jobRole.jobRole,
          sno: index + 1,
          totalScore: item.obtainedGrandTotalMarks,
          percentage: item.percentage,
          passfail: item.result,
        };

        item.nosResult.forEach((item) => {
          const nos = item.nosName.replace(/[\r\n]+/g, "");
          if (!singleCandidateData[nos])
            singleCandidateData[nos] = {
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
        });

        return singleCandidateData;
      });

      // return sendResponse(res, 200, "got data", {nosWiseResultList,
      //   allOnineResult,
      //   transformedData,
      // candidateList ,
      //   candidateIds,
      //   candidateResult,
      //   candidateReport})

      // styling the excel sheet
      // const row = worksheet.getRow("A1:AK")
      // row.height = 100
      // row.alignment = { vertical: 'middle', horizontal: 'center' }
      // row.fill = {
      //   type: 'pattern',
      //   pattern:'solid',
      //   fgColor:{argb:'FFB53400'},
      // }
      // row.border = {
      //   top: {style:'thin', color: {argb:'FF000000'}},
      //   left: {style:'thin', color: {argb:'FF000000'}},
      //   bottom: {style:'thin', color: {argb:'FF000000'}},
      //   right: {style:'thin', color: {argb:'FF000000'}}
      // }

      const baseHeaders = [
        { header: "S.No", key: "sno", width: 10 },
        { header: "Batch ID", key: "batchId", width: 15 },
        { header: "Job Role", key: "jobRole", width: 20 },
        { header: "Candidate ID", key: "candidateId", width: 15 },
        { header: "Candidate Name", key: "candidateName", width: 20 },
      ];

      const modifiedTransformedData = [
        ...new Set(transformedData.flatMap((item) => Object.keys(item))),
      ];
      console.log("modifiedTransformedData-->", modifiedTransformedData);

      const subjects = modifiedTransformedData.filter(
        (key) =>
          !baseHeaders.some((header) => header.key === key) &&
          // !["totalScore", "percentage", "passfail", "grade"].includes(key)
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

      columns.push(
        { header: "Total Score", key: "totalScore", width: 12 },
        { header: "Percentage", key: "percentage", width: 12 },
        { header: "Pass/Fail", key: "passfail", width: 12 }
        // { header: "Grade", key: "grade", width: 12 }
      );

      worksheet.columns = columns;

      let currentColumn = baseHeaders.length + 1;
      subjects.forEach((subject) => {
        const startColumn = currentColumn;
        const endColumn = startColumn + 2;
        worksheet.mergeCells(1, startColumn, 1, endColumn);
        worksheet.getCell(1, startColumn).value = subject;
        worksheet.getCell(1, startColumn).font = { bold: true };
        ["Theory", "Practical", "Viva"].forEach((detail, index) => {
          worksheet.getCell(2, startColumn + index).value = detail;
          worksheet.getCell(2, startColumn + index).font = { bold: true };
        });
        currentColumn += 3;
      });

      let writtenTotalMarks = new Set();

      transformedData.forEach((user, index) => {
        let totalMarksRowValues = { sno: index + 1 };
        let obtainedMarksRowValues = {
          sno: index + 1,
          candidateName: user.candidateName,
          candidateId: user.candidateId,
          batchId: user.batchId,
          jobRole: user.jobRole || "NA",
          totalScore: user.totalScore,
          percentage: parseFloat(user.percentage),
          passfail: user.passfail,
          grade: user.grade,
        };

        console.log("subjects-->", subjects);

        subjects.forEach((subject) => {
          // console.log('user-->', user)
          // console.log("subject-->", subject)
          // console.log('userwithSubject-->', user[subject])

          ["Theory", "Practical", "Viva"].forEach((detail) => {
            const keyForTotalMarks = `${subject}${detail}`;

            if (!writtenTotalMarks.has(keyForTotalMarks)) {
              totalMarksRowValues[keyForTotalMarks] =
                user[subject]?.[detail.toLowerCase()]["marks"];
              writtenTotalMarks.add(keyForTotalMarks);
            }

            obtainedMarksRowValues[keyForTotalMarks] =
              user[subject]?.[detail.toLowerCase()]["obtainedMarks"];
          });
        });

        if (index === 0) {
          const totalMarksRow = {
            ...totalMarksRowValues,
          };
          delete totalMarksRow.sno;
          worksheet.addRow(totalMarksRow);
        }

        worksheet.addRow(obtainedMarksRowValues);
      });

      worksheet.mergeCells("A1:A3");
      worksheet.mergeCells("B1:B3");
      worksheet.mergeCells("C1:C3");
      worksheet.mergeCells("D1:D3");
      worksheet.mergeCells("E1:E3");

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

exports.downloadExcelOfflineByBatch = async (req, res) => {
  try {
    const batchId = req.params.batchId;
    if (!batchId)
      return errorResponse(
        res,
        400,
        "no batchid provided",
        "no batchid provided"
      );

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("New Sheet");

    const assessment = await createAssesmentModel
      .findOne({ batch_id: batchId })
      .populate({
        path: "vivaQuestion_id",
        select: "",
        populate: { path: "question_bank_id", select: "nos" },
      });

    if (!assessment)
      return errorResponse(
        res,
        400,
        "No assessment Found by this batch Id",
        "No assessment Found by this batch Id"
      );

    const candidateList = await CandidateModel.find({ batchId: batchId })
      .select("name candidateId batchId")
      .populate({
        path: "batchId",
        select: "batchId jobRole",
        populate: { path: "jobRole", select: "jobRole" },
      });

    const set = await SetModel.findOne({ _id: assessment.set_id });

    if (!set)
      return errorResponse(
        res,
        400,
        "No set found in the assessment",
        "No set found in the assessment"
      );

    const questions = await QuestionModel.find({
      _id: { $in: set.question_id },
    }).populate("question_bank_id");
    const vivaQuestion = await Vivaquestion.find({
      _id: { $in: assessment.vivaQuestion_id },
    }).populate("question_bank_id");
    const practicalQuestions = await practicalQuestion
      .find({ _id: { $in: assessment.practicalQuestion_id } })
      .populate("question_bank_id");

    if (!questions)
      return errorResponse(
        res,
        400,
        "No question found in the set",
        "No question found in the set"
      );

    let nosListSectionWise = {
      theory: {},
      viva: {},
      practical: {},
    };

    // viva questions
    vivaQuestion.forEach((question) => {
      if (
        nosListSectionWise.viva.hasOwnProperty(question.question_bank_id?.nos)
      ) {
        nosListSectionWise.viva[question.question_bank_id?.nos] +=
          Number(question.marks) || 0;
      } else {
        nosListSectionWise.viva[question.question_bank_id?.nos] =
          Number(question.marks) || 0;
      }
    });

    // practical questions
    practicalQuestions.forEach((question) => {
      if (
        nosListSectionWise.practical.hasOwnProperty(
          question.question_bank_id?.nos
        )
      ) {
        nosListSectionWise.practical[question.question_bank_id?.nos] +=
          Number(question.marks) || 0;
      } else {
        nosListSectionWise.practical[question.question_bank_id?.nos] =
          Number(question.marks) || 0;
      }
    });

    // theory questions
    questions.forEach((question) => {
      if (
        nosListSectionWise.theory.hasOwnProperty(question.question_bank_id?.nos)
      ) {
        nosListSectionWise.theory[question.question_bank_id?.nos] +=
          Number(question.marks) || 0;
      } else {
        nosListSectionWise.theory[question.question_bank_id?.nos] =
          Number(question.marks) || 0;
      }
    });

    // const nosList = [{ nosWiseTheoryMarksOfOneCandidate, vivaQuestionNos, practicalNos }]

    const nosWiseResultList = candidateList.map((candidate, sno) => {
      const result = {
        candidateId: candidate.candidateId,
        testaCandidateId: candidate._id.toString(),
        candidateName: candidate.name,
        batchId: candidate.batchId.batchId,
        jobRole: candidate.batchId.jobRole.jobRole,
        sno: sno + 1,
      };

      Object.keys(nosListSectionWise).forEach((section) => {
        Object.keys(nosListSectionWise[section]).forEach((nos) => {
          if (!result[nos]) {
            result[nos] = {
              theory: {
                marks:
                  section === "theory" ? nosListSectionWise[section][nos] : 0,
                obtainedMarks: null,
              },
              viva: {
                marks:
                  section === "viva" ? nosListSectionWise[section][nos] : 0,
                obtainedMarks: null,
              },
              practical: {
                marks:
                  section === "practical"
                    ? nosListSectionWise[section][nos]
                    : 0,
                obtainedMarks: null,
              },
            };
          } else {
            if (section === "theory") {
              result[nos]["theory"] = {
                marks: section === "theory" && nosListSectionWise[section][nos],
                obtainedMarks: null,
              };
            } else if (section === "viva") {
              result[nos]["viva"] = {
                marks: section === "viva" && nosListSectionWise[section][nos],
                obtainedMarks: null,
              };
            } else if (section === "practical") {
              result[nos]["practical"] = {
                marks:
                  section === "practical" && nosListSectionWise[section][nos],
                obtainedMarks: null,
              };
            }
          }
        });
      });

      return result;
    });

    const baseHeaders = [
      { header: "S.No", key: "sno", width: 10 },
      { header: "Batch ID", key: "batchId", width: 15 },
      { header: "Job Role", key: "jobRole", width: 20 },
      { header: "Candidate ID", key: "candidateId", width: 15 },
      { header: "Testa Candidate ID", key: "testaCandidateId", width: 20 },
      { header: "Candidate Name", key: "candidateName", width: 20 },
    ];

    const subjects = Object.keys(nosWiseResultList[0]).filter(
      (key) => !baseHeaders.some((header) => header.key === key) //&&
      //!["totalScore", "percentage", "passfail", "grade"].includes(key)
    );

    const columns = baseHeaders.concat(
      subjects.flatMap((subject) => {
        return ["Theory", "Practical", "Viva"].map((detail) => {
          return { header: `${detail}`, key: `${subject}${detail}`, width: 15 };
        });
      })
    );

    // columns.push(
    //   { header: "Total Score", key: "totalScore", width: 12 },
    //   { header: "Percentage", key: "percentage", width: 12 },
    //   { header: "Pass/Fail", key: "passfail", width: 12 },
    //   { header: "Grade", key: "grade", width: 12 }
    // );

    worksheet.columns = columns;

    let currentColumn = baseHeaders.length + 1;
    subjects.forEach((subject) => {
      const startColumn = currentColumn;
      const endColumn = startColumn + 2;
      worksheet.mergeCells(1, startColumn, 1, endColumn);
      worksheet.getCell(1, startColumn).value = subject;
      worksheet.getCell(1, startColumn).font = { bold: true };
      ["Theory", "Practical", "Viva"].forEach((detail, index) => {
        worksheet.getCell(2, startColumn + index).value = detail;
        worksheet.getCell(2, startColumn + index).font = { bold: true };
      });
      currentColumn += 3;
    });

    let writtenTotalMarks = new Set();

    nosWiseResultList.forEach((user, index) => {
      let totalMarksRowValues = { sno: index + 1 };

      let obtainedMarksRowValues = {
        sno: index + 1,
        candidateName: user.candidateName,
        candidateId: user.candidateId,
        testaCandidateId: user.testaCandidateId,
        batchId: user.batchId,
        jobRole: user.jobRole,
        totalScore: user.totalScore,
        percentage: user.percentage,
        passfail: user.passfail,
        grade: user.grade,
      };

      subjects.forEach((subject) => {
        ["Theory", "Practical", "Viva"].forEach((detail) => {
          const keyForTotalMarks = `${subject}${detail}`;
          if (!writtenTotalMarks.has(keyForTotalMarks)) {
            totalMarksRowValues[keyForTotalMarks] =
              user[subject][detail.toLowerCase()]["marks"];
            writtenTotalMarks.add(keyForTotalMarks);
          }
          obtainedMarksRowValues[keyForTotalMarks] =
            user[subject][detail.toLowerCase()]["obtainedMarks"];
        });
      });

      if (index === 0) {
        const totalMarksRow = {
          ...totalMarksRowValues,
        };
        delete totalMarksRow.sno;
        worksheet.addRow(totalMarksRow);
      }

      worksheet.addRow(obtainedMarksRowValues);
    });

    worksheet.mergeCells("A1:A3");
    worksheet.mergeCells("B1:B3");
    worksheet.mergeCells("C1:C3");
    worksheet.mergeCells("D1:D3");
    worksheet.mergeCells("E1:E3");
    worksheet.mergeCells("F1:F3");

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

    //return sendResponse(res, 200, 'Offline export excel data', nosWiseResultList)
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

const getFileUrl = async (key) => {
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
      Key: key,
    };
    const getCommand = new GetObjectCommand(fileGetData);

    const url = await getSignedUrl(s3, getCommand, { expiresIn: 36000 });
    console.log("url ---> ", url);
    if (url) {
      return { [key]: url };
    }
  } catch (error) {
    return error.message;
  }
};

//activity log

exports.candidateActivityByBatch = async (req, res) => {
  try {
    let filter = getFilter(req, ["batchId"]);

    const { page, limit, skip, sortOrder } = Paginate(req);

    let query = filter ? filter.query : {};
    //query = { batchId: req?.params?.batchId, isTestSubmitted:true }
    query = { batchId: req?.params?.batchId };

    const batchDetails = await BatchModel.findOne({
      _id: req?.params?.batchId,
    });
    if (!batchDetails)
      return errorResponse(res, 400, "Batch not found", "Batch not found");

    if (batchDetails?.batchMode === "offline") {
      return errorResponse(
        res,
        400,
        "This is a offline batch",
        "This is a offline batch"
      );
    }

    const totalCounts = await AnswerModel.countDocuments(query);

    const totalPages = Math.ceil(totalCounts / limit);

    const candidateList = await AnswerModel.find(query)
      .populate("batchId")
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    if (candidateList.length > 0) {
      const candidateIds = candidateList.map(
        (candidate) => candidate.candidateId
      );
      // const candidateResult = await CandidateReport.find({ candidateId : { $in : candidateIds }})
      const answerDetail = await CandidateModel.find({
        _id: { $in: candidateIds },
      });

      let details = [];

      candidateList.forEach((item2) => {
        answerDetail.forEach((item) => {
          if (item._id.toString() === item2.candidateId.toString()) {
            let userName = item.userName;
            let candidateId = item.candidateId;
            let candidateName = item.name;
            let _id = item._id;
            let loginTime = item.loginTime || null;
            let logoutTime = item.logoutTime || null;
            let latitude = item.latitude || null;
            let longitude = item.longitude || null;
            let ipAddress = item.ipAddress || null;
            let browser = item.browser || null;

            let obj = {
              userName,
              candidateId,
              candidateName,
              loginTime,
              logoutTime,
              latitude,
              longitude,
              ipAddress,
              browser,
              _id,
              startTime: null,
              endTime: null,
              resumeTime: item.resumeTime,
            };

            let finalObj = {
              ...obj,
              startTime: item2.startTime,
              endTime: item2.endTime,
            };
            details.push(finalObj);
          }
        });
      });

      return sendResponse(res, 200, "Candidate Activity List", {
        candidateList: details,
        page,
        totalCounts,
        totalPages,
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

exports.candidateActivityByCandiate = async (req, res) => {
  try {
    const query = {
      batchId: req?.params?.batchId,
      isTestSubmitted: true,
      _id: req?.params?.id,
    };

    const candidateList = await CandidateModel.find(query, {
      rawPassword: 0,
      password: 0,
    }).populate([{ path: "batchId", populate: { path: "clientId" } }]);

    if (candidateList.length > 0) {
      const candidateIds = await candidateList.map(
        (candidate) => candidate._id
      );
      // const candidateResult = await CandidateReport.find({ candidateId : { $in : candidateIds }})
      const answerDetail = await AnswerModel.find({
        candidateId: { $in: candidateIds },
      });

      let details = [];

      candidateList.forEach((item) => {
        let userName = item.userName;
        let candidateId = item.candidateId;
        let candidateName = item.name;
        let _id = item._id;
        let loginTime = item.loginTime;
        let logoutTime = item.logoutTime || "NA";
        let latitude = item.latitude || "NA";
        let longitude = item.longitude || "NA";
        let ipAddress = item.ipAddress || "NA";
        let browser = item.browser || "NA";

        answerDetail.forEach((item2) => {
          let startTime = item2.startTime;
          let endTime = item2.endTime;
          let resumeTime = item2?.resumeTime || "NA";

          if (item._id.toString() === item2.candidateId.toString()) {
            details.push({
              userName,
              candidateId,
              candidateName,
              loginTime,
              logoutTime,
              latitude,
              longitude,
              ipAddress,
              browser,
              startTime,
              endTime,
              resumeTime,
              _id,
            });
          }
        });
      });

      return sendResponse(res, 200, "Candidate Activity List", {
        candidateList: details,
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

exports.singleQuestion = async (req, res) => {
  try {
    const batchId = req.params.id;
    const candidateId = req.params.candidateId;
    const questionId = req.params.questionId;
    if (!batchId) return errorResponse(res, 400, "no batch id provided");
    if (!candidateId)
      return errorResponse(res, 400, "no candidate id provided");
    if (!questionId) return errorResponse(res, 400, "no question id provided");

    const questionList = await AnswerModel.findOne({
      $and: [{ batchId: batchId }, { candidateId: candidateId }],
    });

    const singleQuestion = questionList.questions.filter(
      (item) => item._id?.toString() === questionId?.toString()
    );
    questionList.questions = singleQuestion;

    return sendResponse(res, 200, "single question", { questionList });
  } catch (error) {
    errorResponse(res, 500, responseMessage.something_wrong, error.message);
  }
};

//used in mis for single question update
exports.saveSingleQuestion = async (req, res) => {
  try {
    const batchId = req.params.id;
    const candidateId = req.params.candidateId;
    const questionId = req.params.questionId;
    if (!batchId) return errorResponse(res, 400, "no batch id provided");
    if (!candidateId)
      return errorResponse(res, 400, "no candidate id provided");
    if (!questionId) return errorResponse(res, 400, "no question id provided");

    const questionPayload = req.body;

    const updatedAnswer = await AnswerModel.findOneAndUpdate(
      {
        candidateId: candidateId,
        batchId: batchId,
        "questions._id": questionId,
      },
      {
        $set: {
          "questions.$[questionElem]": questionPayload,
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
      const isRegenerated = await resultGenerate(batchId, candidateId);

      if (isRegenerated) {
        const nosWishResultUpdate = await onlineResultNosWiseRegenerate(
          batchId,
          candidateId
        );
        return sendResponse(
          res,
          200,
          "one question updated and result regenerated",
          nosWishResultUpdate
        );
      } else
        return errorResponse(
          res,
          400,
          "Error while Result Regeneration",
          "Error while Result Regeneration"
        );
    } else {
      return errorResponse(
        res,
        400,
        "Answer not found or Question not found in the array."
      );
    }
  } catch (error) {
    errorResponse(res, 500, responseMessage.something_wrong, error.message);
  }
};

const resultGenerate = async (batchId, candidateId) => {
  try {
    // const batchId = batchId
    // const candidateId = candidateId
    //const questionId = req.params.questionId
    if (!batchId) return errorResponse(res, 400, "no batch id provided");
    if (!candidateId)
      return errorResponse(res, 400, "no candidate id provided");

    // const existingResult = await CandidateReportModel.findOne({ $and: [ {batchId: batchId}, {candidateId: candidateId}]})
    // if(existingResult) return errorResponse(res, 400, "this assessment has already been sumbmitted for this candidate")

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
    // console.log("questionIds--->", questionIds)
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
          (item) => item._id.toString() === question._id.toString()
        );

        if (correspondingQuestion) {
          const correctOptionIds = correspondingQuestion.answer.map(
            (answerObj) => {
              correctOptionIdsArray.push(answerObj.answerId.toString());
              return answerObj.answerId.toString();
            }
          );

          const choosenOption = question.options.filter(
            (option) => option.isSelect
          );
          chooseOptionArray.push(choosenOption);
          //return sendResponse (res, 200, 'got options', { correctOptionIds, choosenOption})

          if (choosenOption.length != correctOptionIds.length) {
            wrongAnswers.push(question._id.toString());
          } else {
            const isAnswerCorrect = choosenOption.every((option) =>
              correctOptionIds.includes(option._id.toString())
            );

            if (isAnswerCorrect) {
              correctAnswers.push(question._id.toString());
            } else {
              wrongAnswers.push(question._id.toString());
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
        if (question._id.toString() === answer.toString()) {
          marksObtained = marksObtained + parseInt(question.marks);
        }
      });
    });

    // console.log("marksObtained--->", marksObtained)
    // console.log("totalMarks--->", totalMarks)

    obtainedPercentage = (marksObtained / totalMarks) * 100;
    // console.log("obtainedPercentage--->", obtainedPercentage)
    wrongAnswer = wrongAnswers?.length;
    correctAnswer = correctAnswers?.length;

    //return sendResponse(res, 200, {wrongAnswers, correctAnswers, correctOptionIdsArray, chooseOptionArray})
    // {questionList, rawQuestion}

    const batchDetails = await BatchModel.findOne({ _id: batchId });

    let passingPercentage =
      batchDetails?.questionPaper?.passingPercentage || 60;

    // const newCandidateReport = new CandidateReport({
    //     numberOfQuestion: numberOfQuestion,
    //     notAttemptQuestion: notAttemptQuestion,
    //     passingPercentage: passingPercentage,
    //     percentageScored:obtainedPercentage,
    //     passedStatus: obtainedPercentage >= passingPercentage ? "Pass" : "Fail",
    //     totalObtainMarks: marksObtained,
    //     attemptQuestion: attemptQuestion,
    //     correctAnswer: correctAnswer,
    //     wrongAnswer: wrongAnswer,
    //     candidateId: candidateId,
    //     batchId: batchId,
    //     totalMarks: totalMarks,
    //     correctAnswerIds: correctAnswers,
    //     wrongAnswerIds: wrongAnswers

    // })

    const reportSaved = await CandidateReport.findOneAndUpdate(
      {
        candidateId: candidateId,
        batchId: batchId,
      },
      {
        $set: {
          numberOfQuestion: numberOfQuestion,
          notAttemptQuestion: notAttemptQuestion,
          passingPercentage: passingPercentage,
          percentageScored: obtainedPercentage,
          passedStatus:
            obtainedPercentage >= passingPercentage ? "Pass" : "Fail",
          totalObtainMarks: marksObtained,
          attemptQuestion: attemptQuestion,
          correctAnswer: correctAnswer,
          wrongAnswer: wrongAnswer,
          candidateId: candidateId,
          batchId: batchId,
          totalMarks: totalMarks,
          correctAnswerIds: correctAnswers,
          wrongAnswerIds: wrongAnswers,
        },
      }
    );

    // const reportSaved = await newCandidateReport.save()

    if (reportSaved) return true;
    else return false;
  } catch (error) {
    console.log("Error In Result Re-Generation ----> ", error.message);
    return false;
  }
};

const onlineResultNosWiseRegenerate = async (batchId, candidateId) => {
  try {
    const batchDetails = await BatchModel.findOne({ _id: batchId });
    const candidateResult = await AnswerModel.findOne({
      candidateId: candidateId,
    }).populate([
      { path: "questions.question_bank_id", select: "" },
      { path: "candidateId", select: ["candidateId", "name"] },
      {
        path: "batchId",
        select: "batchId",
        populate: { path: "jobRole", select: "jobRole" },
      },
    ]);

    const candidateReport = await CandidateReport.findOne({
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
            // practical: { marks: null, obtainedMarks: null },
            // viva: { marks: null, obtainedMarks: null },
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

    const nosWiseResultItem = {
      ...nosWiseTheoryMarks,
      candidateId: candidateResult.candidateId.candidateId,
      candidate_mongo_id: candidateResult.candidateId._id,
      candidateName: candidateResult.candidateId?.name,
      batchId: candidateResult.batchId?.batchId,
      jobRole: candidateResult.batchId?.jobRole?.jobRole,
      // sno: index + 1
    };

    ///////////////////////////
    const candidate = await OnlineResultModel.findOne({
      candidate_mongo_id: candidateId,
    });

    // return {nosWiseResultItem, candidate}

    const filter = {
      candidate_mongo_id: candidateId,
    };

    let totalTheoryMarks = 0;
    let totalPracticalMarks = 0;
    let totalVivaMarks = 0;
    let obtainedTotalTheoryMarks = 0;
    let obtainedTotalPracticalMarks = 0;
    let obtainedTotalVivaMarks = 0;

    candidate.nosResult.forEach((nos) => {
      Object.keys(nosWiseResultItem).forEach((item) => {
        if (item === nos.nosName) {
          const { theory } = nosWiseResultItem[item];

          obtainedTotalTheoryMarks += theory.obtainedMarks;
          obtainedTotalPracticalMarks += nos.obtainedPracticalMarks;
          obtainedTotalVivaMarks += nos.obtainedVivaMarks;

          totalTheoryMarks += nos.theoryMarks;
          totalPracticalMarks += nos.practicalMarks;
          totalVivaMarks += nos.vivaMarks;

          nos.nosName = nos.nosName;
          nos.theoryMarks = nos.theoryMarks;
          nos.practicalMarks = nos.practicalMarks;
          nos.vivaMarks = nos.vivaMarks;
          nos.obtainedTheoryMarks = theory.obtainedMarks;
          nos.obtainedPracticalMarks = nos.obtainedPracticalMarks;
          nos.obtainedVivaMarks = nos.obtainedVivaMarks;

          nos.totalMarks = nos.theoryMarks + nos.practicalMarks + nos.vivaMarks;
          nos.totalObtainedMarks =
            nos.obtainedTheoryMarks +
            nos.obtainedPracticalMarks +
            nos.obtainedVivaMarks;
        }
      });
    });

    let grandTotalMarks =
      totalTheoryMarks + totalPracticalMarks + totalVivaMarks;
    let obtainedGrandTotalMarks =
      obtainedTotalTheoryMarks +
      obtainedTotalPracticalMarks +
      obtainedTotalVivaMarks;
    let percentage = (
      (obtainedGrandTotalMarks / grandTotalMarks) *
      100
    ).toFixed(2);

    const update = {
      $set: {
        nosResult: candidate.nosResult,
        obtainedTotalTheoryMarks: obtainedTotalTheoryMarks,
        obtainedTotalPracticalMarks: obtainedTotalPracticalMarks,
        obtainedTotalVivaMarks: obtainedTotalVivaMarks,
        totalTheoryMarks: totalTheoryMarks,
        totalPracticalMarks: totalPracticalMarks,
        totalVivaMarks: totalVivaMarks,

        grandTotalMarks: grandTotalMarks,
        obtainedGrandTotalMarks: obtainedGrandTotalMarks,
        percentage: percentage,
        result:
          percentage >= batchDetails.questionPaper.passingPercentage
            ? "Pass"
            : "Fail",
      },
    };

    const upsertOperation = {
      updateOne: {
        filter,
        update,
        // upsert: true
      },
    };

    // batchDetails

    // console.log('bulkOperations  ---> ', bulkOperations)
    // return sendResponse(res, 200, 'data', bulkOperations)

    return OnlineResultModel.bulkWrite([upsertOperation])
      .then((data) => {
        return data;
      })
      .catch((err) => {
        return err.message;
      });
  } catch (error) {
    return error.message;
  }
};

//added this functionality for ncvt-dashboard

exports.resultPercentageStatsNcvtDashboard = async (req, res, next) => {
  try {
    const clientId = req.query.clientId;
    const matchQuery = {};

    if (clientId) {
      // Check if the provided clientId has clientType 'ncevt'
      const client = await ClientModel.findOne({
        _id: clientId,
        clientType: "ncevt",
      });

      if (client) {
        matchQuery.clientId = clientId;
      }
    } else {
      // Filter by assigned clients that have clientType 'ncevt'
      const assignedClients = req.user.assigndClients;
      const ncevtClients = await ClientModel.find({
        _id: { $in: assignedClients },
        clientType: "ncevt",
      }).select("_id");
      const ncevtClientIds = ncevtClients.map((client) => client._id);
      matchQuery.clientId = { $in: ncevtClientIds };
    }

    const batchData = await BatchModel.find(matchQuery);

    const totalBatch = await BatchModel.countDocuments();

    const batchIds = batchData.map((batch) => batch._id);

    const query = { batchId: { $in: batchIds } };
    const totalCandidates = await CandidateModel.countDocuments(query);

    //total result generated or total assessment submitted
    const candidateResult = await CandidateReport.find(query);

    const passedCandidate = candidateResult.filter(
      (candidate) => candidate.passedStatus === "Pass"
    );
    const failedCandidate = candidateResult.filter(
      (candidate) => candidate.passedStatus === "Fail"
    );

    const candidatesNotAppear =
      totalCandidates - (passedCandidate.length + failedCandidate.length);

    const percentagePassed =
      (passedCandidate.length / totalCandidates) * 100 || 0;
    const percentageFailed =
      (failedCandidate.length / totalCandidates) * 100 || 0;
    const percentageNotAppeared =
      (candidatesNotAppear / totalCandidates) * 100 || 0;

    return sendResponse(res, 200, "batch result percentage", {
      passedCandidate: `${percentagePassed.toFixed(2)}%`,
      failedCandidate: `${percentageFailed.toFixed(2)}%`,
      notGivenTest: `${percentageNotAppeared.toFixed(2)}%`,
      totalCandidates: totalCandidates || 0,
    });
  } catch (error) {
    return errorResponse(
      res,
      400,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.adminFirstConsole = async (req, res) => {
  let session = null;
  try {
    const batchId = req.body.batchId;
    const candidateIds = req.body.candidateIds;

    //transaction started

    session = await mongoose.startSession();
    session.startTransaction();

    if (!batchId) {
      await session.abortTransaction();
      return errorResponse(res, 400, "no batch id provided");
    }
    if (!mongoose.Types.ObjectId.isValid(batchId)) {
      await session.abortTransaction();
      return errorResponse(res, 400, "invalid batch id");
    }
    const batch = await BatchModel.findOne({ _id: batchId });
    if (!batch) {
      await session.abortTransaction();
      return errorResponse(res, 400, "no batch found");
    }
    if (candidateIds.length < 1) {
      await session.abortTransaction();
      return errorResponse(res, 400, "no candidate id provided");
    }

    const isValid = candidateIds.every((item) =>
      mongoose.Types.ObjectId.isValid(item)
    );
    if (!isValid) {
      await session.abortTransaction();
      const failedItem = candidateIds.find(
        (item) => !mongoose.Types.ObjectId.isValid(item)
      );
      return errorResponse(res, 400, `Invalid candidate Id : ${failedItem}`);
    }

    const validCandidates = await CandidateModel.find({
      _id: { $in: candidateIds },
      batchId: batchId,
    });
    if (validCandidates.length !== candidateIds.length) {
      await session.abortTransaction();
      return errorResponse(res, 400, "invalid candidate list");
    }

    const validCandidatesReports = await CandidateReport.find({
      candidateId: { $in: candidateIds },
      batchId: batchId,
      passedStatus: "Fail",
    });
    if (validCandidatesReports.length !== candidateIds.length) {
      await session.abortTransaction();
      return errorResponse(
        res,
        400,
        "invalid candidate report list OR any candidate already pass"
      );
    }

    const passingPercentageCheck = await checkTotalPassingCandidate(
      batchId,
      candidateIds
    );
    if (!passingPercentageCheck) {
      await session.abortTransaction();
      return errorResponse(
        res,
        400,
        "More than 95% of candidate can not PASS if batch has more than 9 candidates",
        "More than 95% of candidate can not PASS if batch has more than 9 candidates"
      );
    }

    const response = await Promise.all(
      candidateIds.map(async (candidateId) => {
        // await takeOldResultBackup(req, res, batchId, candidateId)
        await makeAllQuestionAnswered(res, batchId, candidateId);
        const udpate_res = await updateQuestionAnswer(
          res,
          batchId,
          candidateId
        );

        return udpate_res;
      })
    );

    const candidatePassed = response.reduce(
      (acc, item) => (acc += item.data.modifiedCount),
      0
    );

    await session.commitTransaction();
    return sendResponse(
      res,
      200,
      "Done",
      `${candidatePassed} candidate has been passed successfully`
    );
  } catch (error) {
    console.log("error", error);
    if (session) {
      await session.abortTransaction();
    }
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

const checkTotalPassingCandidate = async (batchId, candidateIds) => {
  const totalCandidateCount = await CandidateReport.countDocuments({ batchId });
  if (totalCandidateCount < 10) {
    return true;
  }
  // console.log("totalCandidateCount-->", totalCandidateCount)
  const passedCandidateCount = await CandidateReport.countDocuments({
    batchId,
    passedStatus: "Pass",
  });
  // console.log("passedCandidateCount-->", passedCandidateCount)
  const upcomingCandidateCount = candidateIds.length;
  // console.log("upcomingCandidateCount-->", upcomingCandidateCount)
  const totalPassedCandidateCount =
    passedCandidateCount + upcomingCandidateCount;
  // console.log("totalPassedCandidateCount-->", totalPassedCandidateCount)
  const passedPercentage =
    (totalPassedCandidateCount / totalCandidateCount) * 100;

  // console.log("passedPercentage-->", passedPercentage)

  if (passedPercentage > 95) {
    return false;
  } else {
    return true;
  }
};

function currentDateAndTime() {
  const date = new Date();
  const formattedDate = date.toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "Asia/Kolkata",
  });
  const formattedTime = date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "numeric",
    hour12: true,
    timeZone: "Asia/Kolkata",
  });
  const weekday = date.toLocaleDateString("en-IN", {
    weekday: "long",
    timeZone: "Asia/Kolkata",
  });

  return `${formattedDate} at ${formattedTime} ${weekday}`;
}

const makeAllQuestionAnswered = async (res, batchId, candidateId) => {
  const assessment = await createAssesmentModel.findOne({ batch_id: batchId });

  const set = await SetModel.findOne({ assesment_id: assessment._id });

  const questionIds = set.question_id.map((item) => item);

  const desiredQuestions = await QuestionModel.find({
    _id: { $in: questionIds },
  });

  const candidateQuestions = await AnswerModel.findOne({
    batchId,
    candidateId,
  }).lean();

  const modifiedQuestions = candidateQuestions.questions.map(
    (candidateQuestion) => {
      if (
        candidateQuestion.questionStatus.notAttempt ||
        candidateQuestion.questionStatus.notAnswered ||
        candidateQuestion.questionStatus.markForReview
      ) {
        // Reset all options to isSelect = false
        candidateQuestion.options = candidateQuestion.options.map((option) => {
          return { ...option, isSelect: false };
        });

        const rawQuestion = desiredQuestions.find(
          (item) => item._id?.toString() === candidateQuestion?._id?.toString()
        );

        for (const option of candidateQuestion.options) {
          //update the first option which doesn't match answerId
          if (
            rawQuestion.answer[0]?.answerId?.toString() !== option?._id?.toString()
          ) {
            option.isSelect = true;
            candidateQuestion.questionStatus.notAttempt = false;
            candidateQuestion.questionStatus.notAnswered = false;
            candidateQuestion.questionStatus.markForReview = false;
            candidateQuestion.questionStatus.answered = true;

            break;
          }
        }
      }
      return candidateQuestion;
    }
  );

  // Saving the modified answer
  const updatedAnswer = await AnswerModel.updateOne(
    { batchId, candidateId },
    { $set: { questions: modifiedQuestions } },
    { new: true }
  );

  // udpate candidate report collection
  await udpateCandidateReportCollection(res, batchId, candidateId);
  await onlineResultUploadHanlder(res, batchId, candidateId);

  return {
    status: true,
    messsage: "result udpated successfully",
    data: { updatedAnswer, modifiedQuestions },
  };
};

const takeOldResultBackup = async (req, res, batchId, candidateId) => {
  const candidateAnswers = await AnswerModel.findOne({ batchId, candidateId });
  const candidateReport = await CandidateReport.findOne({
    batchId,
    candidateId,
  });
  const candidateOnlineResult = await OnlineResultModel.findOne({
    batch_mongo_id: batchId,
    candidate_mongo_id: candidateId,
  }).populate("candidate_mongo_id");
  const candidateId2 =
    candidateOnlineResult.candidateId ??
    candidateOnlineResult?.candidate_mongo_id?.candidateId;
  const oldResultDocument = new OldResultModel({
    candidateId: candidateId2,
    candidate_mongo_id: candidateId,
    batchId: candidateOnlineResult.batchId,
    batch_mongo_id: batchId,
    generatedBy: req.user._id,
    generatedByName: `${req.user?.firstName} ${req.user?.lastName}`,
    generatedAt: currentDateAndTime(),
    answers: candidateAnswers,
    candidateReport: candidateReport,
    onlineResult: candidateOnlineResult,
  });

  const oldResultSaved = await oldResultDocument.save();
  return {
    status: true,
    messsage: "old result saved successfully",
    data:
      oldResultSaved &&
      `${candidateOnlineResult?.candidate_mongo_id?.name} ( ${candidateId2} ) result backed-up successfully`,
  };
};

const getCandidateReport = async (res, batchId, candidateId) => {
  const candidateReport = await CandidateReport.findOne({
    batchId,
    candidateId,
  });
  return {
    status: true,
    message: "candidate report data",
    data: candidateReport,
  };
};

const getDesiredMarks = async (res, candidateReport) => {
  const totalMarks = candidateReport.totalMarks;
  // console.log("totalMarks-->", totalMarks)
  const obtainedMarks = candidateReport.totalObtainMarks;
  // console.log("obtainedMarks-->", obtainedMarks)
  const passingPercentage = parseFloat(candidateReport.passingPercentage);
  // console.log("passingPercentage-->", passingPercentage)
  const passingMarks = parseInt((passingPercentage / 100) * totalMarks);
  // console.log("passingMarks-->", passingMarks)
  const requiredMarks = parseInt(passingMarks - obtainedMarks);
  // console.log("requiredMarks-->", requiredMarks)
  const randomPercentage = Math.random() * (10 - 5) + 5;
  // console.log("randomPercentage-->", randomPercentage)
  const randomMarks = Math.floor((randomPercentage / 100) * totalMarks);
  // console.log("randomMarks-->", randomMarks)
  const desiredMarks = requiredMarks + randomMarks;
  // console.log("desiredMarks-->", desiredMarks)

  return {
    status: true,
    message: "successfully calculated desired marks",
    data: desiredMarks,
  };
};

const updateQuestionAnswer = async (res, batchId, candidateId) => {
  const candiateReport = await CandidateReport.findOne({
    batchId,
    candidateId,
  });

  const rawQuestions = await QuestionModel.find({
    _id: { $in: candiateReport.wrongAnswerIds },
  });

  const desiredMarks = (
    await getDesiredMarks(
      res,
      (
        await getCandidateReport(res, batchId, candidateId)
      ).data
    )
  ).data;

  const desiredQuestions = [];
  let currentMarks = 0;

  rawQuestions.forEach((question) => {
    if (desiredMarks >= currentMarks) {
      desiredQuestions.push({
        _id: question._id,
        optionIds: question.answer.map((item) => item?.answerId?.toString()),
      });
      currentMarks += question.marks;
    }
  });
  // console.log('currentMarks--->', currentMarks)
  const candidateQuestions = await AnswerModel.findOne({
    batchId,
    candidateId,
  });

  const modifiedQuestions = candidateQuestions.questions.map(
    (candidateQuestion) => {
      desiredQuestions.forEach((desiredQuestion) => {
        if (
          candidateQuestion._id?.toString() === desiredQuestion._id?.toString()
        ) {
          // Reset all options to isSelect = false
          candidateQuestion.options.forEach((option) => {
            option.isSelect = false;
          });

          // Set isSelect = true for matching options
          candidateQuestion.options.forEach((option) => {
            if (desiredQuestion.optionIds.includes(option._id?.toString())) {
              option.isSelect = true;
            }
          });
        }
      });

      return candidateQuestion; // Return the modified candidateQuestion
    }
  );

  // Saving the modified answer
  const updatedAnswer = await AnswerModel.updateOne(
    { batchId, candidateId },
    { $set: { questions: modifiedQuestions } },
    { new: true }
  );

  // udpate candidate report collection
  await udpateCandidateReportCollection(res, batchId, candidateId);
  await onlineResultUploadHanlder(res, batchId, candidateId, true);
  // const deleted = await OldResultModel.deleteMany({batch_mongo_id: batchId})

  return {
    status: true,
    messsage: "job done successfully",
    data: updatedAnswer,
  };
};

const udpateCandidateReportCollection = async (res, batchId, candidateId) => {
  const correctAnswers = [];
  const wrongAnswers = [];
  const attemptedQuestions = [];
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

  const questionList = await AnswerModel.findOne({ batchId, candidateId });
  const candiateReport = await CandidateReport.findOne({
    batchId,
    candidateId,
  });
  const questionIds = questionList.questions.reduce(
    (acc, item) => [...acc, item._id],
    []
  );
  const rawQuestion = await QuestionModel.find({ _id: { $in: questionIds } });

  questionList.questions.forEach((question) => {
    // to count the attempted question
    if (!question.questionStatus.notAttempt) {
      attemptQuestion = attemptQuestion + 1;
      attemptedQuestions.push(question._id?.toString());
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

  const batchDetails = await BatchModel.findOne({ _id: batchId });

  let passingPercentage = batchDetails?.questionPaper?.passingPercentage || 60;

  candiateReport.numberOfQuestion = numberOfQuestion;
  candiateReport.notAttemptQuestion = notAttemptQuestion;
  candiateReport.passingPercentage = passingPercentage;
  candiateReport.percentageScored = `${obtainedPercentage}%`;
  candiateReport.passedStatus =
    obtainedPercentage >= passingPercentage ? "Pass" : "Fail";
  candiateReport.attemptQuestion = attemptQuestion;
  candiateReport.totalObtainMarks = marksObtained.toFixed(2);
  candiateReport.correctAnswer = correctAnswer;
  candiateReport.wrongAnswer = wrongAnswer;
  candiateReport.totalMarks = totalMarks;
  candiateReport.correctAnswerIds = correctAnswers;
  candiateReport.wrongAnswerIds = wrongAnswers;

  await candiateReport.save();
};

const onlineResultUploadHanlder = async (
  res,
  batchId,
  candidateId,
  first = false
) => {
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

  const candidateReport = await CandidateReport.findOne({
    candidateId: candidateId,
  });

  const candidateOnlineResult = await OnlineResultModel.findOne({
    batch_mongo_id: batchId,
    candidate_mongo_id: candidateId,
  });

  let nosWiseTheoryMarks = {};

  candidateResult.questions.forEach((question) => {
    const nos = question.question_bank_id?.nos;
    const marks = question.marks;
    const jobRole = question.question_bank_id.jobRole;
    const qpCode = question.question_bank_id.qpCode;
    const version = question.question_bank_id.version;
    const level = question.question_bank_id.jobLevel;

    if (nos) {
      if (!nosWiseTheoryMarks[nos]) {
        nosWiseTheoryMarks[nos] = {
          theory: { marks: 0, obtainedMarks: 0 },
          practical: { marks: 0, obtainedMarks: 0 },
          viva: { marks: 0, obtainedMarks: 0 },
          jobRole: jobRole,
          qpCode: qpCode,
          version: version,
          level: level,
        };
      }

      // Always add marks to the 'theory' part
      nosWiseTheoryMarks[nos].theory.marks += marks;
    }
  });

  // logic to update the viva & practical marks
  const nosList = candidateOnlineResult.nosResult.map((item) => item.nosName);

  nosList.forEach((NOS) => {
    // if the nos is not found in theory but have in viva and practical than add it in nosWiseTheoryMarks
    if (!nosWiseTheoryMarks[NOS]) {
      nosWiseTheoryMarks[NOS] = {
        theory: { marks: 0, obtainedMarks: 0 },
        practical: { marks: 0, obtainedMarks: 0 },
        viva: { marks: 0, obtainedMarks: 0 },
        // jobRole: jobRole,
        // qpCode: qpCode,
        // version: version,
        // level: level
      };
    }

    const nosData = candidateOnlineResult.nosResult.find(
      (item) => item.nosName === NOS
    );

    nosWiseTheoryMarks[NOS].practical.marks = nosData.practicalMarks;
    nosWiseTheoryMarks[NOS].practical.obtainedMarks =
      nosData.obtainedPracticalMarks;

    nosWiseTheoryMarks[NOS].viva.marks = nosData.vivaMarks;
    nosWiseTheoryMarks[NOS].viva.obtainedMarks = nosData.obtainedVivaMarks;
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
    const { theory, practical, viva, jobRole, qpCode, version, level } =
      nosWiseTheoryMarks[nosName];

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

    let nosTheoryResult = {
      nosName,
      theoryMarks: theory.marks,
      obtainedTheoryMarks: theory.obtainedMarks,
      totalMarks: totalMarks,
      totalObtainedMarks: totalObtainedMarks,
    };

    let nosResult1 = {
      nosName,
      jobRole: jobRole,
      qpCode: qpCode,
      version: version,
      level: level,
      theoryMarks: theory.marks,
      obtainedTheoryMarks: theory.obtainedMarks,

      practicalMarks: practical.marks,
      obtainedPracticalMarks: practical.obtainedMarks,

      vivaMarks: viva.marks,
      obtainedVivaMarks: viva.obtainedMarks,

      totalMarks: totalMarks,
      totalObtainedMarks: totalObtainedMarks,
    };

    return { nosResult1, nosTheoryResult };
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

  const onlineResult = await OnlineResultModel.findOne({
    batch_mongo_id: batchId,
    candidate_mongo_id: candidateId,
  });

  (onlineResult.nosResult = nosResult.map((item) => item.nosResult1)),
    (onlineResult.nosTheoryResult = nosResult.map(
      (item) => item.nosTheoryResult
    )),
    (onlineResult.candidate_mongo_id = candidateResult.candidateId._id),
    (onlineResult.candidateName = candidateResult.candidateId?.name),
    (onlineResult.batchId = candidateResult.batchId?.batchId),
    (onlineResult.batch_mongo_id = candidateResult.batchId?._id),
    (onlineResult.totalTheoryMarks = totalTheoryMarks),
    (onlineResult.totalPracticalMarks = totalPracticalMarks),
    (onlineResult.totalVivaMarks = totalVivaMarks),
    (onlineResult.obtainedTotalTheoryMarks = obtainedTotalTheoryMarks),
    (onlineResult.obtainedTotalPracticalMarks = obtainedTotalPracticalMarks),
    (onlineResult.obtainedTotalVivaMarks = obtainedTotalVivaMarks),
    (onlineResult.grandTotalMarks = grandTotalMarks),
    (onlineResult.obtainedGrandTotalMarks = obtainedGrandTotalMarks),
    (onlineResult.percentage = percentage),
    (onlineResult.result =
      percentage >= candidateResult.batchId?.questionPaper?.passingPercentage
        ? "Pass"
        : "Fail");

  await onlineResult.save();
  first &&
    (await CandidateModel.findOneAndUpdate(
      { _id: candidateId },
      { $set: { studentType: 2 } }
    ));
};

exports.failedCandidateList = async (req, res) => {
  try {
    let filter = getFilter(req, ["name", "candidateId"]);

    const { page, limit, skip, sortOrder } = Paginate(req);

    let query = filter ? filter.query : {};
    query = { ...query, batchId: req?.params?.batchId, isTestSubmitted: true };

    const failedCandidate = await CandidateReport.find({
      batchId: req?.params?.batchId,
      passedStatus: "Fail",
    });
    //  console.log('failedCandidate-->', failedCandidate)

    query = {
      ...query,
      _id: {
        $in:
          failedCandidate.length > 0
            ? failedCandidate?.reduce(
                (acc, item) => [...acc, item.candidateId],
                []
              )
            : [],
      },
    };
    const totalCounts = await CandidateModel.countDocuments(query);

    const totalPages = Math.ceil(totalCounts / limit);

    const candidateList = await CandidateModel.find(query, {
      rawPassword: 0,
      password: 0,
    })
      .populate([{ path: "batchId", populate: { path: "jobRole" } }])
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    if (candidateList.length > 0) {
      const candidateIds = await candidateList.map(
        (candidate) => candidate._id
      );

      const candidateSectionResult = await CandidateReport.find({
        candidateId: { $in: candidateIds },
      });
      //const candidateSectionResult = await OnlineResultModel.find({ candidate_mongo_id : candidateIds})

      let candiateReport = [];
      candidateList.forEach((candidate) => {
        let sectionStats = {};
        candidateSectionResult.forEach((result) => {
          if (candidate._id.toString() === result.candidateId.toString()) {
            sectionStats = {
              totalTheoryMarks: result?.totalMarks.toString() || "0",
              // totalPracticalMarks: result?.totalPracticalMarks.toString() || "0",

              // totalVivaMarks: result?.totalVivaMarks.toString() || "0",
              obtainedTotalTheoryMarks:
                result?.totalObtainMarks.toString() || "0",
              // obtainedTotalPracticalMarks: result?.obtainedTotalPracticalMarks.toString() || "0",
              // obtainedTotalVivaMarks: result?.obtainedTotalVivaMarks.toString() || "0",

              // grandTotalMarks: result?.grandTotalMarks.toString() || "0",
              // obtainedGrandTotalMarks: result?.obtainedGrandTotalMarks.toString() || "0",
              percentage: result?.percentageScored.toString() || "0",
              result: result?.passedStatus.toString(),
            };
          }
          // else{

          //   candidateResult.forEach(studentResult=> {
          //     if(candidate._id.toString() === studentResult.candidateId.toString()){

          //       sectionStats = {

          //         totalTheoryMarks: studentResult?.totalMarks.toString() || "0",
          //         obtainedTotalTheoryMarks: studentResult?.totalObtainMarks.toString() || "0",

          //         totalVivaMarks:  "0",
          //         obtainedTotalVivaMarks:  "0",
          //         totalPracticalMarks:  "0",
          //         obtainedTotalPracticalMarks:  "0",

          //         grandTotalMarks:studentResult?.totalMarks.toString() || "0",
          //         obtainedGrandTotalMarks:studentResult?.totalObtainMarks.toString() || "0",
          //         percentage: studentResult?.percentageScored.toString() || "0",
          //         result: studentResult?.passedStatus.toString()
          //       }

          //     }

          //   })

          // }
        });

        let { batchId } = candidate;
        let response = {
          batchId: batchId.batchId,
          passingPercentage: batchId.questionPaper.passingPercentage,
          jobRole: batchId.jobRole?.jobRole,
          name: candidate.name,
          candidateId: candidate.candidateId,
          userName: candidate.userName,
          _id: candidate._id,
          // examDate: batchId.assessmentDate,
          // aadharNo: candidate.aadharNo,
          // dob: candidate.dob,
          // gender: candidate.gender,
          // email: candidate.email,
          // mobile: candidate.mobile,
          // ...stats,
          ...sectionStats,
        };

        candiateReport.push(response);
      });

      return sendResponse(res, 200, "Candidate List", {
        candiateReport,
        page,
        totalCounts,
        totalPages,
      });
    } else {
      return errorResponse(res, 200, "No Candidate Found", []);
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

exports.getAssessmentFeedback = async (req, res) => {
  try {
    const assessmentBatchId = req.params.id;
    const assessmentCandidateId = req.params.candidateId;

    if (!assessmentBatchId)
      return errorResponse(res, 400, "no batch id provided");
    if (!assessmentCandidateId)
      return errorResponse(res, 400, "no candidate id provided");

    const candidateReport = await CandidateReport.findOne({
      $and: [
        { batchId: assessmentBatchId },
        { candidateId: assessmentCandidateId },
      ],
    });

    if (!candidateReport) {
      return errorResponse(res, 400, "No candidate report found");
    }

    const { _id, candidateId, batchId, createdAt, assessmentFeedback } =
      candidateReport;

    const data = {
      _id,
      candidateId,
      batchId,
      assessmentFeedback,
      createdAt,
    };
   

    return sendResponse(
      res,
      200,
      "assessment feedback found successfully",
      data
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

exports.downloadExcelOnlineWithCorrectOption = async (req, res) => {
  try {
    const { batchId, candidateId } = req.params;

    // Fetch answer details
    const answerDetails = await AnswerModel.findOne({
      batchId: mongoose.Types.ObjectId(batchId),
      candidateId: mongoose.Types.ObjectId(candidateId),
    });

    const query = {
      batchId: mongoose.Types.ObjectId(batchId),
      isTestSubmitted: true,
      _id: mongoose.Types.ObjectId(candidateId),
    };

    const candidate = await CandidateModel.findOne(query, {
      rawPassword: 0,
      password: 0,
    }).populate([
      {
        path: "batchId",
        populate: {
          path: "clientId jobRole questionPaper.multipleJobRole.jobRoleId",
        },
      },
    ]);

    if (!answerDetails) {
      return res
        .status(404)
        .json({ error: "No data found for the given IDs." });
    }

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Answers");

    // Define initial columns
    let columns = [
      { header: "Sl No", key: "serialNumber", width: 10 },
      { header: "Candidate Name", key: "candidateName", width: 30 },
      { header: "Candidate ID", key: "candidateId", width: 30 },
      { header: "Job Role Name", key: "jobRoleName", width: 30 },
      { header: "Question", key: "questionText", width: 50 },
    ];

    // Add dynamic option columns
    const maxOptions = Math.max(
      ...answerDetails.questions.map((q) => q.options.length || 0)
    );
    for (let i = 1; i <= maxOptions; i++) {
      columns.push({
        header: `Option ${i}`,
        key: `option${i}`,
        width: 20,
      });
    }

    // Add final columns
    columns.push(
      { header: "Correct Answer", key: "correctAnswer", width: 30 },
      { header: "Selected Answer", key: "selectedAnswer", width: 30 }
    );

    worksheet.columns = columns;

    const questionIds = answerDetails?.questions?.map(
      (question) => question._id
    );

    const rawQuestions = await QuestionModel.find({
      _id: { $in: questionIds },
    });

    let questionWithAnswer = [];

    answerDetails.questions.forEach((question) => {
      rawQuestions.forEach((rawQuestion) => {
        if (question._id.toString() === rawQuestion._id.toString()) {
          const modifiedQuestion = {
            ...JSON.parse(JSON.stringify(question)),
            options: question.options?.sort((a, b) => {
              const keyA = a.optionKey.slice(-1);
              const keyB = b.optionKey.slice(-1);
              return keyA.localeCompare(keyB);
            }),
          };

          questionWithAnswer.push({
            ...modifiedQuestion,
            answer: rawQuestion.answer,
          });
        }
      });
    });

    const response = {
      ...JSON.parse(JSON.stringify(answerDetails)),
      questions: JSON.parse(JSON.stringify(questionWithAnswer)),
    };
    const getCharacterValue = (char) => {
      if (char?.length === 1 && char >= "a" && char <= "z") {
        return char.charCodeAt(0) - "a".charCodeAt(0);
      }
      return null;
    };

    // Populate rows with question data
    let jobRoleName = "N/A";
    if (candidate.batchId) {
      if (candidate.batchId.questionPaper.isMultiJobRole) {
        const multiJobRole =
          candidate.batchId.questionPaper?.multipleJobRole ?? [];

        if (multiJobRole.length) {
          jobRoleName = "";
        }
        for (let jobRole of multiJobRole) {
          jobRoleName += `${jobRole.jobRoleId.jobRole}, `;
        }

        if (jobRoleName && jobRoleName[jobRoleName.length - 1] === ",") {
          jobRoleName = jobRoleName.slice(0, jobRoleName.length - 1);
        }
      } else {
        jobRoleName = candidate.batchId?.jobRole?.jobRole ?? "N/A";
      }
    }
    response.questions.forEach((question, index) => {
      const options = question.options || [];
      const correctOption =
        getCharacterValue(question.answer[0]?.rawAnswer.toLowerCase()) >= 0
          ? options[
              getCharacterValue(question.answer[0]?.rawAnswer.toLowerCase())
            ]
          : {};

      const selectedOption = options.find((opt) => opt.isSelect) || {};

      const rowData = {
        serialNumber: index + 1, // Add Serial Number
        candidateName: candidate.name ?? "N/A",
        candidateId: candidate.candidateId ?? "N/A",
        jobRoleName,
        questionText: question.questionText ?? "",
        correctAnswer: correctOption.optionValue ?? "",
        selectedAnswer: selectedOption.optionValue ?? "Not Answered",
      };

      options.forEach((option, optionIndex) => {
        rowData[`option${optionIndex + 1}`] = option.optionValue || "";
      });

      worksheet.addRow(rowData);
    });

    // Merge cells for Candidate Name, Candidate ID, and Job Role Name
    const totalRows = response.questions.length + 1; // Including the header row

    worksheet.mergeCells(`B2:B${totalRows}`);
    worksheet.mergeCells(`C2:C${totalRows}`);
    worksheet.mergeCells(`D2:D${totalRows}`);

    worksheet.getCell("B2").value = candidate.name ?? "N/A";
    worksheet.getCell("C2").value = candidate.candidateId ?? "N/A";
    worksheet.getCell("D2").value = jobRoleName ?? "N/A";

    worksheet.getCell("B2").alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    worksheet.getCell("C2").alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    worksheet.getCell("D2").alignment = {
      vertical: "middle",
      horizontal: "center",
    };

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

exports.downloadAttendanceSheet = async (req, res) => {
  try {
    const { batchId } = req.params;

    const query = {
      batchId: mongoose.Types.ObjectId(batchId),
    };

    const candidates = await CandidateModel.find(query, {
      rawPassword: 0,
      password: 0,
    }).populate([
      {
        path: "batchId",
        populate: {
          path: "clientId jobRole questionPaper.multipleJobRole.jobRoleId",
        },
      },
    ]);

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet("Answers");

    // Define initial columns
    let columns = [
      { header: "Sl No", key: "serialNumber", width: 10 },
      { header: "Batch Id", key: "batchId", width: 50 },
      { header: "Job Role Name", key: "jobRoleName", width: 30 },
      { header: "Candidate Name", key: "candidateName", width: 30 },
      { header: "Candidate ID", key: "candidateId", width: 30 },
      { header: "Attendance", key: "attendance", width: 20 },
    ];

    worksheet.columns = columns;

    // Add rows with candidate data
    const batchIdValue = candidates[0]?.batchId?.batchId ?? "N/A";
    // const jobRoleNameValue = candidates[0]?.batchId?.jobRole?.jobRole ?? "N/A";
    const candidate = candidates[0];
    let jobRoleNameValue = "N/A";
    if (candidate.batchId) {
      if (candidate.batchId.questionPaper.isMultiJobRole) {
        const multiJobRole =
          candidate.batchId.questionPaper?.multipleJobRole ?? [];

        if (multiJobRole.length) {
          jobRoleNameValue = "";
        }
        for (let jobRole of multiJobRole) {
          jobRoleNameValue += `${jobRole.jobRoleId.jobRole}, `;
        }

        if (
          jobRoleNameValue &&
          jobRoleNameValue[jobRoleNameValue.length - 1] === ","
        ) {
          jobRoleNameValue = jobRoleNameValue.slice(
            0,
            jobRoleNameValue.length - 1
          );
        }
      } else {
        jobRoleNameValue = candidate.batchId?.jobRole?.jobRole ?? "N/A";
      }
    }

    candidates.forEach((candidate, index) => {
      const rowData = {
        serialNumber: index + 1,
        batchId: batchIdValue,
        candidateName: candidate.name ?? "N/A",
        candidateId: candidate.candidateId ?? "N/A",
        jobRoleName: jobRoleNameValue,
        attendance: candidate.isTestSubmitted ? "Attended" : "Non Attended",
      };
      worksheet.addRow(rowData);
    });

    // Merge cells for Batch Id and Job Role Name
    const totalRows = candidates.length + 1; // Including the header row
    worksheet.mergeCells(`B2:B${totalRows}`);
    worksheet.mergeCells(`C2:C${totalRows}`);

    worksheet.getCell("B2").value = batchIdValue;
    worksheet.getCell("C2").value = jobRoleNameValue;

    worksheet.getCell("B2").alignment = {
      vertical: "middle",
      horizontal: "center",
    };
    worksheet.getCell("C2").alignment = {
      vertical: "middle",
      horizontal: "center",
    };

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

exports.downloadBatchResultsAsZip = async (req, res) => {
  try {
    const { batchId } = req.params;

    // Fetch all candidates in the batch
    const candidates = await CandidateModel.find({
      batchId: mongoose.Types.ObjectId(batchId),
      isTestSubmitted: true,
    }).populate([
      {
        path: "batchId",
        populate: {
          path: "clientId jobRole questionPaper.multipleJobRole.jobRoleId",
        },
      },
    ]);

    if (!candidates || candidates.length === 0) {
      return res
        .status(404)
        .json({ error: "No candidates found for the given batch." });
    }

    const zip = new JSZip();

    for (const candidate of candidates) {
      // Fetch answer details for the candidate
      const answerDetails = await AnswerModel.findOne({
        batchId: mongoose.Types.ObjectId(batchId),
        candidateId: mongoose.Types.ObjectId(candidate._id),
      });

      if (!answerDetails) continue;

      const questionIds = answerDetails?.questions?.map((q) => q._id);
      const rawQuestions = await QuestionModel.find({
        _id: { $in: questionIds },
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet("Answers");

      // Define columns
      let columns = [
        { header: "Sl No", key: "serialNumber", width: 10 },
        { header: "Candidate Name", key: "candidateName", width: 30 },
        { header: "Candidate ID", key: "candidateId", width: 30 },
        { header: "Job Role Name", key: "jobRoleName", width: 30 },
        { header: "Question", key: "questionText", width: 50 },
      ];

      const maxOptions = Math.max(
        ...answerDetails.questions.map((q) => q.options.length || 0)
      );
      for (let i = 1; i <= maxOptions; i++) {
        columns.push({ header: `Option ${i}`, key: `option${i}`, width: 20 });
      }

      columns.push(
        { header: "Correct Answer", key: "correctAnswer", width: 30 },
        { header: "Selected Answer", key: "selectedAnswer", width: 30 }
      );

      worksheet.columns = columns;

      // Prepare question details with correct/selected answers
      const getCharacterValue = (char) => {
        if (char?.length === 1 && char >= "a" && char <= "z") {
          return char.charCodeAt(0) - "a".charCodeAt(0);
        }
        return null;
      };

      const questionWithAnswer = answerDetails.questions.map((question) => {
        const rawQuestion = rawQuestions.find(
          (raw) => raw._id.toString() === question._id.toString()
        );

        const sortedOptions = question.options?.sort((a, b) => {
          const keyA = a.optionKey.slice(-1);
          const keyB = b.optionKey.slice(-1);
          return keyA.localeCompare(keyB);
        });

        const correctOption =
          getCharacterValue(rawQuestion?.answer[0]?.rawAnswer.toLowerCase()) !==
          null
            ? sortedOptions[
                getCharacterValue(rawQuestion.answer[0].rawAnswer.toLowerCase())
              ]
            : {};
        const selectedOption = sortedOptions.find((opt) => opt.isSelect) || {};

        return {
          questionText: question.questionText,
          options: sortedOptions,
          correctAnswer: correctOption?.optionValue || "N/A",
          selectedAnswer: selectedOption?.optionValue || "Not Answered",
        };
      });

      let jobRoleName = "N/A";
      if (candidate.batchId) {
        if (candidate.batchId.questionPaper.isMultiJobRole) {
          const multiJobRole =
            candidate.batchId.questionPaper?.multipleJobRole ?? [];

          if (multiJobRole.length) {
            jobRoleName = "";
          }
          for (let jobRole of multiJobRole) {
            jobRoleName += `${jobRole.jobRoleId.jobRole}, `;
          }

          if (jobRoleName && jobRoleName[jobRoleName.length - 1] === ",") {
            jobRoleName = jobRoleName.slice(0, jobRoleName.length - 1);
          }
        } else {
          jobRoleName = candidate.batchId?.jobRole?.jobRole ?? "N/A";
        }
      }

      questionWithAnswer.forEach((question, index) => {
        console.log("candidate.batchId?.jobRole", candidate.batchId?.jobRole);
        const rowData = {
          serialNumber: index + 1,
          candidateName: candidate.name ?? "N/A",
          candidateId: candidate.candidateId ?? "N/A",
          jobRoleName,
          questionText: question.questionText ?? "",
          correctAnswer: question.correctAnswer,
          selectedAnswer: question.selectedAnswer,
        };

        question.options.forEach((option, optionIndex) => {
          rowData[`option${optionIndex + 1}`] = option.optionValue || "";
        });

        worksheet.addRow(rowData);
      });

      // Merge cells for Candidate Name, Candidate ID, and Job Role Name
      const totalRows = questionWithAnswer.length + 1; // Including header row
      worksheet.mergeCells(`B2:B${totalRows}`);
      worksheet.mergeCells(`C2:C${totalRows}`);
      worksheet.mergeCells(`D2:D${totalRows}`);

      worksheet.getCell("B2").value = candidate.name ?? "N/A";
      worksheet.getCell("C2").value = candidate.candidateId ?? "N/A";
      worksheet.getCell("D2").value = jobRoleName ?? "N/A";

      worksheet.getCell("B2").alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      worksheet.getCell("C2").alignment = {
        vertical: "middle",
        horizontal: "center",
      };
      worksheet.getCell("D2").alignment = {
        vertical: "middle",
        horizontal: "center",
      };

      // Write the workbook to a buffer
      const buffer = await workbook.xlsx.writeBuffer();

      // Add the buffer to the ZIP
      zip.file(
        `${candidate.name || "Candidate"}_${candidate.candidateId}.xlsx`,
        buffer
      );
    }

    // Generate ZIP archive
    const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });

    res.setHeader(
      "Content-Disposition",
      'attachment; filename="BatchResults.zip"'
    );
    res.setHeader("Content-Type", "application/zip");

    const stream = Readable.from(zipBuffer);
    stream.pipe(res);
  } catch (error) {
    console.error("Error generating ZIP archive:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};


//OMR functionality code
exports.getCandidateListWithQuestion = async (req, res) => { 
  try {
    console.log("inside code")

    const batchId = req.params.batchId
    console.log("batchId==>",batchId)
    if(!batchId)
      return errorResponse(res, 400, "batch id not provided", "batch id not provided")

    const candidateList = await AnswerOfflineTheoryModel.find({batchId:batchId}).populate('candidateId')
    console.log("candidateList=>",candidateList)
    if(candidateList.length < 1){
      console.log("inside")
      return errorResponse(res, 400, "no candidate found", "no candidate found")
    }

    return sendResponse(res, 200, "candidateList", candidateList)

    
  } catch (error) {
      return errorResponse(res, 500, responseMessage.something_wrong, error.message)
  }
}



exports.uploadOfflineOMR = async (req, res) => { 
  try {
    const batchId = req.params.batchId;
    if (!batchId) {
      return errorResponse(res, 400, "batch id not provided", "batch id not provided");
    }

    const candidateData = req.body;
    if (!candidateData || candidateData.length === 0) {
      return errorResponse(res, 400, "question data not provided", "question data not provided");
    }

    const updateData = await Promise.all(candidateData.map(async (item) => { 
      const questionIds = item.questions
        .filter(question => question.optionId !== null)
        .map(question => question.questionId);

      const results = await Promise.all(item.questions.map(async (question) => {
        if (question.optionId !== null) {

          //set every other option to false
          await AnswerOfflineTheoryModel.updateOne(
            { 
              candidateId: item.candidateId,
              "questions._id": question.questionId
            },
            { 
              $set: { 'questions.$[outer].options.$[inner].isSelect': false }
            },
            { 
              arrayFilters: [
                { 'outer._id': question.questionId },
                { 'inner._id': { $ne: question.optionId } }
              ]
            }
          ).exec();

          // set only one option to true
          return await AnswerOfflineTheoryModel.findOneAndUpdate(
            { 
              candidateId: item.candidateId,
              "questions._id": question.questionId,
              "questions.options._id": question.optionId 
            },
            { 
              $set: { 'questions.$[outer].options.$[inner].isSelect': true } 
            },
            { 
              arrayFilters: [
                { 'outer._id': question.questionId },
                { 'inner._id': question.optionId }
              ],
              new: true 
            }
          ).exec();
        }
      }));

      return results;
    }));

    if (updateData.flat().length < 1) {
      return errorResponse(res, 400, "no candidate found", "no candidate found");
    }

    const generatedCandidateReortOffline = await Promise.all(candidateData.map( async (item) =>{

      const offlineSavedReport = await offlineCandidateReportGenerator(batchId, item.candidateId)
      return offlineSavedReport

    }))

    const generatedResultOffline = await Promise.all(candidateData.map( async (item) =>{

      const offlineResultPayload = await offlineResultUploadHanlder(item.candidateId)

      const existingOfflineResult = await OfflineResultModel.findOne({candidate_mongo_id: item.candidateId})

      if(existingOfflineResult){

        existingOfflineResult.nosResult = offlineResultPayload.nosResult
        existingOfflineResult.totalTheoryMarks = offlineResultPayload.totalTheoryMarks
        existingOfflineResult.totalPracticalMarks = offlineResultPayload.totalPracticalMarks
        existingOfflineResult.totalVivaMarks = offlineResultPayload.totalVivaMarks
        existingOfflineResult.obtainedTotalTheoryMarks = offlineResultPayload.obtainedTotalTheoryMarks
        existingOfflineResult.obtainedTotalPracticalMarks = offlineResultPayload.obtainedTotalPracticalMarks
        existingOfflineResult.obtainedTotalVivaMarks = offlineResultPayload.obtainedTotalVivaMarks
        existingOfflineResult.grandTotalMarks = offlineResultPayload.grandTotalMarks
        existingOfflineResult.obtainedGrandTotalMarks = offlineResultPayload.obtainedGrandTotalMarks
        existingOfflineResult.percentage = offlineResultPayload.percentage
        existingOfflineResult.result = offlineResultPayload.result

        const offlineResultSaved = await existingOfflineResult.save()
  
        return offlineResultSaved

      }else{ 

        const newOfflineResult = new OfflineResultModel(offlineResultPayload)
        const offlineResultSaved = await newOfflineResult.save()
  
        return offlineResultSaved

      }

    

    }))

    

    return sendResponse(res, 200, "updateData", {updateData, generatedResultOffline, generatedCandidateReortOffline});

  } catch (error) {
    return errorResponse(res, 500, responseMessage.something_wrong, error.message);
  }
};

exports.offlinePortalStats = async (req, res) => { 
  try {
    const candidateId = req.params.candidateId;
    if (!candidateId) {
      return errorResponse(res, 400, "candidateId  not provided", "candidateId not provided");
    }

    const offlineCandidateAnswerKey = await AnswerOfflineTheoryModel.findOne({candidateId:candidateId})
    .populate('candidateId')
    .populate({ path: 'batchId', select: 'batchId batchMode schemeName subSchemeName startDate clientname jobRoleNames qpCode' }); 
  
    if(!offlineCandidateAnswerKey)
      return errorResponse(res, 400, "no candidate found", "no candidate found")

    const OMRsheetImages = await TheoryFileModel.find({candidate_id: candidateId})

    let fileData = []
    if(OMRsheetImages.length > 0 ){
      fileData = await Promise.all(OMRsheetImages.map(item=> { 
        return getFileUrl(item.fileKey, true)
      }))
    }

    return sendResponse(res, 200, "got data", {answerKey: offlineCandidateAnswerKey, OMRsheet: fileData})

  } catch (error) {
    return errorResponse(res, 500, responseMessage.something_wrong, error.message);
  }
};

exports.offlineOMRSheetZipDownload = async (req, res) => { 
  try {

    const batchId = req.params.batchId
    if(!batchId)
      return errorResponse(res, 400, "batch id not provided", "batch id not provided")


    const OMRsheetImages = await TheoryFileModel.find({batch_id: batchId}).populate("candidate_id batch_id")

    if(OMRsheetImages.length < 1 )
     return errorResponse(res, 400, "no file found", "no file found")
   
    const fileData = await Promise.all(OMRsheetImages.map( async (item)=> { 

      let obj = { 
          fileUrl : await getFileUrl(item.fileKey, true), 
          candidateName: item.candidate_id?.userName || 'unKnown'
          //candidateName: item.candidate_id
      }

      return obj

    }))


    // zip file creation logic 

    const archive = archiver("zip", {
      zlib: { level: 9 },
    });

    const zipFileName = `Answer sheet-${OMRsheetImages[0].batch_id.batchId}.zip`

    const filePath = path.join(__dirname, zipFileName);

    const output = fs2.createWriteStream(filePath);
    

    archive.on("end", () => {
      console.log("Archive finalized.");
    });

    archive.on("error", (err) => {;
      res.status(500).send("Error creating ZIP archive");
    });

    archive.pipe(output);


    const downloadAndAddToArchive = async (url, archive, fileName) => {
      if (url != undefined) {
        const response = await axios.get(url, { responseType: "stream" });
        archive.append(response.data, { name: fileName });
      }
    };

    const candidateFileCount = {};
    const downloadPromises = fileData.map( (item, index) => {

    
        const candidateName = item.candidateName;

        if (!candidateFileCount[candidateName]) {

          candidateFileCount[candidateName] = 1;
        } else {
          candidateFileCount[candidateName]++;
        }

        // Generate the new file name
        const count = candidateFileCount[candidateName];
        const fileName = `${candidateName}_${count}.jpg`;

        return downloadAndAddToArchive(item.fileUrl, archive, fileName);
    });

    Promise.all(downloadPromises)
      .then(async () => {
        await archive.finalize();
        res.setHeader("Content-Type", "application/zip");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${zipFileName}`
        );
        const fileStream = fs2.createReadStream(filePath);

        fileStream.on("error", (err) => {
          return errorResponse(res, 500, "Error downloading zip file", err);
        });

        fileStream.pipe(res);
        await fs2.unlink(filePath)
  
      })
      .catch((error) => {
        console.error("Error downloading files:", error);
      });

    
  } catch (error) {
      return errorResponse(res, 500, responseMessage.something_wrong, error.message)
  }
}

const offlineCandidateReportGenerator = async (batchId, candidateId) => { 

  try {

        const correctAnswers = [];
        const wrongAnswers = [];
        let totalMarks 
        let numberOfQuestion 
        let notAttemptQuestion = 0
        let attemptQuestion = 0
        let marksObtained = 0
        let correctAnswer 
        let wrongAnswer 
        let obtainedPercentage = 0

        let correctOptionIdsArray =[]
        let chooseOptionArray=[]

        // question answered by candidate
        const questionList = await AnswerOfflineTheoryModel.findOne({ $and: [ { batchId: batchId}, { candidateId: candidateId } ] })
        // console.log("questionList--->", questionList)
        const questionIds = await SetModel.findById(questionList?.setId)
        // raw questions
        const rawQuestion = await QuestionModel.find({ _id: { $in:  questionIds?.question_id } })

        questionList.questions.forEach(question=> {

          // to count the attempted question 
          if(!question.questionStatus.notAttempt){
              attemptQuestion = attemptQuestion + 1
          }

          if(question.questionStatus.notAttempt){
              notAttemptQuestion = notAttemptQuestion + 1
          }

          //if(question.questionStatus.answered || question.questionStatus.answeredMarkForReview){
              const correspondingQuestion = rawQuestion.find(item => item._id?.toString() === question._id?.toString());

              if (correspondingQuestion) {
          
                  const correctOptionIds = correspondingQuestion.answer.map(answerObj => {
                       correctOptionIdsArray.push(answerObj.answerId?.toString())
                       return answerObj.answerId?.toString()
                  });
                  
    
                  const choosenOption = question.options.filter( option => option.isSelect)
                  chooseOptionArray.push(choosenOption)
                  //return sendResponse (res, 200, 'got options', { correctOptionIds, choosenOption})
    
                  if(choosenOption.length != correctOptionIds.length){
                      wrongAnswers.push(question._id?.toString());
                  }
                  else{
    
                     const isAnswerCorrect = choosenOption.every(option =>
                      correctOptionIds.includes(option._id?.toString()) );
    
                      if (isAnswerCorrect) {
                        correctAnswers.push(question._id?.toString());
                      } else {
                        wrongAnswers.push(question._id?.toString());
                      }
                  }
                   
                  
              }
           //}
        })

        // total Marks
        // console.log("rawQuestion--->",rawQuestion)    
        totalMarks = rawQuestion?.reduce((accumulator, currentValue) => {

          return accumulator + currentValue.marks;
          }, 0);

          numberOfQuestion = rawQuestion?.length 

          rawQuestion.forEach(question => { 
          
              correctAnswers?.forEach(answer => {
                  
                  if(question._id?.toString() === answer?.toString()){
                      marksObtained = marksObtained + parseFloat(question.marks)
                  }
              })
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
          wrongAnswer = wrongAnswers?.length 
          correctAnswer = correctAnswers?.length 
          
          //return sendResponse(res, 200, {wrongAnswers, correctAnswers, correctOptionIdsArray, chooseOptionArray})
          // {questionList, rawQuestion}

          const batchDetails = await BatchModel.findOne({_id: batchId})

          let passingPercentage = batchDetails?.questionPaper?.passingPercentage || 60


          const existingOfflineReport = await CandidateReportOffline.findOne({candidateId:candidateId})
          if(existingOfflineReport){

              existingOfflineReport.numberOfQuestion = numberOfQuestion
              existingOfflineReport.notAttemptQuestion = notAttemptQuestion
              existingOfflineReport.passingPercentage = passingPercentage
              existingOfflineReport.percentageScored = `${obtainedPercentage}%`
              existingOfflineReport.passedStatus = obtainedPercentage >= passingPercentage ? "Pass" : "Fail"
              existingOfflineReport.totalObtainMarks = marksObtained.toFixed(2)
              existingOfflineReport.attemptQuestion = attemptQuestion
              existingOfflineReport.correctAnswer = correctAnswer
              existingOfflineReport.wrongAnswer = wrongAnswer
              existingOfflineReport.totalMarks = totalMarks
              existingOfflineReport.correctAnswerIds = correctAnswers
              existingOfflineReport.wrongAnswerIds = wrongAnswers

              const reportSaved = await existingOfflineReport.save()

              return reportSaved

          }else{ 

            const newCandidateReport = new CandidateReportOffline({
              numberOfQuestion: numberOfQuestion, 
              notAttemptQuestion: notAttemptQuestion,
              passingPercentage: passingPercentage,
              percentageScored:`${obtainedPercentage}%`,
              passedStatus: obtainedPercentage >= passingPercentage ? "Pass" : "Fail",
              totalObtainMarks: marksObtained.toFixed(2),
              attemptQuestion: attemptQuestion,
              correctAnswer: correctAnswer,
              wrongAnswer: wrongAnswer,
              candidateId: candidateId,
              batchId: batchId,
              totalMarks: totalMarks,
              correctAnswerIds: correctAnswers,
              wrongAnswerIds: wrongAnswers

            })

            const reportSaved = await newCandidateReport.save()

            return reportSaved

          }

          
    
  } catch (error) {
     console.log('error--->', error)
  }

}

const offlineResultUploadHanlder = async (candidateId) => { 
  try {

      const candidateResult = await AnswerOfflineTheoryModel.findOne({ candidateId : candidateId })
      .populate([ {path: 'questions.question_bank_id', select: ""},
                  {path: 'candidateId', select: ["candidateId", "name"]},
                  {path: 'batchId', select : ["batchId", "questionPaper"] , populate: { path: 'jobRole', select: 'jobRole' }} ])

      const candidateReport = await CandidateReportOffline.findOne({ candidateId : candidateId })

        let nosWiseTheoryMarks = {};
      
        candidateResult.questions.forEach((question) => {
          const nos = question.question_bank_id?.nos;
          const jobRole = question.question_bank_id.jobRole
          const qpCode = question.question_bank_id.qpCode 
          const version = question.question_bank_id.version 
          const level = question.question_bank_id.jobLevel 
          const marks = question.marks;
      
          if (nos) {
            if (!nosWiseTheoryMarks[nos]) {
              nosWiseTheoryMarks[nos] = {
                theory: { marks: 0, obtainedMarks: 0 },
                practical: { marks: 0, obtainedMarks: 0 },
                viva: { marks: 0, obtainedMarks: 0 },
                jobRole: jobRole,
                qpCode: qpCode, 
                version: version,
                level: level
              };
            }
      
            // Always add marks to the 'theory' part
            nosWiseTheoryMarks[nos].theory.marks += marks;
          }
        });
      

          if (candidateResult.candidateId?._id.toString() === candidateReport.candidateId.toString()) {
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
            console.log('No candidate ID matched');
          }

          let totalTheoryMarks = 0 
          let totalPracticalMarks = 0
          let totalVivaMarks = 0
          let obtainedTotalTheoryMarks = 0
          let obtainedTotalPracticalMarks = 0
          let obtainedTotalVivaMarks = 0



          const nosResult = Object.keys(nosWiseTheoryMarks).map((nosName) => {
              const { theory, practical, viva , jobRole, qpCode, version, level } = nosWiseTheoryMarks[nosName];

              let totalMarks = theory.marks + practical.marks + viva.marks
              let totalObtainedMarks = theory.obtainedMarks + practical.obtainedMarks + viva.obtainedMarks

              //calculating total Marks 
              totalTheoryMarks += theory.marks
              obtainedTotalTheoryMarks += theory.obtainedMarks

              totalPracticalMarks += practical.marks
              obtainedTotalPracticalMarks += practical.obtainedMarks

              totalVivaMarks += viva.marks
              obtainedTotalVivaMarks += viva.obtainedMarks
     

              return {
                nosName,
                jobRole: jobRole,
                qpCode: qpCode, 
                version: version, 
                level: level,
                theoryMarks: theory.marks,
                obtainedTheoryMarks: theory.obtainedMarks,

                practicalMarks: practical.marks,
                obtainedPracticalMarks: practical.obtainedMarks,

                vivaMarks: viva.marks,
                obtainedVivaMarks: viva.obtainedMarks,
                
                totalMarks: totalMarks,
                totalObtainedMarks : totalObtainedMarks 
              };
            });

          
      const grandTotalMarks = totalTheoryMarks + totalPracticalMarks + totalVivaMarks
      const obtainedGrandTotalMarks  = obtainedTotalTheoryMarks + obtainedTotalPracticalMarks + obtainedTotalVivaMarks
      const percentage = ((obtainedGrandTotalMarks / grandTotalMarks) * 100).toFixed(2)
      
        const nosWiseResultItem = {
          nosResult,
          candidateId: candidateResult.candidateId.candidateId,
          candidate_mongo_id: candidateResult.candidateId._id,
          candidateName: candidateResult.candidateId?.name,
          batchId : candidateResult.batchId?.batchId,
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
          result: percentage >= candidateResult.batchId?.questionPaper?.passingPercentage ? "Pass" : "Fail"
       }
      

  return nosWiseResultItem
      
  } catch (error) {
      console.log('error-->', error.message)
  }
}