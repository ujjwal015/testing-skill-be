const fetch = require('node-fetch'); // For Node < 18, else global fetch works.

const s3UrlToBlob = async (url) => {
  if (!url) throw new Error('S3 URL is required');

  try {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Failed to fetch from S3: ${response.statusText}`);

    const contentType = response.headers.get('content-type') || 'application/octet-stream';
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return { buffer, contentType };
  } catch (error) {
    console.error('s3UrlToBlob Error:', error);
    throw error;
  }
};

module.exports = s3UrlToBlob;
