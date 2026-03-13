const mongoose = require("mongoose");

const batchMetaDataSchema = new mongoose.Schema({
    batchId: {
        type: String,
        required: true
    },
    batchMode: {
        type: String,
        enum: ['online', 'offline'],
        default:'online'       
    },
    jobRole: {
        type: String,
        required: true
    },
    scheduled: {
        type: Boolean,
        required: true
    },
    startDate: {
        type: String,
        required: true
    },
    endDate: {
        type: String,
        required: true
    },
    clientId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'client'
    }
}, { timestamps: true });

const BatchMetaData = mongoose.model("batchMetaData", batchMetaDataSchema);

module.exports = BatchMetaData;