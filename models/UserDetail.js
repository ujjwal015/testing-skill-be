const mongoose = require("mongoose");

const userDetailSchema = mongoose.Schema({
    preferredLanguage: {
        type: String,
        enum: ['en', 'hin'],
        required: true,
        default: 'en'
    },
    isTourComplete: {
        type: String,
        default: false,
        required: true
    }
}, { timestamps: true })
const UserDetail = mongoose.model("userDetail", userDetailSchema)
module.exports = UserDetail;

