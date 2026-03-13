const mongoose = require('mongoose');

// Define the OTP schema
const otpSchema = new mongoose.Schema({ 

  phoneNumber: {
    type: String,
    required: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 300, // OTP document will be automatically deleted after 5 minutes.
    
  },
  // Security tracking fields
  isUsed: {
    type: Boolean,
    default: false
  },
  verificationAttempts: {
    type: Number,
    default: 0
  },
  ipAddress: {
    type: String,
    required: false
  },
  userAgent: {
    type: String,
    required: false
  }
});

// Create the TTL index on the createdAt field
otpSchema.index({ createdAt: 1 }, { expireAfterSeconds: 300 });

// Create the OTP model
const OTP = mongoose.model('OTP', otpSchema);
module.exports = OTP;

