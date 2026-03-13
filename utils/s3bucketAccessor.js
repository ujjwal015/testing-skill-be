const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { removeExifData } = require("./imageProcessor");
const optimizeBuffer = require("./optimizeBuffer");

exports.uploadFile = async (req) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });
  const key = `${Math.floor(1000 + Math.random() * 900000)}`;
  const bufferDataWithoutMeta = await removeExifData(req.file.buffer, req.file.mimetype);
  const optimizedBuffer = await optimizeBuffer(bufferDataWithoutMeta.buffer, req.file.mimetype);
  const fileData = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `${key}`,
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

exports.uploadOption = async (req) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });
  const key = `${Math.floor(1000 + Math.random() * 900000)}`;
  const bufferDataWithoutMeta = await removeExifData(req.file.buffer, req.file.mimetype);
  const fileData = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `${key}`,
    Body: bufferDataWithoutMeta.buffer,
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

exports.getFileUrl = async (data) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });
  const sipCertificateKeysWithIds = data.sipDetails.map((sipDetail) => ({
    sipCertificateKey: sipDetail.sipCertificateKey,
    _id: sipDetail._id,
    jobroleId: sipDetail.jobroleId,
    sipCertificateName: sipDetail.sipCertificateName,
    sipCertificateSize: sipDetail.sipCertificateSize,
  }));
  const fileUrls = [];

  for (const {
    sipCertificateKey,
    _id,
    jobroleId,
    sipCertificateName,
    sipCertificateSize,
  } of sipCertificateKeysWithIds) {
    const fileGetData = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: sipCertificateKey,
    };

    const getCommand = new GetObjectCommand(fileGetData);
    try {
      const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });

      if (url) {
        const newData = {
          _id,
          jobroleId: jobroleId,
          sipCertificateKey,
          sipCertificateName,
          sipCertificateSize,
          url: url,
        };
        fileUrls.push(newData);
      }
    } catch (error) {
      return error;
      // Handle error if necessary
    }
  }

  return fileUrls;
};

exports.getOptionsFileUrl = async (optionImgKey) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });

  const fileGetData = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: optionImgKey,
  };

  const getCommand = new GetObjectCommand(fileGetData);

  try {
    const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 }); // Adjust expiresIn as needed

    if (url) {
      return  url ;
     }
    // else {
    //   // Handle the case where the URL is not available
    //   return { optionImgKey, url: null };
    // }
  } catch (error) {
    // Handle any errors that occur during URL generation
    
    return { optionImgKey, url: null };
  }
};

// Function to delete an image from the S3 bucket
exports.deleteImageFromS3 = async (imageKey) => {

  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });

  const deleteParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: imageKey, 
  };

  let deletedData = await s3.send(new DeleteObjectCommand(deleteParams));
   
  return deletedData;
};

// exports.getassessorFileUrl = async (data) => {
//   const s3 = new S3Client({
//     credentials: {
//       accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//       secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
//     },
//     region: process.env.AWS_REGION,
//   });
//   const fileKeys = [
//     "cv",
//     "experienceCertificate",
//     "aadharCard",
//     "panCard",
//     "assessorPhoto",
//     "agreementCertificate",
//     "highSchoolCertificate",
//     "intermediateCertificate",
//     "diplomaCertificate",
//     "undergradCertificate",
//     "postgradCertificate",
//     "otherCertificate",
//   ];
  // const fileUrls = [];
  // // Destructure the properties you want from the data object
  // const {
  //   _id,
  //   assessorId,
  //   firstName,
  //   lastName,
  //   email,
  //   mobile,
  //   gender,
  //   dob,
  //   address,
  //   state,
  //   district,
  //   pinCode,
  //   sector,
  //   aadharNo,
  //   panCardNo,
  //   bankName,
  //   bankAccount,
  //   bankIFSC,
  //   education,
  //   experience,
  //   agreementSigned,
  //   agreementValidity,
  //   modeofAgreement,
  //   isAllDocumentUploaded,
  //   clientDetail,
  //   sipDetails,
  //   cvCertificate,
  //   experienceCertificate,
  //   agreementCertificate,
  //   assessorCertificate,
  //   aadharCardCertificate,
  //   panCardCertificate,
  //   highSchoolCertificate,
  //   intermediateCertificate,
  //   diplomaCertificate,
  //   undergradCertificate,
  //   postgradCertificate,
  //   otherCertificate,
  //   sipCertificateName,

  //   client_status,
  // } = data;

  // // Create a new object with the selected properties
  // const newData = {
  //   _id,
  //   assessorId,
  //   firstName,
  //   lastName,
  //   email,
  //   mobile,
  //   gender,
  //   dob,
  //   address,
  //   state,
  //   district,
  //   pinCode,
  //   sector,
  //   aadharNo,
  //   panCardNo,
  //   bankName,
  //   bankAccount,
  //   bankIFSC,
  //   education,
  //   experience,
  //   agreementSigned,
  //   agreementValidity,
  //   modeofAgreement,
  //   isAllDocumentUploaded,
  //   clientDetail,
  //   sipDetails,
  //   cvCertificate,
  //   experienceCertificate,
  //   agreementCertificate,
  //   assessorCertificate,
  //   aadharCardCertificate,
  //   panCardCertificate,
  //   highSchoolCertificate,
  //   intermediateCertificate,
  //   diplomaCertificate,
  //   undergradCertificate,
  //   postgradCertificate,
  //   otherCertificate,
  //   sipCertificateName,

  //   client_status,
  // };

  // // Push the new object into the fileUrls array
  // fileUrls.push(newData);

//   for (const key of fileKeys) {
//     const fileGetData = {
//       Bucket: process.env.AWS_BUCKET_NAME,
//       Key: `${data.email}/${key}`,
//     };

//     const getCommand = new GetObjectCommand(fileGetData);

//     try {
//       const url = await getSignedUrl(s3, getCommand, { expiresIn: 36000 });

//       if (url) {
//         const newData = {
//           key: key,
//           url: url,
//         };

//         fileUrls.push(newData);
//       }
//     } catch (error) {
//       console.log("error", error);
//       // Handle error if necessary
//     }
//   }

//   return fileUrls;
// };



exports.getassessorFileUrl = async (data,fileKeys) => {
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
    mobile,
    gender,
    dob,
    address,
    state,
    district,
    pinCode,
    sector,
    aadharNo,
    panCardNo,
    bankName,
    bankAccount,
    bankIFSC,
    education,
    experience,
    agreementSigned,
    agreementValidity,
    modeofAgreement,
    isAllDocumentUploaded,
    clientDetail,
    sipDetails,
    cvCertificate,
    experienceCertificate,
    agreementCertificate,
    assessorCertificate,
    aadharCardCertificate,
    panCardCertificate,
    highSchoolCertificate,
    intermediateCertificate,
    diplomaCertificate,
    undergradCertificate,
    postgradCertificate,
    otherCertificate,
    sipCertificateName,
 
    client_status,
  } = data;
 
  // Create a new object with the selected properties
  const newData = {
    _id,
    assessorId,
    firstName,
    lastName,
    email,
    mobile,
    gender,
    dob,
    address,
    state,
    district,
    pinCode,
    sector,
    aadharNo,
    panCardNo,
    bankName,
    bankAccount,
    bankIFSC,
    education,
    experience,
    agreementSigned,
    agreementValidity,
    modeofAgreement,
    isAllDocumentUploaded,
    clientDetail,
    sipDetails,
    cvCertificate,
    experienceCertificate,
    agreementCertificate,
    assessorCertificate,
    aadharCardCertificate,
    panCardCertificate,
    highSchoolCertificate,
    intermediateCertificate,
    diplomaCertificate,
    undergradCertificate,
    postgradCertificate,
    otherCertificate,
    sipCertificateName,
 
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
      const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });

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

exports.getassessorListFileUrl = async (data,fileKeys) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });
  // const fileKeys = [
  //   "cv",
  //   "experienceCertificate",
  //   "aadharCard",
  //   "panCard",
  //   "assessorPhoto",
  //   "agreementCertificate",
  //   "highSchoolCertificate",
  //   "intermediateCertificate",
  //   "diplomaCertificate",
  //   "undergradCertificate",
  //   "postgradCertificate",
  //   "otherCertificate",
  // ];
  const fileUrls = [];
  // Destructure the properties you want from the data object
  const {
    _id,
    assessorId,
    firstName,
    lastName,
    email,
    mobile,
    gender,
    dob,
    address,
    state,
    district,
    pinCode,
    sector,
    aadharNo,
    panCardNo,
    bankName,
    bankAccount,
    bankIFSC,
    education,
    experience,
    agreementSigned,
    agreementValidity,
    modeofAgreement,
    isAllDocumentUploaded,
    clientDetail,
    sipDetails,
    cvCertificate,
    experienceCertificate,
    agreementCertificate,
    assessorCertificate,
    aadharCardCertificate,
    panCardCertificate,
    highSchoolCertificate,
    intermediateCertificate,
    diplomaCertificate,
    undergradCertificate,
    postgradCertificate,
    otherCertificate,
    sipCertificateName,
    tpDeclaration,
    examcenter,
    client_status,
    failedLoginAttempts,
    isAccountLocked,
    lockoutExpiry,
    lastFailedLogin,
  } = data;
 
  // Create a new object with the selected properties
  const newData = {
    _id,
    assessorId,
    firstName,
    lastName,
    email,
    mobile,
    gender,
    dob,
    address,
    state,
    district,
    pinCode,
    sector,
    aadharNo,
    panCardNo,
    bankName,
    bankAccount,
    bankIFSC,
    education,
    experience,
    agreementSigned,
    agreementValidity,
    modeofAgreement,
    isAllDocumentUploaded,
    clientDetail,
    sipDetails,
    cvCertificate,
    experienceCertificate,
    agreementCertificate,
    assessorCertificate,
    aadharCardCertificate,
    panCardCertificate,
    highSchoolCertificate,
    intermediateCertificate,
    diplomaCertificate,
    undergradCertificate,
    postgradCertificate,
    otherCertificate,
    sipCertificateName,
    tpDeclaration,
    examcenter,
    client_status,
    failedLoginAttempts,
    isAccountLocked,
    lockoutExpiry,
    lastFailedLogin,
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
      const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });

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


exports.getCheckFileUrl = async (data) => {
  console.log('batch id in getCheckFileUrl',data.batchId)
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });
  const fileKeys = [
    "checkInPhoto",
    "checkOutPhoto",
  ];
  const fileUrls = [];
 
  for (const key of fileKeys) {
    const fileGetData = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${data.batchId}/${key}`,
    };

    const getCommand = new GetObjectCommand(fileGetData);

    try {
      //await s3.send(getCommand).promise(); // Check if the object exists
      const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });

      if (url) {
        const newData = {
          batchId:data.batchId,
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

exports.getQAFileUrl = async (data,fileKeys,type = null) => {
  console.log("data.QAverificationTimeStampId===>",data.QAverificationTimeStampId,)
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });
  
  const fileUrls = [];
 
  for (const key of fileKeys) {
    const imageName = key.imgName
    let imageKey;
    if(type && (type === 'checkInPhoto' || type === 'checkOutPhoto') ){
      imageKey = key.imgKey
    } else {
      // imageKey = `${key.imgKey ?key.imgKey:key.videoKey}`//key.imgKey//`${data.QAverificationTimeStampId}/${key.imgKey ?key.imgKey:key.videoKey}`
      imageKey = `${data.QAverificationTimeStampId}/${key.imgKey ?key.imgKey:key.videoKey}`
    }

    const fileGetData = {

      Bucket: process.env.AWS_BUCKET_NAME,
      Key : imageKey
     // Key: `${data.QAverificationTimeStampId}/${key.imgKey ?key.imgKey:key.videoKey}`,
      // Key: `${data.QAverificationTimeStampId}/${key.imgKey ?key.imgKey:key.videoKey}`,
    };

    const getCommand = new GetObjectCommand(fileGetData);

    try {
      //await s3.send(getCommand).promise(); // Check if the object exists
      const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });

      if (url) {
        const newData = {
          batchId:data.batchId,
          QAverificationTimeStampId: data.QAverificationTimeStampId,
          key: `${key.imgKey ?key.imgKey:key.videoKey}`,//key.imgKey,
          adminUploaded: key.adminUploaded,
          status: key.status,
          fileName:imageName,
          url: url,
          _id: key._id
        };

        //console.log("newData==>",newData)

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

exports.getQAZipFileUrl = async (data,fileKeys,type = null) => { //type = null
  // console.log("filekeys===>",fileKeys)
   const s3 = new S3Client({
     credentials: {
       accessKeyId: process.env.AWS_ACCESS_KEY_ID,
       secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
     },
     region: process.env.AWS_REGION,
   });
   // const fileKeys = [
   //   "checkInPhoto",
   //   "checkOutPhoto",
   // ];
   const fileUrls = [];
  
   for (const key of fileKeys) {
   console.log("key===>",key)
    //approch to get checkInPhoto and checkOutPhoto
    let imageKey;
    if(type && (type === 'checkInPhoto' || type === 'checkOutPhoto') ){
      imageKey = key//.imgKey
    } else {
      // imageKey = `${key.imgKey ?key.imgKey:key.videoKey}`//key.imgKey//`${data.QAverificationTimeStampId}/${key.imgKey ?key.imgKey:key.videoKey}`
      imageKey = `${data.QAverificationTimeStampId}/${key}`//{key.imgKey ?key.imgKey:key.videoKey}`
    }
    // console.log('key--->', key)
     const fileGetData = {
       Bucket: process.env.AWS_BUCKET_NAME,
      //  Key: `${data.QAverificationTimeStampId}/${key}`,
     // Key: key,
     Key : imageKey
     };
 
     const getCommand = new GetObjectCommand(fileGetData);
 
     try {
       //await s3.send(getCommand).promise(); // Check if the object exists
       const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });
 
       if (url) {
         const newData = {
           batchId:data.batchId,
           QAverificationTimeStampId: data.QAverificationTimeStampId,
           key: `${key}`,//key.imgKey,
           //adminUploaded: key.adminUploaded,
           //status: key.status,
           url: url,
           _id: key._id
         };
 
         //console.log("newData==>",newData)
 
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
exports.getQAFileUrlByBatch = async (data,fileKeys) => {
  //console.log('getQAFileUrl',data,fileKeys)
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });
  // const fileKeys = [
  //   "checkInPhoto",
  //   "checkOutPhoto",
  // ];
  const fileUrls = [];
 
  for (const key of fileKeys) {
    const fileGetData = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${data.batchIdName}/${key}`,
    };

    const getCommand = new GetObjectCommand(fileGetData);

    try {
      //await s3.send(getCommand).promise(); // Check if the object exists
      const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });

      if (url) {
        const newData = {
          batchIdName:data.batchIdName,
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

exports.getQAFileListUrl = async (batchId,fileKeys) => {
  console.log('getQAFileUrl',batchId,fileKeys)
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });
  // const fileKeys = [
  //   "checkInPhoto",
  //   "checkOutPhoto",
  // ];
  const fileUrls = [];
 
  for (const key of fileKeys) {
    const fileGetData = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${batchId}/${key}`,
    };

    const getCommand = new GetObjectCommand(fileGetData);

    try {
      //await s3.send(getCommand).promise(); // Check if the object exists
      const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });
      
      if (url) {
        const newData = {
          batchId:batchId,
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