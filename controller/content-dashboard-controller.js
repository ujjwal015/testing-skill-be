const Batch = require("../models/batch-model");
const Questionbank = require("../models/questionBankModel");
const createAssesment = require("../models/createAssesment-model");
const jobRole = require("../models/jobRole-model");
const NOS = require("../models/nos-theory-model");
const { errorResponse, sendResponse } = require("../utils/response");
const responseMessage = require("../utils/responseMessage");
const { months, monthResponse } = require("../utils/custom-validators");
exports.getUpcomingAssignment = async (req, res) => {
  try {
    if (req.body) {
      const startDate = new Date(req.body.startDate);

      const endDate = new Date(req.body.endDate);

      if (startDate > endDate) {
        return errorResponse(
          res,
          400,
          "End date is not valid",
          "End date should after than start date"
        );
      }

      const getAssignmentData = await createAssesment
        .find({
          createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) },
        })
        .select("assessmentName");

      if (getAssignmentData) {
        return sendResponse(
          res,
          200,
          "upcoming assessment get successfully",
          getAssignmentData
        );
      } else {
        return sendResponse(res, 200, "upcoming assessment is empty", []);
      }
    } else {
      let responseData = {
        isVisible: req.body.isVisible,
        assessmentDetail: [],
      };
      return sendResponse(
        res,
        200,
        "upcoming assessment is not visible",
        responseData
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};
module.exports.contentDeshboard = async (req, res) => {
  try {
   
    const jobRoleCount = await jobRole.countDocuments({$and:[{ status: true},{clientId:{$in:req.user.assigndClients}}]});
  
    const activeQuesBankCount = await Questionbank.countDocuments({
      status: "active",
    });
    const totalAssesments = await createAssesment.countDocuments({
      status: "active",
    });
    const totalNos = await NOS.countDocuments({ status: "active" });
    const totalTheoryBank = await Questionbank.countDocuments({
      section: "Theory",
    });
    const totalPracticalBank = await Questionbank.countDocuments({
      section: "practical",
    });
    const totalVivaBank = await Questionbank.countDocuments({
      section: "viva",
    });

    const monthlyDetails = await Questionbank.aggregate([
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
   
    const clientList = await Batch.find({})
      .select("batchName batchId status")
      .limit(5);

    const operationStats = {
      activeQuesBankCount: activeQuesBankCount || 0,
      totalAssesments: totalAssesments || 0,
      jobRoleCount: jobRoleCount || 0,
      totalNos: totalNos || 0,
      monthResponse: monthResponse || [],
      clientList,
      QuestionBankStatics: {
        activeQuesBankCount,
       QuestionBankDetails: [{
          name: "Theory",
          value: totalTheoryBank,
          fill: "#0077B6",
        },
        {
          name: "Practical",
          value: totalPracticalBank,
          fill: "#00B4D8",
        },{
          name: "Viva",
          value: totalVivaBank,
          fill: "#90E0EF",
        },
      ]
      },
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
