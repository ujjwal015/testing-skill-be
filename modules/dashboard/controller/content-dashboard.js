const { jobRolePaginate, teamMemberPaginate } = require("../util/jobRolePaginate")
const { errorResponse, sendResponse } = require("../../../utils/response");
const responseMessage = require("../../../utils/responseMessage");
const { COL_JOBROLE, 
        COL_THEORY_NOS,
            COL_VIVA_PRACTICAL_NOS, 
            COL_QUESTIONBANK,
            COL_PRACTICAL_QUESTION,
            COL_VIVA_QUESTION,
            COL_THEORY_QUESTION ,
            COL_USER,
            COL_ASSESSMENT_CONTENT,
            COL_CLIENT } = require("../../../utils/dbCollectionList")

const { asyncErrorHandler } = require('../../../utils/asyncErrorHandler');
const { default: mongoose } = require("mongoose");
const { getFileUrl } = require("../util/getFileUrl")


exports.contentDashboardCard = asyncErrorHandler( async (req, res, next) => { 

        let query
        let clientId = req?.query?.clientId ? req?.query?.clientId.split(',') : req?.user?.assigndClients
        clientId = req?.query?.clientId ? clientId.map(item=>mongoose.Types.ObjectId(item)) : req?.user?.assigndClients
        if(clientId) query = { clientId: { $in: clientId}} 

        const jobRoleCount = await COL_JOBROLE.countDocuments(query)
        const contentDataList = await COL_ASSESSMENT_CONTENT.find(query)

        // const totalBluePrint = contentDataList?.reduce((acc, curr)=> { 
        //     return acc = acc + (curr.bluePrintCount.theory + curr.bluePrintCount.vivaPractical)
        // }, 0)
        const totalBluePrint = contentDataList?.reduce((acc, curr)=> {
          let theory = curr.bluePrintCount.theory > 0 ? 1 : 0
          let vivaPractical = curr.bluePrintCount.vivaPractical > 0 ? 1 : 0
       
 
           
          return acc = acc + (theory + vivaPractical)
 
        }, 0)

        const toDoBluePrint = contentDataList?.reduce((acc, curr)=> { 
          if(curr.bluePrintCount.theory === 0){
            acc = acc + 1
          }
          if(curr.bluePrintCount.vivaPractical === 0){
            acc = acc + 1
          }

          return acc 

        }, 0)

        // const totalQuestionBank = contentDataList?.reduce((acc, curr)=> { 
        //   return acc = acc + (curr.nosBankCount.theory + curr.nosBankCount.viva + curr.nosBankCount.practical)
        // }, 0)

        const totalQuestionBank = contentDataList?.reduce((acc, curr)=> {
          let theory = curr.nosBankCount.theory > 0 ? 1 : 0
          let Viva = curr.nosBankCount.viva > 0 ? 1 : 0
          let Practical = curr.nosBankCount.practical > 0 ? 1 : 0
 
          return acc = acc + (theory + Viva + Practical)
 
        }, 0)

        const toDoQuestionBank = contentDataList?.reduce((acc, curr)=> { 
          if(curr.nosBankCount.theory === 0){
            acc = acc + 1
          }
          if(curr.nosBankCount.viva === 0){
            acc = acc + 1
          }
          if(curr.nosBankCount.practical === 0){
            acc = acc + 1
          }

          return acc 

        }, 0)

        const questionBanks = await COL_QUESTIONBANK.find(query);
        if(questionBanks.length < 1){
            return errorResponse(res, 400, "No question bank found", "No question bank found")
        }
    
        let theoryIds = [];
        let vivaIds = [];
        let practicalIds = [];
    
        questionBanks.forEach(item => {
            if (item.section === "Theory") {
                theoryIds.push(item._id);
            } else if (item.section === "viva") {
                vivaIds.push(item._id);
            } else if (item.section === "practical") {
                practicalIds.push(item._id);
            }
        });
    
        const [theoryCount, vivaCount, practicalCount] = await Promise.all([
            COL_THEORY_QUESTION.countDocuments({ question_bank_id: { $in: theoryIds } }),
            COL_VIVA_QUESTION.countDocuments({ question_bank_id: { $in: vivaIds } }),
            COL_PRACTICAL_QUESTION.countDocuments({ question_bank_id: { $in: practicalIds } })
        ]);


        const response = {
          jobRoleCount: jobRoleCount,
          totalBluePrintCount: totalBluePrint,
          toDoBluePrint,
          totalQuestionBankCount: totalQuestionBank, 
          toDoQuestionBank,
          primaryQuestionCount: theoryCount + vivaCount + practicalCount


        }

        return sendResponse(res, 200, "got data", response)
} )


//

exports.questionAnalytics = asyncErrorHandler( async (req, res, next) => { 

    let query
    let clientId = req?.query?.clientId ? req?.query?.clientId.split(',') : req?.user?.assigndClients
    clientId = req?.query?.clientId ? clientId.map(item=>mongoose.Types.ObjectId(item)) : req?.user?.assigndClients
    if(clientId) query = { clientId: { $in: clientId}} 

      
    const questionBanks = await COL_QUESTIONBANK.find(query);
    if(questionBanks.length < 1){
      return sendResponse(res, 200, "no question bank found", { 
        questionCount: {
            theory: 0,
            viva: 0,
            practical: 0
        }
      })
    }

    let theoryIds = [];
    let vivaIds = [];
    let practicalIds = [];

    questionBanks.forEach(item => {
        if (item.section === "Theory") {
            theoryIds.push(item._id);
        } else if (item.section === "viva") {
            vivaIds.push(item._id);
        } else if (item.section === "practical") {
            practicalIds.push(item._id);
        }
    });

    const [theoryCount, vivaCount, practicalCount] = await Promise.all([
        COL_THEORY_QUESTION.countDocuments({ question_bank_id: { $in: theoryIds } }),
        COL_VIVA_QUESTION.countDocuments({ question_bank_id: { $in: vivaIds } }),
        COL_PRACTICAL_QUESTION.countDocuments({ question_bank_id: { $in: practicalIds } })
    ]);

    const response = { 
        questionCount: {
            theory: theoryCount,
            viva: vivaCount,
            practical: practicalCount
        }
    };

    return sendResponse(res, 200, "got data", response)
} )

exports.languageAnalytics = asyncErrorHandler( async (req, res, next) => { 

    let query
    let clientId = req?.query?.clientId ? req?.query?.clientId.split(',') : req?.user?.assigndClients
    clientId = req?.query?.clientId ? clientId.map(item=>mongoose.Types.ObjectId(item)) : req?.user?.assigndClients
    if(clientId) query = { clientId: { $in: clientId}} 

    const questionBanks = await COL_QUESTIONBANK.find(query);
    if(questionBanks.length < 1){
      return sendResponse(res, 200, "no question bank found", { 
        totalCount:0,
        languages: []
    })
    }

    let theoryIds = [];
    let vivaIds = [];
    let practicalIds = [];

    questionBanks.forEach(item => {
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
              $match: { question_bank_id: { $in: ids } } 
          },
          { 
              $facet: {
                  languageCounts: [
                      { $unwind: "$lang" },
                      { $group: { _id: "$lang.language", count: { $sum: 1 } } }
                  ],
                  totalEnglish: [
                      { $group: { _id: "English", count: { $sum: 1 } } }
                  ]
              }
          },
          { 
              $project: {
                  counts: { 
                      $concatArrays: ["$languageCounts", "$totalEnglish"]
                  }
              }
          },
          { 
              $unwind: "$counts" 
          },
          { 
              $replaceRoot: { newRoot: "$counts" } 
          }
      ]);
        return otherLanguage

    };

    // Run aggregations in parallel for all three collections
    const [theoryLanguages, vivaLanguages, practicalLanguages] = await Promise.all([
        aggregateLanguageCounts(COL_THEORY_QUESTION, theoryIds),
        aggregateLanguageCounts(COL_VIVA_QUESTION, vivaIds),
        aggregateLanguageCounts(COL_PRACTICAL_QUESTION, practicalIds)
    ]);

    // Combine the language counts from all three collections
    const allLanguages = [...theoryLanguages, ...vivaLanguages, ...practicalLanguages];

    // Combine counts of the same language
    const languageCounts = allLanguages.reduce((acc, lang) => {
        if (!acc[lang._id]) {
            acc[lang._id] = 0;
        }
        acc[lang._id] += lang.count;
        return acc;
    }, {});

    // Calculate total counts and percentages
    const totalCount = Object.values(languageCounts).reduce((sum, count) => sum + count, 0);
    const languagePercentages = Object.keys(languageCounts).map(language => ({
        language,
        count: languageCounts[language],
        percentage: ((languageCounts[language] / totalCount) * 100).toFixed(2) // Fixed to 2 decimal places
    }));

    const response = { 
        totalCount,
        languages: languagePercentages
    };

    return sendResponse(res, 200, "got data", response)
} )

exports.jobRoleOccurrence = asyncErrorHandler( async (req, res, next) => { 

  let query
  let clientId = req?.query?.clientId ? req?.query?.clientId.split(',') : req?.user?.assigndClients
  clientId = req?.query?.clientId ? clientId.map(item=>mongoose.Types.ObjectId(item)) : req?.user?.assigndClients
  if(clientId) query = { clientId: { $in: clientId}} 

    const { page, limit, skip, sortOrder } = await jobRolePaginate(req);
    
    const totalCounts = await COL_JOBROLE.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);
    const jobRoleDetails = await COL_JOBROLE.find(query).select("jobRole occurred qpCode")
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    if (!jobRoleDetails)
      return errorResponse(
        res,
        400,
        responseMessage.job_role_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, responseMessage.job_role_found, {
      jobRoleDetails,
      page,
      totalCounts,
      totalPages,
    });
    
} )


exports.teamMembers = asyncErrorHandler( async (req, res, next) => { 
    
    const { roleId = "65a77bd0d0b713c333e4406e"} = req.query 
    let query  = {userRole : mongoose.Types.ObjectId(roleId)}


    const { page, limit, skip, sortOrder } = await teamMemberPaginate(req);
    
    const totalCounts = await COL_USER.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);
    let userDetails = await COL_USER.find(query)
      .select("firstName lastName email")
      .populate({
        path: "userRole",
        match: { _id: mongoose.Types.ObjectId(roleId) },
        select: "_id userRoleName",
        populate: { path: "userId" , select: "firstName lastName"}
      })
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    return sendResponse(res, 200, "Users found...", {
      userDetails,
      page,
      totalCounts,
      totalPages,
    });
    
} )


exports.clientWithJobRole = asyncErrorHandler(async (req, res, next) => {

      let clientId = req?.query?.clientId ? req?.query?.clientId.split(',') : req?.user?.assigndClients;
      clientId = clientId ? clientId.map(item => mongoose.Types.ObjectId(item)) : req?.user?.assigndClients;


      // Aggregation pipeline
      let result = await COL_CLIENT.aggregate([
          {
              $match: { _id: { $in: clientId } }
          },
          {
              $lookup: {
                  from: 'jobroles', // the collection name of QuestionJobrole model
                  localField: '_id',
                  foreignField: 'clientId',
                  as: 'jobRoleArray'
              }
          },
          {
              $project: {
                  clientname: 1,
                  email: 1,
                  webpage: 1,
                  clientcode: 1,
                  isProfilePicUploaded: 1,
                  jobRoleArray: 1
              }
          }
      ]);

      result = await Promise.all(result.map(async (item)=>{
        if(item.isProfilePicUploaded){
          return {...item, webpage: await getFileUrl(item.email)}
        }
        else{ 
          return { ...item, webpage: null}
        }
      }))

      return sendResponse(res, 200, "Data found...", {
        result
      });

});