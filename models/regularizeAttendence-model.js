const mongoose=require('mongoose');

const attendenceRegularizeSchema=mongoose.Schema({
     
        clockInTime:{
            type:String,
            required:true
        },
        clockOutTime:{
            type:String,
            required:false
        },
        captureImageKey:{
            type:String
        },
        duration:{
            type:String,

        },
        location:{
            type:Object,
            latitude:{
                type:String
            },
            longitude:{
                type:String
            }
        },

        assesor_id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'assessor',
            required:false
        },
        batch_id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'Batch',
            required:false
        },
        attendence_id:{
            type:mongoose.Schema.Types.ObjectId,
            useref:'attendence',
            required:false
        },
        isApprove:{
        type: String,
        enum: ['pending', 'approve', 'reject'],
        default:'pending' 
        },
        remark:{
            type:String,
            required: false,
        },
        comment:{
            type:String,
            required:false
        },
        clockInImageKey:{
            type:String
        },
        status:{
            type:String,
            required:false
        },
        isSelectAll:{
            type:Boolean,
            required: false
        },
        QAverificationTimeStampId:{ //added for approve attendance 
            type: mongoose.Schema.Types.ObjectId,
            required:false
          },

},{timestamps:true});
const  AttendenceModel=mongoose.model('regularizeAttendence',attendenceRegularizeSchema);
module.exports=AttendenceModel;