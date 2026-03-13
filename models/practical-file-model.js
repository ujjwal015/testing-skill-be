
const mongoose = require("mongoose")

const practicalFilesSchema = new mongoose.Schema({

    fileKey : { 
        type: String,
        required: true 
    },
    isViva:{
        type:Boolean,
        default:false,
        required:true
    },
    isVideo:{
        type:Boolean,
        default:false,
        required:true
    },
    batch_id : { 
        type: mongoose.Schema.Types.ObjectId , ref: "Batch"
    },
    candidate_id:{ type: mongoose.Schema.Types.ObjectId , ref: "Candidate"},
    
},

{ timestamps : true}

)

const PracticalFilesModel = mongoose.model("practicalFiles", practicalFilesSchema)

module.exports = PracticalFilesModel