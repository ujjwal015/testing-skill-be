const mongoose = require("mongoose");

const roleSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    permissions:[
        // {ModuleName:{view:true,Edit:true,delete:true}},
        // {SubModuleName:{view:true,Edit:true,delete:true}}
    ],
    description: {
        type: String,
        required: true,
    }
}, { timestamps: true });

const Role = mongoose.model("role", roleSchema)
module.exports =  Role;