const mongoose = require('mongoose');

const languages = ['Tamil', 'Hindi', 'Telugu' , 'Assamese' ,'Bengali', 'Gujarati', 'Kannada','Malayalam'
                    ,'Marathi','Punjabi', 'Odia']

const optionSchema = new mongoose.Schema({
    optionKey: {
        type: String,
        required:false
    },
    optionValue: {
        type: String,
        required:false
    },
    secondaryOptionValue: { 
        type: String,
        default: null
    },
    optionImgKey : {
        type: String,
        default: null
    },
    optionUrl: {
        type: String,
        default: null
    },
    isSelect: { 
        type: Boolean,
        default: false
    }
});

const answerSchema = new mongoose.Schema({
    rawAnswer: {
        type: String,
        required: true
    },
    answerId: {
        type: String,
    }
});

const questionSchema = new mongoose.Schema({ 

        question_bank_id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "QuestionBank",
        },
        questionText:  {
            type: String    
        },
        secondaryQuestionText: { 
            type: String,
            default: null
        },
        difficulty_level:{
            type: String,
            enum:['Easy','Medium','Difficult']
        },
        // jobRole:{
        //    type:String,
        //    required:false
        // },
        questionImgKey : {
            type: String,
            default: null
        },
        options: [optionSchema],

        answer: [answerSchema],

        marks: { 
            type: Number,
            default:0
        },
        setId : { 
            type: mongoose.Schema.Types.ObjectId,
            ref: 'sets'
        },
        serialNo : {
            type: Number
        },
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
        },
        stats: { 
            occurrence: { 
                type: Number, 
                default: 0
            },
            correctCount: { 
                type: Number, 
                default: 0
            },
            incorrectCount: { 
                type: Number, 
                default: 0
            },
            attemptCount: { 
                type: Number, 
                default: 0
            }
        },
        
        lang: [{
            language: { type: String , enum: languages },
            questionText: { type : String },
            questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'Question'},
            options:  [{

                optionKey: {
                    type: String,
                },
                optionValue: {
                    type: String,
                },
            }]
        }]
        
     
},
    {timestamps: true}

)

const Question = mongoose.model('Question', questionSchema);
module.exports = Question;




