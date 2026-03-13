const mongoose = require("mongoose");

const adminProfileSchema = mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    password: {
        type: String,
    },
    userType: {
        type: Number,
        required: true,
    },
    address: {
        type: String,
        required: true,
    },
    country: {
        type: String,
        default: "India"
    },
    state: {
        type: String,
        required: true,
    },
    city: {
        type: String,
        required: true,
    },
    pincode: {
        type: String,
        required: true,
    },
    fipsCode: {
        type: String
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'others', "transgender", "notSpecify"]
    },
    userRole: {
        type: String,
        required: false
    },
    mobile: {
        type: String,
        required: true,
    },
    description: {
        type: String
    },
    status: {
        type: String,
        enum: ['active', 'inactive']
    },
    enabled: {
        type: Boolean,
        default: true
    },
    active: {
        type: Boolean,
        default: true
    },
    organisationName: {
        type: String
    },
    isUserProfileCreated: {
        type: Boolean,
        default: true
    },
    isAdminApproved: {
        type: String,
        default: "accepted",
        enum: ['accepted', 'rejected', 'pending']
    },
    isTourComplete: {
        type: Boolean
    },
    socialMedias: {
        twitter: {
            type: String,
            default: ""
        },
        facebook: {
            type: String,
            default: ""
        },
        youtube: {
            type: String,
            default: ""
        },
        linkedIn: {
            type: String,
            default: ""
        }
    }
}, { timestamps: true })

const AdminProfile = mongoose.model("AdminProfile", adminProfileSchema)
module.exports = AdminProfile;
