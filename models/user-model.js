const mongoose = require("mongoose")

const userSchema = new mongoose.Schema({

    firstName : { 
        type: String,
        required: true 
    },
    lastName : { 
        type: String, 
        required: false
    },
    isSuperAdmin: { 
        type: Boolean,
        default: false
    },
    gender: { 
        type: String, 
        enum: ['male', 'female', "transgender", "notSpecify"]
    },
    mobile: { 
        type: String
    },
    address: { 
        type: String
    },
    country: { 
        type: String
    },
    state: { 
        type: String
    },
    email : { 
        type: String, 
        required: true
    },
    userName : { 
        type: String, 
        required: true
    },
    isProfilePicUploaded : { 
        type: Boolean,
        default: false
    },
    ProfileKey : { 
        type: String
    },
    status: { 
        type: String,
        enum: ['active', 'inactive'],
        default: 'inactive'
    },
    isPasswordChangeEmailSend: { 
        type: Boolean,
        default: false
    },
    isInitialPasswordChanged: { 
        type: Boolean, 
        default: false
    },
    password: { 
        type: String,
    },
    isUserProfileCreated:{
        type:Boolean,
        default: true
    },
    isAdminApproved:{
        type:String,
        enum:['accepted','rejected','pending'],
        default: 'pending'
    },
    userType: { 
        type:Number,
        default: 2
    },
    isTourComplete:{
        type: Boolean,
        default: true
    },
    userRole : [ { type: mongoose.Schema.Types.ObjectId , ref: "userRole" } ],

    reportinManager: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "uuser",
        default: null,
    },

    
    assigndClients: [ { type: mongoose.Schema.Types.ObjectId , ref: "client" } ],

    assignedDashboard: { type: mongoose.Schema.Types.ObjectId, ref: "dashboard"},
    userDashboard: { type: mongoose.Schema.Types.ObjectId, ref: "user-dashboard", default: null },

    createdBy: {type: mongoose.Schema.Types.ObjectId , ref: 'uuser'},

    // Account lockout fields
    failedLoginAttempts: {
        type: Number,
        default: 0
    },
    isAccountLocked: {
        type: Boolean,
        default: false
    },
    lockoutExpiry: {
        type: Date,
        default: null
    },
    lastFailedLogin: {
        type: Date,
        default: null
    },

    // Password reset security fields
    resetToken: {
        type: String,
        default: null
    },
    resetTokenExpiry: {
        type: Date,
        default: null
    },
    resetTokenUsed: {
        type: Boolean,
        default: false
    },
    lastPasswordReset: {
        type: Date,
        default: null
    },
    passwordResetAttempts: {
        type: Number,
        default: 0
    },
    lastResetRequest: {
        type: Date,
        default: null
    }
},

{ timestamps : true }



)

const UserModel = mongoose.model("uuser", userSchema)

module.exports = UserModel