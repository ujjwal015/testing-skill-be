const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/keys");
exports.generateUrlEncodingToken = async (batch, candidateId) => {
  try {
    // Create a random string as part of the token data
    const randomString = Math.random().toString(36).substring(2, 15);

    // token payload
    const payload = {
      randomString,
      candidateId,
      batchId: batch._id,
    };

    // Generate JWT token without expiration
    const token = jwt.sign(payload, JWT_SECRET);

    return token;
  } catch (error) {
    console.error("Error generating URL encoding token:", error);
    throw new Error("Failed to generate URL encoding token");
  }
};
