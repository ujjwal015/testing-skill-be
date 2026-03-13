const { exitOnError } = require("winston");
const NosTheory = require("../models/nos-theory-model");
const NosViva = require("../models/nos-viva-model");
const Question = require("../models/question");
const PracticalQuestion = require("../models/practicalQuestion-model");
const VivaQuestion = require("../models/vivaQuestion-model");
const setName = require("../models/setsModel");
const responseMessage = require("../utils/responseMessage");
const { sendResponse, errorResponse } = require("../utils/response");
const createAssesmentModel = require("../models/createAssesment-model");
const Batch = require("../models/batch-model");
const QuestionBank = require("../models/questionBankModel");
const Joi = require("@hapi/joi");



module.exports.createQuestionPaper = async (batch, res) => {
  try {
    const { batchId } = batch;
    const batchDetails = await Batch.findById(batchId).populate([
      { path: "schemeId", select: "schemeName" },
      { path: "jobRole", select: "jobRole" },
      { path: "questionPaper.multipleJobRole.jobRoleId", select: "jobRole"}
    ]);

    const existingNos = []
    const noOfSet = batchDetails.questionPaper.questionSet;

    const sectionObj = { theory: false, practical: false, viva: false };

    await batchDetails.questionPaper.sectionTable.forEach((item) => {
      if (item.sectionName == "theory" && item.isSelected) {
        sectionObj.theory = true;
      }
      if (item.sectionName == "practical" && item.isSelected) {
        sectionObj.practical = true;
      }
      if (item.sectionName == "viva" && item.isSelected) {
        sectionObj.viva = true;
      }
    });

    if(batchDetails.questionPaper?.isMultiJobRole){

        
        const error = [] 
        let updateAssesment

        // await batchDetails.questionPaper.multipleJobRole.forEach(async (jobrole)=> { 
        //     let version = jobrole.version
        //     let level = jobrole.level
        //     let jobRole = jobrole.jobRoleId.jobRole

        //     const totalMarks = async () => {
        //       console.log('jobRole-->', jobRole)
        //       console.log('version-->', version)
        //       console.log('level-->', level)
        //       let nosList = await getNosList(jobRole, version, level);
      
        //       return nosList[0]?.nosData.reduce((acc, curr) => {
        //         acc = acc + Number(curr.totalTMPQ);
        //         return acc;
        //       }, 0);
        //     };

        //     let subTotal = await totalMarks();
        //     total = total + subTotal 

        //     let req_data = {
        //       assessmentName: `Assessment-${batchDetails.batchId}`,
        //       assessmentCode: `Assessment-${batchDetails.batchId}`,
        //       batch_id: batchDetails._id.toString(),
        //       batchMode: batchDetails.batchMode,
        //       level,
        //       version,
        //       section: sectionObj,
        //       scheme: batchDetails.schemeId.schemeName,
        //       noOfSet,
        //       jobRole: jobRole,
        //       totalMarks: subTotal ? subTotal : 0,
        //       status: "active",
        //       passingPercentage: batchDetails.questionPaper.passingPercentage,
        //       isMultiJobRole: batchDetails.questionPaper.isMultiJobRole ? true:false
        //     };


        //     updateAssesment = await addAssesment(req_data, res);

        //     console.log('updateAssesment------->>', updateAssesment)

        //     if (updateAssesment && updateAssesment.saveAssesmentDetails) {
        //       error.push({ error: false, message: "Exam Paper Create Sucessfully" })
        //     } else {
        //       const AssesmentsDetails = await createAssesmentModel
        //         .find({})
        //         .sort({ createdAt: "-1" });
      
        //       error.push({ error: true, message: updateAssesment.message })
        //     }

        // })

        async function mainFunction() {
          const multipleJobRole = batchDetails.questionPaper.multipleJobRole;
          let total = 0
          for (let i = 0; i < multipleJobRole.length; i++) {
            const jobrole = multipleJobRole[i];
            let version = jobrole.version;
            let level = jobrole.level;
            let jobRole = jobrole.jobRoleId.jobRole;
        
            const totalMarks = async () => {
              // console.log('jobRole-->', jobRole);
              // console.log('version-->', version);
              // console.log('level-->', level);
              let nosList = await getNosList(jobRole, version, level);
        
              return nosList[0]?.nosData.reduce((acc, curr) => {
                acc = acc + Number(curr.totalTMPQ);
                return acc;
              }, 0);
            };
        
            let subTotal = await totalMarks();
            total = total + subTotal;
            // console.log('total-->', total)
            let req_data = {
              assessmentName: `Assessment-${batchDetails.batchId}`,
              assessmentCode: `Assessment-${batchDetails.batchId}`,
              batch_id: batchDetails._id.toString(),
              batchMode: batchDetails.batchMode,
              level,
              version,
              section: sectionObj,
              scheme: batchDetails.schemeId.schemeName,
              noOfSet,
              jobRole: jobRole,
              jobRoleId: jobrole.jobRoleId._id,
              totalMarks: total ? total : 0,
              status: "active",
              passingPercentage: batchDetails.questionPaper.passingPercentage,
              isMultiJobRole: batchDetails.questionPaper?.isMultiJobRole ? true : false
            };
            console.log("existingNos from createQuestionPapper-->", existingNos)
            let updateAssesment = await addAssesment(req_data, res, existingNos);
        
            // console.log('updateAssesment------->>', updateAssesment);
        
            if (updateAssesment && updateAssesment.saveAssesmentDetails) {
              existingNos.push(...updateAssesment.existingNosList)
              error.push({ error: false, message: "Exam Paper Create Sucessfully" });
            } else {
              // const AssesmentsDetails = await createAssesmentModel
              //   .find({})
              //   .sort({ createdAt: "-1" });
        
              error.push({ error: true, message: updateAssesment.message });
            }
          }
        }
        
        await mainFunction();
        

        if(error.every(item=>!item.error)){
          return { error: false, message: "Exam Paper Create Sucessfully" }
        }
        else{
          console.log('error-->', error) 
          return { error: true, message: updateAssesment?.message }
        }


    }
    else{ 

      const version = batchDetails?.questionPaper?.version;
      const level = batchDetails?.questionPaper?.level;
      const jobRole = batchDetails?.jobRole.jobRole;

      const totalMarks = async () => {
      
        let nosList = await getNosList(jobRole, version, level);

        return nosList[0]?.nosData.reduce((acc, curr) => {
          acc = acc + Number(curr.totalTMPQ);
          return acc;
        }, 0);
      };
      
      let total = await totalMarks();

      let req_data = {
        assessmentName: `A-${batchDetails.jobRole.jobRole}-${batchDetails.batchId}`,
        assessmentCode: `A-${batchDetails.jobRole.jobRole}-${batchDetails.batchId}`,
        batch_id: batchDetails._id.toString(),
        batchMode: batchDetails.batchMode,
        level,
        version,
        section: sectionObj,
        scheme: batchDetails.schemeId.schemeName,
        noOfSet,
        jobRole: batchDetails.jobRole.jobRole,
        totalMarks: total ? total : 0,
        status: "active",
        passingPercentage: batchDetails.questionPaper.passingPercentage,
        // createdBy:nosList[0]._id
      };
      let updateAssesment = await addAssesment(req_data, res, existingNos);

      if (updateAssesment && updateAssesment.saveAssesmentDetails) {
        return { error: false, message: "Exam Paper Create Sucessfully" };
      } else {
        const AssesmentsDetails = await createAssesmentModel
          .find({})
          .sort({ createdAt: "-1" });

        return { error: true, message: updateAssesment.message };
      }

    }

    
  } catch (error) {
    console.log("error", error);
    return { error: true, message: "Something Went Wrong" };
  }
};


const selectTheoryQuestion = async (nosData, sectionList, index, jobRoleId) => {
  let questionPapers = [];
  const questionBankDetails = await QuestionBank.findOne({
    $and: [
      { nosId: nosData._id.toString() },

      { jobRole: sectionList?.jobRole },
      { section: "Theory" },
      { status:'active'},
      { jobLevel: nosData.level },
      { version: nosData.version },
    ],
  }).select("section questionBankautoId");



  if (questionBankDetails == null)
    return { error: true, message: `${nosData.NOS}-${sectionList?.jobRole}-${nosData.level}-${nosData.version} not contain active questionbank` };

  const queryForEasy = {
    $and: [
      { difficulty_level: "Easy" },
      { marks: nosData.easyMPQ },
      { question_bank_id: questionBankDetails._id },
    ],
  };
  const queryForMedium = {
    $and: [
      { difficulty_level: "Medium" },
      { marks: nosData.mediumMPQ },
      { question_bank_id: questionBankDetails._id },
    ],
  };
  const queryForHard = {
    $and: [
      { difficulty_level: "Difficult" },
      { marks: nosData.difficultMPQ },
      { question_bank_id: questionBankDetails._id },
    ],
  };

  const EasyLength = await addCountQuestions(queryForEasy);

  const MediumLength = await addCountQuestions(queryForMedium);

  

  const HardLength = await addCountQuestions(queryForHard);

  let EasyQuesitonDetails = await addQuestions(
    Math.floor(Math.random() * EasyLength),
    Number(nosData.easyNOQ),
    queryForEasy
  );

  let uniqueEasy = Array.from(
    new Set(EasyQuesitonDetails.map((item) => item._id.toString()))
  );

  if (uniqueEasy.length != nosData.easyNOQ) {
    questionPapers.push(
      ...(await addMoreQuestions(
        EasyQuesitonDetails,
        nosData.easyNOQ - EasyQuesitonDetails.length,
        nosData.easyNOQ,
        queryForEasy,
        index
      ))
    );
  }
  let MediumQuesitonDetails = await addQuestions(
    Math.floor(Math.random() * MediumLength),
    Number(nosData.mediumNOQ),
    queryForMedium
  );

  let uniqueMedium = Array.from(
    new Set(MediumQuesitonDetails.map((item) => item._id.toString()))
  );

  if (uniqueMedium.length != nosData.mediumNOQ) {
    questionPapers.push(
      ...(await addMoreQuestions(
        MediumQuesitonDetails,
        nosData.mediumNOQ - MediumQuesitonDetails.length,
        nosData.mediumNOQ,
        queryForMedium
      ))
    );
  }
  let HardQuesitonDetails = await addQuestions(
    Math.floor(Math.random() * HardLength),
    Number(nosData.difficultNOQ),
    queryForHard
  );
  let uniqueHard = Array.from(
    new Set(HardQuesitonDetails.map((item) => item._id.toString()))
  );

  if (uniqueHard.length != nosData.difficultNOQ) {
    questionPapers.push(
      ...(await addMoreQuestions(
        HardQuesitonDetails,
        nosData.difficultNOQ - HardQuesitonDetails.length,
        nosData.difficultNOQ,
        queryForHard,
        index
      ))
    );
  }
  let questionsA = [
    ...EasyQuesitonDetails,
    ...MediumQuesitonDetails,
    ...HardQuesitonDetails,
    ...questionPapers,
  ];

  let uniqueAll = Array.from(new Set(questionsA));

  if (uniqueAll.length > nosData.totalNOQ) {
    uniqueAll = uniqueAll.slice(0, nosData.totalNOQ);
  }

  return {
    questions: [...uniqueAll],
    totalQuestion: nosData.totalNOQ,
  };
};
const addCountQuestions = async (query) => {
  let questionss = await Question.countDocuments(query);
  return questionss;
};
const addQuestions = async (skipIndex, questionCount, query) => {
  let questionss = await Question.find(query)
    .select("_id")
    .skip(skipIndex)
    .limit(questionCount);
  return questionss;
};
const addMoreQuestions = async (
  questionPaper,
  noOfAddQuestion,
  questionCount,
  query,
  i
) => {
  if (questionPaper.length > questionCount) {
    questionPaper.splice(0, questionPaper.length - questionCount);
  } else {
    let questionss = await Question.find(query)
      .select("_id")
      .skip()
      .limit(questionPaper.length - questionCount);
    if (questionss.length > 0) {
      questionPaper.push(...questionss);
    }
  }

  let removedDuplicate = [
    new Set(...questionPaper.map((item) => item._id.toString())),
  ];
  return removedDuplicate;
};

const selectVivaQuestion = async (nosData, sectionList, index,pickQuestions) => {

  console.log('data-->', nosData._id, sectionList.jobRole, nosData.level, nosData.version)

  const query = {
    // $and: [{ nos: nosData.NOS, section: "viva" }],
    $and: [
        // { nosId: nosData._id.toString()},
        {$or: 
          [
            { nos: nosData.NOS},
            { nosId: nosData._id}
          ]
        }, 
        { section: "viva" },
        { status:"active"},
        { jobRole: sectionList?.jobRole },
        { jobLevel: nosData.level },
        { version: nosData.version },

      ]
  }

  console.log("query-->", query)
  let questionPapers=[];
  const questionBankDetails = await QuestionBank.findOne(query);
// const questionBankDetails = await QuestionBank.findOne({_id:"65bc6d479156f690e79c7b68"});
  
  console.log('questionBankDetails-->', questionBankDetails)
  if (questionBankDetails == null)
    return { error: true, message: `${nosData.NOS} not contain active questionbank in Viva Section` };
  let queryForViva={
    $and: [
      {
        question_bank_id: questionBankDetails?._id,
        marks:nosData.vivaMPQ
      },
    ],
  }

  //console.log('questionBankDetailsOfViva-->', questionBankDetails)

  const VivaLength = await VivaQuestion.countDocuments(queryForViva);

  //console.log('VivaLength-->', VivaLength)

  const VivaQuesitonDetails = await VivaQuestion.find(queryForViva)
    .select("_id")
    .skip(Math.floor(Math.random() * VivaLength))
    .limit(Number(nosData.vivaNOQ));
    let uniqueViva = Array.from(
      new Set(VivaQuesitonDetails.map((item) => item._id.toString()))
    );

    //console.log("VivaQuesitonDetails-->", VivaQuesitonDetails)
    //console.log("uniqueViva--->", uniqueViva)
  
    if (uniqueViva.length != nosData.vivaNOQ) {
      questionPapers.push(
        ...(await addMoreVivaQuestions(
          VivaQuestion,
          VivaQuesitonDetails,
          nosData.vivaNOQ - VivaQuesitonDetails.length,
          nosData.vivaNOQ,
          queryForViva,
          index
        ))
      );
    }
    let questionsViva=[
      ...VivaQuesitonDetails,
     ...questionPapers
    ]
    let uniqueVivaAll = Array.from(new Set(questionsViva));

    //console.log("uniqueVivaAll--->", uniqueVivaAll)

  if (uniqueVivaAll.length > pickQuestions) {
    uniqueVivaAll = uniqueVivaAll.slice(0, pickQuestions);
  }
  
  return {
    questions: [...uniqueVivaAll],
    totalQuestion: pickQuestions,
  };
};
const addMoreVivaQuestions=async(sh,
  questionPaper,
  noOfAddQuestion,
  questionCount,
  query,
  i)=>{
    let a=[] 
    if (questionPaper.length > questionCount) {
      questionPaper.splice(0, questionPaper.length - questionCount);
    } else {
      let questionss = await sh.find(query)
        .select("_id")
        .skip(Math.floor(Math.random() * noOfAddQuestion))
        .limit(questionPaper.length - questionCount);
        
      if (questionss.length > 0) {
       
        questionPaper.push(...questionss);
        //a=Array.from(new Set(...questionPaper.map((item) => item._id.toString())))
      }
    }
  
    let removedDuplicate = [
     ...questionPaper
    ];
    
    return removedDuplicate;

  }
const selectPracticalQuestion = async (nosData, sectionList, index,pickQuestions) => {
  let questionPapers=[];
  const questionBankDetails = await QuestionBank.findOne({
    // nos: nosData.NOS,
    // section: "practical",
    $and: [
      // { nosId: nosData._id},
      {$or: 
        [
          { nos: nosData.NOS},
          { nosId: nosData._id}
        ]
      }, 
      { section: "practical" },
      {status:'active'},
      { jobRole: sectionList?.jobRole },
      { jobLevel: nosData.level },
      { version: nosData.version },

    ]
  });
  if (questionBankDetails == null)
    return { error: true, message: `${nosData.NOS} not contain active questionbank in Practical Section` };
  let queryForPractical={
    $and: [
      {
        question_bank_id: questionBankDetails?._id,
        marks:nosData.practicalMPQ
      },
    ],
  }
  const PracticalLength = await PracticalQuestion.countDocuments(queryForPractical);

  const PracticalQuesitonDetails = await PracticalQuestion.find(queryForPractical)
    .select("_id")
    .skip(Math.floor(Math.random() * PracticalLength))
    .limit(Number(nosData.practicalNOQ));
    let uniquePractical = Array.from(
      new Set(PracticalQuesitonDetails.map((item) => item._id.toString()))
    );
    
    if (uniquePractical.length != nosData.practicalNOQ) {
      questionPapers.push(
        ...(await addMoreVivaQuestions(
          PracticalQuestion,
          PracticalQuesitonDetails,
          nosData.practicalNOQ - PracticalQuesitonDetails.length,
          nosData.practicalNOQ,
          queryForPractical,
          index
        ))
      );
    }
    let questionsPractical=[
      ...PracticalQuesitonDetails,
      ...questionPapers
    ]
    let uniquePracticalAll = Array.from(new Set(questionsPractical));

  if (uniquePracticalAll.length > pickQuestions) {
    uniquePracticalAll = uniquePracticalAll.slice(0, pickQuestions);
  }
 
  return {
    questions: [...uniquePracticalAll],
    totalQuestion: nosData.practicalNOQ,
  };

};

const updateSets = async ({
  assesment_id,
  batchDetails,
  setId,
  jobRole,
  version, 
  level,
  section,
  theoryNosList,
  count,
  existingNos
}) => {
  // console.log("existingNos from updateSet-->", existingNos)
  let questionPaper = [];
  let questionCount = 0;
  let nosList = "";
  // const version = batchDetails?.questionPaper?.version;
  // const level = batchDetails?.questionPaper?.level;

  let setDetails = await setName.findById(setId);
  if (section.theory) {
     nosList = await getNosList(jobRole, version, level);
    // console.log("rawNosList--->", rawNosList)
    // nosList = rawNosList
    // nosList[0].nosData = rawNosList[0].nosData.filter(item=> { 
    //     return !theoryNosList.some(nos => item.NOS === nos.nosName);
    // })

  }

  // console.log("nosList sabse final--->", nosList)

  
  //existingNosList removal logic 
  const nosList222 = []
  nosList[0].nosData.forEach(item=> { 
      if(!nosList222.includes(item.NOS)){
        nosList222.push(item.NOS)
      }
  })

  nosList[0].nosData = nosList[0].nosData.filter(item=>!existingNos.includes(item.NOS))
  // console.log('nosList[0--->', nosList[0])
  if( nosList[0].nosData.length < 1){
    return {status: true, nos: [], nosList222}
  }
  if (nosList !== "") {
    //for (item of nosList) {
      // console.log("nosList-->", nosList)
      for (const [index, item2] of nosList[0].nosData.entries()) {
 
        if (section.theory) {
          // console.log('item------------>', item)
          
          let questionsDetails = await selectTheoryQuestion(item2, nosList[0], index);
          //  console.log('questionDetails',questionsDetails)
          if (questionsDetails.error) {
            return {
              error: questionsDetails.error,
              message: `${questionsDetails.message} in Theory Section`,
            };
          } else {
            
            questionPaper.push(
              ...questionsDetails?.questions?.map((item) => item._id?.toString())
            );
          }

          questionCount =
            questionCount + Number(questionsDetails.totalQuestion);
        }
      }
      count++;
    //}
  } else {
    return { error: true, message: "No NOS Found" };
  }

  if (questionPaper.length > 0) {
    setDetails.question_id.push(...questionPaper);

    await setDetails.save();
    await updateQuestionOccurrence(setDetails.question_id, "theory")
    return {status: true, nos: nosList[0].nosData, nosList222};
  } else {
    await setName.deleteMany({ assesment_id });
    return {status: false, nos: null, nosList222};
  }
};
const addAssesment = async (req, res, existingNos) => {
  try {
    console.log("existingNos from addAssessment-->", existingNos)
    const { error } = await validateAddAssesment(req);
    if (error) return { error: true, message: error.message };
    const {
      assessmentName,
      assessmentCode,
      batchMode,
      level,
      version,
      batch_id,
      scheme,
      section,
      noOfSet,
      jobRole,
      totalMarks,
      status,
      passingPercentage,
      isMultiJobRole,
      jobRoleId
    } = req;

    let saveAssesment
    let existingNosList = []
    saveAssesment = await createAssesmentModel.findOne(
      {assessmentName: assessmentName})
      // ).sort({createdAt:-1
      // })
    // console.log("saveAssesment-->", saveAssesment)
  
    if(!isMultiJobRole){
      if (saveAssesment)
      return { error: true, message: "assesment already created" };
    }
    // console.log("condition--->", saveAssesment!=null)
    if(saveAssesment==null){
      // console.log("in if of save assessment")
      saveAssesment = await new createAssesmentModel({
        assessmentName,
        assessmentCode,
        batch_id,
        section,
        scheme,
        batchMode,
        status,
        jobRole,
        totalMarks,
        passingPercentage,
        isMultiJobRole: isMultiJobRole?true:false
      }).save();
      // console.log('saveAssessment from inside if-->', saveAssesment)
    }


      let setId = [];
      let nosList
    let setAlphabet = ["A", "B", "C", "D", "E", "F", "G"];
    // let nosList = await NosViva.find({ jobRole: jobRole });
    const rawNosList = saveAssesment.theoryNosList.map(item=>item.nosName)
    // console.log('rawNosList--->',rawNosList)

    if(isMultiJobRole){
      nosList = await NosViva.aggregate([
        {$match: { jobRole: jobRole, 'nosData.level': level, 'nosData.version': version }},
        {$project : {
            jobRole:1, 
            section:1,
            status:1,
            clientId: 1,
            createdAt:1,
            updatedAt:1,
            nosData: { $filter : { 
                    input: '$nosData',
                    as: 'item',
                    cond: { $not : { $in : ["$$item.NOS", rawNosList] }}
            }}
        }}
      ])

      // console.log('nosList aggregate-->', nosList)
    }
    else{ 
      nosList = await NosViva.find({ $and: [
        { jobRole: jobRole}, 
        {'nosData.level': level}, 
        {'nosData.version': version},
      ]})
    }

    // console.log('nosList of viva/practical-->', nosList, jobRole, level, version)

    let pickQuestions
    if(section.practical){
       pickQuestions= nosList[0]?.nosData.reduce((acc,curr)=>{
       
        if(curr.level==level && curr.version==version){
  
          acc=acc+Number(curr.practicalNOQ);
        }
        
        return acc;
      },0)

    }else{
      pickQuestions= nosList[0]?.nosData.reduce((acc,curr)=>{
       
        if(curr.level==level && curr.version==version){
  
          acc=acc+Number(curr.vivaNOQ);
        }
        
        return acc;
      },0)
    }

    for (item of nosList) {
      for (const [index, item2] of item.nosData.entries()) {
        if (section.practical) {
          
          let assesment = await createAssesmentModel.findById(
            saveAssesment._id
          );
          let questionpPaper = [];
          let questionsDetails = await selectPracticalQuestion(
            item2,
            item,
            index,
            pickQuestions
          );
          if (questionsDetails.error) {
            return questionsDetails;
          }
          questionpPaper.push(
            ...questionsDetails.questions.map((item) => item._id.toString())
          );
          assesment.practicalQuestion_id.push(...questionpPaper);
          await assesment.save();
          await updateQuestionOccurrence(assesment.practicalQuestion_id, "practical")
        }
        if (section.viva) {
          let assesment = await createAssesmentModel.findById(
            saveAssesment._id
          );
          let questionpvPaper = [];
          let questionsDetails = await selectVivaQuestion(item2, item, index,pickQuestions);
          if (questionsDetails.error) {
            return questionsDetails;
          }
          questionpvPaper.push(
            ...questionsDetails.questions.map((item) => item._id.toString())
          );
          assesment.vivaQuestion_id.push(...questionpvPaper);
          await assesment.save();
          await updateQuestionOccurrence(assesment.vivaQuestion_id, "viva")
        }
      }
    }
    let isInsertSets = await createAssesmentModel.findById(saveAssesment._id);
    const batchDetails = await Batch.findOne({ _id: batch_id })

    if(isInsertSets && section.theory && batchDetails){
      for (let i = 0; i < noOfSet; i++) {

        let existingSet 
        if(batchDetails.questionPaper?.isMultiJobRole){
          existingSet = await setName.findOne({assesment_id: saveAssesment._id})
        }

        if(existingSet){
          // console.log('existing set -->', existingSet)
          let updateSetStatus = await updateSets({
            existingNos: existingNos,
            assesment_id: isInsertSets._id,
            batchDetails: batchDetails,
            setId: existingSet._id,
            jobRole: jobRole,
            version: version, 
            level: level, 
            section,
            theoryNosList: saveAssesment.theoryNosList,
            i,
          });
          if (updateSetStatus.error) {
            return updateSetStatus;
          }
          existingNosList.push(...updateSetStatus.nosList222)
          //theoryNosList payload 
          const theoryNosList = []
          updateSetStatus.nos.forEach(item=>{ 
            let obj = { 
              nosName: item.NOS,
              nosId: item._id
            }
            theoryNosList.push(obj)
          })
          

          isInsertSets.multipleJobRole.push({
            jobRoleId: jobRoleId,
            version:version,
            level: level, 
            jobRoleName: jobRole
          }),

          isInsertSets.theoryNosList.push(...theoryNosList)
          isInsertSets.totalMarks = totalMarks
          isInsertSets.jobRole = batchDetails.questionPaper?.isMultiJobRole ?
              jobRole: jobRole
          await isInsertSets.save();
        }
        else{ 
          const setDetails = await new setName({
            setName: `Set-${setAlphabet[i]}`,
            assesment_id: saveAssesment._id,
            status: true,
            language: "English",
          }).save();
          setId.push(setDetails._id);
  
          let updateSetStatus = await updateSets({
            assesment_id: isInsertSets._id,
            existingNos:existingNos,
            batchDetails: batchDetails,
            setId: setDetails._id,
            jobRole: jobRole,
            version: version, 
            level: level, 
            section,
            theoryNosList: saveAssesment.theoryNosList ? saveAssesment.theoryNosList:null,
            i,
          });
          // console.log('update set status -->', updateSetStatus)
          if (updateSetStatus.error) {
            return updateSetStatus;
          }
          existingNosList.push(...updateSetStatus.nosList222)
          //theoryNosList payload 
          const theoryNosList = []
          updateSetStatus.nos.forEach(item=>{ 
            let obj = { 
              nosName: item.NOS,
              nosId: item._id
            }
            theoryNosList.push(obj)
          })
          
           isInsertSets.theoryNosList.push(...theoryNosList)

          // console.log("setId hai ---->", setId)
          isInsertSets.set_id = setId;
          isInsertSets.multipleJobRole.push({
              jobRoleId: jobRoleId,
              version:version,
              level: level, 
              jobRoleName: jobRole
          })
          await isInsertSets.save();
        }

        
      }
     
    }

      if (saveAssesment) {
        return { saveAssesmentDetails: isInsertSets, error: false, existingNosList };
      } else {
        return { error: true, message: "Assesment could not create" };
      }

    
    
    

    
  } catch (error) {
    console.log("error----->", error);
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

const getNosList = async (jobRole, version, level) => {
  const jobRoleId = await NosTheory.findOne({
    jobRole: jobRole,
    nosData: {
      $elemMatch: {
        version: version,
        level: level,
      },
    },
  });

  // console.log('jobRoleId--->', jobRoleId)

  const query = [
    {
      $match: { _id: jobRoleId._id },
    },
    {
      $project: {
        jobRole: 1,
        section: 1,
        status: 1,
        nosData: {
          $filter: {
            input: "$nosData",
            as: "nosData",
            cond: {
              $and: [
                { $eq: ["$$nosData.version", version] },
                { $eq: ["$$nosData.level", level] },
              ],
            },
          },
        },
        _id: 0,
      },
    },
  ];

  const nosList = await NosTheory.aggregate(query);
  return nosList;
};
async function validateAddAssesment(data) {
  try {
    const schema = Joi.object({
      assessmentName: Joi.string().required(),
      assessmentCode: Joi.string().required(),
      status: Joi.string().required(),
      level:Joi.string().required(),
      version:Joi.string().required(),
      batch_id: Joi.string().required(),
      section: Joi.object().required(),
      batchMode: Joi.string().required(),
      question_id: Joi.array(),
      scheme: Joi.string().allow(""),
      jobRole: Joi.string().trim().required(),
      totalMarks: Joi.number().required(),
      noOfSet: Joi.number(),
      passingPercentage: Joi.number().required(),
      isMultiJobRole: Joi.boolean().allow(""),
      jobRoleId: Joi.any()
    });
    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
}

const updateQuestionOccurrence = async (questionList, section) => {
  
        if(!Array.isArray(questionList)){
          throw Error("Invalid or empty question list")
        }

        const models = {
          theory: Question,
          viva: VivaQuestion,
          practical: PracticalQuestion,
        };

        const model = models[section]
        if(!model){
          throw Error("Invalid section")
        }

        await model.updateMany({_id: { $in : questionList }}, { $inc: { "stats.occurrence" : 1 }})
}