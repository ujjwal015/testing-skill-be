const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const responseMessage = require("./responseMessage");
const { removeExifData } = require("./removeExifData");
const optimizeBuffer = require("./optimizeBuffer");


//assessor attendance
exports.uploadAssessorExperienceFile = async ({ req, randomNo }) => {
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
    Key: `${req.email}/${req.key}${randomNo}`, // `${req.email}/${req.key}`,
    Body: optimizedBuffer,
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



//MyProfile code

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