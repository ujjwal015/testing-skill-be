const mongoose = require("mongoose");

const examCenterSchema = new mongoose.Schema({

            trainingPartner: { 
                type: mongoose.Schema.Types.ObjectId,
                ref: "trainingPartner"
            },
            examCenterName: {
                type: String,
                required:true
            },
            trainingCenterId:{
                type:String,
                required:true
            },
            mobile: {
                type: String,
                required:true
            },
            state: {
                type: String,
                required:true
            },
            district: {
                type: String,
                required: true
            },
            pincode: {
                type: String,
                required:true
            },
            address: {
                type: String,
                required: true
            },
            noOfSeats:{
                type:Number,
                required:true
            },
            status:{
                type:String,
                enum:['active','inactive'],
                default:'active'
            },
            locationURL: {
                type: String,
                required: true
            },
            poc: [{ 
                designation: { type: String },
                name: { type: String},
                email: { type: String},
                mobile: { type: String}
            }]
   

}, { timestamps: true });

const ExamCenter = mongoose.model("ExamCenter", examCenterSchema);
module.exports = ExamCenter;
