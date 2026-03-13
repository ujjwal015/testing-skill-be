const mongoose = require('mongoose')

const nosSchema = new mongoose.Schema({

    NOS:{
        type: String,
        required: true
    },
    qpCode:{
        type: String,
        required: true
    },
    level:{
        type: String,
        required: true
    },
    version:{
        type: String,
        required: true
    },
    language:{
        type: String,
        required:true
    },
    outOf: { 
        type: Number,
        required: true
    },
    theory: { 
        type: String,
    },
    easyNOQ: { 
        type: Number,
        required: true
    },
    mediumNOQ: { 
        type: Number,
        required: true,
        //unique: true
    },
    difficultNOQ:{ 
        type: Number,
        required: true
    },
    totalNOQ: { 
        type: Number,
        required: true
    },
    easyMPQ: { 
        type: Number,
        required: true
    },
    mediumMPQ: { 
        type: Number,
        required: true,
        //unique: true
    },
    difficultMPQ:{ 
        type: Number,
        required: true
    },
    totalMPQ: { 
        type: Number,
        required: true
    },
    easyTMPQ: { 
        type: Number,
        required: true
    },
    mediumTMPQ: { 
        type: Number,
        required: true,
        //unique: true
    },
    difficultTMPQ:{ 
        type: Number,
        required: true
    },
    totalTMPQ: { 
        type: Number,
        required: true
    },
},{ timestamps : true})

const mainnosSchema = new mongoose.Schema({
    clientId: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'client'
    },
    // creating this because jobRole was already there
    jobRoleId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'jobrole'  
    },
    jobRole:{
        type: String,
        required: true
    },
    section:{
        type: String,
        enum: ['Theory', 'viva', 'practical'],
        required: true
    },
   
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    nosData: [nosSchema],
  },{ timestamps : true});

// Performance optimization indexes for batch controller
mainnosSchema.index({ 
    jobRole: 1, 
    section: 1, 
    'nosData.level': 1, 
    'nosData.version': 1 
}, { 
    name: 'idx_nostheory_performance',
    background: true 
});

mainnosSchema.index({ 
    clientId: 1, 
    jobRole: 1, 
    section: 1, 
    status: 1 
}, { 
    name: 'idx_nostheory_client',
    background: true 
});

mainnosSchema.index({ 
    jobRoleId: 1, 
    section: 1, 
    'nosData.level': 1, 
    'nosData.version': 1 
}, { 
    name: 'idx_nostheory_jobrole_id',
    background: true 
});
  
  const nosModel = mongoose.model('nostheory', mainnosSchema)
  module.exports = nosModel
  


