const { boolean } = require('joi');
const mongoose = require('mongoose');

const userdemoSchema = new mongoose.Schema({
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: false
    },
    email: {
        type: String,
        required: true
    },
    mobile: {
        type: String,
        required: true
    },
    userRole: {
        type: String,
        required: true
    },
    organisationName:{
        type:String,
        required:false
    },
    acceptTermCondition:{
        type:Boolean
    },
    isMobileVerified:{
        type:Boolean,
        default:false
    },
    startDate: {
        type: String,
        required: false
    },
    endDate: {
        type: String,
        required: false
    },
    remarkId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'remark',
        required:false
    },
    remark:{
        type: String,
        required: false
    },
    isremark:{
        type:Boolean,
        required:false,
        default:false,
    },
    status:{
        type:String,
        enum:['active','inactive'],
        default:'inactive'
    }
}, {
    timestamps: true
});

const UserdemoProfile = mongoose.model('Userdemo', userdemoSchema);

module.exports =  UserdemoProfile ;