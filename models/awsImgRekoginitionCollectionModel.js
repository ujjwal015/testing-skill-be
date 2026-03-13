const mongoose = require("mongoose");

const RekognitionCollectionSchema = mongoose.Schema({
    name:{
        type:String,
    },

    
},{timestamps:true});

const RekognitionCollectionModel = mongoose.model("rekognitionCollection", RekognitionCollectionSchema)

module.exports = RekognitionCollectionModel;