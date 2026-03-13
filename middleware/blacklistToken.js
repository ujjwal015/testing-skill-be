const { BLACK_LIST_TOKENS } = require("../constants/redis");
const RedisService = require("../utils/redisService");
const { errorResponse, sendResponse } = require("../utils/response");
const responseMessage = require("../utils/responseMessage");
const jwt = require("jsonwebtoken");

const redis = new RedisService("db4");

const blacklistingToken = async (req, res) => {
  try {
    const token = req.header("x-auth-token");
    const decoded = jwt.decode(token);

    const expiryInSec = decoded.exp - Math.floor(Date.now() / 1000); // in seconds
    console.log("expiryInSec", expiryInSec, decoded.exp);
    if (expiryInSec > 0) {
      await redis.set(
        `blacklist_${token}`,
        BLACK_LIST_TOKENS,
        expiryInSec
      );
    }
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

module.exports = blacklistingToken;
