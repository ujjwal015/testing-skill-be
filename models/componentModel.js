const mongoose = require("mongoose");

const componentSchema = mongoose.Schema({

    component_name: {
        type: String,
    },
    component_type:{
        type: String,
        enum: ['Widget', 'Graph', 'Table']
    },
    component_category: { 
        type: String,
        enum: ['Business','Content','Operations','MIS', 'QA', 'HR', 'Other'],
        default: 'Other'
    },
    default_layout:{ 
        w: { type: String, default: null},
        h: { type: String, default: null},
        x: { type: String, default: null},
        y: { type: String, default: null},
        widget_order: { type: Number , default: null}
    },
    used_count: { 
        type: Number,
        default: 0
    },
    endpoint: { 
        type: String,
        default: null
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


// componentSchema.post("save", async function (doc) {
//     try {
//         await Component.findByIdAndUpdate(doc._id, { $inc: { used_count: 1 } });
//     } catch (error) {
//         console.error("Error incrementing used_count:", error);
//     }
// });


const Component = mongoose.model("component",  componentSchema)
module.exports = Component;