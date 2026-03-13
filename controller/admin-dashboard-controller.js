const responseMessage = require("../utils/responseMessage");
const mongoose=require("mongoose");
const Batch = require("../models/batch-model");
const jobRole = require("../models/jobRole-model");
const AssesorModel = require("../models/AssesorModel");
const Client = require("../models/client-model");
const { getFilter, batchFilter, batchRequestFilter, monthResponse} = require("../utils/custom-validators");
const { sendResponse, errorResponse } = require("../utils/response");
const moment = require("moment");
const { Paginate } = require("../utils/paginate");
const { uploadFile , getFileUrl, getclientFileUrl,getClientFileUrl} = require('../utils/s3bucket');
const { candidate_Appeared_In_Batch } = require("../utils/dbQuery");
const ObjectId = mongoose.Types.ObjectId;


module.exports.assessedBatchAdminList = async (req, res) => {
    try {
      const { clientId } = req.query;
  
      // Get current date and time
      const currentDateTime = moment();
  
      // Build the match criteria for batchList
      let query = {};
      if (clientId) {
        query.clientId = clientId;
      }
  
      // Find batches matching the criteria
      const batchList = await Batch.find(query).populate("clientId");
  
      const checkTime = ({ startDate, endDate, startTime, endTime }, batchType) => {
      
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
      let currentBatch = batchList.filter((item) => checkTime(item, 'complete'))
        .filter(item=>item.clientId?.clientType==="ncevt").filter(item=>req?.user?.assigndClients.includes(item.clientId?._id))
      const totalCounts = currentBatch.length;
  
      // Count batches that started in each month
      currentBatch.forEach((batch) => {
        let endMonth = moment(batch.endDate, "DD/MM/YYYY").month() + 1; // Adding 1 because moment.js months are zero-indexed
        let month = monthResponse.find((value) => value.monthNo === endMonth);
        if (month) {
          month.value++;
        }
      });
  
      const adminStats = {
        assessedBatch: totalCounts,
        monthResponse: monthResponse || []
      };
  
      return sendResponse(res, 200, "got data", {
        adminStats
      });
    } catch (err) {
      return errorResponse(res, 500, responseMessage.something_wrong, err.message);
    }
  };
  
module.exports.liveBatchAdminList = async (req, res) => {
    try {
      const {clientId } = req.query;

      // Get current date and time
      const currentDateTime = moment();

      
      
      let batchMatch={};
      if (clientId) {
        batchMatch.clientId = clientId;
      }
      
      if(req.user?.email === "ncvet.testaonline@gmail.com" ){
        batchMatch["status"] = true
      }
     
      const batchList = await Batch.find(batchMatch).populate("clientId");
      
      const checkTime = ({ startDate, endDate, startTime, endTime }, batchType) => {
        
        let startDateTime = moment(`${startDate} ${startTime}`, "DD/MM/YYYY hh:mmA");
        let endDateTime = moment(`${endDate} ${endTime}`, "DD/MM/YYYY hh:mmA");
        
        switch (batchType) {
          case "ongoing":
            return startDateTime <= currentDateTime.toDate() &&
              endDateTime >= currentDateTime.toDate();
          case "all":
            return true;
          default:
            break;
        }
      };
  
      // Filter batches based on the "ongoing" condition
      let currentBatch = batchList.filter((item) => checkTime(item, "ongoing"))
      .filter(item=>item.clientId?.clientType==="ncevt").filter(item=>req?.user?.assigndClients.includes(item.clientId?._id));
      const totalCounts = currentBatch.length;
      // Update monthResponse based on batch start dates
      currentBatch.forEach(batch => {
        let startMonth = moment(batch.startDate, "DD/MM/YYYY").month() + 1; // Adding 1 because moment.js months are zero-indexed
        let month = monthResponse.find(value => value.monthNo === startMonth);
        if (month) {
          month.value++;
        }
      });
  
      const adminStats = {
        liveBatch: totalCounts,
        monthResponse: monthResponse || []
      };
  
      return sendResponse(res, 200, "got data", {
        adminStats
      });
    } catch (err) {
      return errorResponse(res, 500, responseMessage.something_wrong, err.message);
    }
  };

module.exports.jobroleAdminDashboard = async (req, res) => {
    try {
      const { clientId } = req.query;
  
      let matchQuery = {};
      if (clientId) {
        matchQuery.clientId = mongoose.Types.ObjectId(clientId); // Assuming clientId is stored as ObjectId in your schema
      }

      const jobRoleList = await jobRole.find(matchQuery).populate('clientId')

      const ncevtJobRoleList = jobRoleList.filter(item=> item.clientId?.clientType === "ncevt").filter(item=>req?.user?.assigndClients.includes(item.clientId?._id))

  
      const monthlyDetails = await jobRole.aggregate([
        { $match: matchQuery },
        { $project: { months: { $month: "$createdAt" }, batchName: 1 } },
        { $group: { _id: "$months", value: { $sum: 1 } } },
        { $project: { monthNo: "$_id", value: 1, _id: 0 } },
        {
          $addFields: {
            monthName: {
              $let: {
                vars: {
                  monthsInString: [
                    "",
                    "January", "February", "March", "April", "May", "June",
                    "July", "August", "September", "October", "November", "December", ""
                  ]
                },
                in: {
                  $arrayElemAt: ["$$monthsInString", "$monthNo"]
                }
              }
            }
          }
        }
      ]);
  
      const monthResponse = [
        { name: "January", monthNo: 1, value: 0 },
        { name: "February", monthNo: 2, value: 0 },
        { name: "March", monthNo: 3, value: 0 },
        { name: "April", monthNo: 4, value: 0 },
        { name: "May", monthNo: 5, value: 0 },
        { name: "June", monthNo: 6, value: 0 },
        { name: "July", monthNo: 7, value: 0 },
        { name: "August", monthNo: 8, value: 0 },
        { name: "September", monthNo: 9, value: 0 },
        { name: "October", monthNo: 10, value: 0 },
        { name: "November", monthNo: 11, value: 0 },
        { name: "December", monthNo: 12, value: 0 }
      ];
  
      monthResponse.forEach((value) => {
        monthlyDetails.forEach(data => {
          if (data.monthNo === value.monthNo) {
            value.value = data.value;
          }
        });
      });
  
      const operationStats = {
        jobRoleCount: ncevtJobRoleList.length || 0,
        monthResponse: monthResponse || []
      };
  
      return sendResponse(
        res,
        200,
        responseMessage.content_dashboard,
        operationStats
      );
    } catch (error) {
      console.log("error", error);
      return errorResponse(res, 500, responseMessage.something_wrong, error);
    }
  };

module.exports.onBoardAssessorAdminDashboard = async (req, res) => {
    try {

      const { clientId } = req.query
      // let jobRoleMatchStage = {};
      // if (clientId) {
      //   jobRoleMatchStage["jobRoleDetails.clientId"] = mongoose.Types.ObjectId(clientId);
      // }

      const assessorList = await AssesorModel.find();

      const jobRoleList = assessorList.flatMap(assessor=>assessor.jobRole.map(item=> {
          let obj = { 
            assessorId: assessor.assessorId,
            assessor_mongoId : assessor._id, 
            assessorName: assessor.fullName,
            jobRole: item.jobroleName
          }
          return obj
      }))

      const uniqueAssessors = []
      const clientList = await Promise.all(jobRoleList.map(async (item)=> {
        let clientRaw = await jobRole.findOne({ jobRole: item.jobRole }).populate('clientId')
        if(clientRaw?.clientId?.clientType==="ncevt" && req?.user?.assigndClients.includes(clientRaw.clientId._id)){
           obj = { 
            ...item,
            clientId: clientRaw.clientId._id,
            clientName: clientRaw.clientId.clientname
          }

          return obj
       
        }

        return null
      })) 


      const uniqueAssessorClientSet = new Set();

      const filteredClientList = clientList
        .filter(item => item != null)
        .filter(item => clientId ? item.clientId.toString() === clientId.toString() : item)
        .filter(item => {
          const uniqueKey = `${item.assessor_mongoId.toString()}_${item.clientId.toString()}`;
          if (uniqueAssessorClientSet.has(uniqueKey)) {
            return false;
          } else {
            uniqueAssessorClientSet.add(uniqueKey);
            return true;
          }
        });

      // const totalAssessorCounts = await AssesorModel.aggregate([
      //   {
      //     $lookup: {
      //       from: "jobroles",
      //       localField: "jobRole.jobroleName",
      //       foreignField: "jobRole",
      //       as: "jobRoleDetails",
      //     },
      //   },
      //   {
      //     $unwind: {
      //       path:  "$jobRoleDetails",
      //       preserveNullAndEmptyArrays: false
      //     }
      //   },
      //   {
      //     $match: jobRoleMatchStage,
      //   },
      //   {
      //     $lookup: {
      //       from: "clients",
      //       localField: "jobRoleDetails.clientId",
      //       foreignField: "_id",
      //       as: "clientDetails",
      //     },
      //   },
      //   {
      //     $unwind: {
      //       path:  "$clientDetails",
      //       preserveNullAndEmptyArrays: false
      //     }
      //   },
      //   {
      //     $match: {
      //       "clientDetails.clientType": "ncevt",
      //       "clientDetails._id": {$in:  req?.user?.assigndClients}
      //     },
      //   },
      //   {
      //     $count: "total",
      //   },
      // ]);
  

      const monthlyDetails = await AssesorModel.aggregate([
        { $project: { months: { $month: "$createdAt" }, batchName: 1 } },
        { $group: { _id: "$months", value: { $sum: 1 } } },
        { $project: { monthNo: "$_id", value: 1, _id: 0 } },
        {
          $addFields: {
            monthName: {
              $let: {
                vars: {
                  monthsInString: [
                    "",
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
                    "",
                  ],
                },
                in: {
                  $arrayElemAt: ["$$monthsInString", "$monthNo"],
                },
              },
            },
          },
        },
      ]);
      monthResponse.forEach((value) => {
          
        monthlyDetails.map(data => {
            
            if (data.monthNo === value.monthNo) {
                value.value = data.value
  
            }
        })
    })
     
      const operationStats = {
        totalAssesorOnBoardCount:filteredClientList.length,
        //totalAssesorOnBoardCount: totalAssessorCounts[0] ? totalAssessorCounts[0].total : 0,
        monthResponse:monthResponse || [],
      };
      return sendResponse(
        res,
        200,
        responseMessage.hr_dashboard,
        operationStats
      );
    } catch (error) {
      console.log("error", error);
      return errorResponse(res, 500, responseMessage.something_wrong, error);
    }
  };  

module.exports.clientJobroleDashboard = async (req, res) => {
    try {
      const {clientId} = req.query;
      const query = { _id: req?.user?.assigndClients}
      if(clientId){
        query._id = clientId
      }
  
      const totalCounts = await Client.countDocuments({...query,clientType:'ncevt'});
      let clientDetails = await Client.find({...query,clientType:'ncevt'})
        .select("clientname clientcode email isProfilePicUploaded") // Add isProfilePicUploaded to the selection
       
  
      if (!clientDetails || clientDetails.length === 0) {
        return sendResponse(
          res,
          200,
          "No clients found for the specified filter.",
          []
        );
      }
  
      const allData = await Promise.all(
        clientDetails.map(async (item) => {
          // Fetch job roles associated with the client
          const jobRoleByClient = await jobRole.find({ clientId: item._id }).select("jobRole");
  
          // Check if the profile picture is uploaded
          let url = null;
          if (item.isProfilePicUploaded) {
            const urlData = await getClientFileUrl(item);
            url = urlData.url || null; // If URL is successfully fetched, use it; otherwise, null
          }
  
          return {
            _id: item._id,
            clientname: item.clientname,
            clientCode: item.clientcode,
            clientemail: item.email,
            url,
            jobRoleByClient,
          };
        })
      );
  
      return sendResponse(res, 200, "JobRole Based Client List", {
        clientDetails: allData,
       
      });
    } catch (error) {
      return errorResponse(
        res,
        500,
        "An error occurred while fetching client job role data.",
        error.message
      );
    }
  };
  

//filter by ncevt clientId
exports.assessorDashboard = async (req, res, next) => {
  try {
    const { clientId } = req.query;

    // Build match stage for job roles with optional clientId filtering
    let jobRoleMatchStage = {};
    if (clientId) {
      jobRoleMatchStage["jobRoleDetails.clientId"] = mongoose.Types.ObjectId(clientId);
    }

    // Aggregation pipeline to calculate statewiseCounts, totalAssessorCounts, totalPayrollCounts, and totalFreelanceCounts
    const assessorAggregation = await AssesorModel.aggregate([
      {
        // Lookup job roles to get clientId
        $lookup: {
          from: "jobroles", // Collection name for JobroleModel
          localField: "jobRole.jobroleName",
          foreignField: "jobRole",
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
          from: "clients", // Collection name for ClientModel
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
        // Match clientType with "ncevt" and check if state is present
        $match: {
          "clientDetails.clientType": "ncevt",
          "clientDetails._id": { $in: req?.user?.assigndClients },
          state: { $exists: true, $ne: null }, // Ensure state exists and is not null
        },
      },
      {
        // Group by unique assessor ID (assuming "assessorId" is the unique identifier)
        $group: {
          _id: "$assessorId", // Group by unique assessor ID
          state: { $first: "$state" }, // Keep the state information
          modeofAgreement: { $first: "$modeofAgreement" }, // Keep the agreement mode
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
    const totalAssessorCounts = assessorAggregation.reduce((acc, curr) => acc + curr.total, 0);
    const totalPayrollCounts = assessorAggregation.reduce((acc, curr) => acc + curr.payroll, 0);
    const totalFreelanceCounts = assessorAggregation.reduce((acc, curr) => acc + curr.freelance, 0);

    // Filter and format state names
    const filteredState = assessorAggregation
      .filter((item) => /^[A-Z]+$/.test(String(item.state).replace(/ +/g, "")) ? false : true)
      .map((item) => ({ ...item, state: String(item.state).replace(/ +/g, "_") }));

    // Gather all the stats
    const assessorStats = {
      totalAssessorCounts,
      totalPayrollCounts,
      totalFreelanceCounts,
      statewiseCounts: filteredState,
    };

    return sendResponse(res, 200, responseMessage.assessor_profile_get, { assessorStats });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.sectorAssessmentList = async (req, res) => {
  try {
    // Check if clientId is provided in the request
    const { clientId } = req.query;

    // Convert clientId to ObjectId if it's provided as a string
    const clientIdFilter = clientId ? mongoose.Types.ObjectId(clientId) : null;

    // Construct the query for Client.find based on the presence of clientId
    const query = clientIdFilter
      ? { _id: clientIdFilter, clientType: 'ncevt' } // Filter by clientId if provided
      : { _id: { $in: req?.user?.assigndClients }, clientType: 'ncevt' }; // Otherwise, use assigned clients

    let clientDetails = await Client.find(query);

    const resultNotFound = [
      {
        clientId: "65a7868bd0b713c333e46aff",
        clientName: "Retailers Associations Skill Council of India",
        clientCode: "RASCI",
        BatchCount: 0
      },
      {
        clientId: "65a79a7bd0b713c333e4f2e7",
        clientName: "Skill Council for Persons with Disability",
        clientCode: "SCPwD",
        BatchCount: 0
      },
      {
        clientId: "65a79c9fd0b713c333e503d2",
        clientName: "Sports Physical Education fitness & Leisure Skill Council",
        clientCode: "SPORTS",
        BatchCount: 0
      },
      {
        clientId: "65a79478d0b713c333e48be8",
        clientName: "test",
        clientCode: "THSC",
        BatchCount: 0
      },
      {
        clientId: "65a79977d0b713c333e4e0d0",
        clientName: "Ministry Of Textiles",
        clientCode: "MOTSAMARTH",
        BatchCount: 0
      }
    ];

    const pipeline = [
      {
        $match: {
          ...(clientIdFilter ? { clientId: clientIdFilter } : { clientId: { $in: req?.user?.assigndClients } })
        }
      },
      {
        $group: {
          _id: "$clientId", // Grouping by clientId
          count: { $sum: 1 }, // Counting the batches for each clientId
        },
      },
      {
        $lookup: {
          from: "clients", // Assuming 'clients' is the collection name for clients
          localField: "_id",
          foreignField: "_id",
          as: "client",
        },
      },
      {
        $unwind: "$client", // Unwind the client array to filter based on clientType
      },
      {
        $match: {
          "client.clientType": "ncevt", // Filtering clients with clientType 'ncevt'
        },
      },
      {
        $project: {
          clientId: "$client._id",
          clientName: "$client.clientname",
          clientCode: "$client.clientcode",
          BatchCount: "$count",
          _id: 0,
        },
      },
    ];

    const results = await Batch.aggregate(pipeline);

    const batchCountMap = {};

    results.forEach((result) => {
      // Convert ObjectId to string for comparison
      batchCountMap[result.clientId.toString()] = {
        clientName: result.clientName,
        clientCode: result.clientCode,
        BatchCount: result.BatchCount,
      };
    });

    // Create final output combining results and clientDetails
    const finalResults = clientDetails.map((client) => {
      const clientIdStr = client._id.toString(); // Convert ObjectId to string for comparison
      const clientName = client.clientname;
      const clientCode = client.clientcode; // Extract clientCode from clientDetails

      if (batchCountMap[clientIdStr]) {
        return {
          clientId: client._id,
          clientName: batchCountMap[clientIdStr].clientName,
          clientCode: batchCountMap[clientIdStr].clientCode,
          BatchCount: batchCountMap[clientIdStr].BatchCount,
        };
      } else {
        return {
          clientId: client._id,
          clientName,
          clientCode,
          BatchCount: 0,
        };
      }
    });

    if (!finalResults || finalResults.length === 0) {
      return sendResponse(res, 200, "No Batch found", {
        clientId: resultNotFound
      });
    }

    return sendResponse(res, 200, "Batch found", {
      clientId: finalResults
    });
  } catch (error) {
    console.log('error', error)
    return errorResponse(res, 500, "Internal Server Error", error.message);
  }
};

module.exports.scheduleBatchList = async (req, res) => {  
  try {
      const { startDate, clientId } = req.query;
      let query = {};
      let formattedStartDate = moment(`${startDate}`, "DD/MM/YYYY");

      if (clientId) {
          query.clientId = clientId; 
      }
      const batchList = await Batch.find(query)
          .select('startDate endDate batchId batchMode')
          .populate({
              path: "clientId",
              match: {
                  clientType: "ncevt", 
                  _id: { $in: req?.user?.assigndClients } 
              },
              select: "clientname clientcode email clientType",
          })
          .populate({
              path: "jobRole",
              select: "jobRole qpCode",
          });

      // Filter to include only items with a non-null clientId
      const clientBatchList = batchList.filter(item => item.clientId);

      const checkTime = ({ startDate, endDate }) => {
          let startDateTime = moment(`${startDate}`, "DD/MM/YYYY");
          let endDateTime = moment(`${endDate}`, "DD/MM/YYYY");

          return formattedStartDate.isBetween(startDateTime, endDateTime, undefined, '[]');
      };

      if (clientBatchList.length > 0) {
          let currentBatch = clientBatchList.filter(item => checkTime(item)); 

          return sendResponse(res, 200, "Upcoming Batch List", {
              batchList: [...currentBatch]
          });
      } else {
          return sendResponse(res, 200, "Upcoming Batch List", {
              batchList: []
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

module.exports.liveBatchList = async (req, res) => {
    try {
      const { page, limit, skip, sortOrder } = Paginate(req);
      
      const { isStatus,clientId } = req.query;
      const currentDateTime = moment();
      // Initialize the match query
      const matchQuery = {
        "clientId.clientType": "ncevt", // Filtering clients with clientType 'ncevt'
        "clientId._id":{$in: req?.user?.assigndClients}
      };

      if(req.user?.email === "ncvet.testaonline@gmail.com" ){
  
        matchQuery["status"] = true
      }
  
      // Add clientId filter to the match query if clientId is provided
      if (clientId) {
        matchQuery["clientId._id"] = new ObjectId(clientId);
      }

      console.log('matchQuery--->', matchQuery)
  
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
              { $project: { clientname: 1, clientType: 1, clientcode: 1, email: 1 } },
              { $match: { clientType: "ncevt" } }, // Filter for clientType 'ncevt'
            ],
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
  
        // Apply initial match criteria
        { $match: matchQuery },
        // Sort by sortOrder
        { $sort: sortOrder },
      ];
  
      // Execute the pipeline to get the initial batch list
      let batchList = await Batch.aggregate(pipeline);
     
      // Function to check the batch time
      const checkTime = (
        { startDate, endDate, startTime, endTime },
        batchType
      ) => {
       
        let startDateTime = moment(`${startDate} ${startTime}`, "DD/MM/YYYY hh:mmA");
        let endDateTime = moment(`${endDate} ${endTime}`, "DD/MM/YYYY hh:mmA");
  
        switch (batchType) {
          case "upcoming":
            return startDateTime > currentDateTime.toDate();
          case "ongoing":
            return (
              startDateTime <= currentDateTime.toDate() && endDateTime >= currentDateTime.toDate()
            );
          case "all":
            return true;
          default:
            return false;
        }
      };
  
      // Apply filtering based on `isStatus`
      let filteredBatchList = batchList.filter((item) => checkTime(item, 'ongoing'))
      .filter(item=>item.clientId?.clientType==="ncevt").filter(item=>req?.user?.assigndClients.includes(item.clientId?._id));
  
      // Count total batches after filtering
      const totalCounts = filteredBatchList.length;
     
      // Apply pagination to the filtered list
      const paginatedBatch = filteredBatchList.slice(skip, skip + limit);
      // Calculate total pages
      const totalPages = Math.ceil(totalCounts / limit);
  
      if (paginatedBatch.length > 0) {
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

module.exports.assessmentDashboard = async (req, res) => {
  try {
      const { clientId } = req.query;

      // Calculate dates for last week, last month, and last year
      const now = new Date();
      const startOfLastWeek = moment().subtract(1, 'weeks').startOf('isoWeek').toDate();
      const startOfLastMonth = moment().subtract(1, 'months').startOf('month').toDate();
      const startOfLastYear = moment().subtract(1, 'years').startOf('year').toDate();

      // Build match query
      const matchQuery = {
          createdAt: { $gte: startOfLastWeek, $lt: now },
      };

      // If clientId is provided, add it to the match query
      if (clientId) {
          matchQuery.clientId = mongoose.Types.ObjectId(clientId);
      }

      // Last Week Details
      const lastWeekDetails = await Batch.aggregate([
          {
              // Use $lookup to join with the client collection
              $lookup: {
                  from: 'clients', // Ensure this matches your client collection name
                  localField: 'clientId',
                  foreignField: '_id',
                  as: 'client',
              },
          },
          { $unwind: '$client' }, // Unwind the client array to access its fields
          {
              $match: {
                  ...matchQuery,
                 // 'client.clientType': 'ncevt', // Filtering clients with clientType 'ncevt'
                  'client._id': { $in: req.user.assigndClients.map(id => mongoose.Types.ObjectId(id)) }, // Ensure ObjectId conversion
              },
          },
          {
              $group: {
                  _id: { weekDay: { $dayOfWeek: '$createdAt' }, batchMode: '$batchMode' },
                  value: { $sum: 1 },
              },
          },
          {
              $project: {
                  weekDay: '$_id.weekDay',
                  batchMode: '$_id.batchMode',
                  value: 1,
                  _id: 0,
              },
          },
      ]);

      // Last Month Details
      const lastMonthDetails = await Batch.aggregate([
          {
              $lookup: {
                  from: 'clients',
                  localField: 'clientId',
                  foreignField: '_id',
                  as: 'client',
              },
          },
          { $unwind: '$client' },
          {
              $match: {
                  ...matchQuery,
                  createdAt: { $gte: startOfLastMonth, $lt: now },
                 // 'client.clientType': 'ncevt',
                  'client._id': { $in: req.user.assigndClients.map(id => mongoose.Types.ObjectId(id)) },
              },
          },
          {
              $group: {
                  _id: { month: { $month: '$createdAt' }, batchMode: '$batchMode' },
                  value: { $sum: 1 },
              },
          },
          {
              $project: {
                  month: '$_id.month',
                  batchMode: '$_id.batchMode',
                  value: 1,
                  _id: 0,
              },
          },
      ]);

      // Last Year Details
      const lastYearDetails = await Batch.aggregate([
          {
              $lookup: {
                  from: 'clients',
                  localField: 'clientId',
                  foreignField: '_id',
                  as: 'client',
              },
          },
          { $unwind: '$client' },
          {
              $match: {
                  ...matchQuery,
                  createdAt: { $gte: startOfLastYear, $lt: now },
                //  'client.clientType': 'ncevt',
                  'client._id': { $in: req.user.assigndClients.map(id => mongoose.Types.ObjectId(id)) },
              },
          },
          {
              $group: {
                  _id: { year: { $year: '$createdAt' }, batchMode: '$batchMode' },
                  value: { $sum: 1 },
              },
          },
          {
              $project: {
                  year: '$_id.year',
                  batchMode: '$_id.batchMode',
                  value: 1,
                  _id: 0,
              },
          },
      ]);

      // Constructing weekly response with default values
      const weekResponse = Array.from({ length: 7 }, (_, i) => {
          const dayOfWeek = moment().day(i + 1).format('dddd');
          const dayData = lastWeekDetails
              .filter(data => data.weekDay === (i + 1))
              .reduce(
                  (acc, data) => {
                      acc[data.batchMode] = data.value;
                      return acc;
                  },
                  { online: 0, offline: 0 } // Default values
              );
          return { [dayOfWeek]: dayData };
      });

      // Constructing monthly response with default values
      const monthResponse = Array.from({ length: 12 }, (_, i) => {
          const monthName = moment().month(i).format('MMMM');
          const monthData = lastMonthDetails
              .filter(data => data.month === (i + 1))
              .reduce(
                  (acc, data) => {
                      acc[data.batchMode] = data.value;
                      return acc;
                  },
                  { online: 0, offline: 0 } // Default values
              );
          return { [monthName]: monthData };
      });

      // Constructing yearly response (last 10 years) with default values
      const currentYear = moment().year();
      const yearResponse = Array.from({ length: 10 }, (_, i) => {
          const year = currentYear - i;
          const yearData = lastYearDetails
              .filter(data => data.year === year)
              .reduce(
                  (acc, data) => {
                      acc[data.batchMode] = data.value;
                      return acc;
                  },
                  { online: 0, offline: 0 } // Default values
              );
          return { [year.toString()]: yearData };
      });

      const operationStats = {
          weekResponse: weekResponse || [],
          monthResponse: monthResponse || [],
          yearResponse: yearResponse || [],
      };

      return sendResponse(res, 200, responseMessage.op_dashboard, operationStats);
  } catch (error) {
      console.log('error', error);
      return errorResponse(res, 500, responseMessage.something_wrong, error);
  }
};