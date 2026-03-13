const mongoose = require("mongoose");

const sectorSchema = mongoose.Schema({
   sector:{
    type: String,
    required: false
   }
}, { timestamps: true });

const sectorModel = mongoose.model("sector", sectorSchema)
module.exports = sectorModel;