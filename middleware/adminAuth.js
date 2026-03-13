const jwt = require("jsonwebtoken");
require("dotenv").config();
const { errorResponse } = require("../utils/response");
const CommonUsers = require("../models/user-model");
const responseMessage = require("../utils/responseMessage");
const RedisService = require("../utils/redisService");

const redisDB4 = new RedisService("db4");
const redisDB1 = new RedisService("db1");

const { USER_ADMIN_AUTH_CACHE } = require("../constants/redis");
const { log } = require("winston");


async function adminAuth(req, res, next) {
  try {
    const token = req.header("x-auth-token");
    if (!token) {
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

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      return errorResponse(
        res,
        401,
        err.name === "TokenExpiredError"
          ? responseMessage.session_expired
          : responseMessage.token_expire,
        err.message
      );
    }
    
    const id = decoded?.id;
    const email = decoded?.email;
    if (!id) {
      return errorResponse(
        res,
        400,
        "Invalid token payload",
        "Missing email in token"
      );
    }

    const redisKey = `${USER_ADMIN_AUTH_CACHE}:${email}`;
    let user = await redisDB1.get(redisKey);

    if (!user) {
      // Fetch from DB if not in cache
      user = await CommonUsers.findById(id).lean();
      if (!user) {
        return errorResponse(
          res,
          404,
          responseMessage.user_not_exist,
          responseMessage.errorMessage
        );
      }
      await redisDB1.set(redisKey, user, process.env.REDIS_DEFAULT_EXPIRY * 2); // cache for 10 mins
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.message === "jwt expired") {
          return errorResponse(
            res,
            401,
            responseMessage.session_expired,
            error.message
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

module.exports = adminAuth;
