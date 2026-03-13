const { errorResponse, sendResponse } = require("../../../utils/response");
const responseMessage = require("../../../utils/responseMessage");
const { Paginate } = require("../../../utils/paginate");
const { main } = require("../db/skill-connect");
const { asyncErrorHandler } = require("../../../utils/asyncErrorHandler");
//batch list for skill assesments
exports.batchList = asyncErrorHandler(async (req, res) => {
  const db = await main();
  const master_batch = db.collection("master_batch");
  let query = {};
  const { batchid, partner_id } = req.query;
  const { page, limit, skip, sortOrder } = await Paginate(req);
  const totalCounts = await master_batch.countDocuments(
    batchid ? { batchid } : {},
    partner_id ? { partner_id } : {}
  );

  const totalPages = Math.ceil(totalCounts / limit);
  let pipeline = [
    {
      $lookup: {
        from: "master_assessment",
        localField: "assessment_id",
        foreignField: "id",
        as: "assesments",
      },
    },
    {
      $lookup: {
        from: "master_student",
        localField: "id",
        foreignField: "batch_id",
        as: "students",
      },
    },
    {
      $addFields: {
        jobrole_id: {
          $split: ["$jobrole_id", ","],
        },
      },
    },
    {
      $lookup: {
        from: "master_jobrole",
        localField: "jobrole_id",
        foreignField: "id",
        as: "jobRoles",
      },
    },
    {
      $lookup: {
        from: "master_examcenter",
        localField: "examcenter_id",
        foreignField: "id",
        as: "examCenters",
      },
    },
    {
      $lookup: {
        from: "master_assessor",
        localField: "id",
        foreignField: "batch_id",
        as: "assesors",
      },
    },

    {
      $project: {
        batchid: 1,
        name: 1,
        id: 1,
        jobRoleName: {
          $reduce: {
            input: "$jobRoles.name",
            initialValue: "",
            in: {
              $concat: [
                "$$value",
                { $cond: [{ $eq: ["$$value", ""] }, "", ","] },
                "$$this",
              ],
            },
          },
        },
        assesmentsName: {
          $reduce: {
            input: "$assesments.name",
            initialValue: "",
            in: {
              $concat: [
                "$$value",
                { $cond: [{ $eq: ["$$value", ""] }, "", ","] },
                "$$this",
              ],
            },
          },
        },

        studentCount: { $size: "$students" },
        "assesors.firstname": 1,
        exam_time: 1,
        partner_id: 1,
        start_batch_time: 1,
        end_batch_time: 1,
        language_code: 1,
        "examCenters.name": 1,
        language_code1: 1,
        examstartDate: 1,
      },
    },
  ];
  if (batchid) {
    pipeline.push({
      $match: {
        batchid,
      },
    });
  }
  if (partner_id) {
    pipeline.push({
      $match: {
        partner_id,
      },
    });
  }
  let batchDetails = await master_batch
    .aggregate(pipeline)
    .skip(skip)
    .limit(limit)
    .sort(sortOrder)
    .toArray();

  return sendResponse(res, 200, "Batch List", {
    batchDetails,
    page,
    totalCounts,
    totalPages,
  });
});
//result list
exports.resultList = asyncErrorHandler(async (req, res) => {
  const db = await main();
  const master_batch = db.collection("master_batch");
  let query = {};
  const { jobroleIds } = req.query;
  const { page, limit, skip, sortOrder } = await Paginate(req);
  const jobroleIdArray = jobroleIds?.split(",");
  const totalCounts = await master_batch.countDocuments();

  const totalPages = Math.ceil(totalCounts / limit);




  let pipeline = [
    {
      $lookup: {
        from: "master_assessment",
        localField: "assessment_id",
        foreignField: "id",
        as: "assesments",
      },
    },
    {
      $lookup: {
        from: "master_student",
        localField: "id",
        foreignField: "batch_id",
        as: "students",
      },
    },
    {
      $addFields: {
        jobrole_id: {
          $split: ["$jobrole_id", ","],
        },
      },
    },
    {
      $lookup: {
        from: "master_jobrole",
        localField: "jobrole_id",
        foreignField: "id",
        as: "jobRoles",
      },
    },
    {
      $lookup: {
        from: "master_examcenter",
        localField: "examcenter_id",
        foreignField: "id",
        as: "examCenters",
      },
    },
    {
      $lookup: {
        from: "final_candidate_result",
        localField: "batchid",
        foreignField: "batch_id",
        as: "candidateResults",
      },
    },
    {
      $lookup: {
        from: "master_assessor",
        localField: "id",
        foreignField: "batch_id",
        as: "assesors",
      },
    },
    {
      $lookup: {
        from: "master_scheme",
        localField: "partner_id",
        foreignField: "partner_id",
        as: "schemes",
      },
    },
    {
      $project: {
        batchid: 1,
        name: 1,
        id: 1,
        jobrole_id: 1,
        jobRoleName: {
          $reduce: {
            input: "$jobRoles.name",
            initialValue: "",
            in: {
              $concat: [
                "$$value",
                { $cond: [{ $eq: ["$$value", ""] }, "", ","] },
                "$$this",
              ],
            },
          },
        },
        qpcode: {
          $reduce: {
            input: "$jobRoles.code",
            initialValue: "",
            in: {
              $concat: [
                "$$value",
                { $cond: [{ $eq: ["$$value", ""] }, "", ","] },
                "$$this",
              ],
            },
          },
        },
        "schemes.name": 1,
        assesmentsName: {
          $reduce: {
            input: "$assesments.name",
            initialValue: "",
            in: {
              $concat: [
                "$$value",
                { $cond: [{ $eq: ["$$value", ""] }, "", ","] },
                "$$this",
              ],
            },
          },
        },
        studentCount: { $size: "$students" },
        resultCount: { $size: "$candidateResults" },
        "assesors.firstname": 1,
        exam_time: 1,
        start_batch_time: 1,
        end_batch_time: 1,
        language_code: 1,
        "examCenters.name": 1,
        language_code1: 1,
        examstartDate: 1,
      },
    },
    {
      $match: {
        resultCount: { $gte: 1 }
      },
    },
  ];

   // Add the `jobrole_id` condition dynamically if `jobroleIds` is provided
if (jobroleIds && jobroleIdArray?.length>=1) {
   pipeline.push({
    $match: {
      jobrole_id: { $in:jobroleIdArray } 
    }
  })
}
   
  let batchDetails = await master_batch
    .aggregate(pipeline)
    .skip(skip)
    .limit(limit)
    .sort(sortOrder)
    .toArray();

  return sendResponse(res, 200, "Result List", {
    batchDetails,
    page,
    totalCounts,
    totalPages,
  });
});
//candidate list
exports.candiateList = asyncErrorHandler(async (req, res) => {
  const db = await main();
  const master_student = db.collection("master_student");
  const { batch_id } = req.query;
  let query = {};

  const { page, limit, skip, sortOrder } = await Paginate(req);

  const totalCounts = await master_student.countDocuments(
    batch_id ? { batch_id } : {}
  );

  const totalPages = Math.ceil(totalCounts / limit);

  let pipeline = [
    {
      $lookup: {
        from: "master_batch",
        localField: "batch_id",
        foreignField: "id",
        as: "batch",
      },
    },
    {
      $lookup: {
        from: "master_scheme",
        localField: "scheme_id",
        foreignField: "id",
        as: "schemes",
      },
    },
    {
      $project: {
        batch_id: 1,
        user_name: 1,
        candidate_id: 1,
        firstname: 1,
        email: 1,
        mobile: 1,
        "schemes.name": 1,
        "batch.name": 1,
        "batch.id": 1,
        "batch._id": 1,
      },
    },
  ];
  if (batch_id) {
    pipeline.push({
      $match: {
        batch_id,
      },
    });
  }
  let candidateDetails = await master_student
    .aggregate(pipeline)
    .skip(skip)
    .limit(limit)
    .sort(sortOrder)
    .toArray();

  return sendResponse(res, 200, "Candidate List", {
    candidateDetails,
    page,
    totalCounts,
    totalPages,
  });
});
//assesorList
exports.assesorList = asyncErrorHandler(async (req, res) => {
  const db = await main();
  const master_assessor = db.collection("master_assessor");
  let query = {};

  const { page, limit, skip, sortOrder } = await Paginate(req);

  const totalCounts = await master_assessor.countDocuments();

  const totalPages = Math.ceil(totalCounts / limit);
  let pipeline = [
    // {$match:{
    //   batch_id:'34721'
    // }},
    {
      $lookup: {
        from: "master_batch",
        localField: "batch_id",
        foreignField: "id",
        as: "batch",
      },
    },
    // {
    //   $lookup: {
    //     from: "master_scheme",
    //     localField: "scheme_id",
    //     foreignField: "id",
    //     as: "schemes",
    //   },
    // },
    {
      $lookup: {
        from: "master_partner",
        localField: "partner_id",
        foreignField: "id",
        as: "partners",
      },
    },
    {
      $project: {
        user_name: 1,
        id: 1,
        mobile: 1,
        dob:1,
        gender:1,
        aadhar:1,
        pan:1,
        mou_signed:1,
        toa_certified:1,
        batch_id: 1,
        firstname: 1,
        batchCount:{$size:"$batch"},
        email: 1,
        status: 1,
        "batch.name": 1,
        "batch.id": 1,
        "batch._id": 1,
       
        "schemes.name": 1,
        "partners.name": 1,
      },
    },
  ];
  let assesorDetails = await master_assessor
    .aggregate(pipeline)
    .skip(skip)
    .limit(limit)
    .sort(sortOrder)
    .toArray();

  return sendResponse(res, 200, "Assesor List", {
    assesorDetails,
    page,
    totalCounts,
    totalPages,
  });
});
//candidate result
exports.candidateResults = asyncErrorHandler(async (req, res) => {
  const db = await main();
  const master_student = db.collection("final_candidate_result");
  const { batch_id } = req.query;
  let query = {};

  const { page, limit, skip, sortOrder } = await Paginate(req);

  const totalCounts = await master_student.countDocuments();

  const totalPages = Math.ceil(totalCounts / limit);
  let pipeline = [
    {
      $lookup: {
        from: "master_batch",
        localField: "batch_id",
        foreignField: "batchid",
        as: "batch",
      },
    },
    // {
    //   from: "master_student",
    //   localField: "candidate_id",
    //   foreignField: "candidate_id",
    //   as: "students",
    // },
    // {
    //   $lookup: {
    //     from: "master_student",
    //     localField: "username",
    //     foreignField: "username",
    //     as: "students",
    //   },
    // },
    {
      $project: {
        candidate_id: 1,
        // "students.firstname": 1,
        // "students.studentid": 1,
        id: 1,
        partner_id: 1,
        total_theory_obtained: 1,
        total_theory: 1,
        theory: 1,
        total_practical: 1,
        practical: 1,
        total_practical_obtained: 1,
        proctoring_image_count: 1,
        total_marks: 1,
        obtained_marks: 1,
        percentage: 1,
        section_id: 1,
        status: 1,
        batch_id: 1,
        batchCount: { $size: "$batch" },
        // studentCount:{$size:"$students"},
        studentid: 1,
        result: 1,
        email: 1,
        "batch.name": 1,
        "batch.jobrole_id": 1,
        "batch.id": 1,
        "batch._id": 1,
        "jobRoles.name": 1,
        "jobRoles.code": 1,
        mobile: 1,
        scheme_id: 1,
      },
    },
    {
      $match: {
        batchCount: { $gte: 1 },
        // studentCount:{$gte:1}
      },
    },
  ];

  const resultDetails = await master_student
    .aggregate(pipeline)
    .skip(skip)
    .limit(limit)
    .sort(sortOrder)
    .toArray();

  return sendResponse(res, 200, "Candidate Result List", {
    resultDetails,
    page,
    totalCounts,
    totalPages,
  });
});
//view nos
exports.viewNosResult = asyncErrorHandler(async (req, res) => {
  const jobrole_id = req.params.id;
  const db = await main();
  const master_nos = db.collection("master_nos");
  let query = {};

  const { page, limit, skip, sortOrder } = await Paginate(req);

  const totalCounts = await master_nos.countDocuments();

  const totalPages = Math.ceil(totalCounts / limit);
  let pipeline = [
    {
      $match: {
        jobrole_id,
      },
    },
  ];

  const nosDetails = await master_nos
    .aggregate(pipeline)
    .skip(skip)
    .limit(limit)
    .sort(sortOrder)
    .toArray();

  return sendResponse(res, 200, "Candidate Nos Result", {
    nosDetails,
    page,
    totalCounts,
    totalPages,
  });
});
//partner list
exports.partnerList = asyncErrorHandler(async (req, res) => {
  const db = await main();
  const master_partner = db.collection("master_partner");

  const partnerOptionList =
    (await master_partner
      .find({}, { projection: { name: 1, id: 1 } })
      .toArray()) || [];
  return sendResponse(res, 200, "Partner option List", partnerOptionList);
});
//jobRoleList
exports.jobRoleList = asyncErrorHandler(async (req, res) => {
  const db = await main();
  const master_jobrole = db.collection("master_jobrole");

  const jobroleOptionList =
    (await master_jobrole
      .find({}, { projection: { name: 1, id: 1 } })
      .toArray()) || [];
  return sendResponse(res, 200, "JobRole option List", jobroleOptionList);
});

//assesorDetails
exports.assesorById = asyncErrorHandler(async (req, res) => {
  const db = await main();
  const id=req.params.id;
  const master_assessor = db.collection("master_assessor");

  const assesorDetails =
    await master_assessor
      .find({id:id})
      .toArray();
  return sendResponse(res, 200, "Assesor Details", assesorDetails);
});

