const mongoose=require('mongoose');

const attendenceSchema=mongoose.Schema({
        clockInTime:{
            type:String,
            required:true
        },
        clockOutTime:{
            type:String,
            default:null,
            required:false
        },
        isClockOut:{
            type:Boolean,
            default:false
        },
        isClockIn:{
            type:Boolean,
            default:false
        },
        comment:{
            type:String,
            required:false
        },
        clockInImageKey:{
            type:String
        },
        clockOutImageKey:{
            type:String
        },
        duration:{
            type:String,
             default:null
        },
        location:{
            type:Object,
            latitude:{
                type:String
            },
            latitude:{
                type:String
            }
        },
        assesor_id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'assessor'
        },
        batch_id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Batch'
        },
        regularise_Id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'regularizeAttendence',
            default:null
        },
        QAverificationTimeStampId:{ //added for approve attendance 
            type: mongoose.Schema.Types.ObjectId,
            required:false
        },


},{timestamps:true});
const AttendenceModel=mongoose.model('attendence',attendenceSchema);
module.exports=AttendenceModel;