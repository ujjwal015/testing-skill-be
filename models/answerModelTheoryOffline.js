const mongoose = require("mongoose")

const answerOfflineTheorySchema = new mongoose.Schema({ 
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
                    questionNumber: { 
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


})

const AnswerOfflineTheoryModel = mongoose.model('answers-offline-theory', answerOfflineTheorySchema)
module.exports = AnswerOfflineTheoryModel