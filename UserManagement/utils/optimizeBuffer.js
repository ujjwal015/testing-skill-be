const sharp = require("sharp");

const optimizeBuffer = async (buffer, mimetype, compressionPercentage = 30) => {
  try {
    const quality = Math.max(1, Math.min(100, compressionPercentage));

    let image;
    try {
      image = await sharp(buffer);
    } catch (err) {
      console.error("Failed to create sharp instance:", err);
      return buffer;
    }
    let optimizedBuffer;
    if (mimetype === "image/jpeg" || mimetype === "image/jpg") {
      optimizedBuffer = await image.jpeg({ quality }).toBuffer();
    } else if (mimetype === "image/png") {
      const compressionLevel = Math.round((9 * (100 - quality)) / 100);
      optimizedBuffer = await image.png({ compressionLevel }).toBuffer();
    } else if (mimetype === "image/webp") {
      optimizedBuffer = await image.webp({ quality }).toBuffer();
    } else {
      console.warn("Unsupported mimetype, returning original buffer");
      optimizedBuffer = buffer;
    }
    console.log("Optimized buffer size:", optimizedBuffer.length);
    return optimizedBuffer;
  } catch (err) {
    console.error("Sharp processing failed:", err);
    return buffer;
  }
};

module.exports = optimizeBuffer;
