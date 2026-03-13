const { S3Client , PutObjectCommand, GetObjectCommand,DeleteObjectCommand } = require("@aws-sdk/client-s3")
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner')
const { AWS_ACCESS_KEY_ID, AWS_ACCESS_KEY_SECRET, AWS_BUCKET_NAME, AWS_REGION} = require('../utils/envHelper');
const optimizeBuffer = require("../utils/optimizeBuffer");
const stream = require("stream");
const archiver = require("archiver");


exports.uploadSingleFile = async (req, imageKey) => {
  try {
    const s3 = new S3Client({
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_ACCESS_KEY_SECRET,
      },
      region: AWS_REGION,
    });

    const optimizedBuffer = await optimizeBuffer(req.file.buffer, req.file.mimetype);
    const fileData = {
      Bucket: AWS_BUCKET_NAME,
      Key: `${imageKey}`,//`${attendenceDetails.clockInImageKey}`,//`${attendenceDetails.assesor_id}/`${req.file.originalname}`,//req.file.originalname,
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

exports.getSingleFileUrl = async (data) => {
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
      Key: data.clockInImageKey,
    };
    const getCommand = new GetObjectCommand(fileGetData);

    const url = await getSignedUrl(s3, getCommand, { expiresIn: 36000 });
    if (url) {
     

      const newData = {
        data,
        url: url,
      };

      return newData;
    }
  } catch (error) {
    return error.message;
  }
};
exports.uploadFile = async (req) =>{

        try {
         
            const s3 = new S3Client({ 

                credentials : {
                      accessKeyId: AWS_ACCESS_KEY_ID, 
                      secretAccessKey: AWS_ACCESS_KEY_SECRET
                },
                region: AWS_REGION
            
            });
          const  fileuploadedData= await Promise.all(
              req.files.map(async (file,index) => {
                const optimizedBuffer = await optimizeBuffer(file.buffer, file.mimetype);
                const fileData = { 
                  Bucket: AWS_BUCKET_NAME,
                  Key:file.originalname,
                  Body: optimizedBuffer,
                  ContentType:file.mimetype
                }
        
              let command=  new PutObjectCommand(fileData);
             let  fileuploaded= await s3.send(command);
             if(fileuploaded.$metadata.httpStatusCode === 200){
              return {key:file.originalname, statusCode : fileuploaded.$metadata.httpStatusCode}
          }
          else{
              return { fileuploaded }
          }
              
        
              })
            )
          
           return fileuploadedData
           
            
          } catch (error) {
                return error.message
          }
}



exports.getFileUrl = async (data) => { 
  
      
      try {

        const s3 = new S3Client({ 

            credentials : {
                  accessKeyId: AWS_ACCESS_KEY_ID, 
                  secretAccessKey: AWS_ACCESS_KEY_SECRET
                  
            },
            region: AWS_REGION
        
        });
    
        const fileGetData = { 
            Bucket: AWS_BUCKET_NAME,
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
exports.deleteImageFromS3 = async (imageKey) => {
  // console.log(imageKey)
  const s3 = new S3Client({ 

    credentials : {
          accessKeyId: AWS_ACCESS_KEY_ID, 
          secretAccessKey: AWS_ACCESS_KEY_SECRET
          
    },
    region: AWS_REGION

});
console.log('s3',s3)
  const deleteParams = {
    Bucket: AWS_BUCKET_NAME,
    Key: imageKey, 
  };
  const command = new DeleteObjectCommand(deleteParams)

  let deletedData = await s3.send(command);
  return deletedData;
};

//to get  assessor attendence list data like profilePic,clockiIn,clockOut
exports.getassessorListFileUrl = async (data,fileKeys) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });
 
  const fileUrls = [];
  // Destructure the properties you want from the data object
  const {
    _id,
    assessorId,
    firstName,
    lastName,
    email,
    clockIn,
    clockOut,
    modeofAgreement,
    isAllDocumentUploaded,
    assessorCertificate,
    client_status,
  } = data;
 
  // Create a new object with the selected properties
  const newData = {
    _id,
    assessorId,
    firstName,
    lastName,
    email,
    clockIn,
    clockOut,
    modeofAgreement,
    isAllDocumentUploaded,
    assessorCertificate, 
    client_status,
  };
 
  // Push the new object into the fileUrls array
  fileUrls.push(newData);
  for (const key of fileKeys) {
    const fileGetData = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${data.email}/${key}`,
    };

    const getCommand = new GetObjectCommand(fileGetData);

    try {
      //await s3.send(getCommand).promise(); // Check if the object exists
      const url = await getSignedUrl(s3, getCommand, { expiresIn: 36000 });

      if (url) {
        const newData = {
          key: key,
          url: url,
        };

        fileUrls.push(newData);
      }
    } catch (error) {
      if (error.name === 'NotFound') {
        const newData = {
          key: key,
          url: null, // Set URL to null if the file doesn't exist
        };
        fileUrls.push(newData);
      } else {
        console.log("error", error);
        // Handle error if necessary
      }
    }
  }

  return fileUrls;
};


//to get only ssessor profile
exports.getassessorProfileUrl = async (data,fileKeys) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });
 
  const fileUrls = [];
  // Destructure the properties you want from the data object
  // const {
  //   _id,
  //   assessorId,
  //   firstName,
  //   lastName,
  //   email,
  //   modeofAgreement,
  //   isAllDocumentUploaded,
  //   assessorCertificate,
  //   client_status,
  //   assignedBatchesId,
  // } = data;
 
  // // Create a new object with the selected properties
  // const newData = {
  //   _id,
  //   assessorId,
  //   firstName,
  //   lastName,
  //   email,
  //   modeofAgreement,
  //   isAllDocumentUploaded,
  //   assessorCertificate, 
  //   client_status,
  //   assignedBatchesId,
  // };
 
  // Push the new object into the fileUrls array
 // fileUrls.push(newData);
 // for (const key of fileKeys) {
    const fileGetData = {
      Bucket: process.env.AWS_BUCKET_NAME,
     // Key: `${data.assesor_id.email}/${fileKeys}`//${key}`,//`${data.assesor_id}/${req.file.originalname}`
      Key:`${fileKeys}`//`${data.assesor_id}/${fileKeys}`

    };

    const getCommand = new GetObjectCommand(fileGetData);

    try {
      //await s3.send(getCommand).promise(); // Check if the object exists
      const url = await getSignedUrl(s3, getCommand, { expiresIn: 36000 });

      if (url) {
        const newData = {
          key: fileKeys,//key,
          url: url,
        };

        fileUrls.push(newData);
      }
    } catch (error) {
      if (error.name === 'NotFound') {
        const newData = {
          key: key,
          url: null, // Set URL to null if the file doesn't exist
        };
        fileUrls.push(newData);
      } else {
        console.log("error", error);
        // Handle error if necessary
      }
    }
  //}

  return fileUrls;
};

exports.getassessorRegularizeProfileUrl = async (data,fileKeys) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });
 
  const fileUrls = [];
 
    const fileGetData = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${data.assesor_id.email}/${fileKeys}`
  
    };

    const getCommand = new GetObjectCommand(fileGetData);

    try {
  
      const url = await getSignedUrl(s3, getCommand, { expiresIn: 36000 });

      if (url) {
        const newData = {
          key: fileKeys,
          url: url,
        };

        fileUrls.push(newData);
      }
    } catch (error) {
      if (error.name === 'NotFound') {
        const newData = {
          key: key,
          url: null, // Set URL to null if the file doesn't exist
        };
        fileUrls.push(newData);
      } else {
        console.log("error", error);
        // Handle error if necessary
      }
    }
  //}

  return fileUrls;
};

exports.getassessorRegularizeClockinUrl = async (data,fileKeys) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });
 
 // const fileUrls = [];
 
 // fileUrls.push(newData);
 // for (const key of fileKeys) {
    const fileGetData = {
      Bucket: process.env.AWS_BUCKET_NAME,
     // Key: `${data.assesor_id.email}/${fileKeys}`//${key}`,//`${data.assesor_id}/${req.file.originalname}`
      Key:`${fileKeys}`//`${data.assesor_id}/${fileKeys}`

    };

    const getCommand = new GetObjectCommand(fileGetData);

    try {
      //await s3.send(getCommand).promise(); // Check if the object exists
      const url = await getSignedUrl(s3, getCommand, { expiresIn: 36000 });

      if (url) {
        const newData = {
          key: fileKeys,//key,
          url: url,
        };

        //fileUrls.push(newData);
        return newData
      }
    } catch (error) {
      if (error.name === 'NotFound') {
        const newData = {
          key: key,
          url: null, // Set URL to null if the file doesn't exist
        };
        fileUrls.push(newData);
      } else {
        console.log("error", error);
        // Handle error if necessary
      }
    }
  //}

  return fileUrls;
};

exports.uploadAuditZipFile = async (zipBuffer, zipKey) => {
  try {
    const s3 = new S3Client({
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
      },
      region: process.env.AWS_REGION,
    });

    const fileData = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: zipKey,
      Body: zipBuffer,
      ContentType: "application/zip",
    };

    const command = new PutObjectCommand(fileData);
    const uploaded = await s3.send(command);

    if (uploaded.$metadata.httpStatusCode === 200) {
      return {
        statusCode: uploaded.$metadata.httpStatusCode,
        key: zipKey,
        message: "Zip uploaded successfully",
        location: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${zipKey}`
      };
    } else {
      return uploaded;
    }

  } catch (error) {
    return { error: error.message };
  }
};


exports.generateZipBuffer = async (batchName, filesList) => {
  return new Promise((resolve, reject) => {
    const archive = archiver("zip", { zlib: { level: 9 } });
    const chunks = [];

    archive.on("data", chunk => chunks.push(chunk));
    archive.on("end", () => resolve(Buffer.concat(chunks)));
    archive.on("error", reject);

    // FOLDERS
    filesList.folders.forEach(folder => {
      archive.append(null, { name: folder });
    });

    // FILE STREAMS
    filesList.files.forEach(f => {
      archive.append(f.stream, { name: f.path });
    });

    archive.finalize();
  });
};

