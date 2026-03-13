const _ = require('lodash');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const {errorResponse} = require("../utils/response");
const CommonUsers = require("../models/common-user-model");
const Role=require("../models/RoleSchema");
const responseMessage  = require("../utils/responseMessage");
async function AuthPermission(req, res, next) {
    try {
        // get the token from req
        const token = req.header('x-auth-token');
        // if token not provided return error
        if (!token) return errorResponse(res, 401, responseMessage.token_for_auth, responseMessage.errorMessage);  
        // decode the token using jwt
        var decodedId = jwt.decode(token);
        // get the user by decoded id  
        const user = await CommonUsers.findOne({ email: decodedId.email });
        let userRole=await Role.findOne({name:'Business Manager'});
        // console.log(userRole);
        if (!user) return errorResponse(res, 404, responseMessage.user_not_exist, responseMessage.errorMessage);  
        if (user.userType !== 1) return errorResponse(res, 401, responseMessage.user_unauthorized_to_access, responseMessage.errorMessage);  
        let tokenValidate = jwt.verify(token, process.env.JWT_SECRET);
        // console.log("token validation",tokenValidate);
        // if invalid token return 410 'Unauthorised'
        if (!tokenValidate) {
            return errorResponse(res, 410, responseMessage.token_expire, responseMessage.errorMessage); 
        } else {
            // console.log(userRole)
            req.permissions=userRole;
            next();
        }
    } catch (error) {
        // send error if something goes wrong
        if (error.message === 'jwt expired') {
            return errorResponse(res, 401, responseMessage.session_expired, error.message);
        } else {
            return errorResponse(res, 500, responseMessage.errorMessage, error.message);
        }
    }
}

module.exports = AuthPermission;
