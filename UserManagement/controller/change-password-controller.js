require("dotenv").config()
const Joi = require('@hapi/joi');
const UserProfile = require("../models/userProfile-model");
const { Paginate } = require("../utils/paginate");
const bcrypt = require("bcryptjs");
const responseMessage = require('../utils/responseMessage')
const { sendResponse, errorResponse } = require("../utils/response");
const { getFilter } = require("../utils/custom-validators");
module.exports.changePassword = async (req, res) => {
    try {
        const {error}=await validatePassword(req.body);
        if(error) return errorResponse(res, 400, error.message, responseMessage.errorMessage);
        const { oldPassword, newPassword, confirmNewPassword, userId } = req.body;
        if (oldPassword == newPassword) return errorResponse(res, 400, "Password should be different from old one.", responseMessage.errorMessage);
        if (confirmNewPassword != newPassword) return errorResponse(res, 400, "Confirm Password and Password should be same.", responseMessage.errorMessage)
        const userDetails = await UserProfile.findById(userId);
       
        if (!userDetails) return errorResponse(res, 404, "User Details not found.", responseMessage.errorMessage);
        bcrypt.compare(oldPassword, userDetails.password, async (err, result) => {
            
            if (!result) return errorResponse(res, 400, "OldPassword not matched.", responseMessage.errorMessage)
       
        const salt = await bcrypt.genSalt(8);

        const hashPassword = await bcrypt.hash(newPassword, salt);
       

        const saveUserDetails = await UserProfile.findOneAndUpdate({ _id: userId }, {
            password: hashPassword
        })

        if (saveUserDetails){

            return sendResponse(res, 200, "Password Update Successfully")
        } 
        if (!saveUserDetails) return errorResponse(res, 404, "User Details not saved", responseMessage.errorMessage)
    })
    } catch (err) {
        console.log('err', err)
        return errorResponse(res, 500, err, responseMessage.errorMessage)
    }
}
async function validatePassword(superAdminBody) {
    try {
        const schema = Joi.object({
            oldPassword: Joi.string().trim().min(8).max(20).required(),
            userId:Joi.string().required(),
            newPassword: Joi.string().trim().min(8).max(20).required(),
            confirmNewPassword: Joi.string().trim().min(8).max(20).required(),
            
        })
        return schema.validate(superAdminBody);
    } catch (error) {
        console.log(err);
    }
}
