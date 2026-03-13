require("dotenv").config()
const crypto = require("crypto");

const sendResponse = (res, statusCode, message, data, cacheHit = false, customStatusCode) => {
    const nonce = crypto.randomBytes(16).toString("base64");
    res.locals.nonce = nonce;

    res.setHeader(
        "Content-Security-Policy",
        `
      default-src 'none';
      script-src 'self' 'nonce-${nonce}';
      style-src 'self' 'nonce-${nonce}';
      img-src 'self' data:;
      font-src 'self';
      connect-src 'self';
      object-src 'none';
      frame-ancestors 'none';
      base-uri 'none';
      form-action 'self';
      media-src 'self';
      manifest-src 'self';
      worker-src 'self';
      frame-src 'none';
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim()
    );
    customStatusCode = customStatusCode ?? statusCode;
    return res.status(statusCode).json({ cacheHit, statusCode: customStatusCode, success: true, message: message, details: data });
};

// In your response helper file (e.g., utils/response.js)

const errorResponse = (res, statusCode, message, error) => {
    const nonce = crypto.randomBytes(16).toString("base64");
    res.locals.nonce = nonce;

    // Your Content-Security-Policy header logic remains unchanged
    res.setHeader(
        "Content-Security-Policy",
        `
      default-src 'none';
      script-src 'self' 'nonce-${nonce}';
      style-src 'self' 'nonce-${nonce}';
      img-src 'self' data:;
      font-src 'self';
      connect-src 'self';
      object-src 'none';
      frame-ancestors 'none';
      base-uri 'none';
      form-action 'self';
      media-src 'self';
      manifest-src 'self';
      worker-src 'self';
      frame-src 'none';
      upgrade-insecure-requests;
    `.replace(/\s{2,}/g, ' ').trim()
    );

    const safeError = error instanceof Error ? { message: error.message } : error || {};

    return res.status(statusCode).json({
        statusCode: statusCode,
        success: false,
        message: message,
        error: safeError // Use the new 'safeError' plain object here
    });
};

module.exports = { sendResponse, errorResponse }
