const mongoose = require("mongoose");

const userProfileSchema = mongoose.Schema({
    firstName: {
        type: String,
        required: true,
    },
    lastName: {
        type: String,
        required: true,
    },
    usersId: {
        type: Number,
        unique: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    userType: {
        type: Number,
        required: true,
    },
    userRole: {
        type: String,
        required: false
    },
    mobile: {
        type: String,
        required: true,
    },
    address: {
        type: String,
        required: true
    },
    country: {
        type: String,
        default: "India"
    },
    state: {
        type: String,
        required: true
    },
    city: {
        type: String,
        required: true
    },
    pincode: {
        type: String,
        required: true,
    },
    status: {
        type: String,
        enum: ['active', 'inactive']
    },
    gender: {
        type: String,
        required: true,
        enum: ['male', 'female', "transgender", "notSpecify"]
    },
    description: {
        type: String
    },
    isEmailVerified: {
        type: Boolean
    },
    enabled: {
        type: Boolean,
        default: true
    },
    active: {
        type: Boolean,
        default: true
    },
    isUserProfileCreated: {
        type: Boolean,
    },
    user: {
        type: mongoose.Types.ObjectId,
        ref: 'User'
    },
    organisationName: {
        type: String,
        required: true
    },
    organisationId: {
        type: mongoose.Types.ObjectId,
        ref: "Subadminprofile"
    },
    fipsCode: {
        type: String
    },
    isAdminApproved: {
        type: String,
        required: true,
        default: "pending",
        enum: ['accepted', 'rejected', 'pending']
    },
    isTourComplete: {
        type: Boolean,
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

const UserProfile = mongoose.model("UserProfile", userProfileSchema)
module.exports = UserProfile;
