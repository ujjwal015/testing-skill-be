const jwt = require("jsonwebtoken");
require("dotenv").config();
const userModel = require("../models/user-model");
const deviceManagers = require("../models/device-manager-model");
const { errorResponse } = require("../utils/response");
const responseMessage = require("../utils/responseMessage");
const RedisService = require("../utils/redisService");

const redisDB4 = new RedisService("db4");
const { USER_AUTH_CACHE, DEVICE_AUTH_CACHE } = require("../constants/redis");

const redisDB1 = new RedisService("db1");

async function auth(req, res, next) {
  try {
    const token = req.header("x-auth-token");

    if (!token) {
      return errorResponse(res, 401, responseMessage.token_for_auth, responseMessage.errorMessage);
    }

    // 1. Verify JWT
    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return errorResponse(
        res,
        401,
        responseMessage.token_for_auth,
        responseMessage.errorMessage
      );
    }

    const isBlacklisted = await redisDB4.get(`blacklist_${token}`);
    if (isBlacklisted) {
      return errorResponse(
        res,
        401,
        responseMessage.USER_ALREADY_LOGGEDOUT,
        responseMessage.TOKEN_BLACKLISTED
      );
    }
    
    let tokenValidate = jwt.verify(token, process.env.JWT_SECRET);

    if (!tokenValidate) {
      return errorResponse(
        res,
        410,
        responseMessage.token_expire,
        responseMessage.errorMessage
      );
    }
    const email = decoded.email;
    const id = decoded.id;
    const ip = decoded.ip;

    // 2. Try Redis cache for user
    const cachedUser = await redisDB1.get(`${USER_AUTH_CACHE}:${email}`);
    let user = cachedUser;
    if (!cachedUser) {
      user = await userModel.findById(id).lean();
      if (!user) {
        return errorResponse(res, 404, responseMessage.user_not_exist, responseMessage.errorMessage);
      }
      await redisDB1.set(`user:${email}`, user, process.env.REDIS_DEFAULT_EXPIRY * 2); // cache for 10 mins
    }

    // 3. Try Redis cache for device
    const deviceKey = `${DEVICE_AUTH_CACHE}:${user._id}:${ip}`;
    const cachedDevice = await redisDB1.get(deviceKey);
    let deviceDetails = cachedDevice;
    if (!cachedDevice) {
      deviceDetails = await deviceManagers.findOne({
        userId: user._id,
        ipAddress: ip
      }).lean();
      if (!deviceDetails) {
        return errorResponse(res, 410, responseMessage.token_expire, {
          message: "This device is logged out from our system",
          details: null,
        });
      }
      await redisDB1.set(deviceKey, deviceDetails, process.env.REDIS_DEFAULT_EXPIRY * 2);
    }

    req.user = user;
    next();
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
}

module.exports = auth;
