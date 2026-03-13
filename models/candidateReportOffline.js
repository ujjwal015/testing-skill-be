const { boolean } = require("@hapi/joi");
const mongoose = require("mongoose");

const candidateReportSchema = mongoose.Schema({
    numberOfQuestion:{
        type:Number,
        required:true
    },
    notAttemptQuestion:{
        type:Number,
        required:true
    },
    passingPercentage:{
        type:String,
        required:true
    },
    passedStatus:{
        type:String,
        enum:['Pass','Fail','Not-attempt'],
        default:'Not-attempt'
    },
    totalMarks: { 
        type: Number,
        required:true
    },
    percentageScored: { 
        type: String,
        required: true
    },
    totalObtainMarks:{
        type:Number,
        required:true
    },
    attemptQuestion:{
        type:Number,
        required:true
    },
    attemptToCopyPaste:{
        type:Boolean,
        default:false
    },
    attemptToNavigateOut:{
        type:Boolean,
        default:false
    },
    correctAnswer:{
        type:Number,
        required:true
    },
    wrongAnswer:{
        type:Number,
        required:true
    },
    candidateId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Candidate'
    },
    assessmentId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'createAssesments'

    },

    correctAnswerIds: [{ type: mongoose.Schema.Types.ObjectId , ref: "question"}],
    wrongAnswerIds: [{ type: mongoose.Schema.Types.ObjectId , ref: "question"}],

    batchId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Batch'
    },
    examId:{
        type:String
    },
    testTime:[{
        startTime:String,
        endTime:String,
        submitTime:String
    }],
    
},{timestamps:true});

const CandidateReportOffline = mongoose.model("CandidateReportOffline", candidateReportSchema)

module.exports = CandidateReportOffline;