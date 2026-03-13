const mongoose = require("mongoose")

const answerSchema = new mongoose.Schema({ 
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

}, {
    timestamps: true
})

const AnswerModel = mongoose.model('answers', answerSchema)
module.exports = AnswerModel