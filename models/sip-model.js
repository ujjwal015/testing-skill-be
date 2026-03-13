const mongoose=require('mongoose');

const createSipSchema=new mongoose.Schema({
   sipData: [
         {
            jobroleId:{
                type:mongoose.Schema.Types.ObjectId,
                ref:'Jobrole',
                required:true
            },
            sipValidity: { 
                type: String,
                required: true
            },
            isSipUploaded:{
                type:Boolean,
                default:false
            },
            sipCertificateKey:{
                type:String,
                required:false
            },
            sipCertificateKey1:{
                type:String,
                required:false
            },
            email:{
                type:String,
                require:false
            }  
        } 
    ]
},{timestamps: true});
const createSipModel=mongoose.model('sipModel',createSipSchema);
module.exports=createSipModel;