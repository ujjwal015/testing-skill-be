const mongoose = require('mongoose');

const trainingPartnerSchema = new mongoose.Schema({
    
    trainingPartner: { 
        type: String, 
        required: true
    },
    tpId: {
        type: String,
        required: false,
    },
    address: {
        type: String,
        required: false
    },
    pincode: {
        type: String,
        required: false
    },
    district: {
        type: String,
        required: false
    },
    state: {
        type: String,
        required: false
    },
    spocName: {
        type: String,
        required: false
    },
    spocMobile: {
        type: String,
        required: false
    },
    spocEmail: {
        type: String,
        required: false
    },
    

}, { timestamps: true });

const TrainingPartnerModel = mongoose.model('trainingPartner', trainingPartnerSchema);
module.exports = TrainingPartnerModel;