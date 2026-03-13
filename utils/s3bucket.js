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
const { removeExifData } = require("./imageProcessor");
const optimizeBuffer = require("./optimizeBuffer");

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
    if (fileuploadedData.$metadata.httpStatusCode === 200) {
      return {
        key: req.body.email,
        statusCode: fileuploadedData.$metadata.httpStatusCode,
      };
    } else {
      return { fileuploadedData };
    }
  } catch (error) {
    return error.message;
  }
};

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

    const url = await getSignedUrl(s3, getCommand, { expiresIn: 36000 });
    if (url) {
      const {
        clientname,
        _id,
        address,
        client_city,
        clientcode,
        email,
        mobile,
        landLine,
        organisationType,
        pincode,
        state,
        client_status,
        isProfilePicUploaded,
        spoke,
        sector,
        webpage,
      } = data;

      const newData = {
        clientname,
        _id,
        address,
        client_city,
        clientcode,
        email,
        mobile,
        landLine,
        organisationType,
        pincode,
        state,
        client_status,
        isProfilePicUploaded,
        spoke,
        sector,
        webpage,
        url: url,
      };

      return newData;
    }
  } catch (error) {
    return error.message;
  }
};

exports.getClientFileUrl = async (data) => {
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

    const url = await getSignedUrl(s3, getCommand, { expiresIn: 36000 });
    if (url) {
      const newData = {
        url: url,
      };

      return newData;
    }
  } catch (error) {
    return error.message;
  }
};
