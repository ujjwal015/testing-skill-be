const mongoose = require('mongoose')

const userRoleSchema = new mongoose.Schema({

    userRoleName: { 
        type: String, 
        required: true
    },
    userAssigned: { 
        type: Number, 
        default: 0
    },
    userId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'uuser'
    },
    features: [
        {
            featureName: { 
                type: String
            },
            enabled : { 
                type: Boolean
            },
            subFeatures: [
                { 
                    subFeatureName: { 
                        type: String
                    },
                    enabled : { 
                        type: Boolean
                    },
                    permissions: {
                        
                        view : {
                            type: Boolean,
                            default: false
                        },
                        add : {
                            type: Boolean,
                            default: false
                        },
                        edit : {
                            type: Boolean,
                            default: false
                        },
                        delete : {
                            type: Boolean,
                            default: false
                        },
                        export : {
                            type: Boolean,
                            default: false
                        },
                        status : {
                            type: Boolean,
                            default: false
                        },
                    }
                }
            ],
        }
    ]


},
    { timestamps : true}
)

const UserRoleModel = mongoose.model('userRole', userRoleSchema)
module.exports = UserRoleModel