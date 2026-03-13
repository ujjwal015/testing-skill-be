const mongoose = require("mongoose");

const setSchema = mongoose.Schema({
    setName:{
        type:String,

    },
    assesment_id:{
            type:mongoose.Schema.Types.ObjectId,
            ref:'assesments'
        },
    
    status:{
        type:Boolean,
        default:true
    },
    language:{
        type:String,
        default:'English'
    },
    question_id:[
        {
            type:mongoose.Schema.Types.ObjectId,
            ref:'Question'
        }
    ]
 
    
},{timestamps:true});
const sets = mongoose.model("sets", setSchema);
module.exports = sets