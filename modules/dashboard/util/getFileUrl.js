const {
    S3Client,
    GetObjectCommand,
  } = require("@aws-sdk/client-s3");
  const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
  const {
    AWS_ACCESS_KEY_ID,
    AWS_ACCESS_KEY_SECRET,
    AWS_BUCKET_NAME,
    AWS_REGION,
  } = require("../../../utils/envHelper");
  
  
exports.getFileUrl = async (email) => {
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
        Key: email,
      };
      const getCommand = new GetObjectCommand(fileGetData);
  
      const url = await getSignedUrl(s3, getCommand, { expiresIn: 36000 });
      if (url){
        return url
      } 

    } catch (error) {
      return error.message;
    }
  };