const mongoose = require("mongoose");

const dashboardNotificationSchema = mongoose.Schema({
    message:{
        type:String
    }
}, { timestamps: true })

const DashboardNotification = mongoose.model("DashboardNotification", dashboardNotificationSchema)

module.exports = DashboardNotification;
