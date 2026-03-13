const mongoose = require("mongoose");

const JobroleSchema = mongoose.Schema({
    jobRole: {
        type: String,
        required: true,
    },
    clientId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'client',
        required:true
    },
    qpCode:{
        type: String,
        required: true,
        maxlength: [25, 'QPCode must be at most 25 characters long'],
    },
    status:{
        type: Boolean,
        required: false,
        default:true
    },
}, { timestamps: true })

// Performance optimization indexes for batch controller
JobroleSchema.index({ 
    clientId: 1, 
    jobRole: 1 
}, { 
    name: 'idx_jobrole_client',
    background: true 
});

const QuestionJobrole = mongoose.model("Jobrole",  JobroleSchema)
module.exports = QuestionJobrole;
