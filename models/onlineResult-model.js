const mongoose = require("mongoose");

const onlineResultSchema = mongoose.Schema({
   
    candidateId:{
        type:String,
    },
    candidate_mongo_id: { 
            type:mongoose.Schema.Types.ObjectId,
            ref:'Candidate'
    },
    batchId:{
        type:String,
    },
    batch_mongo_id: { 
        type:mongoose.Schema.Types.ObjectId,
        ref:'Batch'
    },
    
    candidateName: { 
        type: String,
    },
    // feedbackPercentage: {
    //     type: String,
    // },
    // comment: { 
    //     type: String,
    // },
    nosResult: [{ 
        // nosId: {
        //     type:mongoose.Schema.Types.ObjectId,
        //     ref:'Candidate'
        // },
        nosName: { type: String },
        theoryMarks: { type: Number , default: 0},
        practicalMarks: { type: Number , default: 0},
        vivaMarks: { type: Number, default: 0 },
        obtainedTheoryMarks: { type: Number, default: 0 },
        obtainedPracticalMarks: { type: Number, default: 0 },
        obtainedVivaMarks: { type: Number, default: 0 },
        totalMarks: { type: Number , default: 0},
        totalObtainedMarks : { type: Number , default: 0}

    }],
    totalTheoryMarks: { type: Number },
    totalPracticalMarks: { type: Number },
    totalVivaMarks: { type: Number },
    obtainedTotalTheoryMarks: { type: Number },
    obtainedTotalPracticalMarks: { type: Number },
    obtainedTotalVivaMarks: { type: Number },
    grandTotalMarks: { type: Number},
    obtainedGrandTotalMarks : { type: Number},
    percentage: { type: String },
    result: { type: String}

},{timestamps:true});

const OnlineResultModel = mongoose.model("OnlineResult", onlineResultSchema)

module.exports = OnlineResultModel;