const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const responseMessage = require("./responseMessage");
const s3UrlToBlob = require("./s3UrlToBlob");
const { removeExifData } = require("./imageProcessor");
const optimizeBuffer = require("./optimizeBuffer");

exports.uploadAssessorFile = async (req) => {
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

exports.getAssessorFileUrl = async (data) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });

  const fileGetData = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `${data.email}/${data.cvKey}`,
  };

  const getCommand = new GetObjectCommand(fileGetData);

  try {
    const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });
    if (url) {
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
        isAllDocumentUploaded,
        clientDetail,
        sipDetails,
        client_status,
      } = data;

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
        isAllDocumentUploaded,
        clientDetail,
        sipDetails,
        client_status,
        url: url,
      };

      return newData;
    }
  } catch (error) {
    return error;
  }
};

// Function to delete an image from the S3 bucket
exports.deleteAssessorFromS3 = async (req) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });

  const deleteParams = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `${req.email}/${req.key}`,
  };

  let deletedData = await s3.send(new DeleteObjectCommand(deleteParams));

  return deletedData;
};

//assessor attendance
exports.uploadAssessorExperienceFile = async ({ req, randomNo }) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });

  const fileData = {
    Bucket: process.env.AWS_BUCKET_NAME,
    Key: `${req.email}/${req.key}${randomNo}`, // `${req.email}/${req.key}`,
    Body: req.buffer,
    ContentType: req.mimetype,
  };
  const command = new PutObjectCommand(fileData);

  try {
    const fileuploadedData = await s3.send(command);

    if (fileuploadedData.$metadata.httpStatusCode === 200) {
      return {
        key: fileData.Key,
        s3Url: `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileData.Key}`,
        statusCode: fileuploadedData.$metadata.httpStatusCode,
      };
    } else {
      return { fileuploadedData };
    }
  } catch (error) {
    return error;
  }
};

exports.getassessorPersonalFileUrl = async (data, fileKeys, verified) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });

  const cardWithUrls = await Promise.all(
    data.personalDetail.map(async (personalData) => {
      const matchingFileKey = personalData.cardFileKey;
      const fileKeyIndex = fileKeys.indexOf(matchingFileKey);

      if (fileKeyIndex !== -1) {
        const key = fileKeys[fileKeyIndex];
        const fileGetData = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `${data.email}/${key}`,
        };
        const getCommand = new GetObjectCommand(fileGetData);

        try {
          const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });

          // Check if status is 'accepted' if verified is true
          if (
            verified &&
            personalData.status !== "accepted" &&
            personalData.status !== "noAction"
          ) {
            return null; // Skip this personal data
          }

          return {
            isDocumentUploaded: personalData.isDocumentUploaded,
            cardType: personalData.cardType,
            cardNo: personalData.cardNo,
            cardFileName: personalData.cardFileName,
            cardFileSize: personalData.cardFileSize,
            cardFileKey: personalData.cardFileKey,
            adminUploaded: personalData.adminUploaded,
            status: personalData.status,
            url: url,
            _id: personalData._id,
          };
        } catch (error) {
          if (error.name === "NotFound") {
            return null; // Skip this personal data
          } else {
            console.log("error", error);
            // Handle error if necessary
            return null; // Skip this personal data
          }
        }
      } else {
        return null; // Skip this personal data
      }
    })
  );

  // Remove null elements from the array
  return cardWithUrls.filter((data) => data !== null);
};

exports.getassessorExperienceFileUrl = async (
  data,
  fileKeys,
  verified,
  pending
) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });

  const experiencesWithUrls = await Promise.all(
    data.experiences.map(async (experience) => {
      const matchingFileKey = experience.experienceCertificateKey;
      const fileKeyIndex = fileKeys.indexOf(matchingFileKey);

      if (fileKeyIndex !== -1) {
        const key = fileKeys[fileKeyIndex];
        const fileGetData = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `${data.email}/${key}`,
        };

        const getCommand = new GetObjectCommand(fileGetData);

        try {
          const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });
          console.log("verified==>");
          console.log("pending===>", pending);
          // Check if status is 'accepted' if verified is true
          if (
            verified === true &&
            experience.status !== "accepted" &&
            experience.status !== "noAction"
          ) {
            return null; // Skip this experience data
          }

          //  // Check if status is 'rejected' or 'noAction' and skip if true
          // else if (pending && experience.status !== 'rejected' || experience.status !== 'noAction') {
          //   return null; // Skip this experience data
          // }
          else if (pending === true && experience.status === "accepted") {
            return null; // Skip this experience data
          }

          return {
            isExperienceUploaded: experience.isExperienceUploaded,
            designation: experience.designation,
            companyName: experience.companyName,
            startDate: experience.startDate,
            endDate: experience.endDate,
            experienceCertificateName: experience.experienceCertificateName,
            experienceCertificateSize: experience.experienceCertificateSize,
            experienceCertificateKey: experience.experienceCertificateKey,
            adminUploaded: experience.adminUploaded,
            status: experience.status,
            url: url,
            _id: experience._id,
          };
        } catch (error) {
          console.log("error", error);
          // Handle error if necessary
          return null; // Skip this experience data
        }
      } else {
        return null; // Skip this experience data
      }
    })
  );

  // Remove null elements from the array
  return experiencesWithUrls.filter((data) => data !== null);
};

exports.getassessorEducationFileUrl = async (data, fileKeys, verified) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });

  const educationsWithUrls = await Promise.all(
    data.education.map(async (edu) => {
      const matchingFileKey = edu.educationCertificateKey;
      const fileKeyIndex = fileKeys.indexOf(matchingFileKey);

      if (fileKeyIndex !== -1) {
        const key = fileKeys[fileKeyIndex];
        const fileGetData = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `${data.email}/${key}`,
        };

        const getCommand = new GetObjectCommand(fileGetData);

        try {
          const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });

          // Check if status is 'accepted' if verified is true
          if (
            verified &&
            edu.status !== "accepted" &&
            edu.status !== "noAction"
          ) {
            return null; // Skip this experience data
          }
          return {
            isEducationUploaded: edu.isEducationUploaded,
            collegeName: edu.collegeName,
            degree: edu.degree,
            startDate: edu.startDate,
            endDate: edu.endDate,
            educationCertificateName: edu.educationCertificateName,
            educationCertificateSize: edu.educationCertificateSize,
            educationCertificateKey: edu.educationCertificateKey,
            adminUploaded: edu.adminUploaded,
            status: edu.status,
            url: url,
            _id: edu._id,
          };
        } catch (error) {
          console.log("error", error);
          // Handle error if necessary
          return null; // Skip this education data
        }
      } else {
        return null;
      }
    })
  );
  // Remove null elements from the array
  return educationsWithUrls.filter((data) => data !== null);
};

exports.getassessorJobroleFileUrl = async (data, fileKeys, verified) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });

  const jobWithUrls = await Promise.all(
    data.jobRole.map(async (job) => {
      const matchingFileKey = job.jobRoleCertificateKey;
      const fileKeyIndex = fileKeys.indexOf(matchingFileKey);

      if (fileKeyIndex !== -1) {
        const key = fileKeys[fileKeyIndex];
        const fileGetData = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `${data.email}/${key}`,
        };

        const getCommand = new GetObjectCommand(fileGetData);

        try {
          const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });
          // Check if status is 'accepted' if verified is true
          if (
            verified &&
            job.status !== "accepted" &&
            job.status !== "noAction"
          ) {
            return null; // Skip this experience data
          }
          return {
            isEducationUploaded: job.isEducationUploaded,
            jobroleName: job.jobroleName,
            experience: job.experience,
            issueDate: job.issueDate,
            validUpto: job.validUpto,
            jobRoleCertificateName: job.jobRoleCertificateName,
            educationCertificateSize: job.educationCertificateSize,
            jobRoleCertificateKey: job.jobRoleCertificateKey,
            adminUploaded: job.adminUploaded,
            status: job.status,
            url: url,
            _id: job._id,
          };
        } catch (error) {
          console.log("error", error);
          // Handle error if necessary
          return null;
        }
      } else {
        return null;
      }
    })
  );

  // Remove null elements from the array
  return jobWithUrls.filter((data) => data !== null);
};

exports.getassessorAgreementFileUrl = async (data, fileKeys, verified) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });

  const agreementWithUrls = await Promise.all(
    data.agreement.map(async (agree) => {
      const matchingFileKey = agree.agreementCertificateKey;
      const fileKeyIndex = fileKeys.indexOf(matchingFileKey);

      if (fileKeyIndex !== -1) {
        const key = fileKeys[fileKeyIndex];
        const fileGetData = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `${data.email}/${key}`,
        };

        const getCommand = new GetObjectCommand(fileGetData);

        try {
          const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });

          // Check if status is 'accepted' if verified is true
          if (
            verified &&
            agree.status !== "accepted" &&
            agree.status !== "noAction"
          ) {
            return null; // Skip this experience data
          }
          return {
            agreementName: agree.agreementName,
            agreementValidFrom: agree.agreementValidFrom,
            agreementValidTo: agree.agreementValidTo,
            agreementCertificateName: agree.agreementCertificateName,
            agreementCertificateSize: agree.agreementCertificateSize,
            agreementCertificateKey: agree.agreementCertificateKey,
            isAgreementUploaded: agree.isAgreementUploaded,
            adminUploaded: agree.adminUploaded,
            status: agree.status,
            url: url,
            _id: agree._id,
          };
        } catch (error) {
          console.log("error", error);
          // Handle error if necessary
          return null;
        }
      } else {
        return null;
      }
    })
  );

  // Remove null elements from the array
  return agreementWithUrls.filter((data) => data !== null);
};
exports.getassessorProfileFileUrl = async (data, fileKeys) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });

  const profileWithUrls = await Promise.all(
    fileKeys.map(async (key) => {
      const fileGetData = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: `${data.email}/${key}`,
      };
      try {
        const getCommand = new GetObjectCommand(fileGetData);
        const response = await s3.send(getCommand);

        const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });

        return {
          _id: data._id,
          assessorSipId: data.assessorSipId,
          assessorId: data.assessorId,
          fullName: data.fullName,
          email: data.email,
          ToaType: data.ToaType,
          RadiantFundToa: data.RadiantFundToa,
          mobile: data.mobile,
          gender: data.gender,
          dob: data.dob,
          address: data.address,
          state: data.state,
          sector: data.sector,
          district: data.district,
          pincode: data.pinCode,
          modeofAgreement: data.modeofAgreement,
          assessorType: data.assessorType,
          assessorName: data.assessorCertificate.assessorName,
          assessorPhotoSize: data.assessorCertificate.assessorPhotoSize,
          profileKey: data.assessorCertificate.profileKey,
          key: key,
          url: url,
        };
      } catch (error) {
        if (error.name === "NotFound") {
          return {
            _id: data._id,
            assessorSipId: data.assessorSipId,
            assessorId: data.assessorId,
            fullName: data.fullName,
            email: data.email,
            mobile: data.mobile,
            gender: data.gender,
            dob: data.dob,
            address: data.address,
            state: data.state,
            sector: data.sector,  
            district: data.district,
            pincode: data.pinCode,
            modeofAgreement: data.modeofAgreement,
            assessorType: data.assessorType,
            key: key,
            url: null,
          };
        } else {
          // Handle error if necessary
          return {
            _id: data._id,
            assessorSipId: data.assessorSipId,
            assessorId: data.assessorId,
            fullName: data.fullName,
            email: data.email,
            mobile: data.mobile,
            gender: data.gender,
            dob: data.dob,
            address: data.address,
            ToaType: data.ToaType,
            state: data.state,
            sector: data.sector,
            district: data.district,
            pincode: data.pinCode,
            isPayroll: data.isPayroll,
            isFreelance: data.isFreelance,
            modeofAgreement: data.modeofAgreement,
            assessorType: data.assessorType,
            key: key,
            url: null,
          };
        }
      }
    })
  );

  return profileWithUrls;
  //return profileWithUrls;
};

const dateDifference = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  // console.log('startDate', startDate)
  // console.log('endDate', endDate)
  // console.log('start', start)
  // console.log('end', end)

  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();

  // console.log('yearDiff', yearDiff)
  // console.log('monthDiff', monthDiff)

  return { years: yearDiff, months: monthDiff };
};

exports.getassessorPhotoFileUrl = async (data, fileKeys) => {
  // Calculate total experience duration
  let totalExperience = { years: 0, months: 0 };

  data.experiences.forEach((experience) => {
    let { years, months } = dateDifference(
      experience.startDate,
      experience.endDate
    );

    // Ensure months are positive and adjust years if needed
    if (months < 0) {
      years -= 1;  // Reduce one year
      months += 12; // Convert negative months to positive
    }

    totalExperience.years += years;
    totalExperience.months += months;
  });

  // Convert months to years if more than 12
  if (totalExperience.months >= 12) {
    totalExperience.years += Math.floor(totalExperience.months / 12);
    totalExperience.months %= 12;
  }

  let agreementSigned;
  let agreementValidity;

  if (data?.agreement && data.agreement.length > 0) {
    agreementValidity = data.agreement[0]?.agreementValidTo;
    const [day, month, year] = agreementValidity
      ? agreementValidity?.split("/")
      : [];
    const agreementValidityDate = new Date(`${year}-${month}-${day}`);

    const currentDate = new Date();

    if (agreementValidityDate >= currentDate) {
      agreementSigned = "yes";
    } else {
      agreementSigned = "no";
    }
  } else {
    // If data.agreement is null or empty, set agreementSigned to 'no'
    agreementSigned = "no";
  }
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
    assessorSipId,
    fullName,
    email,
    mobile,
    gender,
    dob,
    address,
    state,
    sector,
    district,
    pinCode,
    modeofAgreement,
    personalDetail,
    jobRole,
    education,
    agreement,
    experiences,
    isAssesorProfileUploaded,
    isAssessorAssignToBatch,
    client_status,
    createdAt,
    updatedAt,
    ToaType,
    assessorType,
    RadiantFundToa,
    scheme,
    accountHolderName,
    bankAccount,
    bankBranchName,
    bankIFSC,
    bankName,
    failedLoginAttempts,
    isAccountLocked,
    lockoutExpiry,
    lastFailedLogin,
  } = data;

  // Create a new object with the selected properties
  const newData = {
    _id,
    assessorId,
    fullName,
    email,
    mobile,
    gender,
    dob,
    address,
    state,
    sector,
    district,
    pinCode,
    agreementValidity,
    agreementSigned,
    totalExperience,
    modeofAgreement,
    assessorId,
    assessorSipId,
    personalDetail,
    jobRole,
    education,
    agreement,
    experiences,
    isAssesorProfileUploaded,
    isAssessorAssignToBatch,
    client_status,
    createdAt,
    updatedAt,
    ToaType,
    assessorType,
    RadiantFundToa,
    scheme,
    accountHolderName,
    bankAccount,
    bankBranchName,
    bankIFSC,
    bankName,
    failedLoginAttempts,
    isAccountLocked,
    lockoutExpiry,
    lastFailedLogin,
  };

  // Push the new object into the fileUrls array
  fileUrls.push(newData);
  //console.log("fileKeys:", fileKeys);
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
      if (error.message === "Failed to fetch from S3: Not Found") {
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

exports.getAssessorDashboardProfileUrl = async (data, fileKeys) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });

  // Return a single URL instead of an array of URLs
  if (fileKeys.length === 0) return null;

  try {
    // Assuming you're interested in the first file in the list
    const key = fileKeys[0]; // You can change this logic if needed to pick a specific key
    const fileGetData = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${data.email}/${key}`, // Assuming file paths are based on email
    };

    const getCommand = new GetObjectCommand(fileGetData);

    // Generate a signed URL for the file
    const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });

    if (url) {
      return url;  // Return the URL directly
    } else {
      return null;  // If no URL found, return null
    }
  } catch (error) {
    if (error.name === 'NotFound') {
      // If file is not found, return null URL
      return null;
    } else {
      console.log("Error fetching file:", error);
      // Handle other errors if necessary
      return null;
    }
  }
};

exports.getAssessorDashboardProfileUrl = async (data, fileKeys) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });

  // Return a single URL instead of an array of URLs
  if (fileKeys.length === 0) return null;

  try {
    // Assuming you're interested in the first file in the list
    const key = fileKeys[0]; // You can change this logic if needed to pick a specific key
    const fileGetData = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: `${data.email}/${key}`, // Assuming file paths are based on email
    };

    const getCommand = new GetObjectCommand(fileGetData);

    // Generate a signed URL for the file
    const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });

    if (url) {
      return url;  // Return the URL directly
    } else {
      return null;  // If no URL found, return null
    }
  } catch (error) {
    if (error.name === 'NotFound') {
      // If file is not found, return null URL
      return null;
    } else {
      console.log("Error fetching file:", error);
      // Handle other errors if necessary
      return null;
    }
  }
};

exports.getassessorHrDashboardFileUrl = async (data,fileKeys) => {
  // Calculate total experience duration
  let totalExperience = { years: 0, months: 0 };
  data.experiences.forEach(experience => {
     //console.log("experience", experience)
      const { years, months } = dateDifference(experience.startDate, experience.endDate);
     // console.log("years,months",years,months)
      totalExperience.years += years;
      totalExperience.months += months;
  });

  // Convert months to years if more than 12
  if (totalExperience.months >= 12) {
      totalExperience.years += Math.floor(totalExperience.months / 12);
      totalExperience.months %= 12;
  }

let agreementSigned;
let agreementValidity

// Check if data.agreement exists and has at least one item
if (data?.agreement && data.agreement.length > 0) {
agreementValidity = data.agreement[0]?.agreementValidTo;
// Parse the agreementValidity string into a valid date object
const [day, month, year] = agreementValidity ? agreementValidity?.split('/') : [];
const agreementValidityDate = new Date(`${year}-${month}-${day}`);

const currentDate = new Date();

if (agreementValidityDate >= currentDate) {
   agreementSigned = 'yes';
} else {
   agreementSigned = 'no';
}
} else {
// If data.agreement is null or empty, set agreementSigned to 'no'
agreementSigned = 'no';
}
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
 assessorSipId,
 fullName,
 email,
 mobile,
 gender,
 dob,
 address,
 state,
 district,
 pinCode,
 modeofAgreement,
 personalDetail,
 jobRole,
 education,
 agreement,
 experiences,
 isAssesorProfileUploaded,
 isAssessorAssignToBatch,
 client_status,
 createdAt,
 updatedAt,
 ToaType,
 scheme,
 profilePercentage

} = data;

// Create a new object with the selected properties
const newData = {
 _id,
 assessorId,
 fullName,
 email,
 mobile,
 gender,
 dob,
 address,
 state,
 district,
 pinCode,
 agreementValidity,
 agreementSigned,
 totalExperience,
 modeofAgreement,
 assessorId,
 assessorSipId,
 personalDetail,
 jobRole,
 education,
 agreement,
 experiences,
 isAssesorProfileUploaded,
 isAssessorAssignToBatch,
 client_status,
 createdAt,
 updatedAt,
 ToaType,
 scheme,
 profilePercentage
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
   const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });

   if (url) {
     newData.url = url
     fileUrls.push(newData);
   }
 } catch (error) {
   if (error.name === 'NotFound') {
     newData.url = null
     fileUrls.push(newData);
   } else {
     console.log("error", error);
     // Handle error if necessary
   }
 }
}

return fileUrls;
};

exports.getMyProfileExperienceFileUrl = async (data, fileKeys) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });
 
  const experiencesWithUrls = await Promise.all(
    data.experiences.map(async (experience) => {
      const matchingFileKey = experience.experienceCertificateKey;
      const fileKeyIndex = fileKeys.indexOf(matchingFileKey);
 
      if (fileKeyIndex !== -1) {
        const key = fileKeys[fileKeyIndex];
        const fileGetData = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `${data.email}/${key}`,
        };
 
        const getCommand = new GetObjectCommand(fileGetData);
 
        try {
          const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });
 
          return {
            jobTitle: experience.jobTitle,
            companyName: experience.companyName,
            dateOfJoining: experience.dateOfJoining,
            dateOfReceiving: experience.dateOfReceiving,
            isExperienceUploaded: experience.isExperienceUploaded,
            experienceCertificateName: experience.experienceCertificateName,
            experienceCertificateSize: experience.experienceCertificateSize,
            experienceCertificateKey: experience.experienceCertificateKey,
            url: url,
            _id:experience._id
          };
        } catch (error) {
          console.error("Error generating signed URL:", error);
          return null; // Skip this experience data
        }
      } else {
        return null; // Skip this experience data
      }
    })
  );
 
  // Remove null elements from the array
  return experiencesWithUrls.filter((data) => data !== null);
};

exports.getMyProfileEducationUrl = async (data, fileKeys) => {
  const s3 = new S3Client({
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_ACCESS_KEY_SECRET,
    },
    region: process.env.AWS_REGION,
  });
 
  const educationsWithUrls = await Promise.all(
    data.education.map(async (edu) => {
      const matchingFileKey = edu.educationCertificateKey;
      const fileKeyIndex = fileKeys.indexOf(matchingFileKey);
 
      if (fileKeyIndex !== -1) {
        const key = fileKeys[fileKeyIndex];
        const fileGetData = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `${data.email}/${key}`,
        };
 
        const getCommand = new GetObjectCommand(fileGetData);
 
        try {
          const url = await getSignedUrl(s3, getCommand, { expiresIn: 360000 });
          //console.log("edu in s3==>",edu)
          return {
            degree: edu.degree,
            yearOfJoining: edu.yearOfJoining,
            specilization: edu.specilization,
            yearOfCompletion: edu.yearOfCompletion,
            isEducationUploaded: edu.isEducationUploaded,
            educationCertificateName: edu.educationCertificateName,
            educationCertificateSize: edu.educationCertificateSize,
            educationCertificateKey: edu.educationCertificateKey,
            url: url,
            _id:edu._id
          };
        } catch (error) {
          console.error("Error generating signed URL:", error);
          return null; // Skip this education data
        }
      } else {
        return null; // Skip this education data
      }
    })
  );
 
  // Remove null elements from the array
  return educationsWithUrls.filter((data) => data !== null);
};