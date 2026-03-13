const mongoose = require('mongoose')

const clientSchema = new mongoose.Schema({
    sector: [{
        sectorId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "sector",
            required: true
        },
        sectorName: { type: String, required: true } 
    }],
    clientname:{
        type: String,
        required: true
    },
    address: { 
        type: String,
        required: true
    },
    client_city: { 
        type: String,
    },
    clientcode: { 
        type: String,
        required: true
    },
    email: { 
        type: String,
        required: true,
        //unique: true
    },
    landLine:{ 
        type: String,
    },
    mobile:{ 
        type: String,
    },
    organisationType: { 
        type: String,
        required: true
    },
    pincode: { 
        type: String,
        required: true
    },
    state: { 
        type: String,
        required: true
    },
    client_status: { 
        type: String,
        enum: ['Active', 'Inactive']
    },
    clientType: {
        type: String,
        enum: ['ncevt', 'other'],
        default:'other',
        required: false
    },
    webpage: { 
        type: String,
    },
    isProfilePicUploaded : {
        type : Boolean,
        default : false
    },
    spoke: [ 
        {
            spoke_name: { 
                type: String,
                required: true
            },
            spoke_email: { 
                type: String,
                required: true
            },
            spoke_mobile: { 
                type: String,
            },
            spoke_designation:{
                type: String,
                
            },
            spoke_department: { 
                type: String,
                required: true
            }
        }
    ]

}, { timestamps : true}

)

const ClientModel = mongoose.model('client', clientSchema)
module.exports = ClientModel

