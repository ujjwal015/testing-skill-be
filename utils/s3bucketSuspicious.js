const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { removeExifData } = require("./imageProcessor");
const optimizeBuffer = require("./optimizeBuffer");

const createS3Client = () => {
  return new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });
};

if (
  !process.env.AWS_ACCESS_KEY_ID ||
  !process.env.AWS_ACCESS_KEY_SECRET ||
  !process.env.AWS_REGION ||
  !process.env.AWS_BUCKET_NAME
) {
  throw new Error("AWS environment variables are not set.");
}

exports.uploadFile = async (req, candidateId) => {
  const s3 = createS3Client();
  const key = `${Math.floor(1000 + Math.random() * 900000)}`;
// console.log("key", key, req.file.mimetype)
  const bufferDataWithoutMeta = await removeExifData(req.file.buffer, req.file.mimetype);
  const optimizedBuffer = await optimizeBuffer(bufferDataWithoutMeta.buffer, req.file.mimetype);
  const fileData = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `${candidateId}_${key}`,
    Body: optimizedBuffer,
    ContentType: req.file.mimetype,
  };
  const command = new PutObjectCommand(fileData);

  try {
    const fileuploadedData = await s3.send(command);

    if (fileuploadedData.$metadata.httpStatusCode === 200) {
      return {
        key,
        statusCode: fileuploadedData.$metadata.httpStatusCode,
      };
    } else {
      return { fileuploadedData };
    }
  } catch (error) {
    console.error("Error:", error);
    return error;
  }
};

exports.uploadCandidateActivityFile = async (req, candidateId, batchId) => {
  const s3 = createS3Client();
  const key = `${Math.floor(1000 + Math.random() * 900000)}`;
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const mimeType = req.file.mimetype;

  let folderType;
  if (mimeType.startsWith("image/")) {
    folderType = "images";
  } else if (mimeType.startsWith("video/")) {
    folderType = "videos";
  }else {
    throw Error("Invalid file type");
  }
  const fileKey = `${today}/${batchId}/${candidateId}/${folderType}/${key}`;
  const bufferDataWithoutMeta = await removeExifData(req.file.buffer, req.file.mimetype);
  const fileData = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: fileKey,
    Body: bufferDataWithoutMeta.buffer,
    ContentType: mimeType,
  };

  const command = new PutObjectCommand(fileData);

  try {
    const fileuploadedData = await s3.send(command);

    if (fileuploadedData.$metadata.httpStatusCode === 200) {
      return {
        key: fileKey,
        statusCode: fileuploadedData.$metadata.httpStatusCode,
      };
    } else {
      return { fileuploadedData };
    }
  } catch (error) {
    console.error("Error:", error);
    return error;
  }
};

exports.getFileUrl = async (data) => { 
  
      
  try {

    const s3 = new S3Client({ 

      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
      },
      region: process.env.AWS_REGION,
    
    });

    const fileGetData = { 
        Bucket:process.env.AWS_BUCKET_NAME,
        Key:data.key,
    }
    const getCommand = new GetObjectCommand(fileGetData)
    
    const url = await getSignedUrl(s3, getCommand, { expiresIn: 604800 });
    if(url){
      return url
    } 
    
  } catch (error) {
    
     return error.message
  } 
}
exports.getProctorFileUrl = async (key) => {
  const s3 = createS3Client();
  const fileGetData = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: key,
  };

  const getCommand = new GetObjectCommand(fileGetData);

  try {
    const url = await getSignedUrl(s3, getCommand, { expiresIn: 36000 });
    return {
      key,
      url: url || null,
    };
  } catch (error) {
    console.error("Error:", error);
    return {
      key,
      url: null,
    };
  }
};

//for uploading viva, practical file
exports.uploadProctoringFile = async (files, candidateId) => {
  const s3 = createS3Client();

  // Ensure files array is passed directly, not req.files
  if (!files || files.length === 0) {
    return { message: "No files found", statusCode: 400 };
  }

  const uploadedFiles = [];
  // Iterate over multiple files in the files array
  for (const file of files) {
    const key = `${candidateId}_${Math.floor(1000 + Math.random() * 900000)}`;
    const bufferDataWithoutMeta = await removeExifData(file.buffer, file.mimetype);
    const fileData = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: key,
      Body: bufferDataWithoutMeta.buffer, // Each file has its own buffer
      ContentType: file.mimetype, // Each file has its own mimetype
    };
    
    const command = new PutObjectCommand(fileData);

    try {
      const fileuploadedData = await s3.send(command);

      if (fileuploadedData.$metadata.httpStatusCode === 200) {
        uploadedFiles.push({
          key,
          statusCode: fileuploadedData.$metadata.httpStatusCode,
        });
      } else {
        uploadedFiles.push({
          error: "Upload failed",
          statusCode: fileuploadedData.$metadata.httpStatusCode,
        });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      uploadedFiles.push({ error: error.message });
    }
  }

  return uploadedFiles.length > 0
    ? { uploadedFiles, statusCode: 200 }
    : { message: "File upload failed", statusCode: 500 };
};

//upload offline theory file
exports.uploadedTheoryFiles = async (req, candidateId) => {
  const s3 = createS3Client();
  const uploadedTheoryFiles = [];

  // Check if multiple files are provided in req.files
  if (!Array.isArray(req.files)) {
    return { error: 'No files to upload' };
  }

  for (const file of req.files) {
    const Key = `${Math.floor(1000 + Math.random() * 900000)}`;
    const bufferDataWithoutMeta = await removeExifData(file.buffer, file.mimetype);
    //const key = `${candidateId}_${Math.floor(1000 + Math.random() * 900000)}`;
    const fileData = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key:`${candidateId}_${Key}`,
      Body: bufferDataWithoutMeta.buffer,
      ContentType: file.mimetype,
    };
    const command = new PutObjectCommand(fileData);

    try {
      const fileUploadedData = await s3.send(command);
      if (fileUploadedData.$metadata.httpStatusCode === 200) {
        uploadedTheoryFiles.push({ Key, statusCode: fileUploadedData.$metadata.httpStatusCode });
      }
    } catch (error) {
      console.error("Error uploading file:", error);
      return { error: 'File upload failed', details: error.message };
    }
  }

  return { uploadedTheoryFiles };
};

//delete files
exports.deleteFileFromS3 = async (fileKeys) => {
  if (!Array.isArray(fileKeys) || fileKeys.length === 0) {
    return { deleted: [], errors: [] };
  }

  const s3 = createS3Client();

  const results = await Promise.all(
    fileKeys.map(async (key) => {
      try {
        await s3.send(
          new DeleteObjectCommand({
            Bucket: process.env.AWS_BUCKET_NAME,
            Key: key,
          })
        );
        return { key, status: 'success' };
      } catch (error) {
        return { key, status: 'error', error: error.message };
      }
    })
  );

  return {
    deleted: results.filter(r => r.status === 'success').map(r => r.key),
    errors: results.filter(r => r.status === 'error')
  };
};