const mongoose = require("mongoose");

const SubSchema = mongoose.Schema({
    schemeId: {
        type:mongoose.Schema.Types.ObjectId,
        ref:'Scheme',
        required:true
    },
    clientId: {
        type:mongoose.Schema.Types.ObjectId,
        ref:'client',
        required:false
    },
    subSchemeName: {
        type: String,
        required: true
    },
    subSchemeCode: {
        type: String,
        required: true
    },
    status:{
        type:Boolean,
        default:true
    }
}, { timestamps: true })

const SchemeModel = mongoose.model("SubSchemes", SubSchema)
module.exports = SchemeModel;
