const mongoose = require("mongoose")

const instructionSchema = new mongoose.Schema({
    instructions: [{
        language: {
            type: String,
            enum:[ "Hindi","Bengali","Marathi", "Telugu", "Tamil", "Gujarati", "Urdu","Kannada",
                   "Odia", "Malayalam","Punjabi", "Assamese", "Maithili", "English",
            ],
            default: 'English'
        },
        instructionDescription:{
            type:String,
            required:false
        }
    }],
    instructionId:{
        type: String,
        required: false
    },
    instructionName: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    },
    //old field
        language:{
        type:String,
        //enum:['Hindi', 'English', 'Both'],
        //default: 'English'
    },
    islanguageHindi:{
        type:Boolean,
        required: false
    },
    islanguageEnglish:{
        type:Boolean,
        required: false
    },
    islanguageBoth:{
        type:Boolean,
        required: false
    },
    descriptionEnglish:{
        type:String,
        required:false
    },
    descriptionHindi:{
        type:String,
        required:false
    }
}, { timestamps: true });

const createInstructionModel = mongoose.model('instruction', instructionSchema);
module.exports = createInstructionModel;

