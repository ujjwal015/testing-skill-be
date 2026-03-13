const mongoose = require("mongoose");

const userDashboardSchema = mongoose.Schema({

    dashboard_id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'dashboard'
    },
    components: [{
        componentId: { 
            type: mongoose.Schema.Types.ObjectId,
            ref: 'component'
        }, 
        user_layout:{ 
            w: { type: String, default: null},
            h: { type: String, default: null},
            x: { type: String, default: null},
            y: { type: String, default: null},
            widget_order: { type: Number, default: null }
        },
        is_user_layout_available : { type: Boolean, default: false},
        is_enabled: { type: Boolean, default: true}
    }],
    
}, { timestamps: true })

const UserDashboard = mongoose.model("user-dashboard",  userDashboardSchema)
module.exports = UserDashboard;