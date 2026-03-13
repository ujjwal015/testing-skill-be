const mongoose=require('mongoose');


const assesmentContentSchema=new mongoose.Schema({
      sectorId:{
      type: mongoose.Schema.Types.ObjectId,
        ref: 'sector'
      },
      clientId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'client'
      },
      jobRoleId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Jobrole'
      },
      level:{
        type:Number,
        default:0
      },
      version:{
        type:Number,
        default:0
      },
      bluePrintCount:{
           theory:{
            type:Number,
            default:0
           },
           vivaPractical:{
            type:Number,
            default:0
           },

      },
      nosBankCount:{
        theory:{
         type:Number,
         default:0
        },
        viva:{
         type:Number,
         default:0
        },
        practical:{
            type:Number,
            default:0
           },
      },
      availableLanguage:[],
      status:{
        type:String,
        default:'active',
        enum:['active','inactive']
      }


}, { timestamps : true});

const assesmentContentModel=mongoose.model('assesmentContent',assesmentContentSchema);

module.exports=assesmentContentModel;