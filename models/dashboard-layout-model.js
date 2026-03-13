const mongoose = require("mongoose");

const dashboardLayoutSchema = mongoose.Schema({
    lg: {
        type: Array,
        default: [],
    },
    md: {
        type: Array,
        default: [],
    },
    sm: {
        type: Array,
        default: [],
    },
    xs: {
        type: Array,
        default: [],
    },
    xxs: {
        type: Array,
        default: [],
    },
    userId: {
        type: mongoose.Types.ObjectId
    },
    activeClientStatistics: {
        type: Boolean,
        default: true
    },
    dashboardNotification: {
        type: Boolean,
        default: true,
    },
    upcomingAssignment: {
        type: Boolean,
        default: true
    },
    assessmentStatistics: {
        type: Boolean,
        default: true
    }
}, { timestamps: true })
const DashboardLayout = mongoose.model("DashboardLayout", dashboardLayoutSchema)
module.exports = DashboardLayout;

