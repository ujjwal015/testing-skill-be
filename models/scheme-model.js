const mongoose = require("mongoose");

const SchemeManagementSchema = mongoose.Schema({
    schemeName: {
        type: String,
        required: true
    },
    
    schemeCode: {
        type: String,
        required: true
    },
    status:{
        type:String,
        enum:['active','inactive'],
        default:'active'
    }
}, { timestamps: true })

const SchemeModel = mongoose.model("Scheme", SchemeManagementSchema)
module.exports = SchemeModel;
