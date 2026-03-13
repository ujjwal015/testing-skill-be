const mongoose = require("mongoose");

const QuestionBankSchema = new mongoose.Schema({
    // theoryQuestionId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Question' }],
    // vivaQuestionId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'vivaQuestion' }],
    // practicalQuestionId: [{ type: mongoose.Schema.Types.ObjectId, ref: 'practicalQuestion' }],
    clientId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'client'
    },
    questionBankautoId: {
        type:String,
        required:true
    },
    secondaryLanguage: { 
        type: Boolean,
        default: false
    },
    questionCount: {
        type:String,
        required:true
    },
    jobRoleId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'jobrole'
    },
    jobRole: {
        type: String,
        required: true,
    },
    qpCode: {
        type: String,
        required: true,
    },
    jobLevel:{
        type:String,
        required:true
    },
    version:{
        type:String,
        required:false
    },
    section: {
        type: String,
        required: true
    },
    nos: {
        type: String,
        required: true
    },
    nosId: {
        type: String,
        required: true
    },
    questionType: {
        type: String,
        enum: ['objective','oral questioning','demonstrating'],
        required:true

    },
    language:{
        type:String,
        required:true,
        enum:['hindi', 'english'],
        default: 'english'
    },
    status:{
        type:String,
        enum:['active','inactive'], 
        default:'inactive'
    }
}, { timestamps: true })

// Performance optimization indexes for batch controller
QuestionBankSchema.index({ 
    jobRole: 1, 
    status: 1, 
    section: 1, 
    jobLevel: 1, 
    version: 1 
}, { 
    name: 'idx_questionbank_performance',
    background: true 
});

QuestionBankSchema.index({ 
    clientId: 1, 
    jobRole: 1, 
    status: 1, 
    section: 1 
}, { 
    name: 'idx_questionbank_client',
    background: true 
});

QuestionBankSchema.index({ 
    jobRole: 1, 
    nos: 1, 
    status: 1, 
    section: 1 
}, { 
    name: 'idx_questionbank_nos',
    background: true 
});

const QuestionModel = mongoose.model("QuestionBank", QuestionBankSchema)
module.exports = QuestionModel;
