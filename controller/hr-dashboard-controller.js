const Client = require("../models/client-model");
const AssesorModel = require("../models/AssesorModel");
const ProctorModel=require("../models/proctor-model")
const createAssesment = require("../models/createAssesment-model");
const jobRole = require("../models/jobRole-model");
const NOS = require("../models/nos-theory-model");
const { errorResponse, sendResponse } = require("../utils/response");
const responseMessage = require("../utils/responseMessage");
const { months, monthResponse } = require("../utils/custom-validators");

module.exports.hrDashboard = async (req, res) => {
  try {
    const clientCount = await Client.countDocuments({});
    const activeAssesorCount = await AssesorModel.countDocuments({
      client_status: "active",
    });
    const totalAssesorCount = await AssesorModel.countDocuments({
      
    });
    const totalProctor = await ProctorModel.countDocuments({});
    const totalPayrollAssesor = await AssesorModel.countDocuments({
        modeofAgreement: "payroll",
    });
   
   

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
    // const clientList = await Batch.find({})
    //   .select("batchName batchId status")
    //   .limit(5);

    const operationStats = {
      totalClient:clientCount,
      totalAssesorCount:totalAssesorCount,
      activeAssesorCount: activeAssesorCount || 0,
      totalProctor: totalProctor || 0,
      monthResponse:monthResponse || [],
    //   clientList,
      AssesorStatics: {
        totalAssesorCount,
       AssesorDetails: [{
          name: "Payroll",
          value: totalPayrollAssesor,
          fill: "#0077B6",
        },
        {
          name: "Freelancer",
          value:totalAssesorCount-totalPayrollAssesor,
          fill: "#00B4D8",
        }
      ]
      },
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
