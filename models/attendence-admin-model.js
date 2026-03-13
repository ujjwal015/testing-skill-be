
const mongoose=require('mongoose');


const attendenceAdminSchema=mongoose.Schema({
    //clockin for clockin time
      clock_in_time:{
        type:Date,
        default:new Date
      },
      //clockout for clockout time
      clock_out_time:{
        type:Date
      },
      //idle time when user idle
      idle_time:{
        type:Number,
        default:0
      },
      //effective time when user effective
      effective_time:{
           type:Number,
           default:0
      },
      //when user on portal
      is_clock_in:{
        type:Boolean,
        default:false
      },
      //when user leave portal
      is_clock_out:{
        type:Boolean,
        default:false
      },
      //clocked out by system
      auto_clocked_out:{
        type:Boolean,
        default:false
      },
      //userId reference to user collection
      user_id:{
          type:mongoose.Schema.Types.ObjectId,
          ref:'uusers',
          required:true

      },
      //user details login logout for particular day
      attendence_log:[{
          startTime:String,
          endTime:String
      }],
      attendence_date:{
        type:Date
      }
     },{timestamps:true});
attendenceAdminSchema.pre('save', function (next) {
    if (this.clock_out_time) {
      const totalTime = this.clock_out_time - this.clock_in_time;
      this.effective_time = totalTime-this.idle_time; 
      this.idle_time = totalTime-this.effective_time; 
    }
    next();
  });
const AttendenceAdminModel=mongoose.model('attendenceAdmin',attendenceAdminSchema);

module.exports=AttendenceAdminModel;
