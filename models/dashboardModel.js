const mongoose = require("mongoose");

const dashboardSchema = mongoose.Schema({

    dashboard_name: {
        type: String,
    },
    components: [{ 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'component'
    }],
    used_count: { 
        type: Number,
        default: 0
    },
    status: { 
        type: Boolean, 
        default: true
    },
    created_by: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'uuser',
        default: null
    },
    updated_by: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'uuser',
        default: null
    }
    
}, { timestamps: true })

const Dashboard = mongoose.model("dashboard",  dashboardSchema)
module.exports = Dashboard;