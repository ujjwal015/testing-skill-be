const mongoose = require("mongoose");
const languages = ['English', 'Hindi']

const mainSchema = new mongoose.Schema({
  //questionBankautoId
  question_bank_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "QuestionBank",
  },
  questionText: {
    type: String,
    required: true,
  },
  secondaryQuestionText: { 
    type: String,
    default: null
  },
  answer:{
    type: String,
    required: false,
  },
  secondaryAnswer: { 
    type: String,
    default: null
  },
  marks:{
    type:String,
    required: false,
  },
  status: {
    type: String,
    enum: ["active", "inactive"],
    default: "active",
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
    questionId: { type: mongoose.Schema.Types.ObjectId, ref: 'vivaQuestion'},
    answer: { type: String },
  }]




},{timestamps:true});

const Vivaquestion = mongoose.model("vivaQuestion", mainSchema);
module.exports = Vivaquestion;
