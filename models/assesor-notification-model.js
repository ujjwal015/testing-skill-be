const mongoose = require('mongoose');
 
const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'assessor',
        required: false, 
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'uuser',
        required: true,
    },
    isRead: {
        type: Boolean,
        default: false,
    },
    title: {
        type: String,
        required: true,
    },
    content: {
        type: String,
        required: true,
    },
    link: {
        type: String,
        required: false,
    },

    type: {
        type: String,
        enum: ['message', 'alert', 'reminder', 'other'],
        required: true,
    },
    isActionTaken: {
        type: Boolean,
        default: false,
    },

    QAverificationTimeStampId : {
        type: String,
    },
    reminderCount: { 
        type: String, 
        default: "1"
    },
    intervalTime: {
        type: String     
    }
},{timestamps:true});
 
 
const Notification = mongoose.model('Notification', notificationSchema);
 
module.exports = Notification;