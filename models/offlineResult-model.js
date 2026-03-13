const mongoose = require("mongoose");

const offlineResultSchema = mongoose.Schema({
   
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
    nosResult: [{ 
        // nosId: {
        //     type:mongoose.Schema.Types.ObjectId,
        //     ref:'Candidate'
        // },
        nosName: { type: String },
        theoryMarks: { type: Number },
        practicalMarks: { type: Number },
        vivaMarks: { type: Number },
        obtainedTheoryMarks: { type: Number },
        obtainedPracticalMarks: { type: Number },
        obtainedVivaMarks: { type: Number },
        totalMarks: { type: Number},
        totalObtainedMarks : { type: Number}

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

const OfflineResultModel = mongoose.model("OfflineResult", offlineResultSchema)

module.exports = OfflineResultModel;