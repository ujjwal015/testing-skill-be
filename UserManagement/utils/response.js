require("dotenv").config();
const crypto = require("crypto");

const sendResponse = (res, statusCode, message, data) => {
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

  return res.status(statusCode).json({
    statusCode,
    success: true,
    message,
    details: data
  });
};

const errorResponse = (res, statusCode, message, error) => {
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
    return res.status(statusCode).json({ statusCode: statusCode, success: false, message: message, error: error });
};

module.exports = { sendResponse, errorResponse }
