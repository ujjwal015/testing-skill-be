const { default: mongoose } = require("mongoose");
const Candidate = require("../models/candidate-model");
const candidateModel = require("../models/candidate-model");
const CandidateReport = require("../models/candidateReport");
const candidateOfflineModel = require("../models/offlineResult-model");
const candidateOnlineModel = require("../models/onlineResult-model");

const candidate_Appeared_In_Batch = async (batchId, batchMode) => {
  try {
    const reportModel = batchMode === "online" ? candidateOnlineModel : candidateOfflineModel;

    // Run both queries in parallel using Promise.all() for efficiency
    const [candidateAttendedData, totalCandidates] = await Promise.all([
      reportModel.aggregate([
        { $match: { batch_mongo_id: batchId } },  // Filter by batchId
        { $group: { _id: "$candidateId" } },       // Group by unique candidateId
        { $count: "uniqueCandidates" }             // Count unique candidates
      ]),
      candidateModel.countDocuments({ batchId })
    ]);
    const candidateAttended = candidateAttendedData.length > 0 ? candidateAttendedData[0].uniqueCandidates : 0;

    return { totalCandidates, candidateAttended };
  } catch (error) {
    console.error("Error in candidate_Appeared_In_Batch:", error.message);
    return { totalCandidates: 0, candidateAttended: 0 }; // Return default values instead of "NA"
  }
};

const getCandidateCountsByBatchIds = async (batchIds, batchMode) => {
  try {
    const reportModel = batchMode === "online" ? candidateOnlineModel : candidateOfflineModel;

    const [attendedData, totalData] = await Promise.all([
      reportModel.aggregate([
        { $match: { batch_mongo_id: { $in: batchIds } } },
        {
          $group: {
            _id: { batchId: "$batch_mongo_id", candidateId: "$candidateId" }
          }
        },
        {
          $group: {
            _id: "$_id.batchId",
            candidateAttended: { $sum: 1 }
          }
        }
      ]),
      candidateModel.aggregate([
        { $match: { batchId: { $in: batchIds } } },
        {
          $group: {
            _id: "$batchId",
            totalCandidates: { $sum: 1 }
          }
        }
      ])
    ]);

    const resultMap = {};

    batchIds.forEach((id) => {
      const idStr = id.toString();
      resultMap[idStr] = {
        totalCandidates: 0,
        candidateAttended: 0,
      };
    });

    attendedData.forEach((doc) => {
  const idStr = doc._id.toString();
  if (resultMap[idStr]) {
    resultMap[idStr].candidateAttended = doc.candidateAttended;
  }
});


    totalData.forEach((doc) => {
  const idStr = doc._id.toString();
  if (resultMap[idStr]) {
    resultMap[idStr].totalCandidates = doc.totalCandidates;
  }
});

    return resultMap;
  } catch (error) {
    const fallback = {};
    batchIds.forEach((id) => {
      fallback[id.toString()] = {
        totalCandidates: 0,
        candidateAttended: 0,
      };
    });
    return fallback;
  }
};


const candidate_fail_pass_percentage = async (batchId) => {
  const candidate = await CandidateReport.find({ batchId: batchId });

  const totalCandidates = candidate.length;
  let passedCandidates = 0;
  let failedCandidate = 0;
  candidate.length > 0 &&
    candidate?.forEach((item) => {
      if (item?.passedStatus === "Pass") {
        passedCandidates += 1;
      }
      if (item?.passedStatus === "Fail") {
        failedCandidate += 1;
      }
    });
  const newData = await Candidate.countDocuments({
    batchId: batchId,
    studentType: 2,
  });

  let passedPercentage = (passedCandidates / totalCandidates) * 100;
  if (Number.isNaN(passedPercentage)) {
    passedPercentage = 0;
  }
  const oldFailedCandidates = newData + failedCandidate;

  return {
    passedPercentage: `${parseFloat(passedPercentage.toFixed(2))}%`,
    failedCandidate: `${oldFailedCandidates}/${totalCandidates}`,
    resultRegenerated: `${newData}/${oldFailedCandidates}`,
  };
};

const candidate_Appeared_In_Batch_v2 = async (batchIds, batchModes) => {
  try {
    const onlineIds = batchIds.filter((id) => batchModes[id] === "online");
    const offlineIds = batchIds.filter((id) => batchModes[id] === "offline");

    const [onlineData, offlineData, totalCandidatesRaw] = await Promise.all([
      candidateOnlineModel.aggregate([
        { $match: { batch_mongo_id: { $in: onlineIds.map(id => mongoose.Types.ObjectId(id)) } } },
        { $group: { _id: { batchId: "$batch_mongo_id", candidateId: "$candidateId" } } },
        { $group: { _id: "$_id.batchId", count: { $sum: 1 } } },
      ]),
      candidateOfflineModel.aggregate([
        { $match: { batch_mongo_id: { $in: offlineIds.map(id => mongoose.Types.ObjectId(id)) } } },
        { $group: { _id: { batchId: "$batch_mongo_id", candidateId: "$candidateId" } } },
        { $group: { _id: "$_id.batchId", count: { $sum: 1 } } },
      ]),
      candidateModel.aggregate([
        { $match: { batchId: { $in: batchIds.map(id => mongoose.Types.ObjectId(id)) } } },
        { $group: { _id: "$batchId", count: { $sum: 1 } } },
      ])
    ]);

    const appearedMap = {};
    [...onlineData, ...offlineData].forEach(item => {
      appearedMap[item._id.toString()] = item.count;
    });

    const totalMap = {};
    totalCandidatesRaw.forEach(item => {
      totalMap[item._id.toString()] = item.count;
    });

    // Combine both maps into desired format
    const result = {};
    batchIds.forEach(id => {
      result[id] = {
        totalCandidates: totalMap[id] || 0,
        candidateAttended: appearedMap[id] || 0,
      };
    });

    return result;
  } catch (error) {
    console.error("Bulk candidate_Appeared_In_Batch error:", error.message);
    return Object.fromEntries(batchIds.map(id => [id, {
      totalCandidates: 0,
      candidateAttended: 0,
    }]));
  }
};


const candidate_fail_pass_percentage_v2 = async (batchIds) => {
  try {
    const [reportStats, regeneratedStats] = await Promise.all([
      CandidateReport.aggregate([
        { $match: { batchId: { $in: batchIds.map(id => mongoose.Types.ObjectId(id)) } } },
        {
          $group: {
            _id: { batchId: "$batchId", status: "$passedStatus" },
            count: { $sum: 1 },
          },
        },
      ]),
      Candidate.aggregate([
        {
          $match: {
            batchId: { $in: batchIds.map(id => mongoose.Types.ObjectId(id)) },
            studentType: 2,
          },
        },
        {
          $group: {
            _id: "$batchId",
            count: { $sum: 1 },
          },
        },
      ])
    ]);

    const result = {};

    const statsMap = {};
    reportStats.forEach(({ _id, count }) => {
      const bid = _id.batchId.toString();
      if (!statsMap[bid]) statsMap[bid] = { pass: 0, fail: 0, total: 0 };
      if (_id.status === "Pass") statsMap[bid].pass += count;
      if (_id.status === "Fail") statsMap[bid].fail += count;
      statsMap[bid].total += count;
    });

    const regenMap = {};
    regeneratedStats.forEach(({ _id, count }) => {
      regenMap[_id.toString()] = count;
    });

    batchIds.forEach((id) => {
      const s = statsMap[id] || { pass: 0, fail: 0, total: 0 };
      const regen = regenMap[id] || 0;
      const totalFailedIncludingRegen = s.fail + regen;
      const passedPercentage = s.total > 0 ? ((s.pass / s.total) * 100).toFixed(2) : "0.00";

      result[id] = {
        passedPercentage: `${passedPercentage}%`,
        failedCandidate: `${totalFailedIncludingRegen}/${s.total}`,
        resultRegenerated: `${regen}/${totalFailedIncludingRegen}`,
      };
    });

    return result;
  } catch (error) {
    console.error("Bulk candidate_fail_pass_percentage error:", error.message);
    return Object.fromEntries(batchIds.map(id => [id, {
      passedPercentage: "0.00%",
      failedCandidate: "0/0",
      resultRegenerated: "0/0",
    }]));
  }
};


module.exports = {
  candidate_Appeared_In_Batch,
  candidate_fail_pass_percentage,
  candidate_Appeared_In_Batch_v2,
  candidate_fail_pass_percentage_v2,
  getCandidateCountsByBatchIds
};
