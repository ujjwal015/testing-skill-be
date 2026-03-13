const mongoose = require("mongoose");

const suspiciousSchema = new mongoose.Schema({
  candidateId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "candidate",
  },
  suspiciousImageIds: [],
  suspiciousVideoIds: [],
});

const ProctorFile = mongoose.model("SuspiciousActivity", suspiciousSchema);
module.exports = ProctorFile;
