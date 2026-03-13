const mongoose = require("mongoose");

const oldResultSchema = mongoose.Schema({

    candidate_mongo_id: { type:mongoose.Schema.Types.ObjectId, ref:'Candidate' },
    candidateId: { type: String},
    batch_mongo_id: { type:mongoose.Schema.Types.ObjectId, ref:'Batch' },
    batchId: {type: String},
    generatedBy: { type:mongoose.Schema.Types.ObjectId, ref: 'uuser' },
    generatedByName: { type: String },
    generatedAt: { type: String },
    
    answers: { 
        candidateId : {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Candidate'
        },
        setId: { type : mongoose.Schema.Types.ObjectId },
        assessmentId: { type : mongoose.Schema.Types.ObjectId },
        batchId: { type: mongoose.Schema.Types.ObjectId , ref:'Batch'},
        questions: [
                    {
                        _id : { type: mongoose.Schema.Types.ObjectId },
                        questionText:  {
                            type: String    
                        },
                        secondaryQuestionText:  {
                            type: String,
                            default: null    
                        },
                        questionImgKey: { 
                            type: String,
                            default: null
                        },
                        marks: { 
                            type: Number, 
                        },
                        serialNo : {
                            type: Number
                        },
                        question_bank_id: { 
                            type: mongoose.Schema.Types.ObjectId, 
                            ref: "QuestionBank"
                        },
                        options: [
                            {
                                optionKey: {
                                    type: String,
                                },
                                optionImgKey:{
                                    type: String,
                                    default: null 
                                },
                                optionValue: {
                                    type: String,
                                    
                                },
                                secondaryOptionValue: {
                                    type: String,
                                    default:null
                                },
                                isSelect: { 
                                    type: Boolean,
                                    default: false
                                },
                                _id: { 
                                    type: mongoose.Schema.Types.ObjectId
                                },
                                optionUrl: {
                                    type: String,
                                    default: null
                                }
                            }
                        ],
                        
                        questionStatus: {
                              notAttempt: {
                                type: Boolean,
                                default: true,
                              
                              },
                              answered: {
                                type: Boolean,
                                default: false,
                               
                              },
                              notAnswered: {
                                type: Boolean,
                                default: false,
                            
                              },
                              markForReview: {
                                type: Boolean,
                                default: false,
                             
                              },
                              answeredMarkForReview: {
                                type: Boolean, 
                                default: false
                              }
                        }
                    }
        ],
        currentSecondaryLanguage: { 
            type: String,
            default: null
        },
        isAssessmentSubmited: { 
            type: Boolean, 
            default: false
        },
        startTime: { 
            type : Date
        },
        endTime:{ 
            type: Date
        },
        isResumed: { 
            type: Boolean,
            default: false
        },
        lastQuestionId: { 
            type : String
        },
        lastQuestionSavedTime: { 
            type: Date
        },
        is24HoursPassed: {
            type: Boolean,
            default: false
        },
        isRestarted: { 
            type: Boolean,
            default: false
        },
        noAnswerSaved: { 
            type: Boolean, 
            default: true
        },
        remainingMiliseconds: { 
            type: String 
        },
        startMilliseconds: { 
            type: String 
        }
    
    },
    candidateReport: {
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
        assessmentFeedback: { 
            trainerQuality: { type: String, enum: ['Very Good', 'Good', 'Average', 'Poor', 'Very Poor', ''] },
            trainerMaterialQuality: { type: String, enum: ['Very Good', 'Good', 'Average', 'Poor', 'Very Poor', '']},
            infrastructureQuality: { type: String, enum: ['Very Good', 'Good', 'Average', 'Poor', 'Very Poor', '']},
            counselingMentoring: { type: String, enum: ['Very Good', 'Good', 'Average', 'Poor', 'Very Poor', ''] },
            trainingEffectiveness: { type: String, enum: ['Very Good', 'Good', 'Average', 'Poor', 'Very Poor', ''] },
            comments: { type: String },
        }
        
    },
    onlineResult: {
   
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
            jobRole: { type: String },
            qpCode: {type: String},
            version: { type: String},
            level: { type: String},
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
    
        // new added nos-separation 
        nosTheoryResult: [{
            nosId: {
                type:mongoose.Schema.Types.ObjectId,
                ref:'nosviva'
            },
            nosName: { type: String },
            theoryMarks: { type: Number },
            obtainedTheoryMarks: { type: Number },
            totalMarks: { type: Number},
            totalObtainedMarks : { type: Number}
     
        }],
        nosVivaResult: [{
            nosId: {
                type:mongoose.Schema.Types.ObjectId,
                ref:'nosviva'
            },
            nosName: { type: String },
            vivaMarks: { type: Number },
            obtainedVivaMarks: { type: Number },
            totalMarks: { type: Number},
            totalObtainedMarks : { type: Number }
     
        }],
        nosPracticalResult: [{
            nosId: {
                type:mongoose.Schema.Types.ObjectId,
                ref:'nosviva'
            },
            nosName: { type: String },
            practicalMarks: { type: Number },
            obtainedPracticalMarks: { type: Number },
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
    
    }


},{timestamps:true});

const OldResultModel = mongoose.model("oldResult", oldResultSchema)

module.exports = OldResultModel