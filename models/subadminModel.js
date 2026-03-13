const mongoose = require('mongoose');

const subadminSchema = new mongoose.Schema(
{
    firstName: {
        type: String,
        required: true
    },
    lastName: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
    },
    mobile: {
        type: String,
        required: true
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
    userType: {
        type: Number,
        required: true
    },
    userRole: {
        type: String,
        required: false
    },
    status: {
        type: String,
        enum: ['active', 'inactive']
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'others', "transgender", "notSpecify"]
    },
    organisationName: {
        type: String,
        required: true,
    },
    isUserProfileCreated: {
        type: Boolean,
        default: true
    },
    fipsCode: {
        type: String,
    },
    isAdminApproved: {
        type: String,
        enum: ['accepted', 'rejected', 'pending']
    },
    isEmailVerified: {
        type: Boolean,
        default: true
    },
    pincode: {
        type: String,
        required: true
    },
    clientId: {
        type: Number,
        unique: true
    },
    description: {
        type: String
    },
    createdBy: {
        type: mongoose.Types.ObjectId,
        ref: "AdminProfile"
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
}, {
    timestamps: true
});

const Subadminprofile = mongoose.model('Subadminprofile', subadminSchema);

module.exports = Subadminprofile;