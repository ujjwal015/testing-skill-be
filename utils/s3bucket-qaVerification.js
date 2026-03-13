const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
  } = require("@aws-sdk/client-s3");
  const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { removeExifData } = require("./imageProcessor");
const optimizeBuffer = require("./optimizeBuffer");
  
  exports.uploadVerificationFile = async (req) => {
    const s3 = new S3Client({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
      },
      region: process.env.AWS_REGION,
    });
    const bufferDataWithoutMeta = await removeExifData(req.buffer, req.mimetype);
    const optimizedBuffer = await optimizeBuffer(bufferDataWithoutMeta.buffer, req.mimetype);
    const fileData = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: req.Key,
      // Key: `${req.QAverificationTimeStampId}/${req.Key}`,
      Body: optimizedBuffer,
      ContentType: req.mimetype,
    };
    const command = new PutObjectCommand(fileData);
  
    try {
      const fileuploadedData = await s3.send(command);
  
      if (fileuploadedData.$metadata.httpStatusCode === 200) {
        return {
          key: fileData.Key,
          statusCode: fileuploadedData.$metadata.httpStatusCode,
        };
      } else {
        return { fileuploadedData };
      }
    } catch (error) {
      return error;
    }
  };