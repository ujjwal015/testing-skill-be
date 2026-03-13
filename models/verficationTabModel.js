const mongoose=require('mongoose');

const verificationTabSchema=new mongoose.Schema({
        OuterTab:[],
         batchId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:''
         },
         assesorId:{
            type:mongoose.Schema.Types.ObjectId,
            ref:''
         },
         options: [
            {
                optionKey: {
                    type: String,
                    
                },
                optionValue: {
                    type: String,
                    
                },
                isSelect: { 
                    type: Boolean,
                    default: false
                },
                _id: { 
                    type: mongoose.Schema.Types.ObjectId
                }
            }
        ],
         tabs:[{
            
            tabName:{
                type:String
               },
               tabStatus:{
                 type:Boolean,
                 default:false
               }
         }]
        
},
{timestamps:true}
);
const verificationTabModel=mongoose.model('verificationTabStatus',verificationTabSchema);
module.exports=verificationTabModel;