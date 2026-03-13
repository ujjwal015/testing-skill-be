const { boolean } = require('@hapi/joi');
const mongoose = require('mongoose');
const sectionSchema = new mongoose.Schema({
    question_bank_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuestionBank',
        required:true
    },
    questionType: {
        type: String,
        enum: ['MCQ', 'Objective'],
        required:true

    },
    jobRole: {
        type: String,
        required:true
    },
    nos: {
        type: String
    },
    section: {
        type: String,
        required: true
    },
    performanceCriteria: {
        type: String
    },
    language: {
        type: String,
        required: true
    },
    question_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'question'
    },
    status:{
        type:String,
        enum:['active','inactive'],
        default:'active'
    }


}, { timestamps: true });
const sections = mongoose.model('sections', sectionSchema);
module.exports = sections;