const mongoose=require('mongoose');

const imageSchema=new mongoose.Schema({
    imageName:{
        type:String,
        required:true
    },
    image_path:{
        type:String,
        required:true
    },
    img:
    {
        data: Buffer,
        contentType: String
    },
    imageUrl:{
        type:String,
        required:true
    },
    imageMetaData:{
        type:String,

    }
    
},{timestamps: true});
const ImageModel=mongoose.model('images',imageSchema);
module.exports=ImageModel;