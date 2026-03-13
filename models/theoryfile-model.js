const mongoose = require("mongoose")
 
const theoryFileSchema = new mongoose.Schema({
 
    fileKey : {
        type: String,
        required: true
    },
    isTheory:{
        type:Boolean,
        default:false,
        required:true
    },
    batch_id : {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Batch"
    },
    candidate_id:{
        type: mongoose.Schema.Types.ObjectId,
        ref: "Candidate"
    },
},
 
{timestamps: true}
 
)
 
 
const TheoryFilesModel = mongoose.model("theoryFiles", theoryFileSchema)
 
module.exports = TheoryFilesModel