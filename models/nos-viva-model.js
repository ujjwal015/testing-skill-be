const mongoose = require("mongoose");
const nosVivaSchema = new mongoose.Schema(
  {
    NOS: {
      type: String,
      required: true,
    },
    qpCode: {
      type: String,
      required: true,
    },
    level: {
      type: String,
      required: true,
    },
    version: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      required: true,
    },
    outOf: {
      type: Number,
      required: true,
    },
    viva: {
      type: String,
      required: true,
    },
    practical: {
      type: String,
      required: true,
    },
    vivaNOQ: {
      type: Number,
      required: true,
    },
    practicalNOQ: {
      type: Number,
      required: true,
    },
    vivaMPQ: {
      type: Number,
      required: true,
    },
    practicalMPQ: {
      type: Number,
      required: true,
    },
    vivaTM: {
      type: Number,
      required: true,
    },
    practicalTM: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

const mainVivaNosSchema = new mongoose.Schema(
  {
    clientId: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'client'
  },
    jobRole: {
      type: String,
      required: true,
    },
    section: {
      type: String,
      enum: ["viva", "practical"],
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    nosData: [nosVivaSchema],
  },
  { timestamps: true }
);

// Performance optimization indexes for batch controller
mainVivaNosSchema.index({ 
    jobRole: 1, 
    section: 1, 
    'nosData.level': 1, 
    'nosData.version': 1 
}, { 
    name: 'idx_nosviva_performance',
    background: true 
});

mainVivaNosSchema.index({ 
    clientId: 1, 
    jobRole: 1, 
    section: 1, 
    status: 1 
}, { 
    name: 'idx_nosviva_client',
    background: true 
});

const nosModel = mongoose.model("nosviva", mainVivaNosSchema);
module.exports = nosModel;
