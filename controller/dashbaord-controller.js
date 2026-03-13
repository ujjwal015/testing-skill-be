const Dashboard = require("../models/dashboardModel");
const mongoose = require("mongoose");
const moment = require("moment");
const {
  COL_JOBROLE,
  COL_QUESTIONBANK,
  COL_PRACTICAL_QUESTION,
  COL_VIVA_QUESTION,
  COL_THEORY_QUESTION,
  COL_ASSESSMENT_CONTENT,
  COL_USER,
  COL_CLIENT,
} = require("../utils/dbCollectionList");
const {
  getassessorRegularizeProfileUrl,
  getassessorRegularizeClockinUrl,
} = require("../middleware/s3bucket");
const ClientModel = require("../models/client-model");
const AssignmentModel = require("../models/createAssesment-model");
const LeadModel = require("../models/userdemo-model");
const AssesorModel = require("../models/AssesorModel");
const ProctorModel = require("../models/proctor-model");
const Batch = require("../models/batch-model");
const Regularize = require("../models/regularizeAttendence-model");
const { errorResponse, sendResponse } = require("../utils/response");
const responseMessage = require("../utils/responseMessage");
const { asyncErrorHandler } = require("../utils/asyncErrorHandler");
const { Paginate } = require("../utils/paginate");

const COL_CREATE_ASSESMENT = require("../models/createAssesment-model");
const COL_ASSESOR = require("../models/AssesorModel");
const COL_BATCH_METADATA = require("../models/batchMetaData-model");
const CandidateModel = require("../models/candidate-model");
const CandidateReport = require("../models/candidateReport");
const qaVerificationModel = require("../models/QAVerification-model");
const MeetingScheduleModel = require("../models/meeting-schedule-model");
const AttendenceModel = require("../models/attendence-model");
const { getFilter } = require("../utils/custom-validators");
const {
  getassessorPhotoFileUrl,
  getAssessorDashboardProfileUrl,
  getassessorHrDashboardFileUrl,
} = require("../utils/s3bucketAssessor");
const {
  jobRolePaginate,
  teamMemberPaginate,
} = require("../modules/dashboard/util/jobRolePaginate");
const { getFileUrl } = require("../modules/dashboard/util/getFileUrl");
const {
  candidate_Appeared_In_Batch,
  candidate_fail_pass_percentage,
} = require("../utils/dbQuery");
const qafileModel = require("../models/QAfileUpload-model");
const OnlineResultModel = require("../models/onlineResult-model");
const OfflineResultModel = require("../models/offlineResult-model");
const nosModel = require("../models/nos-theory-model");
const nosVivaModel = require("../models/nos-viva-model");
const questionBankModel = require("../models/questionBankModel");
const ExamCenter = require("../models/exam-center-model");
//content dashboard widgets code
exports.totalJobroleCount = asyncErrorHandler(async (req, res, next) => {
  let query;
  let clientId = req?.query?.clientId
    ? req?.query?.clientId.split(",")
    : req?.user?.assigndClients;
  clientId = req?.query?.clientId
    ? clientId.map((item) => mongoose.Types.ObjectId(item))
    : req?.user?.assigndClients;
  if (clientId) query = { clientId: { $in: clientId } };

  const jobRoleCount = await COL_JOBROLE.countDocuments(query);

  const response = {
    jobRoleCount: jobRoleCount,
  };

  return sendResponse(res, 200, "got data", response);
});

exports.totalBlueprintCount = asyncErrorHandler(async (req, res, next) => {
  let query;
  let clientId = req?.query?.clientId
    ? req?.query?.clientId.split(",")
    : req?.user?.assigndClients;
  clientId = req?.query?.clientId
    ? clientId.map((item) => mongoose.Types.ObjectId(item))
    : req?.user?.assigndClients;
  if (clientId) query = { clientId: { $in: clientId } };

  const contentDataList = await COL_ASSESSMENT_CONTENT.find(query);

  const [nosTheoryCounts, nosVivaCounts] = await Promise.all([
    nosModel.countDocuments(query),
    nosVivaModel.countDocuments(query),
  ]);

  // Sum the counts from both models
  const totalBluePrint = nosTheoryCounts + nosVivaCounts;

  const toDoBluePrint = contentDataList?.reduce((acc, curr) => {
    if (curr.bluePrintCount.theory === 0) {
      acc = acc + 1;
    }
    if (curr.bluePrintCount.vivaPractical === 0) {
      acc = acc + 1;
    }

    return acc;
  }, 0);

  const response = {
    totalBluePrintCount: totalBluePrint,
    toDoBluePrint,
  };

  return sendResponse(res, 200, "got data", response);
});

exports.totalQuestionbankCount = asyncErrorHandler(async (req, res, next) => {
  let query;
  let clientId = req?.query?.clientId
    ? req?.query?.clientId.split(",")
    : req?.user?.assigndClients;
  clientId = req?.query?.clientId
    ? clientId.map((item) => mongoose.Types.ObjectId(item))
    : req?.user?.assigndClients;
  if (clientId) query = { clientId: { $in: clientId } };

  const contentDataList = await COL_ASSESSMENT_CONTENT.find(query);

  const totalQuestionBank = await questionBankModel.countDocuments(query);

  const toDoQuestionBank = contentDataList?.reduce((acc, curr) => {
    if (curr.nosBankCount.theory === 0) {
      acc = acc + 1;
    }
    if (curr.nosBankCount.viva === 0) {
      acc = acc + 1;
    }
    if (curr.nosBankCount.practical === 0) {
      acc = acc + 1;
    }

    return acc;
  }, 0);

  const response = {
    totalQuestionBankCount: totalQuestionBank,
    toDoQuestionBank,
  };

  return sendResponse(res, 200, "got data", response);
});

exports.totalPrimaryLangQuestionCount = asyncErrorHandler(
  async (req, res, next) => {
    let query;
    let clientId = req?.query?.clientId
      ? req?.query?.clientId.split(",")
      : req?.user?.assigndClients;
    clientId = req?.query?.clientId
      ? clientId.map((item) => mongoose.Types.ObjectId(item))
      : req?.user?.assigndClients;
    if (clientId) query = { clientId: { $in: clientId } };

    const questionBanks = await COL_QUESTIONBANK.find(query);
    if (questionBanks.length < 1) {
      return sendResponse(res, 200, "got data", { primaryQuestionCount: 0 });
    }

    let theoryIds = [];
    let vivaIds = [];
    let practicalIds = [];

    questionBanks.forEach((item) => {
      if (item.section === "Theory") {
        theoryIds.push(item._id);
      } else if (item.section === "viva") {
        vivaIds.push(item._id);
      } else if (item.section === "practical") {
        practicalIds.push(item._id);
      }
    });

    const [theoryCount, vivaCount, practicalCount] = await Promise.all([
      COL_THEORY_QUESTION.countDocuments({
        question_bank_id: { $in: theoryIds },
      }),
      COL_VIVA_QUESTION.countDocuments({ question_bank_id: { $in: vivaIds } }),
      COL_PRACTICAL_QUESTION.countDocuments({
        question_bank_id: { $in: practicalIds },
      }),
    ]);

    const response = {
      primaryQuestionCount: theoryCount + vivaCount + practicalCount,
    };

    return sendResponse(res, 200, "got data", response);
  }
);

exports.totalActiveClientsCount = async (req, res, next) => {
  try {
    let query = { client_status: "Active" }; // Default query to filter active clients
    let clientId = req?.query?.clientId
      ? req?.query?.clientId.split(",")
      : req?.user?.assigndClients;

    clientId = req?.query?.clientId
      ? clientId.map((item) => mongoose.Types.ObjectId(item))
      : req?.user?.assigndClients;

    if (clientId) {
      query._id = { $in: clientId };
    }

    // Count active clients based on the query
    const activeClients = await ClientModel.countDocuments(query);

    return sendResponse(res, 200, "Details available", {
      activeClients: activeClients || 0,
    });
  } catch (error) {
    return errorResponse(res, 400, "Something went wrong", error.message);
  }
};

exports.totalAssessmentCount = async (req, res, next) => {
  try {
    let query = {}; // Default query to filter active clients
    let clientId = req?.query?.clientId
      ? req?.query?.clientId.split(",")
      : req?.user?.assigndClients;

    clientId = req?.query?.clientId
      ? clientId.map((item) => mongoose.Types.ObjectId(item))
      : req?.user?.assigndClients;

    if (clientId) {
      query.clientId = { $in: clientId };
    }
    //totalAssessments
    const totalAssessments = await AssignmentModel.countDocuments(query);

    return sendResponse(res, 200, "details available", {
      totalAssessments: totalAssessments || 0,
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

exports.totalActiveLeadsCount = async (req, res, next) => {
  try {
    //activeLeads
    const activeLeads = await LeadModel.countDocuments({ status: "active" });

    return sendResponse(res, 200, "details available", {
      activeLeads: activeLeads || 0,
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

module.exports.totalClientsCount = async (req, res) => {
  try {
    let query = {};
    let clientId = req?.query?.clientId
      ? req?.query?.clientId.split(",")
      : req?.user?.assigndClients;

    clientId = req?.query?.clientId
      ? clientId.map((item) => mongoose.Types.ObjectId(item))
      : req?.user?.assigndClients;

    if (clientId) {
      query._id = { $in: clientId };
    }

    const clientCount = await ClientModel.countDocuments(query);

    const operationStats = {
      totalClient: clientCount,
    };
    return sendResponse(res, 200, "Clients List", operationStats);
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, 500, responseMessage.something_wrong, error);
  }
};

//new one registered assessor / valid assessor
// module.exports.totalAssessorCount = async (req, res) => {
//   try {
//     const today = moment().startOf("day").toDate();
//     const { clientId } = req.query;

//     const pipeline = [];

//     //Add clientId filter via jobroles lookup
//     if (clientId) {
//       pipeline.push(
//         {
//           $lookup: {
//             from: "jobroles",
//             localField: "jobRole.jobroleName",
//             foreignField: "jobRole",
//             as: "jobRoleData",
//           },
//         },
//         { $unwind: "$jobRoleData" },
//         {
//           $match: {
//             "jobRoleData.clientId": new mongoose.Types.ObjectId(clientId),
//           },
//         },
//         {
//           // filter jobRole array to only include roles of this client
//           $addFields: {
//             jobRole: {
//               $filter: {
//                 input: "$jobRole",
//                 as: "jr",
//                 cond: { $eq: ["$$jr.jobroleName", "$jobRoleData.jobRole"] },
//               },
//             },
//           },
//         }
//       );
//     }

//     pipeline.push(
//       {
//         $addFields: {
//           jobRole: {
//             $map: {
//               input: "$jobRole",
//               as: "job",
//               in: {
//                 $mergeObjects: [
//                   "$$job",
//                   {
//                     parsedDate: {
//                       $dateFromString: {
//                         dateString: "$$job.validUpto",
//                         format: "%m-%d-%Y",
//                         onError: null,
//                       },
//                     },
//                   },
//                 ],
//               },
//             },
//           },
//         },
//       }
//     );

//     const result = await AssesorModel.aggregate([
//       {
//         $facet: {
//           totalAssesorCount: pipeline.concat([{ $count: "count" }]),

//           totalAssignedAssessorDocs: pipeline.concat([
//             {
//               $match: {
//                 jobRole: {
//                   $elemMatch: { parsedDate: { $gte: today } },
//                 },
//               },
//             },
//             {
//               $project: {
//                 name: 1,
//                 state: 1,
//                 jobRole: 1,
//               },
//             },
//           ]),

//           totalAssignedAssessorCount: pipeline.concat([
//             {
//               $match: {
//                 jobRole: {
//                   $elemMatch: { parsedDate: { $gte: today } },
//                 },
//               },
//             },
//             { $count: "count" },
//           ]),
//         },
//       },
//       {
//         $project: {
//           totalAssesorCount: {
//             $ifNull: [{ $arrayElemAt: ["$totalAssesorCount.count", 0] }, 0],
//           },
//           totalAssignedAssessorCount: {
//             $ifNull: [
//               { $arrayElemAt: ["$totalAssignedAssessorCount.count", 0] },
//               0,
//             ],
//           },
//           totalAssignedAssessorList: "$totalAssignedAssessorDocs",
//         },
//       },
//     ]);

//     const stats = result[0];

//     const responseData = {
//       totalAssessorCountByTotalValidAssessorCount: `${stats.totalAssignedAssessorCount}/${stats.totalAssesorCount}`,
//       validAssessors: stats.totalAssignedAssessorList,
//     };

//     return sendResponse(res, 200, "Data found", responseData);
//   } catch (error) {
//     console.error("error", error);
//     return errorResponse(res, 500, "Something went wrong", error.message);
//   }
// };

// module.exports.totalAssessorCount = async (req, res) => {
//   try {
//     const today = moment().startOf("day").toDate();
//     const { clientId } = req.query;

//     let clientIds = [];
//     if (clientId) {
//       clientIds = [new mongoose.Types.ObjectId(clientId)];
//     } else if (req?.user?.email !== "abhijeet@radiantinfonet.com") {
//       clientIds = (req?.user?.assigndClients || []).map((c) =>
//         new mongoose.Types.ObjectId(c._id || c)
//       );
//     }

//     console.log("clientIds==>",clientIds.length)
//     const pipeline = [];

//     // First filter only NON-deleted assessors
//   pipeline.push({
//     $match: { isDeleted: false }
//   });

//     if (clientIds.length > 0) {
//       pipeline.push(
//         {
//           $lookup: {
//             from: "jobroles",
//             localField: "jobRole.jobroleName",
//             foreignField: "jobRole",
//             as: "jobRoleData",
//           },
//         },
//         { $unwind: "$jobRoleData" },
//         {
//           $match: {
//             "jobRoleData.clientId": { $in: clientIds },
//           },
//         },
//         {
//           $addFields: {
//             jobRole: {
//               $filter: {
//                 input: "$jobRole",
//                 as: "jr",
//                 cond: { $eq: ["$$jr.jobroleName", "$jobRoleData.jobRole"] },
//               },
//             },
//           },
//         }
//       );
//     }

//     pipeline.push({
//       $addFields: {
//         jobRole: {
//           $map: {
//             input: "$jobRole",
//             as: "job",
//             in: {
//               $mergeObjects: [
//                 "$$job",
//                 {
//                   parsedDate: {
//                     $dateFromString: {
//                       dateString: "$$job.validUpto",
//                       format: "%m-%d-%Y",
//                       onError: null,
//                     },
//                   },
//                 },
//               ],
//             },
//           },
//         },
//       },
//     });

//     const result = await AssesorModel.aggregate([
//       {
//         $facet: {
//           totalAssesorCount: pipeline.concat([{ $count: "count" }]),

//           totalAssignedAssessorDocs: pipeline.concat([
//             {
//               $match: {
//                 jobRole: {
//                   $elemMatch: { parsedDate: { $gte: today } },
//                 },
//               },
//             },
//             {
//               $project: {
//                 name: 1,
//                 state: 1,
//                 jobRole: 1,
//               },
//             },
//           ]),

//           totalAssignedAssessorCount: pipeline.concat([
//             {
//               $match: {
//                 jobRole: {
//                   $elemMatch: { parsedDate: { $gte: today } },
//                 },
//               },
//             },
//             { $count: "count" },
//           ]),
//         },
//       },
//       {
//         $project: {
//           totalAssesorCount: {
//             $ifNull: [{ $arrayElemAt: ["$totalAssesorCount.count", 0] }, 0],
//           },
//           totalAssignedAssessorCount: {
//             $ifNull: [
//               { $arrayElemAt: ["$totalAssignedAssessorCount.count", 0] },
//               0,
//             ],
//           },
//           totalAssignedAssessorList: "$totalAssignedAssessorDocs",
//         },
//       },
//     ]);

//     const stats = result[0];

//     const responseData = {
//       totalAssessorCountByTotalValidAssessorCount: `${stats.totalAssignedAssessorCount}/${stats.totalAssesorCount}`,
//       validAssessors: stats.totalAssignedAssessorList,
//     };

//     return sendResponse(res, 200, "Data found", responseData);
//   } catch (error) {
//     console.error("error", error);
//     return errorResponse(res, 500, "Something went wrong", error.message);
//   }
// };

module.exports.totalAssessorCount = async (req, res) => {
  try {
    const today = moment().startOf("day").toDate();
    const { clientId } = req.query;
    let clientIds = [];
    if (clientId) {
      clientIds = [new mongoose.Types.ObjectId(clientId)];
    } else if (req?.user?.email !== "support@radiantinfonet.com") {
      clientIds = (req?.user?.assigndClients || []).map((c) =>
        new mongoose.Types.ObjectId(c._id || c)
      );
    }

    //Prepare jobRoles for client filtering
    let jobRoleNames = [];
    if (clientIds.length > 0) {
      jobRoleNames = await   COL_JOBROLE.find({ clientId: { $in: clientIds } }).distinct("jobRole");
    }

    //Build base match for non-deleted assessors
    const matchStage = { isDeleted: false };
    if (jobRoleNames.length > 0) {
      matchStage["jobRole"] = { $elemMatch: { jobroleName: { $in: jobRoleNames } } };
    }

    //Aggregation pipeline
    const pipeline = [
      { $match: matchStage },

      // Add parsedDate for job roles to check validity
      {
        $addFields: {
          jobRole: {
            $map: {
              input: "$jobRole",
              as: "jr",
              in: {
                jobroleName: "$$jr.jobroleName",
                status: "$$jr.status",
                validUpto: "$$jr.validUpto",
                parsedDate: {
                  $dateFromString: {
                    dateString: "$$jr.validUpto",
                    format: "%m-%d-%Y",
                    onError: null
                  }
                }
              }
            }
          }
        }
      },

      // Process agreements for possible future filters
      {
        $addFields: {
          agreementProcessed: {
            $map: {
              input: "$agreement",
              as: "a",
              in: {
                status: "$$a.status",
                agreementValidTo: {
                  $dateFromString: {
                    dateString: "$$a.agreementValidTo",
                    format: "%m-%d-%Y",
                    onError: null
                  }
                },
                parentId: "$_id"
              }
            }
          }
        }
      },

      // Faceted aggregation to get all counts in one go
      {
        $facet: {
          totalAssesorCount: [{ $count: "count" }],

          totalAssignedAssessorDocs: [
            { $match: { jobRole: { $elemMatch: { parsedDate: { $gte: today } } } } },
            {
              $project: {
                fullName: 1,
                state: 1,
                jobRole: 1
              }
            }
          ],

          totalAssignedAssessorCount: [
            { $match: { jobRole: { $elemMatch: { parsedDate: { $gte: today } } } } },
            { $count: "count" }
          ]
        }
      },

      // Normalize output
      {
        $project: {
          totalAssesorCount: { $ifNull: [{ $arrayElemAt: ["$totalAssesorCount.count", 0] }, 0] },
          totalAssignedAssessorCount: { $ifNull: [{ $arrayElemAt: ["$totalAssignedAssessorCount.count", 0] }, 0] },
          totalAssignedAssessorList: "$totalAssignedAssessorDocs"
        }
      }
    ];

    //Execute aggregation
    const result = await AssesorModel.aggregate(pipeline);
    const stats = result[0];

    
    const responseData = {
      totalAssessorCountByTotalValidAssessorCount: `${stats.totalAssignedAssessorCount}/${stats.totalAssesorCount}`,
      validAssessors: stats.totalAssignedAssessorList
    };

    return sendResponse(res, 200, "Data found", responseData);
  } catch (error) {
    console.error("error", error);
    return errorResponse(res, 500, "Something went wrong", error.message);
  }
};





module.exports.totalProctorCount = async (req, res) => {
  try {
    const totalProctor = await ProctorModel.countDocuments({});
    const operationStats = {
      totalProctor: totalProctor || 0,
    };
    return sendResponse(res, 200, "got data", operationStats);
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, 500, responseMessage.something_wrong, error);
  }
};

module.exports.activeAssessorCount = async (req, res) => {
  try {
    const activeAssesorCount = await AssesorModel.countDocuments({
      client_status: "active",
      isDeleted : false
    });
    const operationStats = {
      activeAssesorCount: activeAssesorCount || 0,
    };
    return sendResponse(res, 200, "got data", operationStats);
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, 500, responseMessage.something_wrong, error);
  }
};

module.exports.liveBatchesCount = async (req, res) => {
  try {
    // Initialize query and determine clientId
    let query = {};
    let clientId = req?.query?.clientId
      ? req?.query?.clientId.split(",")
      : req?.user?.assigndClients;

    clientId = req?.query?.clientId
      ? clientId.map((item) => mongoose.Types.ObjectId(item))
      : req?.user?.assigndClients;

    if (clientId) {
      query.clientId = { $in: clientId };
    }

    // Get current date and time
    const currentDateTime = moment();
    let batchMatch = {};
    if (clientId) {
      batchMatch.clientId = clientId;
    }

    // Fetch the batch list with client population
    const batchList = await Batch.find(query).populate("clientId");

    const checkTime = (
      { startDate, endDate, startTime, endTime },
      batchType
    ) => {
      let startDateTime = moment(
        `${startDate} ${startTime}`,
        "DD/MM/YYYY hh:mmA"
      );
      let endDateTime = moment(`${endDate} ${endTime}`, "DD/MM/YYYY hh:mmA");

      switch (batchType) {
        case "ongoing":
          return (
            //   startDateTime <= currentDateTime.toDate() &&
            //   endDateTime >= currentDateTime.toDate()
            startDateTime <= currentDateTime.toDate() &&
            endDateTime >= currentDateTime.toDate()
          );
        case "all":
          return true;
        default:
          return false;
      }
    };

    // Filter batches based on the "ongoing" condition
    let currentBatch = batchList.filter((item) => checkTime(item, "ongoing"));

    const OngoingBatch = currentBatch.length;

    return sendResponse(res, 200, "got data", {
      OngoingBatch,
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

module.exports.assignedApplicantCount = async (req, res) => {
  try {
    const { clientId } = req.query;

    // Handle clientId as a comma-separated string or array
    let clientIds = [];
    if (clientId) {
      if (typeof clientId === "string") {
        clientIds = clientId
          .split(",")
          .map((id) => id.trim().replace(/(^"|"$)/g, "")); // Split by comma, trim spaces, and remove quotes
      } else if (Array.isArray(clientId)) {
        clientIds = clientId.map((id) => id.trim().replace(/(^"|"$)/g, ""));
      }
    }

    // Define the COL_CLIENT filter based on the input, use assigned clients if no clientId is provided
    let clientFilter = {};
    if (clientIds.length > 0) {
      clientFilter = {
        clientId: { $in: clientIds.map((id) => mongoose.Types.ObjectId(id)) },
      };
    } else {
      clientFilter = {
        clientId: {
          $in: req?.user?.assigndClients.map((COL_CLIENT) =>
            mongoose.Types.ObjectId(COL_CLIENT._id)
          ),
        },
      };
    }

    // Get the count of total candidates
    const totalApplicantCount = await CandidateModel.countDocuments({});

    const operationStats = {
      AssignedApplicantCount: totalApplicantCount || 0,
    };

    return sendResponse(res, 200, responseMessage.op_dashboard, operationStats);
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, 500, responseMessage.something_wrong, error);
  }
};

//modified this one
module.exports.totalBatchCount = async (req, res) => {
  try {
    let query = {};
    let clientId = req?.query?.clientId
      ? req?.query?.clientId.split(",")
      : req?.user?.assigndClients;

    clientId = req?.query?.clientId
      ? clientId.map((item) => mongoose.Types.ObjectId(item))
      : req?.user?.assigndClients;

    if (clientId) {
      query.clientId = { $in: clientId };
    }

    const totalBatchCount = await Batch.countDocuments(query);

    // Get current date and time
    const currentDateTime = moment();

    // Fetch batch list to calculate completed batches
    const batchList = await Batch.find(query);

    // Function to check if a batch is complete
    const isComplete = ({ endDate, endTime }) => {
      const endDateTime = moment(`${endDate} ${endTime}`, "DD/MM/YYYY hh:mmA");
      return endDateTime < currentDateTime.toDate();
    };

    const completeBatchCount = batchList.filter((batch) =>
      isComplete(batch)
    ).length;

    const operationStats = {
      totalBatch: `${completeBatchCount}/${totalBatchCount}` || 0,
      // "Completed Batches / Total Batches" : `${completeBatchCount}/${totalBatchCount}`,
    };

    return sendResponse(res, 200, responseMessage.op_dashboard, operationStats);
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, 500, responseMessage.something_wrong, error);
  }
};

module.exports.activeBatchCount = async (req, res) => {
  try {
    let query = { status: true };
    let clientId = req?.query?.clientId
      ? req?.query?.clientId.split(",")
      : req?.user?.assigndClients;

    clientId = req?.query?.clientId
      ? clientId.map((item) => mongoose.Types.ObjectId(item))
      : req?.user?.assigndClients;

    if (clientId) {
      query.clientId = { $in: clientId };
    }

    const activeBatchCount = await Batch.countDocuments(query);

    const operationStats = {
      activeBatch: activeBatchCount || 0,
    };
    return sendResponse(res, 200, responseMessage.op_dashboard, operationStats);
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, 500, responseMessage.something_wrong, error);
  }
};

module.exports.batchVerificationStats = async (req, res) => {
  try {
    const allBatches = await qafileModel.find();

    const batchList = {};
    let adminCount = 0;
    let assessorCount = 0;
    let pendingCount = 0;

    const uploadedbatches = await allBatches.forEach((batch) => {
      if (!batchList[batch.batchId]) {
        batchList[batch.batchId] = [];

        const checkPending = (field) => {
          if (
            !field ||
            !Array.isArray(field.images || field.videos) ||
            field.images?.length === 0 ||
            field.videos?.length === 0
          ) {
            return true;
            e; // Mark as pending if the field is missing or incomplte
          }
          return false;
        };

        const fieldsToCheck = [
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

        fieldsToCheck.forEach((Key) => {
          const field = batch[Key];
          if (checkPending(field)) {
            batchList[batch.batchId].pendingFields += 1;
            pendingCount += 1;
          }
        });

        if (batch.checkInPhoto.images.length > 0) {
          if (batch.checkInPhoto.images[0].adminUploaded) {
            batchList[batch.batchId].uploadedByAdmin += 1;
            adminCount += 1;
          } else {
            batchList[batch.batchId].uploadedByAssessor += 1;
            assessorCount += 1;
          }
        } else {
          if (batch.checkInPhoto.images.length > 0) {
            if (batch.checkInPhoto.images[0].adminUploaded) {
              batchList[batch.batchId].uploadedByAdmin += 1;
              adminCount += 1;
            }
          } else {
            batchList[batch.batchId].uploadedByAssessor += 1;
            assessorCount += 1;
          }
        }
      }
    });

    return sendResponse(res, 200, "Batch verification stats found", {
      adminCount,
      assessorCount,
      pendingCount,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.something_wrong, error);
  }
};

//MIS Dashboard count
module.exports.assessedBatchCounts = async (req, res) => {
  try {
    // Get current date and time
    const currentDateTime = moment();
    // Build the match criteria for batchList
    let query = {};
    let clientId = req?.query?.clientId
      ? req?.query?.clientId.split(",")
      : req?.user?.assigndClients;

    clientId = req?.query?.clientId
      ? clientId.map((item) => mongoose.Types.ObjectId(item))
      : req?.user?.assigndClients;

    if (clientId) {
      query.clientId = { $in: clientId };
    }

    // Find batches matching the criteria
    const batchList = await Batch.find(query).populate("clientId");

    const checkTime = (
      { startDate, endDate, startTime, endTime },
      batchType
    ) => {
      let startDateTime = moment(
        `${startDate} ${startTime}`,
        "DD/MM/YYYY hh:mmA"
      );
      let endDateTime = moment(`${endDate} ${endTime}`, "DD/MM/YYYY hh:mmA");

      switch (batchType) {
        case "complete":
          return endDateTime < currentDateTime.toDate();
        case "all":
          return true;
        default:
          break;
      }
    };

    // Filter batches based on the "complete" condition
    let completeBatches = batchList.filter((item) =>
      checkTime(item, "complete")
    );
    const totalCounts = completeBatches.length;

    const adminStats = {
      assessedBatch: totalCounts,
    };

    return sendResponse(res, 200, "got data", {
      adminStats,
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


// module.exports.batchStatistics = async (req, res) => {
//   try {
//     let query = {};
//     let clientId = req?.query?.clientId
//       ? req?.query?.clientId.split(",")
//       : req?.user?.assigndClients;

//     clientId = req?.query?.clientId
//       ? clientId.map((item) => mongoose.Types.ObjectId(item))
//       : req?.user?.assigndClients;

//     if (clientId) {
//       query.clientId = { $in: clientId };
//     }

//     // Get current date and time
//     const currentDateTime = moment();

//     // Time filter (monthly, quarterly, yearly)
//     let filterType = req?.query?.filterType;
//     let filterStartDate, filterEndDate;

//     if (filterType === "monthly") {
//       filterStartDate = moment().startOf("month");
//       filterEndDate = moment().endOf("month");
//     } else if (filterType === "quarterly") {
//       filterStartDate = moment().startOf("quarter");
//       filterEndDate = moment().endOf("quarter");
//     } else if (filterType === "yearly") {
//       filterStartDate = moment().startOf("year");
//       filterEndDate = moment().endOf("year");
//     }

  
//     // Fetch all batches matching client filter only
//     const allBatches = await Batch.find(query).populate("clientId");

//     //FILTER batches by start/end date instead of createdAt
//     const batchList = filterType
//       ? allBatches.filter(batch => {
//           const batchStart = moment(batch.startDate, "DD/MM/YYYY");
//           const batchEnd = moment(batch.endDate, "DD/MM/YYYY");
//           return (
//             batchStart.isSameOrBefore(filterEndDate) &&
//             batchEnd.isSameOrAfter(filterStartDate)
//           );
//         })
//       : allBatches;

//     // Count after applying filter
//     const totalBatchCount = batchList.length;

//     // Check time logic (unchanged)
//     const checkTime = (
//       { startDate, endDate, startTime, endTime },
//       batchType
//     ) => {
//       let startDateTime = moment(
//         `${startDate} ${startTime}`,
//         "DD/MM/YYYY hh:mmA"
//       );
//       let endDateTime = moment(`${endDate} ${endTime}`, "DD/MM/YYYY hh:mmA");

//       switch (batchType) {
//         case "pending":
//           return startDateTime > currentDateTime;
//         case "complete":
//           return endDateTime < currentDateTime;
//         case "all":
//           return true;
//         default:
//           return false;
//       }
//     };

//     // Filter batches for "pending" and "complete"
//     let pendingBatches = batchList.filter((item) => checkTime(item, "pending"));
//     let completeBatches = batchList.filter((item) =>
//       checkTime(item, "complete")
//     );

//     // Calculate the counts
//     const pendingCount = pendingBatches.length;
//     const completeCount = completeBatches.length;

//     const operationStats = {
//       pendingBatchCount: pendingCount || 0,
//       completedBatchCount: completeCount || 0,
//       totalBatchCount: totalBatchCount || 0,
//     };

//     return sendResponse(res, 200, "got data", {
//       operationStats,
//     });
//   } catch (err) {
//     return errorResponse(
//       res,
//       500,
//       responseMessage.something_wrong,
//       err.message
//     );
//   }
// };

module.exports.batchStatistics = async (req, res) => {
  try {
    let query = {};

    let startOfDate = req.query.startOfDate
    let endOfDate = req.query.endOfDate

    let clientId = req?.query?.clientId
      ? req?.query?.clientId.split(",")
      : req?.user?.assigndClients;

    clientId = req?.query?.clientId
      ? clientId.map((item) => mongoose.Types.ObjectId(item))
      : req?.user?.assigndClients;

    if (clientId) {
      query.clientId = { $in: clientId };
    }

    // Get current date and time
    const currentDateTime = moment();

    // Time filter (monthly, quarterly, yearly)
    let filterType = req?.query?.filterType;
    let filterStartDate, filterEndDate;

    if (filterType === "monthly") {
      filterStartDate = moment().startOf("month");
      filterEndDate = moment().endOf("month");
    } else if (filterType === "quarterly") {
      filterStartDate = moment().startOf("quarter");
      filterEndDate = moment().endOf("quarter");
    } else if (filterType === "yearly") {
      filterStartDate = moment().startOf("year");
      filterEndDate = moment().endOf("year");
    }

     if (startOfDate || endOfDate) {
      // Parse the date from the query and get the start and end of the day
      filterStartDate = moment(startOfDate, "DD-MM-YYYY").startOf("day").toDate();
      filterEndDate = moment(endOfDate, "DD-MM-YYYY").endOf("day").toDate();

      //query.createdAt = { $gte: startOfDay, $lte: endOfDay };
      query.createdAt = { $gte: filterStartDate, $lte: filterEndDate };
    }
  
    // Fetch all batches matching client filter only
    const allBatches = await Batch.find(query).populate("clientId");

    //FILTER batches by start/end date instead of createdAt
    const batchList = filterType
      ? allBatches.filter(batch => {
          const batchStart = moment(batch.startDate, "DD/MM/YYYY");
          const batchEnd = moment(batch.endDate, "DD/MM/YYYY");
          return (
            batchStart.isSameOrBefore(filterEndDate) &&
            batchEnd.isSameOrAfter(filterStartDate)
          );
        })
      : allBatches;

    // Count after applying filter
    const totalBatchCount = batchList.length;

    // Check time logic (unchanged)
    const checkTime = (
      { startDate, endDate, startTime, endTime },
      batchType
    ) => {
      let startDateTime = moment(
        `${startDate} ${startTime}`,
        "DD/MM/YYYY hh:mmA"
      );
      let endDateTime = moment(`${endDate} ${endTime}`, "DD/MM/YYYY hh:mmA");

      switch (batchType) {
        case "pending":
          return startDateTime > currentDateTime;
        case "complete":
          return endDateTime < currentDateTime;
        case "all":
          return true;
        default:
          return false;
      }
    };

    // Filter batches for "pending" and "complete"
    let pendingBatches = batchList.filter((item) => checkTime(item, "pending"));
    let completeBatches = batchList.filter((item) =>
      checkTime(item, "complete")
    );

    // Calculate the counts
    const pendingCount = pendingBatches.length;
    const completeCount = completeBatches.length;

    const operationStats = {
      pendingBatchCount: pendingCount || 0,
      completedBatchCount: completeCount || 0,
      totalBatchCount: totalBatchCount || 0,
    };

    return sendResponse(res, 200, "got data", {
      operationStats,
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

module.exports.liveBatchCount = async (req, res) => {
  try {
    // Get current date and time
    const currentDateTime = moment();

    let query = {};
    let clientId = req?.query?.clientId
      ? req?.query?.clientId.split(",")
      : req?.user?.assigndClients;

    clientId = req?.query?.clientId
      ? clientId.map((item) => mongoose.Types.ObjectId(item))
      : req?.user?.assigndClients;

    if (clientId) {
      query.clientId = { $in: clientId };
    }

    const batchList = await Batch.find(query).populate("clientId");

    const checkTime = (
      { startDate, endDate, startTime, endTime },
      batchType
    ) => {
      let startDateTime = moment(
        `${startDate} ${startTime}`,
        "DD/MM/YYYY hh:mmA"
      );
      let endDateTime = moment(`${endDate} ${endTime}`, "DD/MM/YYYY hh:mmA");

      switch (batchType) {
        case "ongoing":
          return (
            startDateTime <= currentDateTime.toDate() &&
            endDateTime >= currentDateTime.toDate()
          );
        case "all":
          return true;
        default:
          break;
      }
    };

    // Filter batches based on the "ongoing" condition
    let currentBatch = batchList.filter((item) => checkTime(item, "ongoing"));

    const adminStats = {
      liveBatch: currentBatch.length,
    };

    return sendResponse(res, 200, "got data", {
      adminStats,
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

//operation dashboard graph code
exports.assessorLocationDashboard = async (req, res, next) => {
  try {
    const { clientId } = req.query;

    // unified clientId logic
    let clientIds = [];
    if (clientId) {
      if (typeof clientId === "string") {
        clientIds = clientId
          .split(",")
          .map((id) => new mongoose.Types.ObjectId(id.trim().replace(/(^"|"$)/g, "")));
      } else if (Array.isArray(clientId)) {
        clientIds = clientId.map((id) =>
          new mongoose.Types.ObjectId(id.trim().replace(/(^"|"$)/g, ""))
        );
      }
    } else if(req?.user?.email !== "support@radiantinfonet.com") {
      //fallback to req.user.assigndClients
      clientIds = (req?.user?.assigndClients || []).map((c) =>
        new mongoose.Types.ObjectId(c._id || c)
      );
    }

    const pipeline = [
      {
        $match: {
          state: { $exists: true, $ne: null, $ne: "" },
          assessorId: { $exists: true, $ne: null },
          isDeleted: { $ne: true } 
        },
      },
      {
        $lookup: {
          from: "jobroles",
          localField: "jobRole.jobroleName",
          foreignField: "jobRole",
          as: "jobRoleDetails",
        },
      },
      {
        $unwind: {
          path: "$jobRoleDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
    ];

    //always apply client filter (either from query or assignedClients)
    if (clientIds.length > 0) {
      pipeline.push({
        $match: {
          "jobRoleDetails.clientId": { $in: clientIds },
        },
      });
    }

    pipeline.push(
      {
        $group: {
          _id: "$assessorId",
          state: { $first: "$state" },
          modeofAgreement: { $first: "$modeofAgreement" },
        },
      },
      {
        $group: {
          _id: "$state",
          payroll: {
            $sum: { $cond: [{ $eq: ["$modeofAgreement", "payroll"] }, 1, 0] },
          },
          freelance: {
            $sum: { $cond: [{ $eq: ["$modeofAgreement", "freelance"] }, 1, 0] },
          },
          total: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          state: "$_id",
          payroll: 1,
          freelance: 1,
          total: 1,
        },
      }
    );

    const assessorAggregation = await COL_ASSESOR.aggregate(pipeline);

    const totalAssessorCounts = assessorAggregation.reduce(
      (acc, curr) => acc + curr.total,
      0
    );
    const totalPayrollCounts = assessorAggregation.reduce(
      (acc, curr) => acc + curr.payroll,
      0
    );
    const totalFreelanceCounts = assessorAggregation.reduce(
      (acc, curr) => acc + curr.freelance,
      0
    );

    const filteredState = assessorAggregation
      .filter((item) =>
        /^[A-Z]+$/.test(String(item.state).replace(/ +/g, "")) ? false : true
      )
      .map((item) => ({
        ...item,
        state: String(item.state).replace(/ +/g, "_"),
      }));

    const assessorStats = {
      totalAssessorCounts,
      totalPayrollCounts,
      totalFreelanceCounts,
      statewiseCounts: filteredState,
    };

    return sendResponse(res, 200, responseMessage.assessor_profile_get, {
      assessorStats,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};






module.exports.AssessmentHistory = async (req, res) => {
  try {
    let query = {};
    let clientId = req?.query?.clientId
      ? req?.query?.clientId.split(",")
      : req?.user?.assigndClients;

    clientId = req?.query?.clientId
      ? clientId.map((item) => mongoose.Types.ObjectId(item))
      : req?.user?.assigndClients;

    if (clientId) {
      query.clientId = { $in: clientId };
    }

    // Add date range for current year to the query
    const currentYearStart = moment().startOf("year").toDate(); // January 1st of the current year
    const currentYearEnd = moment().endOf("year").toDate(); // December 31st of the current year
    query.startDateTime = {
      $gte: currentYearStart,
      $lte: currentYearEnd,
    };
    // Query to find the number of assessments for the current year
    const currentYearAssessmentCount = await Batch.countDocuments(query);

    // Historical data for past years (you can modify these based on your actual records)
    const historicalData = [
      { year: "2023-24", assessmentCount: 79286 },
      { year: "2022-23", assessmentCount: 61983 },
      { year: "2021-22", assessmentCount: 41363 },
      { year: "2020-21", assessmentCount: 53258 },
    ];

    // Adding current year's data to the historical data
    const currentYearLabel = `${currentYearStart.getFullYear()}-${
      (currentYearEnd.getFullYear() % 100) + 1
    }`;
    historicalData.unshift({
      year: currentYearLabel,
      assessmentCount: currentYearAssessmentCount,
    });

    // Sending the response
    return sendResponse(
      res,
      200,
      responseMessage.assessment_history_get,
      historicalData
    );
  } catch (error) {
    console.log("Error fetching assessment counts:", error);
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

module.exports.schemeAnalytics = async (req, res) => {
  try {
    const { clientId } = req.query;

    // Parse clientId as a comma-separated string
    let clientIds = [];
    if (clientId) {
      if (typeof clientId === "string") {
        clientIds = clientId
          .split(",")
          .map((id) => id.trim().replace(/(^"|"$)/g, "")); // Split by comma, trim spaces, and remove quotes
      } else if (Array.isArray(clientId)) {
        clientIds = clientId.map((id) => id.trim().replace(/(^"|"$)/g, ""));
      }
    }

    // Define the COL_CLIENT filter based on the input, use assigned clients if no clientId is provided
    let clientFilter = {};
    if (clientIds.length > 0) {
      clientFilter = {
        clientId: { $in: clientIds.map((id) => mongoose.Types.ObjectId(id)) },
      };
    } else {
      clientFilter = {
        clientId: {
          $in: req?.user?.assigndClients.map((COL_CLIENT) =>
            mongoose.Types.ObjectId(COL_CLIENT._id)
          ),
        },
      };
    }

    // const startOfLastWeek = moment().subtract(1, 'weeks').startOf('isoWeek').toDate();
    // Get start and end of the current week
    const startOfCurrentWeek = moment().startOf("isoWeek").toDate(); // Monday 2024-12-29
    const endOfCurrentWeek = moment().endOf("isoWeek").toDate(); // Sunday 2024-01-05
    //const startOfLastMonth = moment().subtract(1, 'months').startOf('month').toDate();
    const startOfCurrentMonth = moment().startOf("month").toDate(); // First day of the current month 2024-12-31
    const endOfCurrentMonth = moment().endOf("month").toDate(); // Last day of the current month 2025-01-31
    // Aggregation pipeline to count batches per scheme, including weekly and monthly counts
    const pipeline = [
      { $match: clientFilter },
      {
        $lookup: {
          from: "schemes",
          localField: "schemeId",
          foreignField: "_id",
          as: "schemeDetails",
        },
      },
      { $unwind: "$schemeDetails" },
      {
        $group: {
          _id: "$schemeDetails.schemeName",
          BatchCount: { $sum: 1 },
          BatchCountWeekly: {
            $sum: {
              $cond: [
                {
                  $and: [
                    // { $gte: ["$createdAt", startOfLastWeek] },
                    // { $lt: ["$createdAt", now] }
                    { $gte: ["$createdAt", startOfCurrentWeek] },
                    { $lte: ["$createdAt", endOfCurrentWeek] },
                  ],
                },
                1,
                0,
              ],
            },
          },
          BatchCountMonthly: {
            $sum: {
              $cond: [
                {
                  $and: [
                    // { $gte: ["$createdAt", startOfLastMonth] },
                    // { $lt: ["$createdAt", now] }
                    { $gte: ["$createdAt", startOfCurrentMonth] },
                    { $lte: ["$createdAt", endOfCurrentMonth] },
                  ],
                },
                1,
                0,
              ],
            },
          },
        },
      },
      {
        $project: {
          schemeName: "$_id",
          BatchCount: 1,
          BatchCountWeekly: 1,
          BatchCountMonthly: 1,
        },
      },
    ];

    // Execute the aggregation pipeline to get Batch counts per scheme
    const schemeAnalytics = await Batch.aggregate(pipeline);

    // Calculate the total Batch count for the provided COL_CLIENT(s)
    const totalBatchCount = await Batch.countDocuments(clientFilter);

    // Send the response
    return sendResponse(res, 200, "Scheme Analytics fetched successfully", {
      totalBatchCount,
      schemeAnalytics,
    });
  } catch (err) {
    console.error("Error occurred in schemeAnalytics:", err);
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      err.message
    );
  }
};

module.exports.clientWiseAssessment = async (req, res) => {
  try {
    let clientId;
    let dateFilter = {};

    // Handle client filtering
    if (req?.query?.clientId) {
      clientId = req.query.clientId
        .split(",")
        .map((id) => id.trim())
        .filter((id) => mongoose.Types.ObjectId.isValid(id))
        .map((id) => new mongoose.Types.ObjectId(id));
    } else if (req?.user?.assignedClients) {
      clientId = Array.isArray(req.user.assignedClients)
        ? req.user.assignedClients
        : [req.user.assignedClients];
    }

    // Handle date filtering based on filterBy parameter
    if (req.query.filterBy) {
      const now = new Date();
      const startOfDay = new Date(now.setHours(0, 0, 0, 0));

      switch (req.query.filterBy) {
        case "daily":
        case "today":
          dateFilter = {
            createdAt: {
              $gte: startOfDay,
              $lt: new Date(startOfDay.getTime() + 24 * 60 * 60 * 1000),
            },
          };
          break;

        case "weekly":
          const weekStart = new Date(startOfDay);
          weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Start of week (Sunday)
          dateFilter = {
            createdAt: {
              $gte: weekStart,
              $lt: now,
            },
          };
          break;

        case "monthly":
          const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
          dateFilter = {
            createdAt: {
              $gte: monthStart,
              $lt: now,
            },
          };
          break;

        case "yearly":
          const yearStart = new Date(now.getFullYear(), 0, 1);
          dateFilter = {
            createdAt: {
              $gte: yearStart,
              $lt: now,
            },
          };
          break;
      }
    }

    // Build match conditions
    let matchConditions = {};

    // date filter to match conditions
    if (Object.keys(dateFilter).length > 0) {
      matchConditions = { ...matchConditions, ...dateFilter };
    }

    const results = await COL_CREATE_ASSESMENT.aggregate([
      // Stage 1: initial filters (date, etc.)
      ...(Object.keys(matchConditions).length > 0
        ? [{ $match: matchConditions }]
        : []),

      // Stage 2: Lookup batches
      {
        $lookup: {
          from: "batches",
          localField: "batch_id",
          foreignField: "_id",
          as: "batch",
          pipeline: [
            // Filter by clientId if specified
            ...(clientId && clientId.length > 0
              ? [
                  {
                    $match: {
                      clientId: { $in: clientId },
                    },
                  },
                ]
              : []),
            {
              $project: {
                clientId: 1,
                _id: 1,
              },
            },
          ],
        },
      },

      // Stage 3: Filter out assessments without matching batches
      {
        $match: {
          "batch.0": { $exists: true },
        },
      },

      // Stage 4: Unwind batch
      {
        $unwind: "$batch",
      },

      // Stage 5: Lookup clients
      {
        $lookup: {
          from: "clients",
          localField: "batch.clientId",
          foreignField: "_id",
          as: "client",
          pipeline: [
            {
              $project: {
                clientcode: 1,
                clientname: 1,
                _id: 1,
              },
            },
          ],
        },
      },

      // Stage 6: Unwind client
      {
        $unwind: "$client",
      },

      // Stage 7: Group by client
      {
        $group: {
          _id: "$client._id",
          clientCode: { $first: "$client.clientcode" },
          clientName: { $first: "$client.clientname" },
          assessmentCount: { $sum: 1 },
        },
      },

      // Stage 8: Calculate totals and format output
      {
        $group: {
          _id: null,
          clients: { $push: "$$ROOT" },
          totalAssessmentCount: { $sum: "$assessmentCount" },
        },
      },

      // Stage 9: Format final output
      {
        $project: {
          _id: 0,
          totalAssessmentCount: 1,
          clients: {
            $map: {
              input: "$clients",
              as: "client",
              in: {
                clientId: "$$client._id",
                clientCode: "$$client.clientCode",
                clientName: "$$client.clientName",
                assessmentCount: "$$client.assessmentCount",
                totalAssessmentCount: "$totalAssessmentCount",
              },
            },
          },
        },
      },

      // Stage 10: Unwind clients for individual records
      {
        $unwind: {
          path: "$clients",
          preserveNullAndEmptyArrays: true,
        },
      },

      // Stage 11: Replace root with client data
      {
        $replaceRoot: {
          newRoot: {
            $ifNull: [
              {
                $mergeObjects: [
                  "$clients",
                  { totalAssessmentCount: "$totalAssessmentCount" },
                ],
              },
              {
                message: "No assessments found for the specified criteria",
                totalAssessmentCount: 0,
              },
            ],
          },
        },
      },
    ]);

    // If no results, return empty array with message
    if (!results || results.length === 0) {
      return sendResponse(
        res,
        200,
        "No assessments found for the specified criteria",
        []
      );
    }

    return sendResponse(
      res,
      200,
      "Client assessment data retrieved successfully",
      results
    );
  } catch (error) {
    console.error("Error in clientWiseAssessment:", {
      error: error.message,
      stack: error.stack,
      query: req.query,
      userId: req?.user?.id,
    });

    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

module.exports.scheduleBatchList = async (req, res) => {
  try {
    const { isStatus, startDate, clientId } = req.query;
    let query = {};
    let formattedStartDate = moment(`${startDate}`, "DD/MM/YYYY");

    // Handle clientId as a comma-separated string with potential quotes
    let clientIds = [];
    if (clientId) {
      if (typeof clientId === "string") {
        clientIds = clientId
          .split(",")
          .map((id) => id.trim().replace(/(^"|"$)/g, ""));
      } else if (Array.isArray(clientId)) {
        clientIds = clientId.map((id) => id.trim().replace(/(^"|"$)/g, ""));
      }
    }

    // Apply COL_CLIENT filtering based on clientIds array
    if (clientIds.length > 0) {
      query.clientId = {
        $in: clientIds.map((id) => mongoose.Types.ObjectId(id)),
      };
    }

    // Find batches from the Batch collection
    const batchList = await Batch.find(query)
      .select("startDate endDate batchId batchMode clientId jobrole")
      .populate({
        path: "clientId",
        match: {
          _id: {
            $in: req?.user?.assigndClients.map((COL_CLIENT) =>
              mongoose.Types.ObjectId(COL_CLIENT._id)
            ),
          },
        },
        select: "clientname clientcode email clientType",
      })
      .populate({
        path: "jobRole",
        select: "jobRole qpCode",
      });

    // Find batches from the COL_BATCH_METADATA collection
    const batchMetaList = await COL_BATCH_METADATA.find(query)
      .select(
        "startDate endDate batchId batchMode COL_JOBROLE scheduled clientId"
      )
      .populate({
        path: "clientId",
        match: {
          _id: {
            $in: req?.user?.assigndClients.map((COL_CLIENT) =>
              mongoose.Types.ObjectId(COL_CLIENT._id)
            ),
          },
        },
        select: "clientname clientcode email clientType",
      });

    // Combine the Batch and COL_BATCH_METADATA lists
    const combinedBatchList = [
      ...batchList.map((item) => ({ ...item._doc, scheduled: null })), // Add scheduled field with null value to Batch items
      ...batchMetaList, // COL_BATCH_METADATA items already have scheduled field
    ];

    // Filter to include only items with a non-null clientId
    const clientBatchList = combinedBatchList.filter((item) => item.clientId);

    const checkTime = ({ startDate, endDate }) => {
      let startDateTime = moment(startDate, "DD/MM/YYYY");
      let endDateTime = moment(endDate, "DD/MM/YYYY");

      return formattedStartDate.isBetween(
        startDateTime,
        endDateTime,
        undefined,
        "[]"
      );
    };

    if (clientBatchList.length > 0) {
      let currentBatch = clientBatchList.filter((item) => checkTime(item));

      return sendResponse(res, 200, "Upcoming Batch List", {
        batchList: [...currentBatch],
      });
    } else {
      return sendResponse(res, 200, "Upcoming Batch List", {
        batchList: [],
      });
    }
  } catch (err) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      err.message
    );
  }
};

module.exports.assessmentAanalytics = async (req, res) => {
  try {
    const { filterBy } = req.query; // Added `filterBy` to determine the type of response

    // Calculate dates for last week, last month, and last year
    const now = new Date();
    const startOfLastWeek = moment()
      .subtract(1, "weeks")
      .startOf("isoWeek")
      .toDate();
    const startOfLastMonth = moment()
      .subtract(1, "months")
      .startOf("month")
      .toDate();
    const startOfLastYear = moment()
      .subtract(1, "years")
      .startOf("year")
      .toDate();

    let matchQuery = {};

    let query = {};
    let clientId = req?.query?.clientId
      ? req?.query?.clientId.split(",")
      : req?.user?.assigndClients;

    clientId = req?.query?.clientId
      ? clientId.map((item) => mongoose.Types.ObjectId(item))
      : req?.user?.assigndClients;

    if (clientId) {
      query.clientId = { $in: clientId };
    }

    // let clientId = req?.query?.clientId ? req?.query?.clientId.split(',') : req?.user?.assigndClients
    // clientId = req?.query?.clientId ? clientId.map(item=>mongoose.Types.ObjectId(item)) : req?.user?.assigndClients
    // if(clientId){
    //     matchQuery.clientId =  { $in: clientId}}
    // }
    // if (clientId) {
    //     matchQuery.clientId = mongoose.Types.ObjectId(clientId);
    // }

    let responseData;

    // Weekly Response
    if (filterBy === "weekly") {
      const lastWeekDetails = await Batch.aggregate([
        {
          $lookup: {
            from: "clients",
            localField: "clientId",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $match: {
            ...matchQuery,
            createdAt: { $gte: startOfLastWeek, $lt: now },
            // 'client._id': { $in: req?.user?.assigndClients.map(id => mongoose.Types.ObjectId(id)) },
          },
        },
        {
          $group: {
            _id: {
              weekDay: { $dayOfWeek: "$createdAt" },
              batchMode: "$batchMode",
            },
            value: { $sum: 1 },
          },
        },
        {
          $project: {
            weekDay: "$_id.weekDay",
            batchMode: "$_id.batchMode",
            value: 1,
            _id: 0,
          },
        },
      ]);

      const response = Array.from({ length: 7 }, (_, i) => {
        const dayOfWeek = moment()
          .day(i + 1)
          .format("dddd");
        const dayData = lastWeekDetails
          .filter((data) => data.weekDay === i + 1)
          .reduce(
            (acc, data) => {
              acc[data.batchMode] = data.value;
              return acc;
            },
            { online: 0, offline: 0 }
          );
        return { [dayOfWeek]: dayData };
      });
      responseData = { response };
    }

    // Monthly Response
    if (filterBy === "monthly") {
      const lastMonthDetails = await Batch.aggregate([
        {
          $lookup: {
            from: "clients",
            localField: "clientId",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $match: {
            ...matchQuery,
            createdAt: { $gte: startOfLastMonth, $lt: now },
            // 'client._id': { $in: req?.user?.assigndClients.map(id => mongoose.Types.ObjectId(id)) },
          },
        },
        {
          $group: {
            _id: { month: { $month: "$createdAt" }, batchMode: "$batchMode" },
            value: { $sum: 1 },
          },
        },
        {
          $project: {
            month: "$_id.month",
            batchMode: "$_id.batchMode",
            value: 1,
            _id: 0,
          },
        },
      ]);

      const response = Array.from({ length: 12 }, (_, i) => {
        const monthName = moment().month(i).format("MMMM");
        const monthData = lastMonthDetails
          .filter((data) => data.month === i + 1)
          .reduce(
            (acc, data) => {
              acc[data.batchMode] = data.value;
              return acc;
            },
            { online: 0, offline: 0 }
          );
        return { [monthName]: monthData };
      });
      responseData = { response };
    }

    // Yearly Response
    if (filterBy === "yearly") {
      const lastYearDetails = await Batch.aggregate([
        {
          $lookup: {
            from: "clients",
            localField: "clientId",
            foreignField: "_id",
            as: "client",
          },
        },
        { $unwind: "$client" },
        {
          $match: {
            ...matchQuery,
            createdAt: { $gte: startOfLastYear, $lt: now },
            // 'client._id': { $in: req?.user?.assigndClients.map(id => mongoose.Types.ObjectId(id)) },
          },
        },
        {
          $group: {
            _id: { year: { $year: "$createdAt" }, batchMode: "$batchMode" },
            value: { $sum: 1 },
          },
        },
        {
          $project: {
            year: "$_id.year",
            batchMode: "$_id.batchMode",
            value: 1,
            _id: 0,
          },
        },
      ]);

      const currentYear = moment().year();
      const response = Array.from({ length: 10 }, (_, i) => {
        const year = currentYear - i;
        const yearData = lastYearDetails
          .filter((data) => data.year === year)
          .reduce(
            (acc, data) => {
              acc[data.batchMode] = data.value;
              return acc;
            },
            { online: 0, offline: 0 }
          );
        return { [year.toString()]: yearData };
      });
      responseData = { response };
    }

    if (!responseData) {
      return errorResponse(
        res,
        400,
        'Invalid filterBy value. Use "weekly", "monthly", or "yearly".'
      );
    }

    return sendResponse(res, 200, responseMessage.op_dashboard, responseData);
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, 500, responseMessage.something_wrong, error);
  }
};

module.exports.BatchList = async (req, res) => {
  try {
    const { page, limit, skip, sortOrder } = Paginate(req);
    const { clientId } = req.query;
    const currentDateTime = moment();

    // Parse clientId as a comma-separated string
    let clientIds = [];
    if (clientId) {
      if (typeof clientId === "string") {
        clientIds = clientId
          .split(",")
          .map((id) => id.trim().replace(/(^"|"$)/g, "")); // Split by comma, trim spaces, and remove quotes
      } else if (Array.isArray(clientId)) {
        clientIds = clientId.map((id) => id.trim().replace(/(^"|"$)/g, ""));
      }
    }

    // Define the COL_CLIENT filter based on the input, use assigned clients if no clientId is provided
    let clientFilter = {};
    if (clientIds.length > 0) {
      clientFilter = {
        "clientId._id": {
          $in: clientIds.map((id) => mongoose.Types.ObjectId(id)),
        },
      };
    } else {
      clientFilter = {
        "clientId._id": {
          $in: req?.user?.assigndClients.map((COL_CLIENT) =>
            mongoose.Types.ObjectId(COL_CLIENT._id)
          ),
        },
      };
    }

    // Initialize the match query with COL_CLIENT filter
    const matchQuery = { ...clientFilter };

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
          pipeline: [
            {
              $project: {
                clientname: 1,
                clientType: 1,
                clientcode: 1,
                email: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "jobroles",
          localField: "jobRole", // Correct field for jobRole
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
      {
        $lookup: {
          from: "examcenters",
          localField: "examCenterId",
          foreignField: "_id",
          as: "examCenterId",
          pipeline: [{ $project: { examCenterName: 1 } }],
        },
      },
      {
        $unwind: {
          path: "$questionPaper.multipleJobRole",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "jobroles",
          localField: "questionPaper.multipleJobRole.jobRoleId",
          foreignField: "_id",
          as: "questionPaper.multipleJobRole.jobRoleDetails",
          pipeline: [{ $project: { COL_JOBROLE: 1 } }],
        },
      },
      {
        $unwind: {
          path: "$questionPaper.multipleJobRole.jobRoleDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          "questionPaper.multipleJobRole.COL_JOBROLE":
            "$questionPaper.multipleJobRole.jobRoleDetails.COL_JOBROLE",
        },
      },
      {
        $project: {
          "questionPaper.multipleJobRole.jobRoleDetails": 0,
        },
      },
      {
        $group: {
          _id: "$_id",
          combinedFields: { $mergeObjects: "$$ROOT" },
          questionPaper: {
            $push: "$questionPaper.multipleJobRole",
          },
        },
      },
      {
        $addFields: {
          "combinedFields.questionPaper.multipleJobRole": "$questionPaper",
        },
      },
      {
        $replaceRoot: {
          newRoot: "$combinedFields",
        },
      },
      // Unwind populated fields
      { $unwind: { path: "$schemeId", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$clientId", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$COL_JOBROLE", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$subSchemeId", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$examCenterId", preserveNullAndEmptyArrays: true } },
      // Apply initial match criteria
      { $match: matchQuery },
      // Sort by sortOrder
      { $sort: sortOrder },
    ];

    // Execute the pipeline to get the initial Batch list
    let batchList = await Batch.aggregate(pipeline);

    // Function to check the Batch time
    const checkTime = (
      { startDate, endDate, startTime, endTime },
      batchType
    ) => {
      let startDateTime = moment(
        `${startDate} ${startTime}`,
        "DD/MM/YYYY hh:mmA"
      );
      let endDateTime = moment(`${endDate} ${endTime}`, "DD/MM/YYYY hh:mmA");

      switch (batchType) {
        case "upcoming":
          return startDateTime > currentDateTime.toDate();
        case "ongoing":
          return (
            startDateTime <= currentDateTime.toDate() &&
            endDateTime >= currentDateTime.toDate()
          );
        case "all":
          return true;
        default:
          return false;
      }
    };

    let filteredBatchList = batchList.filter((item) =>
      req?.user?.assigndClients.includes(item.clientId?._id)
    );

    // Count total batches after filtering
    const totalCounts = filteredBatchList.length;

    // Apply pagination to the filtered list
    const paginatedBatch = filteredBatchList.slice(skip, skip + limit);
    // Calculate total pages
    const totalPages = Math.ceil(totalCounts / limit);

    if (paginatedBatch.length > 0) {
      // Return successful response with paginated data
      return sendResponse(res, 200, "Batch found", {
        result: paginatedBatch,
        page,
        totalCounts,
        totalPages,
      });
    } else {
      // Return response when no batches are found after filtering
      return sendResponse(res, 200, "Batch found", {
        result: [],
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

module.exports.assignedAssessorDashboard = async (req, res, next) => {
  try {
    const { filterType } = req.query;
    const now = new Date();

    let startDate;
    // Determine the date range based on the filter type
    if (filterType === "weekly") {
      startDate = moment().subtract(1, "weeks").startOf("isoWeek").toDate();
    } else if (filterType === "monthly") {
      startDate = moment().subtract(1, "months").startOf("month").toDate();
    } else {
      return errorResponse(
        res,
        400,
        "Invalid filter type",
        "Invalid filter type"
      );
    }

    // Fetch assessors
    const assessorData = await AssesorModel.find()
      .populate("scheme")
      .sort({ fullName: 1 });

    // Get assessor IDs
    const assessorIds = assessorData.map((assessor) => assessor._id);

    // Aggregate batch data
    const batchData = await Batch.aggregate([
      {
        $addFields: {
          // Convert startTime and endTime to 24-hour format using moment.js
          startTime24: {
            $let: {
              vars: {
                formattedTime: {
                  $dateToString: {
                    format: "%Y-%m-%d %H:%M",
                    date: {
                      $toDate: {
                        $concat: [
                          {
                            $arrayElemAt: [{ $split: ["$startDate", "/"] }, 2],
                          }, // Year
                          "-",
                          {
                            $arrayElemAt: [{ $split: ["$startDate", "/"] }, 1],
                          }, // Month
                          "-",
                          {
                            $arrayElemAt: [{ $split: ["$startDate", "/"] }, 0],
                          }, // Day
                          " ",
                          "$startTime",
                        ],
                      },
                    },
                  },
                },
              },
              in: "$$formattedTime",
            },
          },
          endTime24: {
            $let: {
              vars: {
                formattedTime: {
                  $dateToString: {
                    format: "%Y-%m-%d %H:%M",
                    date: {
                      $toDate: {
                        $concat: [
                          { $arrayElemAt: [{ $split: ["$endDate", "/"] }, 2] }, // Year
                          "-",
                          { $arrayElemAt: [{ $split: ["$endDate", "/"] }, 1] }, // Month
                          "-",
                          { $arrayElemAt: [{ $split: ["$endDate", "/"] }, 0] }, // Day
                          " ",
                          "$endTime",
                        ],
                      },
                    },
                  },
                },
              },
              in: "$$formattedTime",
            },
          },
        },
      },
      {
        $addFields: {
          startDateTime: {
            $dateFromString: {
              dateString: "$startTime24",
              format: "%Y-%m-%d %H:%M",
            },
          },
          endDateTime: {
            $dateFromString: {
              dateString: "$endTime24",
              format: "%Y-%m-%d %H:%M",
            },
          },
        },
      },
      {
        $match: {
          accessorId: { $in: assessorIds },
          $or: [
            { endDateTime: { $lt: now } }, // Assessed batches
            {
              $and: [
                { startDateTime: { $lte: now } },
                { endDateTime: { $gte: now } },
              ],
            }, // Assigned batches
          ],
        },
      },
      {
        $facet: {
          assessed: [
            { $match: { endDateTime: { $lt: now } } },
            {
              $group: {
                _id: "$accessorId",
                count: { $sum: 1 },
              },
            },
          ],
          assigned: [
            {
              $match: {
                startDateTime: { $lte: now },
                endDateTime: { $gte: now },
              },
            },
            {
              $group: {
                _id: "$accessorId",
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
    ]);

    const assessedBatchMap = Object.fromEntries(
      batchData[0].assessed.map((item) => [item._id.toString(), item.count])
    );
    const assignedBatchMap = Object.fromEntries(
      batchData[0].assigned.map((item) => [item._id.toString(), item.count])
    );

    //promise handling
    const result = await Promise.all(
      assessorData.map(async (assessor) => {
        const assessedBatch = assessedBatchMap[assessor._id.toString()] || 0;
        const assignedBatch = assignedBatchMap[assessor._id.toString()] || 0;

        // Check if the assessor has a profile key to build the URL
        let assessorProfileUrl = null;

        if (
          assessor.assessorCertificate &&
          assessor.assessorCertificate.profileKey
        ) {
          const fileKeys = [assessor.assessorCertificate.profileKey];
          // Await the profile URL here to ensure it resolves before returning
          assessorProfileUrl = await getAssessorDashboardProfileUrl(
            assessor,
            fileKeys
          );
        }

        return {
          fullName: assessor.fullName,
          email: assessor.email,
          assessedBatch,
          assignedBatch,
          url: assessorProfileUrl,
        };
      })
    );

    // Once Promise.all resolves, you can return or use the result
    return sendResponse(res, 200, "Data found", result);
  } catch (error) {
    return errorResponse(res, 500, error.message, error.message);
  }
};

module.exports.clientDashboard = async (req, res) => {
  try {
    // Define time ranges for weekly and monthly calculations
    const now = new Date();
    const startOfLastWeek = moment()
      .subtract(1, "weeks")
      .startOf("isoWeek")
      .toDate();
    const startOfLastMonth = moment()
      .subtract(1, "months")
      .startOf("month")
      .toDate();

    // Get all clients assigned to the user
    const assignedClients = req?.user?.assigndClients.map((COL_CLIENT) =>
      mongoose.Types.ObjectId(COL_CLIENT._id)
    );
    console.log("assignedClients==>", assignedClients);
    // Aggregation to find total and active assessor counts per COL_CLIENT
    const clientAggregation = await COL_ASSESOR.aggregate([
      {
        $unwind: "$COL_JOBROLE",
      },
      {
        $lookup: {
          from: "jobroles",
          localField: "COL_JOBROLE.jobroleName",
          foreignField: "COL_JOBROLE",
          as: "jobRoleDetails",
        },
      },
      {
        $unwind: "$jobRoleDetails",
      },
      {
        $lookup: {
          from: "clients",
          localField: "jobRoleDetails.clientId",
          foreignField: "_id",
          as: "clientDetails",
        },
      },
      {
        $unwind: "$clientDetails",
      },
      {
        $match: {
          "clientDetails._id": { $in: assignedClients },
        },
      },
      {
        // Group by COL_CLIENT to calculate total assessors, total active assessors, weekly, and monthly
        $group: {
          _id: "$clientDetails._id",
          clientName: { $first: "$clientDetails.clientname" },
          totalAssessors: { $addToSet: "$_id" }, // Use Set to count unique assessors
        },
      },
      {
        // Project counts
        $project: {
          _id: 0,
          clientId: "$_id",
          clientName: 1,
          totalAssessorCount: { $size: "$totalAssessors" },
        },
      },
    ]);
    console.log("clientAggregation==>", JSON.stringify(clientAggregation));
    // Calculate weekly and monthly totals separately, including active assessors
    const assessorAggregation = await COL_ASSESOR.aggregate([
      {
        $unwind: "$COL_JOBROLE",
      },
      {
        $lookup: {
          from: "jobroles",
          localField: "COL_JOBROLE.jobroleName",
          foreignField: "COL_JOBROLE",
          as: "jobRoleDetails",
        },
      },
      {
        $unwind: "$jobRoleDetails",
      },
      {
        $lookup: {
          from: "clients",
          localField: "jobRoleDetails.clientId",
          foreignField: "_id",
          as: "clientDetails",
        },
      },
      {
        $unwind: "$clientDetails",
      },
      {
        $match: {
          "clientDetails._id": { $in: assignedClients },
        },
      },
      {
        $lookup: {
          from: "batches",
          localField: "clientDetails._id",
          foreignField: "clientId",
          as: "batchDetails",
        },
      },
      {
        $unwind: "$batchDetails",
      },
      {
        $group: {
          _id: "$clientDetails._id",
          weeklyTotalAssessors: {
            $addToSet: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$batchDetails.startDateTime", startOfLastWeek] },
                    { $lt: ["$batchDetails.endDateTime", now] },
                  ],
                },
                "$_id",
                null,
              ],
            },
          },
          monthlyTotalAssessors: {
            $addToSet: {
              $cond: [
                {
                  $and: [
                    { $gte: ["$batchDetails.startDateTime", startOfLastMonth] },
                    { $lt: ["$batchDetails.endDateTime", now] },
                  ],
                },
                "$_id",
                null,
              ],
            },
          },
          weeklyActiveAssessors: {
            $addToSet: {
              $cond: [
                {
                  $and: [
                    { $lt: [now, "$batchDetails.endDateTime"] }, // Current date is less than endDateTime
                    { $gte: ["$batchDetails.startDateTime", startOfLastWeek] },
                    { $lt: ["$batchDetails.endDateTime", now] },
                  ],
                },
                "$_id",
                null,
              ],
            },
          },
          monthlyActiveAssessors: {
            $addToSet: {
              $cond: [
                {
                  $and: [
                    { $lt: [now, "$batchDetails.endDateTime"] }, // Current date is less than endDateTime
                    { $gte: ["$batchDetails.startDateTime", startOfLastMonth] },
                    { $lt: ["$batchDetails.endDateTime", now] },
                  ],
                },
                "$_id",
                null,
              ],
            },
          },
        },
      },
      {
        $project: {
          clientId: "$_id",
          weeklyTotalAssessorCount: {
            $size: {
              $filter: {
                input: "$weeklyTotalAssessors",
                as: "assessor",
                cond: { $ne: ["$$assessor", null] },
              },
            },
          },
          monthlyTotalAssessorCount: {
            $size: {
              $filter: {
                input: "$monthlyTotalAssessors",
                as: "assessor",
                cond: { $ne: ["$$assessor", null] },
              },
            },
          },
          weeklyActiveAssessorCount: {
            $size: {
              $filter: {
                input: "$weeklyActiveAssessors",
                as: "assessor",
                cond: { $ne: ["$$assessor", null] },
              },
            },
          },
          monthlyActiveAssessorCount: {
            $size: {
              $filter: {
                input: "$monthlyActiveAssessors",
                as: "assessor",
                cond: { $ne: ["$$assessor", null] },
              },
            },
          },
        },
      },
    ]);

    // console.log("assessorAggregation==>",JSON.stringify(assessorAggregation))
    // Merge weekly and monthly counts into clientAggregation
    const clientStats = clientAggregation.map((COL_CLIENT) => {
      const weeklyMonthlyData = assessorAggregation.find(
        (wm) => wm.clientId.toString() === COL_CLIENT.clientId.toString()
      );
      return {
        ...COL_CLIENT,
        weeklyTotalAssessorCount: weeklyMonthlyData
          ? weeklyMonthlyData.weeklyTotalAssessorCount
          : 0,
        monthlyTotalAssessorCount: weeklyMonthlyData
          ? weeklyMonthlyData.monthlyTotalAssessorCount
          : 0,
        weeklyActiveAssessorCount: weeklyMonthlyData
          ? weeklyMonthlyData.weeklyActiveAssessorCount
          : 0,
        monthlyActiveAssessorCount: weeklyMonthlyData
          ? weeklyMonthlyData.monthlyActiveAssessorCount
          : 0,
      };
    });

    return sendResponse(res, 200, "Data found", { result: clientStats });
  } catch (error) {
    console.log("Error occurred in clientDashboard:", error);
    return errorResponse(res, 500, responseMessage.something_wrong, error);
  }
};

module.exports.liveBatchLogs = async (req, res) => {
  try {
    const { page, limit, skip, sortOrder } = Paginate(req);
    const { clientId } = req.query;
    const currentDateTime = moment();

    // Parse clientId as a comma-separated string
    let clientIds = [];
    if (clientId) {
      if (typeof clientId === "string") {
        clientIds = clientId
          .split(",")
          .map((id) => id.trim().replace(/(^"|"$)/g, "")); // Split by comma, trim spaces, and remove quotes
      } else if (Array.isArray(clientId)) {
        clientIds = clientId.map((id) => id.trim().replace(/(^"|"$)/g, ""));
      }
    }

    // Define the COL_CLIENT filter based on the input, use assigned clients if no clientId is provided
    let clientFilter = {};
    if (clientIds.length > 0) {
      clientFilter = {
        "clientId._id": {
          $in: clientIds.map((id) => mongoose.Types.ObjectId(id)),
        },
      };
    } else {
      clientFilter = {
        "clientId._id": {
          $in: req?.user?.assigndClients.map((COL_CLIENT) =>
            mongoose.Types.ObjectId(COL_CLIENT._id)
          ),
        },
      };
    }

    // Initialize the match query with COL_CLIENT filter
    const matchQuery = { ...clientFilter };

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
          pipeline: [
            {
              $project: {
                clientname: 1,
                clientType: 1,
                clientcode: 1,
                email: 1,
              },
            },
          ],
        },
      },
      {
        $lookup: {
          from: "jobroles",
          localField: "jobRole", // Correct field for jobRole
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
      {
        $lookup: {
          from: "examcenters",
          localField: "examCenterId",
          foreignField: "_id",
          as: "examCenterId",
          pipeline: [{ $project: { examCenterName: 1 } }],
        },
      },
      {
        $unwind: {
          path: "$questionPaper.multipleJobRole",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "jobroles",
          localField: "questionPaper.multipleJobRole.jobRoleId",
          foreignField: "_id",
          as: "questionPaper.multipleJobRole.jobRoleDetails",
          pipeline: [{ $project: { COL_JOBROLE: 1 } }],
        },
      },
      {
        $unwind: {
          path: "$questionPaper.multipleJobRole.jobRoleDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $addFields: {
          "questionPaper.multipleJobRole.COL_JOBROLE":
            "$questionPaper.multipleJobRole.jobRoleDetails.COL_JOBROLE",
        },
      },
      {
        $project: {
          "questionPaper.multipleJobRole.jobRoleDetails": 0,
        },
      },
      {
        $group: {
          _id: "$_id",
          combinedFields: { $mergeObjects: "$$ROOT" },
          questionPaper: {
            $push: "$questionPaper.multipleJobRole",
          },
        },
      },
      {
        $addFields: {
          "combinedFields.questionPaper.multipleJobRole": "$questionPaper",
        },
      },
      {
        $replaceRoot: {
          newRoot: "$combinedFields",
        },
      },
      // Unwind populated fields
      { $unwind: { path: "$schemeId", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$clientId", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$COL_JOBROLE", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$subSchemeId", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$examCenterId", preserveNullAndEmptyArrays: true } },
      // Apply initial match criteria
      { $match: matchQuery },
      // Sort by sortOrder
      { $sort: sortOrder },
    ];

    // Execute the pipeline to get the initial Batch list
    let batchList = await Batch.aggregate(pipeline);

    // Function to check the Batch time
    const checkTime = (
      { startDate, endDate, startTime, endTime },
      batchType
    ) => {
      let startDateTime = moment(
        `${startDate} ${startTime}`,
        "DD/MM/YYYY hh:mmA"
      );
      let endDateTime = moment(`${endDate} ${endTime}`, "DD/MM/YYYY hh:mmA");

      switch (batchType) {
        case "upcoming":
          return startDateTime > currentDateTime.toDate();
        case "ongoing":
          return (
            startDateTime <= currentDateTime.toDate() &&
            endDateTime >= currentDateTime.toDate()
          );
        case "all":
          return true;
        default:
          return false;
      }
    };

    let filteredBatchList = batchList
      .filter((item) => checkTime(item, "ongoing"))
      .filter((item) => req?.user?.assigndClients.includes(item.clientId?._id));

    // Count total batches after filtering
    const totalCounts = filteredBatchList.length;

    // Apply pagination to the filtered list
    const paginatedBatch = filteredBatchList.slice(skip, skip + limit);
    // Calculate total pages
    const totalPages = Math.ceil(totalCounts / limit);

    if (paginatedBatch.length > 0) {
      // Return successful response with paginated data
      return sendResponse(res, 200, "Live Batch found", {
        result: paginatedBatch,
        page,
        totalCounts,
        totalPages,
      });
    } else {
      // Return response when no batches are found after filtering
      return sendResponse(res, 200, "Live Batch found", {
        result: [],
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

//Real time monitoring Verification list

module.exports.monitoringAssessmentList = async (req, res) => {
  try {
    const { page, limit, skip, sortOrder } = await Paginate(req);
    const { assessorName, from, to, batchId } = req.query; // 🔹 removed clientId from here, handled separately

    // Convert user input dates
    const fromDate = from ? moment(from, "MM-DD-YYYY").toDate() : null;
    const toDate = to ? moment(to, "MM-DD-YYYY").toDate() : null;

    // Fetch dates from DB
    const dateDocs = await qaVerificationModel.find({}).select("date");
    const convertedDates = dateDocs.map((doc) => ({
      _id: doc._id,
      date: moment(doc.date, "DD-MM-YYYY").toDate(),
    }));

    // Apply date filter
    const filteredDates =
      fromDate && toDate
        ? convertedDates.filter(
            (doc) => doc.date >= fromDate && doc.date <= toDate
          )
        : convertedDates;

    const filteredIds = filteredDates.map((doc) => doc._id);

    // --- Build base filter ---
    let filterQuery = {};

    if (batchId) {
      filterQuery.batchId = new mongoose.Types.ObjectId(batchId);
    }
    if (assessorName) {
      filterQuery.assesorId = new mongoose.Types.ObjectId(assessorName);
    }
    if (from && to) {
      filterQuery._id = { $in: filteredIds };
    }

    let clientIds = [];
    if (req.query?.clientId) {
      clientIds = [new mongoose.Types.ObjectId(req.query.clientId)];
    } else if (req?.user?.email !== "support@radiantinfonet.com") {
      clientIds = (req?.user?.assigndClients || []).map((c) =>
        new mongoose.Types.ObjectId(c._id || c)
      );
    }

    // --- Build pipeline ---
    const pipeline = [
      { $match: filterQuery },
      {
        $lookup: {
          from: "batches",
          localField: "batchId",
          foreignField: "_id",
          as: "batchDetails",
        },
      },
      { $unwind: "$batchDetails" },
    ];

   
    if (clientIds.length > 0) {
      pipeline.push({
        $match: {
          "batchDetails.clientId": { $in: clientIds },
        },
      });
    }

    // Lookup for JobRole
    pipeline.push({
      $lookup: {
        from: "jobroles",
        localField: "batchDetails.jobRole",
        foreignField: "_id",
        as: "jobRoleDetails",
      },
    });

    // Lookup for Assessor
    pipeline.push({
      $lookup: {
        from: "assessors",
        localField: "assesorId",
        foreignField: "_id",
        as: "assessorDetails",
      },
    });

    pipeline.push(
      { $unwind: { path: "$jobRoleDetails", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$assessorDetails", preserveNullAndEmptyArrays: true } }
    );

    // Shape the output exactly like you want
    pipeline.push({
      $project: {
        date: 1,
        isFileUploaded: 1,
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
        createdAt: 1,
        updatedAt: 1,
        batchId: {
          _id: "$batchDetails._id",
          batchId: "$batchDetails.batchId",
          jobRole: {
            _id: "$jobRoleDetails._id",
            jobRole: "$jobRoleDetails.jobRole",
          },
        },
        assesorId: {
          _id: "$assessorDetails._id",
          fullName: "$assessorDetails.fullName",
        },
      },
    });

    pipeline.push({ $sort: sortOrder }, { $skip: skip }, { $limit: limit });

    // Run queries
    const assessmentDetails = await qaVerificationModel.aggregate(pipeline);

    // For pagination
    const totalCountsPipeline = pipeline.slice(0, -3); // remove sort/skip/limit
    totalCountsPipeline.push({ $count: "total" });

    const totalCountResult = await qaVerificationModel.aggregate(
      totalCountsPipeline
    );
    const totalCounts = totalCountResult[0]?.total || 0;
    const totalPages = Math.ceil(totalCounts / limit);

    return sendResponse(res, 200, "Assessment details found", {
      result: assessmentDetails,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    console.error("error", error);
    return errorResponse(res, 500, "Something went wrong", error.message);
  }
};




module.exports.assessorCompletedPercentage = async (req, res, next) => {
  try {
    const assessor_Id = req.params.id;
    //const assessorData = await AssesorModel.findById(assessor_Id);
     const assessorData = await AssesorModel.findOne({
      _id: assessor_Id,
      isDeleted: { $ne: true }
    });

    // Check if the assessor data exists
    if (!assessorData) {
      return errorResponse(
        res,
        404,
        responseMessage.assessor_profile_not_found,
        responseMessage.errorMessage
      );
    }

    const {
      fullName,
      email,
      mobile,
      gender,
      dob,
      address,
      state,
      district,
      pinCode,
      modeofAgreement,
    } = assessorData;

    // Calculate profile completion percentage based on criteria
    let profilePercentage = 0;
    let documentCount = 0;
    let basicDetailProfileStatus = false;
    let personalDetailProfileStatus = false;
    let bankDetailProfileStatus = false;
    let DegreeCertificateProfileStatus = false;

    // Check if assessorCertificate.profileKey is present
    if (assessorData.assessorCertificate.profileKey) {
      profilePercentage += 10;
    }

    // Check if all required properties are present
    if (
      assessorData.assessorCertificate.profileKey &&
      fullName &&
      email &&
      mobile &&
      gender &&
      dob &&
      address &&
      state &&
      district &&
      pinCode &&
      modeofAgreement
    ) {
      documentCount += 1;
      basicDetailProfileStatus = true;
    }

    const personalData = assessorData.personalDetail;
    const acceptedPersonalDocuments = personalData.filter(
      (personal) => personal.status === "accepted"
    );
    const acceptedPersonalDocumentsCount = acceptedPersonalDocuments.length;
    if (acceptedPersonalDocumentsCount === 1) {
      profilePercentage += 15;
    } else if (acceptedPersonalDocumentsCount === 2) {
      profilePercentage += 30;
      documentCount += 1;
      personalDetailProfileStatus = true;
    }

    const assessorEducation = assessorData.education;
    const acceptedDocuments = assessorEducation.filter(
      (education) => education.status === "accepted"
    );
    const acceptedDocumentsCount = acceptedDocuments.length;
    if (acceptedDocumentsCount === 1) {
      profilePercentage += 4;
    } else if (acceptedDocumentsCount === 2) {
      profilePercentage += 7;
    } else if (acceptedDocumentsCount >= 3) {
      profilePercentage += 10;
    }

    const jobRoleData = assessorData.jobRole;
    const acceptedJobroleDocuments = jobRoleData.filter(
      (job) => job.status === "accepted"
    );
    const acceptedJobroleDocumentsCount = acceptedJobroleDocuments.length;
    if (acceptedJobroleDocumentsCount >= 1) {
      profilePercentage += 5;
    }

    const experienceData = assessorData.experiences;
    const acceptedExperienceDocuments = experienceData.filter(
      (experience) => experience.status === "accepted"
    );
    const acceptedExperienceDocumentsCount = acceptedExperienceDocuments.length;
    if (acceptedExperienceDocumentsCount >= 1) {
      profilePercentage += 5;
    }

    const agreementData = assessorData.agreement;
    const acceptedAgreementDocuments = agreementData.filter(
      (agreement) => agreement.status === "accepted"
    );
    const acceptedAgreementDocumentsCount = acceptedAgreementDocuments.length;
    if (acceptedAgreementDocumentsCount >= 1) {
      profilePercentage += 10;
    }

    //  const agreementData = assessorData.agreementCertificate
    //  const acceptedAgreementDocuments = jobRoleData.filter(job => job.status === 'accepted');
    //  //const acceptedAgreementDocumentsCount = acceptedAgreementDocuments.length;

    if (
      acceptedDocuments.length >= 3 &&
      acceptedJobroleDocuments.length &&
      acceptedAgreementDocuments.length
    ) {
      documentCount += 1;
      DegreeCertificateProfileStatus = true;
    }

    if (assessorData.bankAccount) {
      profilePercentage += 30;
      documentCount += 1;
      bankDetailProfileStatus = true;
    }

    const formattedPercentage = profilePercentage + "%";

    const responseData = {
      _id: assessorData._id,
      fullName: assessorData.fullName,
      profilePercentage: formattedPercentage,
      documentCount: documentCount,
      basicDetailProfileStatus: basicDetailProfileStatus,
      personalDetailProfileStatus: personalDetailProfileStatus,
      bankDetailProfileStatus: bankDetailProfileStatus,
      DegreeCertificateProfileStatus: DegreeCertificateProfileStatus,
    };

    return sendResponse(
      res,
      200,
      responseMessage.assessor_profile_get,
      responseData
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

function calculateProfilePercentage(assessorData) {
  let profilePercentage = 0;
  let documentCount = 0;

  // Profile key check
  if (assessorData.assessorCertificate?.profileKey) {
    profilePercentage += 10;
  }

  // Check all essential personal details
  if (
    assessorData.assessorCertificate?.profileKey &&
    assessorData.fullName &&
    assessorData.email &&
    assessorData.mobile &&
    assessorData.gender &&
    assessorData.dob &&
    assessorData.address &&
    assessorData.state &&
    assessorData.district &&
    assessorData.pinCode &&
    assessorData.modeofAgreement
  ) {
    documentCount += 1;
  }

  // Personal documents status check
  const acceptedPersonalDocuments =
    assessorData.personalDetail?.filter(
      (personal) => personal.status === "accepted"
    ) || [];
  if (acceptedPersonalDocuments.length === 1) {
    profilePercentage += 15;
  } else if (acceptedPersonalDocuments.length === 2) {
    profilePercentage += 30;
    documentCount += 1;
  }

  // Education documents status check
  const acceptedEducationDocuments =
    assessorData.education?.filter(
      (education) => education.status === "accepted"
    ) || [];
  if (acceptedEducationDocuments.length === 1) {
    profilePercentage += 4;
  } else if (acceptedEducationDocuments.length === 2) {
    profilePercentage += 8;
    documentCount += 1;
  } else if (acceptedEducationDocuments.length > 2) {
    profilePercentage += 10;
    documentCount += 1;
  }

  // Final adjustment based on document count
  if (documentCount === 2) {
    profilePercentage += 10;
  } else if (documentCount >= 3) {
    profilePercentage += 15;
  }

  // Ensure profile percentage does not exceed 100%
  profilePercentage = Math.min(profilePercentage, 100);

  return profilePercentage;
}


exports.assessorListHrDashboard = async (req, res, next) => {
  try {
    const { verified = false, pending = false, schemeId } = req.query;

    const options = ["assessorId", "fullName", "email"];
    let filter = getFilter(req, options, false);
    const { page, limit, skip, sortOrder } = Paginate(req);

    const modeofAgreement = req?.query?.modeofAgreement;
    const agreementSigned = req?.query?.agreementSigned;
    const from = req?.query?.from;
    const to = req?.query?.to;

    let query = filter ? filter.query : {};

    query.isDeleted = { $ne: true };

    if (modeofAgreement) {
      query.modeofAgreement = modeofAgreement;
    }

    if (agreementSigned) {
      query.agreementSigned = agreementSigned;
    }

    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      query.createdAt = { $gte: fromDate, $lte: toDate };
    }

    if (schemeId) {
      query["scheme"] = { $in: [schemeId] };
    }

    //Handle clientIds here
    let clientIds = [];
    if (req.query?.clientId) {
      clientIds = [new mongoose.Types.ObjectId(req.query.clientId)];
    } else if (req?.user?.email !== "support@radiantinfonet.com") {
      clientIds = (req?.user?.assigndClients || []).map((c) =>
        new mongoose.Types.ObjectId(c._id || c)
      );
    }
    
    //Fetch assessor data
    let assessorData = await AssesorModel.find(query)
      .populate("scheme")
      .sort(sortOrder)
      .lean();

    if (clientIds.length > 0) {
      const jobroleDocs = await mongoose.model("Jobrole").find({
        clientId: { $in: clientIds },
      });

      const allowedJobroles = jobroleDocs.map((jr) => jr.jobRole);

      assessorData = assessorData
        .map((assessor) => {
          const matchingRoles = assessor.jobRole?.filter((role) =>
            allowedJobroles.includes(role.jobroleName)
          );
          if (matchingRoles?.length > 0) {
            return { ...assessor, jobRole: matchingRoles };
          }
          return null;
        })
        .filter(Boolean);

      // Deduplicate assessors by _id
      const uniqueMap = new Map();
      assessorData.forEach((assessor) => {
        uniqueMap.set(assessor._id.toString(), assessor);
      });
      assessorData = Array.from(uniqueMap.values());
    }
   

    let totalCounts = assessorData.length;
    let totalPages = Math.ceil(totalCounts / limit);

    if (assessorData.length < 1) {
      return sendResponse(
        res,
        200,
        responseMessage.assessor_profile_not_found,
        {}
      );
    }

    let filteredData = assessorData.slice(skip, skip + limit);

    //Add profile percentage & fetch image URLs
    const imgUrlPromises = filteredData.map(async (data) => {
      if (data) {
        const fileKeys = [];
        if (data.assessorCertificate?.profileKey) {
          fileKeys.push(data.assessorCertificate.profileKey);
        }

        const profilePercentage = calculateProfilePercentage(data);
        data.profilePercentage = profilePercentage;

        const photoUrl = await getassessorHrDashboardFileUrl(data, fileKeys);
        return photoUrl;
      }
    });

    const imgUrl = await Promise.all(imgUrlPromises);

    //Flatten & calculate profileStatus
    let resultWithVerification = imgUrl.flatMap((assessors) => {
      return assessors.map((assessor) => {
        const hasSpecificScheme = assessor.scheme?.some(
          (item) => item?._id?.toString() === process.env.PM_VISHWAKARMA
        );

        const personalDetailAcceptedCount =
          assessor.personalDetail?.filter(
            (detail) => detail.status === "accepted"
          ).length >= 2;

        const allAccepted =
          assessor.education?.some((edu) => edu.status === "accepted") &&
          assessor.jobRole?.some((role) => role.status === "accepted") &&
          assessor.personalDetail?.some(
            (detail) => detail.status === "accepted"
          ) &&
          assessor.agreement?.some(
            (agreement) => agreement.status === "accepted"
          );

        const profileStatus =
          hasSpecificScheme || (allAccepted && personalDetailAcceptedCount)
            ? "Completed"
            : "Pending";

        return { ...assessor, profileStatus };
      });
    });

    //Final deduplication by _id (removes duplicates from flatMap stage)
    const finalUniqueMap = new Map();
    resultWithVerification.forEach((assessor) => {
      finalUniqueMap.set(assessor._id.toString(), assessor);
    });
    resultWithVerification = Array.from(finalUniqueMap.values());

    return sendResponse(res, 200, responseMessage.assessor_profile_get, {
      result: resultWithVerification,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};



exports.assessorEmploymentType = async (req, res, next) => {
  try {
    const { clientId } = req.query;

    // Handle clientId as a comma-separated string or array
    let clientIds = [];
    if (clientId) {
      if (typeof clientId === "string") {
        clientIds = clientId
          .split(",")
          .map((id) => id.trim().replace(/(^"|"$)/g, "")); // Split by comma, trim spaces, and remove quotes
      } else if (Array.isArray(clientId)) {
        clientIds = clientId.map((id) => id.trim().replace(/(^"|"$)/g, ""));
      }
    }

    // Build match stage for job roles with optional clientId filtering
    let jobRoleMatchStage = {};
    if (clientIds.length > 0) {
      // If clientIds are provided, add them to the match stage
      jobRoleMatchStage["jobRoleDetails.clientId"] = {
        $in: clientIds.map((id) => mongoose.Types.ObjectId(id)),
      };
    } else {
      // If no clientId provided, use assigned clients
      jobRoleMatchStage["jobRoleDetails.clientId"] = {
        $in: req?.user?.assigndClients.map((COL_CLIENT) =>
          mongoose.Types.ObjectId(COL_CLIENT._id)
        ),
      };
    }

    // Aggregation pipeline to calculate statewiseCounts, totalAssessorCounts, totalPayrollCounts, and totalFreelanceCounts
    const assessorAggregation = await COL_ASSESOR.aggregate([
      {
        $match: {
         isDeleted: { $ne: true }  
        }
      },
      {
        // Lookup job roles to get clientId
        $lookup: {
          from: "jobroles", // Collection name for JobroleModel
          localField: "COL_JOBROLE.jobroleName",
          foreignField: "COL_JOBROLE",
          as: "jobRoleDetails",
        },
      },
      {
        // Unwind jobRoleDetails to separate documents
        $unwind: "$jobRoleDetails",
      },
      {
        // Apply clientId filter if provided
        $match: jobRoleMatchStage,
      },
      {
        // Lookup clients to get clientType
        $lookup: {
          from: "clients",
          localField: "jobRoleDetails.clientId",
          foreignField: "_id",
          as: "clientDetails",
        },
      },
      {
        // Unwind clientDetails to separate documents
        $unwind: "$clientDetails",
      },
      {
        // Match clientType with assigned clients and check if state is present
        $match: {
          state: { $exists: true, $ne: null },
        },
      },
      {
        // Group by unique assessor ID (assuming "assessorId" is the unique identifier)
        $group: {
          _id: "$assessorId", // Group by unique assessor ID
          state: { $first: "$state" },
          modeofAgreement: { $first: "$modeofAgreement" },
        },
      },
      {
        // Group by state and aggregate counts for payroll, freelance, and total assessors
        $group: {
          _id: "$state",
          payroll: {
            $sum: {
              $cond: [{ $eq: ["$modeofAgreement", "payroll"] }, 1, 0],
            },
          },
          freelance: {
            $sum: {
              $cond: [{ $eq: ["$modeofAgreement", "freelance"] }, 1, 0],
            },
          },
          total: { $sum: 1 }, // Total unique assessors count
        },
      },
      {
        // Project final state-wise data along with total counts
        $project: {
          _id: 0,
          state: "$_id",
          payroll: 1,
          freelance: 1,
          total: 1,
        },
      },
    ]);

    // Calculate overall totals from the grouped data
    const totalAssessorCounts = assessorAggregation.reduce(
      (acc, curr) => acc + curr.total,
      0
    );
    const totalPayrollCounts = assessorAggregation.reduce(
      (acc, curr) => acc + curr.payroll,
      0
    );
    const totalFreelanceCounts = assessorAggregation.reduce(
      (acc, curr) => acc + curr.freelance,
      0
    );

   
    return sendResponse(res, 200, responseMessage.assessor_profile_get, {
      totalAssessorCounts,
      totalPayrollCounts,
      totalFreelanceCounts,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//clients by location
exports.getAllClientsByLocation = async (req, res, next) => {
  try {
    const query = {};

    // Add clientId filter
    let clientId = req?.query?.clientId
      ? req.query.clientId.split(",")
      : req.user?.assigndClients;

    clientId = clientId?.map((item) => mongoose.Types.ObjectId(item));

    if (clientId) {
      query._id = { $in: clientId };
    }
    // Fetching clients data
    const clientsData = await ClientModel.find(query);

    if (clientsData.length < 1) {
      return sendResponse(res, 200, responseMessage.no_client_found, {});
    }

    // Define all possible organisation types
    const allOrganisationTypes = ["Private", "Government", "Others"];

    // Aggregating organisationType counts by state
    const stateWiseData = {};
    let totalClientCount = 0;

    clientsData.forEach(({ organisationType, state }) => {
      totalClientCount += 1;
      if (!stateWiseData[state]) {
        stateWiseData[state] = { total: 0, organisationTypes: {} };
      }

      stateWiseData[state].total += 1;

      if (!stateWiseData[state].organisationTypes[organisationType]) {
        stateWiseData[state].organisationTypes[organisationType] = 0;
      }

      stateWiseData[state].organisationTypes[organisationType] += 1;
    });

    // Transforming aggregated data into the desired response format
    const allData = Object.keys(stateWiseData).map((state) => {
      const { total, organisationTypes } = stateWiseData[state];

      // Ensure all organisation types are included with a count of 0 if not present
      const filledOrganisationTypes = allOrganisationTypes.reduce(
        (acc, orgType) => {
          acc[orgType] = organisationTypes[orgType] || 0;
          return acc;
        },
        {}
      );

      return {
        state,
        ...filledOrganisationTypes,
      };
    });

    // Sending the response with total client count
    return sendResponse(res, 200, responseMessage.client_profile_get, {
      totalClientCount, // Include total client count
      clientStats: allData,
    });
  } catch (error) {
    console.log("error.message", error.message);
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.getSectorWiseOverview = async (req, res) => {
  try {
    // Extract filters from the request query
    const { filter, clientId } = req.query; // Filter can be 'weekly' or 'monthly'

    // Create a base query
    // Create a base query
    const query = {};

    // Add clientId filter
    const clientIds = clientId
      ? clientId.split(",").map((id) => mongoose.Types.ObjectId(id))
      : req?.user?.assigndClients?.map((id) => mongoose.Types.ObjectId(id));

    if (clientIds) {
      query.clientId = { $in: clientIds };
    }

    // Apply date filter if provided
    if (filter) {
      const currentDate = moment();
      if (filter === "weekly") {
        query.createdAt = {
          $gte: currentDate.clone().startOf("week").toDate(),
          $lte: currentDate.clone().endOf("week").toDate(),
        };
      } else if (filter === "monthly") {
        query.createdAt = {
          $gte: currentDate.clone().startOf("month").toDate(),
          $lte: currentDate.clone().endOf("month").toDate(),
        };
      }
    }

    //total client
    const totalClients = await ClientModel.countDocuments({});
    const totalJobrole = await COL_JOBROLE.countDocuments({});
    console.log("totalClients==>", totalClients);
    // Fetch job roles with client details
    const jobRoleDetails = await COL_JOBROLE.find(query).populate({
      select: "clientname clientcode createdAt",
      path: "clientId",
    });

    // Group data by clientId
    const clientDataMap = {};

    jobRoleDetails.forEach((jobRole) => {
      const clientId = jobRole?.clientId?.clientcode; // Using clientcode as key
      if (!clientDataMap[clientId]) {
        clientDataMap[clientId] = {
          totalClient: 0,
          totalJobRole: 0,
        };
      }
      clientDataMap[clientId].totalJobRole += 1;
    });

    // Count distinct clients
    const distinctClients = new Set(
      jobRoleDetails.map((jobRole) => jobRole?.clientId?.clientcode)
    );
    distinctClients.forEach((clientId) => {
      if (clientDataMap[clientId]) {
        clientDataMap[clientId].totalClient = 1; // Each unique client is counted once
      }
    });

    clientDataMap.totalClient = totalClients;
    clientDataMap.totalJobRole = totalJobrole;
    // Send the response
    return sendResponse(
      res,
      200,
      responseMessage.job_role_found,
      clientDataMap
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//meeting schedule list
module.exports.scheduleList = async (req, res) => {
  try {
    const { startDate } = req.query;
    const { page, limit, skip, sortOrder } = Paginate(req);

    let query = startDate
      ? {
          schedule_date: {
            $eq: startDate,
          },
        }
      : {};
    const totalCounts = await MeetingScheduleModel.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);
    const MeetingScheduleList =
      (await MeetingScheduleModel.find(query)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit)) || [];

    return sendResponse(res, 200, "Schedule List", {
      MeetingScheduleList,
      page,
      totalCounts,
      totalPages,
    });
  } catch (err) {
    console.log("error", err);
    return errorResponse(res, 400, responseMessage.something_wrong, err);
  }
};

//Daily work progress
module.exports.dailyWorkProgress = async (req, res) => {
  try {
    let query = {};
    const clientId = req?.query?.clientId
      ? req?.query?.clientId
          .split(",")
          .map((item) => mongoose.Types.ObjectId(item))
      : req?.user?.assigndClients;

    if (clientId) {
      query.clientId = { $in: clientId };
    }

    const filterType = req?.query?.filterType; // Expect 'weekly' or 'monthly'
    const currentDate = new Date();

    if (filterType === "weekly") {
      // Get the start of the current week (Monday)
      const startOfWeek = new Date(currentDate);
      startOfWeek.setDate(currentDate.getDate() - currentDate.getDay() + 1);
      startOfWeek.setHours(0, 0, 0, 0);

      // Get the end of the current week (Sunday)
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      endOfWeek.setHours(23, 59, 59, 999);

      query.createdAt = { $gte: startOfWeek, $lte: endOfWeek };

      // Aggregate data for each day of the week
      const weeklyData = await COL_ASSESSMENT_CONTENT.aggregate([
        { $match: query },
        {
          $group: {
            _id: {
              day: { $dayOfWeek: "$createdAt" }, // 1 (Sunday) to 7 (Saturday)
            },
            totalBluePrint: {
              $sum: {
                $add: [
                  { $cond: [{ $gt: ["$bluePrintCount.theory", 0] }, 1, 0] },
                  {
                    $cond: [
                      { $gt: ["$bluePrintCount.vivaPractical", 0] },
                      1,
                      0,
                    ],
                  },
                ],
              },
            },
            totalQuestionBank: {
              $sum: {
                $add: [
                  { $cond: [{ $gt: ["$nosBankCount.theory", 0] }, 1, 0] },
                  { $cond: [{ $gt: ["$nosBankCount.viva", 0] }, 1, 0] },
                  { $cond: [{ $gt: ["$nosBankCount.practical", 0] }, 1, 0] },
                ],
              },
            },
          },
        },
      ]);

      const formattedWeeklyData = Array.from({ length: 7 }, (_, i) => {
        const dayData = weeklyData.find((d) => d._id.day === i + 1);
        return {
          day: [
            "Sunday",
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
          ][i],
          totalBluePrint: dayData ? dayData.totalBluePrint : 0,
          totalQuestionBank: dayData ? dayData.totalQuestionBank : 0,
        };
      });

      return sendResponse(res, 200, "Weekly data", {
        weeklyData: formattedWeeklyData,
      });
    } else if (filterType === "monthly") {
      // Get the start and end of the current year
      const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
      const endOfYear = new Date(
        currentDate.getFullYear(),
        11,
        31,
        23,
        59,
        59,
        999
      );

      query.createdAt = { $gte: startOfYear, $lte: endOfYear };
      console.log("query==>", query);
      // Aggregate data for each month of the year
      const monthlyData = await COL_ASSESSMENT_CONTENT.aggregate([
        { $match: query },
        {
          $group: {
            _id: { month: { $month: "$createdAt" } }, // 1 (January) to 12 (December)
            totalBluePrint: {
              $sum: {
                $add: [
                  { $cond: [{ $gt: ["$bluePrintCount.theory", 0] }, 1, 0] },
                  {
                    $cond: [
                      { $gt: ["$bluePrintCount.vivaPractical", 0] },
                      1,
                      0,
                    ],
                  },
                ],
              },
            },
            totalQuestionBank: {
              $sum: {
                $add: [
                  { $cond: [{ $gt: ["$nosBankCount.theory", 0] }, 1, 0] },
                  { $cond: [{ $gt: ["$nosBankCount.viva", 0] }, 1, 0] },
                  { $cond: [{ $gt: ["$nosBankCount.practical", 0] }, 1, 0] },
                ],
              },
            },
          },
        },
      ]);

      const formattedMonthlyData = Array.from({ length: 12 }, (_, i) => {
        const monthData = monthlyData.find((d) => d._id.month === i + 1);
        return {
          month: [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
          ][i],
          totalBluePrint: monthData ? monthData.totalBluePrint : 0,
          totalQuestionBank: monthData ? monthData.totalQuestionBank : 0,
        };
      });

      // return res.status(200).json({ monthlyData: formattedMonthlyData });
      return sendResponse(res, 200, "Weekly data", {
        monthlyData: formattedMonthlyData,
      });
    }

    return sendResponse(
      res,
      200,
      "Invalid filterType. Use 'weekly' or 'monthly'.",
      "Invalid filterType. Use 'weekly' or 'monthly'."
    );
  } catch (error) {
    return errorResponse(res, 500, "Something went wrong", error.message);
  }
};

exports.resultPercentageStats = async (req, res, next) => {
  try {
    const clientId = req.query.clientId;
    const filterBy = req.query.filterBy; // Expecting format "December 2024"
    const matchQuery = {};

    // Filter by clientId if provided
    if (clientId) {
      const client = await ClientModel.findOne({ _id: clientId });
      if (client) {
        matchQuery.clientId = clientId;
      }
    }

    // Filter by month and year if provided
    if (filterBy) {
      const [monthName, year] = filterBy.split(" ");
      const month = new Date(`${monthName} 1, ${year}`).getMonth(); // Convert month name to number

      const startDate = new Date(year, month, 1);
      const endDate = new Date(year, month + 1, 1); // First day of the next month

      matchQuery.createdAt = { $gte: startDate, $lt: endDate };
    }

    console.log("query==>", matchQuery);
    const batchData = await Batch.find(matchQuery);
    const totalBatch = await Batch.countDocuments(matchQuery);

    const batchIds = batchData.map((batch) => batch._id);
    const query = { batchId: { $in: batchIds } };
    const totalCandidates = await CandidateModel.countDocuments(query);

    // Total result generated or total assessment submitted
    const candidateResult = await CandidateReport.find(query);

    const passedCandidate = candidateResult.filter(
      (candidate) => candidate.passedStatus === "Pass"
    );
    const failedCandidate = candidateResult.filter(
      (candidate) => candidate.passedStatus === "Fail"
    );

    const candidatesNotAppear =
      totalCandidates - (passedCandidate.length + failedCandidate.length);

    return sendResponse(res, 200, "batch result count", {
      passedCandidate: passedCandidate.length,
      failedCandidate: failedCandidate.length,
      candidatesNotAppear: candidatesNotAppear,
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

//conten dashboard code

exports.questionAnalytics = asyncErrorHandler(async (req, res, next) => {
  let query;
  let clientId = req?.query?.clientId
    ? req?.query?.clientId.split(",")
    : req?.user?.assigndClients;
  clientId = req?.query?.clientId
    ? clientId.map((item) => mongoose.Types.ObjectId(item))
    : req?.user?.assigndClients;
  if (clientId) query = { clientId: { $in: clientId } };

  const questionBanks = await COL_QUESTIONBANK.find(query);
  if (questionBanks.length < 1) {
    return sendResponse(res, 200, "no question bank found", {
      questionCount: {
        theory: 0,
        viva: 0,
        practical: 0,
      },
    });
  }

  let theoryIds = [];
  let vivaIds = [];
  let practicalIds = [];

  questionBanks.forEach((item) => {
    if (item.section === "Theory") {
      theoryIds.push(item._id);
    } else if (item.section === "viva") {
      vivaIds.push(item._id);
    } else if (item.section === "practical") {
      practicalIds.push(item._id);
    }
  });

  const [theoryCount, vivaCount, practicalCount] = await Promise.all([
    COL_THEORY_QUESTION.countDocuments({
      question_bank_id: { $in: theoryIds },
    }),
    COL_VIVA_QUESTION.countDocuments({ question_bank_id: { $in: vivaIds } }),
    COL_PRACTICAL_QUESTION.countDocuments({
      question_bank_id: { $in: practicalIds },
    }),
  ]);

  const response = {
    questionCount: {
      theory: theoryCount,
      viva: vivaCount,
      practical: practicalCount,
    },
  };

  return sendResponse(res, 200, "got data", response);
});

exports.languageAnalytics = asyncErrorHandler(async (req, res, next) => {
  let query;
  let clientId = req?.query?.clientId
    ? req?.query?.clientId.split(",")
    : req?.user?.assigndClients;
  clientId = req?.query?.clientId
    ? clientId.map((item) => mongoose.Types.ObjectId(item))
    : req?.user?.assigndClients;
  if (clientId) query = { clientId: { $in: clientId } };

  const questionBanks = await COL_QUESTIONBANK.find(query);
  if (questionBanks.length < 1) {
    return sendResponse(res, 200, "no question bank found", {
      totalCount: 0,
      languages: [],
    });
  }

  let theoryIds = [];
  let vivaIds = [];
  let practicalIds = [];

  questionBanks.forEach((item) => {
    if (item.section === "Theory") {
      theoryIds.push(item._id);
    } else if (item.section === "viva") {
      vivaIds.push(item._id);
    } else if (item.section === "practical") {
      practicalIds.push(item._id);
    }
  });

  // Aggregation pipeline to count unique languages in each collection
  const aggregateLanguageCounts = async (collection, ids) => {
    const otherLanguage = collection.aggregate([
      {
        $match: { question_bank_id: { $in: ids } },
      },
      {
        $facet: {
          languageCounts: [
            { $unwind: "$lang" },
            { $group: { _id: "$lang.language", count: { $sum: 1 } } },
          ],
          totalEnglish: [{ $group: { _id: "English", count: { $sum: 1 } } }],
        },
      },
      {
        $project: {
          counts: {
            $concatArrays: ["$languageCounts", "$totalEnglish"],
          },
        },
      },
      {
        $unwind: "$counts",
      },
      {
        $replaceRoot: { newRoot: "$counts" },
      },
    ]);
    return otherLanguage;
  };

  // Run aggregations in parallel for all three collections
  const [theoryLanguages, vivaLanguages, practicalLanguages] =
    await Promise.all([
      aggregateLanguageCounts(COL_THEORY_QUESTION, theoryIds),
      aggregateLanguageCounts(COL_VIVA_QUESTION, vivaIds),
      aggregateLanguageCounts(COL_PRACTICAL_QUESTION, practicalIds),
    ]);

  // Combine the language counts from all three collections
  const allLanguages = [
    ...theoryLanguages,
    ...vivaLanguages,
    ...practicalLanguages,
  ];

  // Combine counts of the same language
  const languageCounts = allLanguages.reduce((acc, lang) => {
    if (!acc[lang._id]) {
      acc[lang._id] = 0;
    }
    acc[lang._id] += lang.count;
    return acc;
  }, {});

  // Calculate total counts and percentages
  const totalCount = Object.values(languageCounts).reduce(
    (sum, count) => sum + count,
    0
  );
  const languagePercentages = Object.keys(languageCounts).map((language) => ({
    language,
    count: languageCounts[language],
    percentage: ((languageCounts[language] / totalCount) * 100).toFixed(2), // Fixed to 2 decimal places
  }));

  // const response = {
  //     //totalCount,
  //     languages: languagePercentages
  // };

  return sendResponse(res, 200, "got data", languagePercentages);
});

exports.jobRoleOccurrence = asyncErrorHandler(async (req, res, next) => {
  let query;
  let clientId = req?.query?.clientId
    ? req?.query?.clientId.split(",")
    : req?.user?.assigndClients;
  clientId = req?.query?.clientId
    ? clientId.map((item) => mongoose.Types.ObjectId(item))
    : req?.user?.assigndClients;
  if (clientId) query = { clientId: { $in: clientId } };

  const { page, limit, skip, sortOrder } = await jobRolePaginate(req);

  const totalCounts = await COL_JOBROLE.countDocuments(query);
  const totalPages = Math.ceil(totalCounts / limit);

  // Fetch job roles with pagination
  const jobRoleDetails = await COL_JOBROLE.find(query)
    .select("_id jobRole qpCode")
    .sort(sortOrder)
    .skip(skip)
    .limit(limit);

  if (!jobRoleDetails || jobRoleDetails.length === 0)
    return errorResponse(
      res,
      400,
      responseMessage.job_role_not_found,
      responseMessage.errorMessage
    );

  // Get occurrences of jobRole in Batch collection
  const jobRoleIds = jobRoleDetails.map((item) => item._id); // Extract jobRole IDs
  const occurrences = await Batch.aggregate([
    { $match: { jobRole: { $in: jobRoleIds } } }, // Match only relevant jobRoles
    {
      $group: {
        _id: "$jobRole",
        count: { $sum: 1 }, // Count occurrences of each jobRole
      },
    },
  ]);

  // Convert occurrences array to an object for faster lookup
  const occurrenceMap = occurrences.reduce((acc, curr) => {
    acc[curr._id] = curr.count;
    return acc;
  }, {});

  // Add jobroleOccurence to each jobRoleDetails item
  const processedResult = jobRoleDetails.map((item) => ({
    ...item.toObject(),
    jobroleOccurence: occurrenceMap[item._id] || 0, // Default to 0 if no occurrences found
  }));

  return sendResponse(res, 200, responseMessage.job_role_found, {
    result: processedResult,
    page,
    totalCounts,
    totalPages,
  });
});

exports.teamMembers = asyncErrorHandler(async (req, res, next) => {
  // const { roleId = "65a77bd0d0b713c333e4406e"} = req.query
  // let query  = {userRole : mongoose.Types.ObjectId(roleId)}
  const query = {};

  const { page, limit, skip, sortOrder } = await teamMemberPaginate(req);

  const totalCounts = await COL_USER.countDocuments(query);
  const totalPages = Math.ceil(totalCounts / limit);
  let userDetails = await COL_USER.find(query)
    .select("firstName lastName email")
    .populate({
      path: "userRole",
      //match: { _id: mongoose.Types.ObjectId(roleId) },
      select: "_id userRoleName",
      populate: { path: "userId", select: "firstName lastName" },
    })
    .sort(sortOrder)
    .skip(skip)
    .limit(limit);

  return sendResponse(res, 200, "Users found...", {
    result: userDetails,
    page,
    totalCounts,
    totalPages,
  });
});

exports.clientWithJobRole = asyncErrorHandler(async (req, res, next) => {
  let clientId = req?.query?.clientId
    ? req?.query?.clientId.split(",")
    : req?.user?.assigndClients;
  clientId = clientId
    ? clientId.map((item) => mongoose.Types.ObjectId(item))
    : req?.user?.assigndClients;

  // Aggregation pipeline
  let result = await COL_CLIENT.aggregate([
    {
      $match: { _id: { $in: clientId } },
    },
    {
      $lookup: {
        from: "jobroles",
        localField: "_id",
        foreignField: "clientId",
        as: "jobRoleArray",
      },
    },
    {
      $project: {
        clientname: 1,
        email: 1,
        webpage: 1,
        clientcode: 1,
        isProfilePicUploaded: 1,
        jobRoleArray: 1,
      },
    },
  ]);

  result = await Promise.all(
    result.map(async (item) => {
      if (item.isProfilePicUploaded) {
        return { ...item, webpage: await getFileUrl(item.email) };
      } else {
        return { ...item, webpage: null };
      }
    })
  );

  return sendResponse(res, 200, "Data found...", {
    result,
  });
});

exports.getAllClientList = asyncErrorHandler(async (req, res, next) => {
  const clientId = req?.query?.clientId
    ? req?.query?.clientId
        .split(",")
        .map((item) => mongoose.Types.ObjectId(item))
    : req?.user?.assigndClients;

  const search = req.query.search || "";
  const { page, limit, skip, sortOrder } = Paginate(req);
  const matchQuery = { _id: { $in: clientId } };

  // Add search filters for clientname or clientcode
  if (search) {
    matchQuery.$or = [
      { clientname: { $regex: search, $options: "i" } },
      { clientcode: { $regex: search, $options: "i" } },
    ];
  }

  // Aggregation pipeline
  const result = await COL_CLIENT.aggregate([
    { $match: matchQuery },
    {
      $lookup: {
        from: "jobroles", // Collection name of QuestionJobrole model
        localField: "_id",
        foreignField: "clientId",
        as: "jobRoleArray",
      },
    },
    {
      $project: {
        clientname: 1,
        email: 1,
        webpage: 1,
        clientcode: 1,
        isProfilePicUploaded: 1,
        jobRoleArray: 1,
        spoke: 1,
        organisationType: 1,
        createdAt: 1,
      },
    },

    { $sort: sortOrder },
    { $skip: skip },
    { $limit: limit },
  ]);

  // Count total documents for pagination metadata
  const totalCounts = await COL_CLIENT.countDocuments(matchQuery);
  const totalPages = Math.ceil(totalCounts / limit);

  // Add webpage URL if profile picture is uploaded
  let processedResult = await Promise.all(
    result.map(async (item) => {
      if (item.isProfilePicUploaded) {
        return { ...item, webpage: await getFileUrl(item.email), sector: null };
      } else {
        return { ...item, webpage: null, sector: null };
      }
    })
  );

  return sendResponse(res, 200, "Data found...", {
    result: processedResult,
    total: totalCounts,
    page,
    limit,
    totalPages,
  });
});

module.exports.assessorAttendanceTimeSpent = async (req, res) => {
  try {
    let query = {};
    const { assesor_id, date } = req.query;

    if (assesor_id) {
     const assessorExists = await AssesorModel.findById(assesor_id);

    if (!assessorExists || assessorExists.isDeleted === true) {
    return sendResponse(
        res,
        200,
        'Assessor not found',
        {}
      );
    }
      
      query.assesor_id = assesor_id;

    }
    // Build the filter query
    // if (assesor_id) {
    //   query.assesor_id = assesor_id;
    // }

    if (date) {
      // Parse the date from the query and get the start and end of the day
      const startOfDay = moment(date, "DD-MM-YYYY").startOf("day").toDate();
      const endOfDay = moment(date, "DD-MM-YYYY").endOf("day").toDate();

      query.createdAt = { $gte: startOfDay, $lte: endOfDay };
    }
    const attendanceList = await AttendenceModel.find(query).select("");
    //.populate({path: "batch_id", select: "" })
    // .populate({
    //   path: "batch_id",
    //   populate: { path: "jobRole", select: "" }
    // })
    // .populate({path:"regularise_Id", select:""})

    if (!attendanceList || attendanceList.length === 0) {
      return sendResponse(
        res,
        200,
        responseMessage.assessor_attendnce_detil,
        {}
      );
    }

    // If there's only one item, return it directly, otherwise return the first item
    const details =
      attendanceList.length === 1 ? attendanceList[0] : attendanceList[0];

    return sendResponse(
      res,
      200,
      responseMessage.assessor_attendnce_list,
      details
    );

    //   return sendResponse(res, 200, responseMessage.assessor_attendnce_list, {
    //     attendanceList
    //   });
  } catch (err) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      err.message
    );
  }
};



module.exports.resultAnalyticsList = async (req, res) => {
  try {
    const currentDate = new Date();
    const { filterBy, clientId } = req.query; // Extract clientId from query
    const assignedClients = clientId
      ? clientId.split(",").map((id) => mongoose.Types.ObjectId(id))
      : req.user.assigndClients.map((id) => mongoose.Types.ObjectId(id)); // Use assigned clients if clientId is not provided

    // Initialize base query
    const baseQuery = {
      $and: [
        { clientId: { $in: assignedClients } }, // Match any of the assigned clients
      ],
    };

    // Initialize the response result object
    let result = {
      monthlyCount: [],
      weeklyCount: [],
    };

    // Monthly filter logic (Current Year: January to December)
    if (filterBy === "monthly") {
      const currentYear = moment().year(); // Get current year
      const months = [
        "January",
        "February",
        "March",
        "April",
        "May",
        "June",
        "July",
        "August",
        "September",
        "October",
        "November",
        "December",
      ];

      // Loop through all months of the current year
      for (let i = 0; i < months.length; i++) {
        const monthStart = moment()
          .year(currentYear)
          .month(i)
          .startOf("month")
          .toDate(); // First day of the month

        const monthEnd = moment()
          .year(currentYear)
          .month(i)
          .endOf("month")
          .toDate(); // Last day of the month

        // Monthly Query for online and offline batches
        const onlineQuery = {
          ...baseQuery,
          $and: [
            ...baseQuery?.$and,
            { batchMode: "online" },
            { createdAt: { $gte: monthStart, $lte: monthEnd } },
          ],
        };
        const offlineQuery = {
          ...baseQuery,
          $and: [
            ...baseQuery?.$and,
            { batchMode: "offline" },
            { createdAt: { $gte: monthStart, $lte: monthEnd } },
          ],
        };

        const [onlineBatchList, offlineBatchList] = await Promise.all([
          Batch.find(onlineQuery),
          Batch.find(offlineQuery),
        ]);

        let onlineResultCount = 0;
        let offlineResultCount = 0;

        // Process online batches for the month
        const uniqueOnlineBatchIds = new Set();
        await Promise.all(
          onlineBatchList.map(async (batch) => {
            const batchIdStr = batch._id.toString();
            if (uniqueOnlineBatchIds.has(batchIdStr)) return;
            uniqueOnlineBatchIds.add(batchIdStr);

            const candidateData = await candidate_Appeared_In_Batch(
              batch._id,
              batch.batchMode
            );
            if (
              candidateData?.totalCandidates > 0 &&
              candidateData?.candidateAttended > 0
            ) {
              onlineResultCount += 1;
            }
          })
        );

        // Process offline batches for the month
        const uniqueOfflineBatchIds = new Set();
        await Promise.all(
          offlineBatchList.map(async (batch) => {
            const batchIdStr = batch._id.toString();
            if (uniqueOfflineBatchIds.has(batchIdStr)) return;
            uniqueOfflineBatchIds.add(batchIdStr);

            const candidateData = await candidate_Appeared_In_Batch(
              batch._id,
              batch.batchMode
            );
            if (
              candidateData?.totalCandidates > 0 &&
              candidateData?.candidateAttended > 0
            ) {
              offlineResultCount += 1;
            }
          })
        );

        // Add month data to the result
        result.monthlyCount.push({
          month: months[i],
          onlineResultCount,
          offlineResultCount,
        });
      }
    }

    // Weekly filter logic (Current Week: Monday to Sunday)
    if (filterBy === "weekly") {
      // Get the start and end of the current week (Monday to Sunday)
      const startOfWeek = moment().startOf("week").toDate(); // Start of the week (Monday)
      const endOfWeek = moment().endOf("week").toDate(); // End of the week (Sunday)

      // Initialize an array to hold results for each day (Monday to Sunday)
      const weekDaysCount = [
        { day: "Monday", onlineResultCount: 0, offlineResultCount: 0 },
        { day: "Tuesday", onlineResultCount: 0, offlineResultCount: 0 },
        { day: "Wednesday", onlineResultCount: 0, offlineResultCount: 0 },
        { day: "Thursday", onlineResultCount: 0, offlineResultCount: 0 },
        { day: "Friday", onlineResultCount: 0, offlineResultCount: 0 },
        { day: "Saturday", onlineResultCount: 0, offlineResultCount: 0 },
        { day: "Sunday", onlineResultCount: 0, offlineResultCount: 0 },
      ];

      // Loop through each day of the current week (Monday to Sunday)
      for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
        const dayStart = moment(startOfWeek)
          .add(dayIndex, "days")
          .startOf("day")
          .toDate();
        const dayEnd = moment(startOfWeek)
          .add(dayIndex, "days")
          .endOf("day")
          .toDate();

        // Daily Queries for online and offline batches
        const onlineQuery = {
          ...baseQuery,
          $and: [
            ...baseQuery.$and,
            { batchMode: "online" },
            { createdAt: { $gte: dayStart, $lte: dayEnd } },
          ],
        };
        const offlineQuery = {
          ...baseQuery,
          $and: [
            ...baseQuery.$and,
            { batchMode: "offline" },
            { createdAt: { $gte: dayStart, $lte: dayEnd } },
          ],
        };

        const [onlineBatchList, offlineBatchList] = await Promise.all([
          Batch.find(onlineQuery),
          Batch.find(offlineQuery),
        ]);

        let onlineResultCount = 0;
        let offlineResultCount = 0;

        // Process online batches for the day
        const uniqueOnlineBatchIds = new Set();
        await Promise.all(
          onlineBatchList.map(async (batch) => {
            const batchIdStr = batch._id.toString();
            if (uniqueOnlineBatchIds.has(batchIdStr)) return;
            uniqueOnlineBatchIds.add(batchIdStr);

            const candidateData = await candidate_Appeared_In_Batch(
              batch._id,
              batch.batchMode
            );
            if (
              candidateData?.totalCandidates > 0 &&
              candidateData?.candidateAttended > 0
            ) {
              onlineResultCount += 1;
            }
          })
        );

        // Process offline batches for the day
        const uniqueOfflineBatchIds = new Set();
        await Promise.all(
          offlineBatchList.map(async (batch) => {
            const batchIdStr = batch._id.toString();
            if (uniqueOfflineBatchIds.has(batchIdStr)) return;
            uniqueOfflineBatchIds.add(batchIdStr);

            const candidateData = await candidate_Appeared_In_Batch(
              batch._id,
              batch.batchMode
            );
            if (
              candidateData?.totalCandidates > 0 &&
              candidateData?.candidateAttended > 0
            ) {
              offlineResultCount += 1;
            }
          })
        );

        // Update the count for the respective day
        weekDaysCount[dayIndex].onlineResultCount = onlineResultCount;
        weekDaysCount[dayIndex].offlineResultCount = offlineResultCount;
      }

      // Set the final weekly count result
      result.weeklyCount = weekDaysCount; // Directly use the array of days (Monday to Sunday)
    }

    // Send the response with either monthly or weekly count based on filter
    if (filterBy === "monthly") {
      return sendResponse(res, 200, responseMessage.batch_found, {
        monthlyCount: result.monthlyCount,
      });
    } else if (filterBy === "weekly") {
      return sendResponse(res, 200, responseMessage.batch_found, {
        weeklyCount: result.weeklyCount,
      });
    }
  } catch (error) {
    console.error("Error:", error.message);
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//client overview
exports.clientOverView = async (req, res, next) => {
  try {
    // Define start of week and month
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + 1);
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Predefine Weeks and Months
    const weekDays = [
      { name: "Monday", dayNo: 2 },
      { name: "Tuesday", dayNo: 3 },
      { name: "Wednesday", dayNo: 4 },
      { name: "Thursday", dayNo: 5 },
      { name: "Friday", dayNo: 6 },
      { name: "Saturday", dayNo: 7 },
      { name: "Sunday", dayNo: 1 },
    ];

    const months = [
      { name: "January", monthNo: 1 },
      { name: "February", monthNo: 2 },
      { name: "March", monthNo: 3 },
      { name: "April", monthNo: 4 },
      { name: "May", monthNo: 5 },
      { name: "June", monthNo: 6 },
      { name: "July", monthNo: 7 },
      { name: "August", monthNo: 8 },
      { name: "September", monthNo: 9 },
      { name: "October", monthNo: 10 },
      { name: "November", monthNo: 11 },
      { name: "December", monthNo: 12 },
    ];

    // List all organisationTypes
    const organisationTypes = await ClientModel.distinct("organisationType");

    // Weekly Data Aggregation
    const weeklyData = await ClientModel.aggregate([
      { $match: { createdAt: { $gte: startOfWeek, $lte: endOfWeek } } },
      {
        $group: {
          _id: {
            organisationType: "$organisationType",
            dayOfWeek: { $dayOfWeek: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Monthly Data Aggregation
    const monthlyData = await ClientModel.aggregate([
      { $match: { createdAt: { $gte: startOfMonth, $lte: endOfMonth } } },
      {
        $group: {
          _id: {
            organisationType: "$organisationType",
            month: { $month: "$createdAt" },
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Format Weekly Data
    const weeklyCounts = organisationTypes.map((type) => {
      const days = weekDays.map((day) => {
        const match = weeklyData.find(
          (item) =>
            item._id.organisationType === type &&
            item._id.dayOfWeek === day.dayNo
        );
        return { name: day.name, count: match ? match.count : 0 };
      });
      return { organisationType: type, days };
    });

    // Format Monthly Data
    const monthlyCounts = organisationTypes.map((type) => {
      const monthDetails = months.map((month) => {
        const match = monthlyData.find(
          (item) =>
            item._id.organisationType === type &&
            item._id.month === month.monthNo
        );
        return { name: month.name, count: match ? match.count : 0 };
      });
      return { organisationType: type, months: monthDetails };
    });

    // Response
    return sendResponse(res, 200, responseMessage.success, {
      weeklyCounts,
      monthlyCounts,
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

exports.resultUpload = async (req, res) => {
  try {
    let query;
    let clientId = req?.query?.clientId
      ? req?.query?.clientId.split(",")
      : req?.user?.assigndClients;
    clientId = req?.query?.clientId
      ? clientId.map((item) => mongoose.Types.ObjectId(item))
      : req?.user?.assigndClients;
    if (clientId) {
      query = { clientId: { $in: clientId } };
    }

    const allBatches = await Batch.find(query);

    const resultUploadCount = await Promise.all(
      allBatches.map(async (batch) => {
        let batchSections = {};
        batchSections["batchId"] = batch._id;
        batchSections["batchMode"] = batch.batchMode;
        batch.questionPaper.sectionTable.forEach((item) => {
          batchSections[item.sectionName] = item.isSelected;
        });

        return await result_uploaded_or_not(batchSections);
      })
    );

    const totalResultUploadCount = resultUploadCount.reduce(
      (acc, count) => acc + count,
      0
    );

    return sendResponse(res, 200, "result upload data available", {
      result: totalResultUploadCount || 0,
    });
  } catch (error) {
    console.log("error-->", error);
    return errorResponse(
      res,
      400,
      responseMessage.something_wrong,
      error.message
    );
  }
};

const result_uploaded_or_not = async (batchSections) => {
  try {
    let resultCount;

    const query = { batch_mongo_id: batchSections.batchId };

    if (batchSections?.theory || batchSections?.Theory) {
      query["obtainedTotalTheoryMarks"] = { $gt: 0 };
    }

    if (batchSections?.viva) {
      query["obtainedTotalVivaMarks"] = { $gt: 0 };
    }

    if (batchSections?.practical) {
      query["obtainedTotalPracticalMarks"] = { $gt: 0 };
    }

    if (batchSections.batchMode === "online") {
      resultCount = await OnlineResultModel.countDocuments(query);
    } else {
      resultCount = await OfflineResultModel.countDocuments(query);
    }

    if (batchSections.batchId.toString() === "673aef211d9f795a1f75bc28") {
      console.log("one batch data-->", {
        batchId: batchSections.batchId,
        resultCount,
        mode: batchSections.batchMode,
      });
    }

    return resultCount;
  } catch (error) {
    console.log("error in result_uploaded_or_not : ", error.message);
    return "NA";
  }
};

exports.clientWiseBatch = async (req, res) => {
  try {
    const { page, limit, skip } = Paginate(req);

    const pipeline = [
      {
        $lookup: {
          from: "clients",
          localField: "clientId",
          foreignField: "_id",
          as: "clientId",
        },
      },
      {
        $unwind: {
          path: "$clientId",
          preserveNullAndEmptyArrays: true,
        },
      },

      {
        $group: {
          _id: "$clientId._id",
          clientname: { $first: "$clientId.clientname" },
          batchCount: { $sum: 1 },
          batches: { $addToSet: "$_id" },
          onlineBatch: {
            $sum: {
              $cond: {
                if: {
                  $eq: ["$batchMode", "online"],
                },
                then: 1,
                else: 0,
              },
            },
          },
          offlineBatch: {
            $sum: {
              $cond: {
                if: {
                  $eq: ["$batchMode", "offline"],
                },
                then: 1,
                else: 0,
              },
            },
          },
        },
      },

      {
        $unwind: {
          path: "$batches",
        },
      },

      {
        $lookup: {
          from: "onlineresults",
          localField: "batches",
          foreignField: "batch_mongo_id",
          as: "candidatesOnline",
        },
      },

      {
        $lookup: {
          from: "offlineresults",
          localField: "batches",
          foreignField: "batch_mongo_id",
          as: "candidatesOffline",
        },
      },

      {
        $addFields: {
          candidateCountOnline: { $size: "$candidatesOnline" },
          candidateCountOffline: { $size: "$candidatesOffline" },
        },
      },

      {
        $group: {
          _id: "$_id",
          clientname: { $first: "$clientname" },
          batchCount: { $first: "$batchCount" },
          onlineBatch: { $first: "$onlineBatch" },
          offlineBatch: { $first: "$offlineBatch" },
          batches: {
            $push: {
              batch: "$batches",
              candidateCountOnline: "$candidateCountOnline",
              candidateCountOffline: "$candidateCountOffline",
            },
          },
        },
      },

      {
        $addFields: {
          assessedCandidates: {
            $reduce: {
              input: "$batches",
              initialValue: 0,
              in: {
                $add: [
                  "$$value",
                  { $ifNull: ["$$this.candidateCountOnline", 0] },
                  { $ifNull: ["$$this.candidateCountOffline", 0] },
                ],
              },
            },
          },
        },
      },

      {
        $project: {
          _id: 1,
          clientname: 1,
          batchCount: 1,
          onlineBatch: 1,
          offlineBatch: 1,
          assessedCandidates: 1,
        },
      },

      {
        $facet: {
          total: [{ $count: "count" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },

      {
        $project: {
          total: { $arrayElemAt: ["$total.count", 0] },
          data: 1,
        },
      },
    ];

    const allBatches = await Batch.aggregate(pipeline);
    const { total, data } = allBatches[0];

    return sendResponse(res, 200, "result upload data available", {
      result: data,
      page: page,
      limit: limit,
      totalCounts: total ?? 0,
      totalPages: total ? Math.ceil(total / limit) : 0,
    });
  } catch (error) {
    console.log("error-->", error);
    return errorResponse(
      res,
      400,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.nosResult = async (req, res) => {
  try {
    const { page, limit, skip } = Paginate(req);

    const pipeline = [
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
          from: "examcenters",
          localField: "examCenterId",
          foreignField: "_id",
          as: "examCenterId",
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
          from: "candidates",
          localField: "_id",
          foreignField: "batchId",
          as: "enrollApplicants",
        },
      },

      { $unwind: { path: "$jobRole", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$examCenterId", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$accessorId", preserveNullAndEmptyArrays: true } },
      // { $unwind: { path: "$enrollApplicants", preserveNullAndEmptyArrays: true } },

      {
        $group: {
          _id: "$_id",
          batchId: { $first: "$batchId" },
          jobRole: { $first: "$jobRole.jobRole" },
          trainingCenterName: { $first: "$examCenterId.examCenterName" },
          assessmentDate: { $first: "$startDate" },
          batchMode: { $first: "$batchMode" },
          batchSize: { $first: "$batchSize" },
          assignedAssessor: { $first: "$accessorId.fullName" },
          enrollApplicants: { $first: "$enrollApplicants" },
        },
      },

      {
        $addFields: {
          enrollApplicantCount: { $size: "$enrollApplicants" },
        },
      },
      {
        $project: {
          _id: 1,
          batchId: 1,
          jobRole: 1,
          trainingCenterName: 1,
          assessmentDate: 1,
          batchMode: 1,
          batchSize: 1,
          assignedAssessor: 1,
          // enrollApplicants: 1,
          enrollApplicantCount: 1,
        },
      },

      {
        $facet: {
          total: [{ $count: "count" }],
          data: [{ $skip: skip }, { $limit: limit }],
        },
      },

      {
        $project: {
          total: { $arrayElemAt: ["$total.count", 0] },
          data: 1,
        },
      },
    ];

    const allBatches = await Batch.aggregate(pipeline);
    const { total, data } = allBatches[0];

    return sendResponse(res, 200, "result upload data available", {
      result: data,
      page: page,
      limit: limit,
      totalCounts: total ?? 0,
      totalPages: total ? Math.ceil(total / limit) : 0,
    });
  } catch (error) {
    console.log("error-->", error);
    return errorResponse(
      res,
      400,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.clientBasedAssessors = async (req, res) => {
  try {
    const pipeline = [
       {
        $match: {
          isDeleted: { $ne: true }   //exclude soft-deleted assessors only
        }
      },
      {
        $unwind: {
          path: "$jobRole",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "jobroles",
          localField: "jobRole.jobroleName",
          foreignField: "jobRole",
          as: "jobRoleDetails",
        },
      },
      {
        $unwind: {
          path: "$jobRoleDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: "clients",
          localField: "jobRoleDetails.clientId",
          foreignField: "_id",
          as: "clientDetails",
        },
      },
      {
        $unwind: {
          path: "$clientDetails",
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $match: {
          "clientDetails.clientname": { $ne: null },
        },
      },
      {
        $group: {
          _id: "$clientDetails.clientname",
          activeAssessorCount: {
            $sum: {
              $cond: [{ $eq: ["$client_status", "active"] }, 1, 0],
            },
          },
          totalAssessorCount: { $sum: 1 },
        },
      },
      {
        $project: {
          clientname: "$_id",
          activeAssessorCount: 1,
          totalAssessorCount: 1,
          _id: 0,
        },
      },
      {
        $limit: 5,
      },
    ];

    const allAssessor = await AssesorModel.aggregate(pipeline);

    return sendResponse(res, 200, "client based assessor data available", {
      result: allAssessor,
    });
  } catch (error) {
    console.log("error-->", error);
    return errorResponse(
      res,
      400,
      responseMessage.something_wrong,
      error.message
    );
  }
};

module.exports.attendenceRequestCount = async (req, res) => {
  try {
    const query = {};
    const assessorData = await Regularize.find({
      ...query,
      isApprove: "pending",
    })
      .populate({ path: "assesor_id", select: "fullName email" })
      .populate({ path: "batch_id", select: "batchId" });

    const attendenceRequestList = assessorData?.filter(
      (item) => item.assesor_id !== null
    );

    // const totalAttendanceRequestCounts = await Regularize.countDocuments(query);
    const totalAttendanceRequestCounts = attendenceRequestList.length;

    return sendResponse(
      res,
      200,
      responseMessage.assessor_attendance_regularize_list,
      {
        totalAttendanceRequestCounts,
      }
    );
  } catch (err) {
    console.log("errmessage==>", err.message);
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      err.message
    );
  }
};

module.exports.batchActivity = async (req, res) => {
  try {
    // Aggregation Pipeline
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
          pipeline: [{ $project: { fullName: 1, isAcceptAssesor: 1 } }],
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
      { $unwind: { path: "$schemeId", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$clientId", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$jobRole", preserveNullAndEmptyArrays: true } },
      { $unwind: { path: "$subSchemeId", preserveNullAndEmptyArrays: true } },

      // Add a field for month and year
      {
        $addFields: {
          batchMonth: { $month: "$createdAt" },
          batchYear: { $year: "$createdAt" },
        },
      },

      // Group by month and year
      {
        $group: {
          _id: { month: "$batchMonth", year: "$batchYear" },
          uniqueAssessors: { $addToSet: "$accessorId" },
          qualityAssurance: {
            $sum: {
              $size: {
                $filter: {
                  input: "$accessorId",
                  as: "assessor",
                  cond: { $eq: ["$$assessor.isAcceptAssesor", true] },
                },
              },
            },
          },
        },
      },
      {
        $project: {
          month: "$_id.month",
          year: "$_id.year",
          assessorCount: { $size: "$uniqueAssessors" },
          qualityAssurance: 1,
          _id: 0,
        },
      },

      // Sort by year and month
      {
        $sort: { year: 1, month: 1 },
      },
    ];

    const results = await Batch.aggregate(pipeline);

    // // If no results, return an error
    // if (!results || results.length === 0) {
    //     return errorResponse(
    //         res,
    //         400,
    //         "Batch not found",
    //         "No batch details found with the given filters"
    //     );
    // }

    // Mapping of month numbers to names
    const monthNames = [
      "January",
      "February",
      "March",
      "April",
      "May",
      "June",
      "July",
      "August",
      "September",
      "October",
      "November",
      "December",
    ];

    // Format the results for a full year (Jan to Dec)
    const monthlyCounts = Array.from({ length: 12 }, (_, i) => ({
      month: monthNames[i],
      Assessors: results?.find((r) => r.month === i + 1)?.assessorCount ?? 0,
      qualityAssurance:
        results?.find((r) => r.month === i + 1)?.qualityAssurance ?? 0,
    }));

    return sendResponse(res, 200, "Batch activity found", {
      monthlyCounts,
    });
  } catch (error) {
    return errorResponse(res, 500, "Internal Server Error", error.message);
  }
};

// module.exports.totalAssignedAssessorCount = async (req, res) => {
//   try {
//     const totalAssignedAssessorCount = await Batch.countDocuments({
//       accessorId: { $ne: null }, // Match documents where accessorId is not null
//     });

//     const operationStats = {
//       totalAssignedAssessorCount: totalAssignedAssessorCount,
//     };
//     return sendResponse(res, 200, "got data", operationStats);
//   } catch (error) {
//     console.log("error", error);
//     return errorResponse(res, 500, responseMessage.something_wrong, error);
//   }
// };

module.exports.totalAssignedAssessorCount = async (req, res) => {
  try {
    const result = await Batch.aggregate([
      {
        $match: {
          accessorId: { $ne: null },
        },
      },
      {
        $lookup: {
          from: "assessors",              
          localField: "accessorId",
          foreignField: "_id",
          as: "assessorData",
        },
      },
      {
        $unwind: {
          path: "$assessorData",
          preserveNullAndEmptyArrays: false, // must have assessor
        },
      },
      {
        $match: {
          "assessorData.isDeleted": { $ne: true },   //Only active assessors
        },
      },
      {
        $count: "totalAssignedAssessorCount",
      },
    ]);

    const totalAssignedAssessorCount =
      result.length > 0 ? result[0].totalAssignedAssessorCount : 0;

    return sendResponse(res, 200, "got data", {
      totalAssignedAssessorCount,
    });
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, 500, responseMessage.something_wrong, error);
  }
};


module.exports.upComingBatchCount = async (req, res) => {
  try {
    let query = {};
    let clientId = req?.query?.clientId
      ? req?.query?.clientId.split(",")
      : req?.user?.assigndClients;

    clientId = req?.query?.clientId
      ? clientId.map((item) => mongoose.Types.ObjectId(item))
      : req?.user?.assigndClients;

    if (clientId) {
      query.clientId = { $in: clientId };
    }

    // Get current date and time
    const currentDateTime = moment();

    // Fetch batch list
    const batchList = await Batch.find(query);

    // Function to check if a batch is upcoming
    const isUpcoming = ({ startDate, startTime }) => {
      const startDateTime = moment(
        `${startDate} ${startTime}`,
        "DD/MM/YYYY hh:mmA"
      );
      return startDateTime > currentDateTime.toDate();
    };

    const upcomingBatchCount = batchList.filter((batch) =>
      isUpcoming(batch)
    ).length;

    return sendResponse(res, 200, responseMessage.op_dashboard, {
      upcomingBatch: upcomingBatchCount,
    });
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, 500, responseMessage.something_wrong, error);
  }
};


exports.statewiseExamCentreAndBatchStats = async (req, res) => {
  try {
    let clientIds = [];

    if (req.query?.clientId) {
      clientIds = [new mongoose.Types.ObjectId(req.query.clientId)];
    } else if (req?.user?.email !== "support@radiantinfonet.com") {
      clientIds = (req?.user?.assigndClients || []).map((c) =>
        new mongoose.Types.ObjectId(c._id || c)
      );
    }
    const pipeline = [
      {
        $lookup: {
          from: "batches",
          localField: "_id",
          foreignField: "examCenterId",
          as: "batches",
        },
      },
    ];

    // Filter batches by clientIds if available
    if (clientIds.length > 0) {
      pipeline.push({
        $addFields: {
          batches: {
            $filter: {
              input: "$batches",
              as: "batch",
              cond: { $in: ["$$batch.clientId", clientIds] },
            },
          },
        },
      });
    }

    pipeline.push(
      {
        $addFields: {
          hasBatches: { $gt: [{ $size: "$batches" }, 0] },
          batchCount: { $size: "$batches" },
        },
      },
      {
        $group: {
          _id: "$state",
          uniqueExamCenters: {
            $addToSet: {
              $cond: ["$hasBatches", "$_id", "$$REMOVE"],
            },
          },
          batchCount: { $sum: "$batchCount" },
        },
      },
      {
        $project: {
          state: {
            $replaceAll: {
              input: "$_id",
              find: " ",
              replacement: "_",
            },
          },
          _id: 0,
          examCenterCount: { $size: "$uniqueExamCenters" },
          batchCount: 1,
        },
      },
      { $sort: { state: 1 } }
    );

    const stateStats = await ExamCenter.aggregate(pipeline);

    return sendResponse(
      res,
      200,
      "Statewise exam centre and batch statistics fetched successfully.",
      { statewiseStats: stateStats }
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};



exports.statewiseMasterAssessorStats = async (req, res) => {
  try {
    const { clientId } = req.query;

    //unified clientIds logic
    let clientIds = [];
    if (clientId) {
      clientIds = [new mongoose.Types.ObjectId(clientId)];
    } else if (req?.user?.email !== "support@radiantinfonet.com") {
      clientIds = (req?.user?.assigndClients || []).map((c) =>
        new mongoose.Types.ObjectId(c._id || c)
      );
    }

    const pipeline = [
      {
        $match: {
          assessorType: "Master Assessor",
          isDeleted: { $ne: true }
        },
      },
    ];

    //apply client filter if clientIds exist
    if (clientIds.length > 0) {
      pipeline.push(
        {
          $lookup: {
            from: "jobroles",
            localField: "jobRole.jobroleName",
            foreignField: "jobRole",
            as: "jobRoleData",
          },
        },
        { $unwind: "$jobRoleData" },
        {
          $match: {
            "jobRoleData.clientId": { $in: clientIds },
          },
        }
      );
    }

    pipeline.push(
      {
        $group: {
          _id: "$state",
          masterAssessorCount: { $sum: 1 },
        },
      },
      {
        $project: {
          _id: 0,
          state: {
            $replaceAll: { input: "$_id", find: " ", replacement: "_" },
          },
          masterAssessorCount: 1,
        },
      },
      { $sort: { state: 1 } },
      {
        $facet: {
          statewiseMasterAssessors: [
            { $match: {} }, // keep response structure same
          ],
        },
      }
    );

    const result = await COL_ASSESOR.aggregate(pipeline);

    return sendResponse(
      res,
      200,
      "State-wise master assessor statistics fetched successfully.",
      result[0]
    );
  } catch (error) {
    console.error("Aggregation error:", error);
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};


module.exports.masterAssessorCount = async (req, res) => {
  try {
    const result = await COL_ASSESOR.countDocuments({
      assessorType: "Master Assessor",
      isDeleted: { $ne: true }
    });

    const operationStats = {
      masterAssessor: result,
    };
    return sendResponse(res, 200, "Data found", operationStats);
  } catch (err) {
    return errorResponse(res, 500, responseMessage.errorMessage);
  }
};
