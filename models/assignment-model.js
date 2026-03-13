const mongoose = require("mongoose");

const assignmentSchema = mongoose.Schema({
    date: {
        type: Number
    },
    day: {
        type: String
    },
    month: {
        type: String,
    },
    year: {
        type: Number
    },
    totalAssessment: {
        type: Number
    }
}, { timestamps: true })

const Assignment = mongoose.model("Assignment", assignmentSchema)

module.exports = Assignment;
