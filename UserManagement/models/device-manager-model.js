const { object } = require("@hapi/joi")
const mongoose = require("mongoose")

const deviceManagerSchema = new mongoose.Schema({

    device : { 
        type: String,
        required: true 
    },
    browser : { 
        type: String, 
        required: true
    },
    ipAddress: { 
        type: String, 
        required: true
    },
    userId:{ type: mongoose.Schema.Types.ObjectId , ref: "uuser"},
    
    location: { 
        type: String
    },
    isDeviceLogin:{
        type:Boolean,
        default:false
    },
    lastSession : { 
        type: String, 
        required: true
    }
},

{ timestamps : true}

)

const DeviceManagerModel = mongoose.model("deviceManagers", deviceManagerSchema)

module.exports = DeviceManagerModel