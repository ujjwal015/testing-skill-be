const mongoose = require("mongoose");

const resetPassword = new mongoose.Schema({
    
    userId: {type:mongoose.Schema.Types.ObjectId, ref: 'uuser'},
    email: {type: String},
    jwtToken: {type: String},
    expiresAt: {type: Date, default: new Date() },
    isUsed: { type: Boolean, default: false}


}, { timestamps: true });

const ResetPasswordMOdel = mongoose.model("resetPassword", resetPassword)
module.exports =  ResetPasswordMOdel;