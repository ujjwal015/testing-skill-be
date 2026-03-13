const _ = require("lodash");
const jwt = require("jsonwebtoken");
require("dotenv").config();
const userModel = require("../models/userProfile-model");
const deviceManagers = require("../models/device-manager-model");
const { errorResponse } = require("../utils/response");
const responseMessage = require("../utils/responseMessage");
const RedisService = require("../utils/redisService");

const redisDB4 = new RedisService("db4");

async function auth(req, res, next) {

  try {
    // get the token from req
    const token = req.header("x-auth-token");
    // if token not provided return error
    if (!token)
      return errorResponse(
        res,
        401,
        responseMessage.token_for_auth,
        responseMessage.errorMessage
      );

    const isBlacklisted = await redisDB4.get(`blacklist_${token}`);

    if (isBlacklisted) {
      return errorResponse(
        res,
        401,
        responseMessage.USER_ALREADY_LOGGEDOUT,
        responseMessage.TOKEN_BLACKLISTED
      );
    }
    // decode the token using jwt
    let decodedId = jwt.decode(token);
    // get the user by decoded id
    const user = await userModel.findOne({ email: decodedId.email });
    //console.log("user", user)
      if (!user)
      return errorResponse(
        res,
        404,
        responseMessage.user_not_exist,
        responseMessage.errorMessage
      );
    const deviceDetails = await deviceManagers.findOne({
      $and: [{ userId: user?._id }, { ipAddress: decodedId.ip }],
    });
    // console.log('device ip',deviceDetails?.ipAddress,decodedId.ip,deviceDetails?.isDeviceLogin)
    
 
    if (!deviceDetails) {
      return errorResponse(
        res,
        410,
        responseMessage.token_expire,
        {message: "This device is logout from our system", details: deviceDetails}
      );
    }

    
    // if user not found return error
    
    // send error is user is not enabled
    // if(!user.enabled) return res.status(401).send({ statusCode : 401, error : 'Unauthorized' , message : 'This user is banned from this platform.' });
    let tokenValidate = jwt.verify(token, process.env.JWT_SECRET);
    // console.log("token validation",tokenValidate);
    // if invalid token return 410 'Unauthorised'
    if (!tokenValidate) {
      return errorResponse(
        res,
        410,
        responseMessage.token_expire,
        responseMessage.errorMessage
      );
    } else {
      req.user = user;
      next();
    }
  } catch (error) {
    // send error if something goes wrong
    if (error.message === "jwt expired") {
      return errorResponse(
        res,
        401,
        responseMessage.session_expired,
        responseMessage.session_expired
      );
    } else {
      return errorResponse(
        res,
        500,
        responseMessage.errorMessage,
        error.message
      );
    }
  }
}

module.exports = auth;
