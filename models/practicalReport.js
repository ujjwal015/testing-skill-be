const { boolean } = require("@hapi/joi");
const mongoose = require("mongoose");

const practicalReportSchema = mongoose.Schema({

    mongoCandidateId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Candidate'
    },
    candidateId: { 
        type: String,
        required: true
    },
    assessmentId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'createAssesments'

    },
    batchId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Batch'
    },
    nosList: [{ 
        nosId: {
            type:mongoose.Schema.Types.ObjectId,
            ref:'Candidate'
        },
        nos: { type: String },
        marks: {type: Number},
        obtainedMarks: { type : Number}
    }]
   
    
},{timestamps:true});

const PracticalReportModel = mongoose.model("PracticalReport", practicalReportSchema)

module.exports = PracticalReportModel;