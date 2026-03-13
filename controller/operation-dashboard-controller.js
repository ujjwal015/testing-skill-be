
const Batch = require("../models/batch-model")
const Candidate = require("../models/candidate-model");
const ExamCenter = require("../models/exam-center-model");
const ClientModel = require("../models/client-model");
const CandidateReport = require("../models/candidateReport")

const moment = require("moment")
const mongoose = require("mongoose")
const { errorResponse, sendResponse } = require("../utils/response")
const responseMessage = require("../utils/responseMessage")
const { Paginate } = require("../utils/paginate")
const { months, monthResponse } = require('../utils/custom-validators');
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
  } = require("@aws-sdk/client-s3");
const {
    AWS_ACCESS_KEY_ID,
    AWS_ACCESS_KEY_SECRET,
    AWS_BUCKET_NAME,
    AWS_REGION,
  } = require("../utils/envHelper");

const { getFilter } = require('../utils/custom-validators');

module.exports.operationDeshboard=async(req,res)=>{
         try{
         const activeBatchCount=await Batch.countDocuments({status:true});
         const totolCandidateCount=await Candidate.countDocuments({});
         const totalBatchCount=await Batch.countDocuments({});
         const totalExamCentreCount=await ExamCenter.countDocuments({});

         // for batch statics circle in dashboard 
         const batchData = await Batch.find()
         const batchIds = batchData.map(batch=> batch._id)
         // const query = batchId ? {batchId: batchId} : { batchId: { $in: batchIds } }
         const query = { batchId: { $in: batchIds } }
         const totalCandidates = await Candidate.countDocuments(query)
 
         //total result generated or total assessment submitted
         const candidateResult = await CandidateReport.find(query)
         
         const passedCandidate = candidateResult.filter(candidate=> candidate.passedStatus === "Pass")
         const failedCandidate = candidateResult.filter(candidate=> candidate.passedStatus === "Fail")
 
         const candidatesNotAppear = totalCandidates - (passedCandidate.length + failedCandidate.length)
 
         const percentagePassed = ((passedCandidate.length) / totalCandidates) * 100
         const percentageFailed = ((failedCandidate.length) / totalCandidates) * 100
         const percentageNotAppeared = (candidatesNotAppear / totalCandidates) * 100

          const batchStats = { 
              totalCandidates: totalCandidates,
              batchDetails: [
                { 
                    name: "Passed Candidates",
                    value: `${percentagePassed.toFixed(2)}%`,
                    fill: "#0077B6",
                },
                { 
                  name: "Failed Candidates",
                  value: `${percentageFailed.toFixed(2)}%`,
                  fill: "#00B4D8",
                },
                { 
                  name: "Not Given Test",
                  value: `${percentageNotAppeared.toFixed(2)}%`,
                  fill: "#90E0EF",
                }
              ]
          }


        const monthlyDetails = await Batch.aggregate([
            { $project: { month: { $month: "$createdAt" } } },
            { $group: { _id: "$month", monthNumber: { $first: "$month" }, value: { $sum: 1 } } },

        ])

        monthResponse.forEach((value) => {

            monthlyDetails.map(data => {

                if (data.monthNumber === value.monthNo) {
                    value.value = data.value

                }
            })
        })

       
        
        const operationStats={
            activeBatch:activeBatchCount||0,
            totalBatch:totalBatchCount||0,
            totalCandidate:totolCandidateCount||0,
            totalExamCentre:totalExamCentreCount||0,
            monthResponse:monthResponse||[],
            batchStatics:batchStats
            

        }
        return sendResponse(res,200,responseMessage.op_dashboard,operationStats)

         }catch(error){
            console.log('error',error);
            return errorResponse(res,500,responseMessage.something_wrong,error)
         }
}


module.exports.batchListOperationDashboard = async (req, res) =>{
    try {

        const { page, limit, skip, sortOrder } = Paginate(req);

        let query = {}

        const totalCounts = await Batch.countDocuments(query);
        const totalPages = Math.ceil(totalCounts / limit);

        const clientList=await Batch.find(query).select('batchName batchId status').populate('clientId').sort(sortOrder)
        .skip(skip).limit(limit);
        
        const transformedClientList = await Promise.all(clientList.map(async (item) => {
            const clientResponse = {
                batchId: item.batchId,
                clientName: item.clientId?.clientname,
                status: item.status,
                examStatus: 'NA',
                logo: await getFileUrl(item.clientId?.email) || null
            };
            
            return clientResponse;
        }));

        return sendResponse(res, 200, "successfully got batch list", 
            {   batchList : transformedClientList,
                page, totalCounts, totalPages })
        
    } catch (error) {
        return errorResponse(res, 500, responseMessage.something_wrong, error.message)
    }
}


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
      if (url) {
        return url
      }
    } catch (error) {
      return error.message;
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
          // If clientId is a string, remove quotes and split by commas
          if (typeof clientId === 'string') {
              clientIds = clientId.split(',').map(id => id.trim().replace(/(^"|"$)/g, ''));
          } else if (Array.isArray(clientId)) {
              clientIds = clientId.map(id => id.trim().replace(/(^"|"$)/g, ''));
          }
      }

      // Apply client filtering based on clientIds array
      if (clientIds.length > 0) {
          query.clientId = { $in: clientIds.map(id => mongoose.Types.ObjectId(id)) }; // Ensure IDs are ObjectId
      }

      const batchList = await Batch.find(query)
          .select('startDate endDate batchId batchMode')
          .populate({
              path: "clientId",
              match: {
                  _id: { $in: req?.user?.assigndClients.map(client => mongoose.Types.ObjectId(client._id)) } // Ensure the clientId is in assignedClients
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