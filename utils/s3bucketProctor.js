const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
  } = require("@aws-sdk/client-s3");
  const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { removeExifData } = require("./imageProcessor");
const optimizeBuffer = require("./optimizeBuffer");
  
  exports.uploadProctorFile = async (req) => {
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
      Key: `${req.email}/${req.key}`,
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
  

  exports.getProctorFileUrl = async (data,fileKeys) => {
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
    proctorId,
    proctorName,
    // clientId,
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
    modeofAgreement,
    agreementValidity,
    isAllDocumentUploaded,
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
    client_status
  } = data;
  
  // Create a new object with the selected properties
  const newData = {
    _id,
    proctorId,
    proctorName,
    // clientId,
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
    client_status
  };
  
  // Push the new object into the fileUrls array
  fileUrls.push(newData);
    for (const key of fileKeys) {
    
      const fileGetData = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${data.email}/${key}`//sipCertificateKey//`${sipCertificate.sipCertificateKey}`,
      };
  
      const getCommand = new GetObjectCommand(fileGetData);
      try {
        const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });
        if (url) {
          
          const newData = {
            key:key,
            url: url,
          };
          // fileUrls.push({ newData,key, url });
          fileUrls.push(newData);
          //return newData
        }
      } catch (error) {
        if (error.name === 'NotFound') {
          const newData = {
            key: key,
            url: null, // Set URL to null if the file doesn't exist
          };
          fileUrls.push(newData);
        // Handle error if necessary
      }  else {
        console.log("error", error);
        // Handle error if necessary
      }
   }
  }
   // return newData
    return fileUrls;
  };