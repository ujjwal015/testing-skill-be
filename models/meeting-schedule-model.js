const mongoose = require("mongoose");

const scheduleMeetingSchema = mongoose.Schema({
    title: {
        type: String,
        required: true,
    },
    from_userid:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'uuser'
    },
    to_userid:{
        type:mongoose.Schema.Types.ObjectId,
        ref:'Userdemo'
    },
    meeting_type:{
         type:String,
         enum:['external','lead'],
         default:'external'
    },
    schedule_date:{
        type: String,
        required: true,
    },
    start_time:{
        type: String,
        required: true,
    },
    end_time:{
        type: String,
        required: true,
    },
    status:{
        type: Boolean,
        required: false,
        default:true
    },
}, { timestamps: true })

const scheduleMeetingModel = mongoose.model("scheduleMeeting",  scheduleMeetingSchema)
module.exports = scheduleMeetingModel;
