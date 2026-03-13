const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const {
  AWS_ACCESS_KEY_ID,
  AWS_ACCESS_KEY_SECRET,
  AWS_BUCKET_NAME,
  AWS_REGION,
} = require("../utils/envHelper");
const { removeExifData } = require("./removeExifData");
const optimizeBuffer = require("./optimizeBuffer");
const { log } = require("winston");

exports.uploadFile = async (req) => {
  try {
    const s3 = new S3Client({
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_ACCESS_KEY_SECRET,
      },
      region: AWS_REGION,
    });
    const bufferDataWithoutMeta = await removeExifData(req.file.buffer, req.file.mimetype);
    const optimizedBuffer = await optimizeBuffer(bufferDataWithoutMeta.buffer, req.file.mimetype);

    const fileData = {
      Bucket: AWS_BUCKET_NAME,
      Key: req.body.email,
      Body: optimizedBuffer,
      ContentType: req.file.mimetype,
    };

    const command = new PutObjectCommand(fileData);

    const fileuploadedData = await s3.send(command);
    console.log(
      "fileuploadedData.$metadata.httpStatusCode",
      fileuploadedData.$metadata.httpStatusCode
    );

    if (fileuploadedData.$metadata.httpStatusCode === 200) {
      return {
        key: req.body.email,
        statusCode: fileuploadedData.$metadata.httpStatusCode,
        s3Url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileData.Key}`,
      };
    } else {
      return { fileuploadedData };
    }
  } catch (error) {
    return error.message;
  }
};

//update time
exports.getFileUrl = async (data) => {
  try {
    const s3 = new S3Client({
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_ACCESS_KEY_SECRET,
      },
      region: AWS_REGION,
    });

    const fileGetData = {
      Bucket: AWS_BUCKET_NAME,
      Key: data.email,
    };
    const getCommand = new GetObjectCommand(fileGetData);
    const currentDate = new Date();
    const oneWeekLater = new Date(
      currentDate.getTime() + 7 * 24 * 60 * 60 * 1000
    ); // Add 7 days in milliseconds
    const expiresIn = Math.floor((oneWeekLater - currentDate) / 1000); // Convert milliseconds to seconds

    const url = await getSignedUrl(s3, getCommand, { expiresIn });

    // const url = await getSignedUrl(s3, getCommand, { expiresIn: 31536000000 });

    if (url) {
      return url;
    }
  } catch (error) {
    return error.message;
  }
};
