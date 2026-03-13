const proctorModel = require("../models/proctor-model");
const Joi = require("@hapi/joi");
const { Paginate } = require("../utils/paginate");
const responseMessage = require("../utils/responseMessage");
const { sendResponse, errorResponse } = require("../utils/response");
const {
  uploadProctorFile,
  getProctorFileUrl,
} = require("../utils/s3bucketProctor");
const {
  getFilter,
  validateMobileNumber,
  validatePincode,
} = require("../utils/custom-validators");
const Batch = require("../models/batch-model");
const fs = require("fs/promises");
const reader = require("xlsx");


module.exports.addProctor = async (req, res) => {
  try {
    const { error } = await validateAddProctor(req.body);

    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );
    const {
      proctorName,
      email,
      mobile,
      gender,
      dob,
      address,
      state,
      district,
      pinCode,
      experience,
      aadharNo,
      panCardNo,
      bankName,
      bankAccount,
      bankIFSC,
      agreementSigned,
      agreementValidity,
      modeofAgreement,
    } = req.body;

    const clientDetail = [];

    let check = validateMobileNumber(mobile);
    if (!check)
      return errorResponse(
        res,
        400,
        responseMessage.mobile_num_invalid,
        responseMessage.errorMessage
      );

    const isExistAssesor = await proctorModel.findOne({ email: email });

    if (isExistAssesor)
      return errorResponse(
        res,
        400,
        responseMessage.proctor_not_create,
        responseMessage.proctor_already_register
      );


    const isExistMobile = await proctorModel.findOne({ mobile: mobile });

    if (isExistMobile)
      return errorResponse(
        res,
        400,
        'Mobile No. you have entered already registered',
        'Mobile No. you have entered already registered'
      );


    let checkPincode = validatePincode(pinCode);

    if (!checkPincode)
      return errorResponse(
        res,
        400,
        responseMessage.pincode_invalid,
        responseMessage.errorMessage
      );


    const isExistAadhar = await proctorModel.findOne({ aadharNo: aadharNo });

    if (isExistAadhar)
      return errorResponse(
        res,
        400,
        'Aadhar No. you have entered already registered',
        'Aadhar No. you have entered already registered'
      );

    const isExistPancard = await proctorModel.findOne({ panCardNo: panCardNo });

    if (isExistPancard)
      return errorResponse(
        res,
        400,
        'Pancard No. you have entered already registered',
        'Pancard No. you have entered already registered'
      );

    const isExistBankAccount = await proctorModel.findOne({ bankAccount: bankAccount });

    if (isExistBankAccount)
      return errorResponse(
        res,
        400,
        'Bank account No. you have entered already registered',
        'Bank account No. you have entered already registered'
      );

    let proctorautoId = `RD${Math.floor(1000 + Math.random() * 9000)}`;

    //------------>set file originalname limit  and length<----------
    const files = req.files;
    const formatFileSize = (bytes) => {
      if (bytes < 1024) {
        return bytes + " B";
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      }
    };

    const sipFile = files.experienceCertificate?.[0];

    let experienceCertificateName = sipFile ? sipFile.originalname : null;

    let experienceCertificateSize = sipFile
      ? `(${formatFileSize(sipFile.size)})`
      : null;

    // Define default values for optional fields (if not provided)
    const cvFile = files.cv?.[0];
    let cvName = cvFile?.originalname || null;
    let cvSize = cvFile ? `(${formatFileSize(cvFile.size)})` : null;

    const aadharCardFile = files.aadharCard?.[0];
    let aadharCardName = aadharCardFile?.originalname || null;
    let aadharCardSize = aadharCardFile
      ? `(${formatFileSize(aadharCardFile.size)})`
      : null;

    const panCardFile = files.panCard?.[0];
    let panCardName = panCardFile?.originalname || null;
    let panCardSize = panCardFile
      ? `(${formatFileSize(panCardFile.size)})`
      : null;

    const assessorFile = files.assessorPhoto?.[0];
    let assessorPhotoName = assessorFile?.originalname || null;
    let assessorSize = assessorFile
      ? `(${formatFileSize(assessorFile.size)})`
      : null;

    const agreementFile = files.agreementCertificate?.[0] || null;
    let agreementCertificateName = agreementFile?.originalname || null;
    let agreementSize = agreementFile
      ? `(${formatFileSize(agreementFile.size)})`
      : null;

    const highSchoolFile = files.highSchoolCertificate?.[0];
    let highSchoolCertificateName = highSchoolFile?.originalname || null;
    let highSchoolCertificateSize = highSchoolFile
      ? `(${formatFileSize(highSchoolFile.size)})`
      : null;

    const intermediateFile = files.intermediateCertificate?.[0];
    let intermediateCertificateName = intermediateFile?.originalname || null;
    let intermediateCertificateSize = intermediateFile
      ? `(${formatFileSize(intermediateFile.size)})`
      : null;

    const diplomaFile = files.diplomaCertificate?.[0];
    let diplomaCertificateName = diplomaFile?.originalname || null;
    let diplomaCertificateSize = diplomaFile
      ? `(${formatFileSize(diplomaFile.size)})`
      : null;

    const undergradFile = files.undergradCertificate?.[0];
    let undergradCertificateName = undergradFile?.originalname || null;
    let undergradCertificateSize = undergradFile
      ? `(${formatFileSize(undergradFile.size)})`
      : null;

    const postgradFile = files.postgradCertificate?.[0];
    let postgradCertificateName = postgradFile?.originalname || null;
    let postgradCertificateSize = postgradFile
      ? `(${formatFileSize(postgradFile.size)})`
      : null;

    const otherFile = files.otherCertificate?.[0] || null;
    let otherCertificateName = otherFile?.originalname || null;
    let otherCertificateSize = otherFile
      ? `(${formatFileSize(otherFile.size)})`
      : null;

    //here we get the key and value, key of file
    const newArray = Object.entries(req.files).map(([key, value]) => {
      return { key, value };
    });

    if (!req.files) {
      return errorResponse(
        res,
        401,
        responseMessage.file_not_received,
        responseMessage.file_not_received
      );
    }

    let assessorToCheck = "";
    let cvToCheck = "";
    let experienceToCheck = "";
    let aadharToCheck = "";
    let panToCheck = "";
    let agreementToCheck = "";
    let highSchoolToCheck = "";
    let intermediateToCheck = "";
    let diplomaToCheck = "";
    let undergradToCheck = "";
    let postgradToCheck = "";
    let otherCertificateToCheck = "";
    const uploadedFilePromises = newArray.map(async (file) => {
      switch (file.key) {
        case "assessorPhoto":
          assessorToCheck = file.key;
          break;
        case "cv":
          cvToCheck = file.key;
          break;
        case "experienceCertificate":
          experienceToCheck = file.key;
          break;
        case "aadharCard":
          aadharToCheck = file.key;
          break;
        case "panCard":
          panToCheck = file.key;
          break;
        case "agreementCertificate":
          agreementToCheck = file.key;
          break;
        case "highSchoolCertificate":
          highSchoolToCheck = file.key;
          break;
        case "intermediateCertificate":
          intermediateToCheck = file.key;
          break;
        case "diplomaCertificate":
          diplomaToCheck = file.key;
          break;
        case "undergradCertificate":
          undergradToCheck = file.key;
          break;
        case "postgradCertificate":
          postgradToCheck = file.key;
          break;
        case "otherCertificate":
          otherCertificateToCheck = file.key;
          break;

        default:
          "";
          break;
      }
      //upload file on s3 bucket
      return uploadProctorFile({
        buffer: file.value[0].buffer,
        key: file.key,
        mimetype: file.value[0].mimetype,
        email: req.body.email,
      });
    });
    const expCert = {
      experienceCertificateName: experienceCertificateName,
      experienceCertificateSize: experienceCertificateSize,
      experienceCertificateKey: experienceToCheck,
    };
    const cvCert = {
      cvName: cvName,
      cvCertificateSize: cvSize,
      cvKey: cvToCheck,
    };
    const aadharCert = {
      aadharName: aadharCardName,
      aadharCertificateSize: aadharCardSize,
      aadharCardKey: aadharToCheck,
    };
    const panCert = {
      panCardName: panCardName,
      panCardCertificateSize: panCardSize,
      panCardKey: panToCheck,
    };
    const assessorCert = {
      assessorName: assessorPhotoName,
      assessorPhotoSize: assessorSize,
      profileKey: assessorToCheck,
    };
    const agreementCert = {
      agreementName: agreementCertificateName,
      agreementCertificateSize: agreementSize,
      agreementCertificateKey: agreementToCheck,
    };
    const highSchoolCert = {
      highSchoolCertificateName: highSchoolCertificateName,
      highSchoolCertificateSize: highSchoolCertificateSize,
      highSchoolCertificateKey: highSchoolToCheck,
    };
    const intermediateCert = {
      intermediateCertificateName: intermediateCertificateName,
      intermediateCertificateSize: intermediateCertificateSize,
      intermediateCertificateKey: intermediateToCheck,
    };
    const diplomaCert = {
      diplomaCertificateName: diplomaCertificateName,
      diplomaCertificateSize: diplomaCertificateSize,
      diplomaCertificateKey: diplomaToCheck,
    };
    const undergradCert = {
      undergraduateCertificateName: undergradCertificateName,
      undergradCertificateSize: undergradCertificateSize,
      undergraduateCertificateKey: undergradToCheck,
    };
    const postgradCert = {
      postgraduateCertificateName: postgradCertificateName,
      postgradCertificateSize: postgradCertificateSize,
      postgraduateCertificateKey: postgradToCheck,
    };
    const otherCert = {
      otherCertificateName: otherCertificateName,
      otherCertificateSize: otherCertificateSize,
      otherCertificateKey: otherCertificateToCheck,
    };

    //here we handle all promises and check status of all file is 200 or not
    Promise.all(uploadedFilePromises)
      .then(async (result) => {
        const allStatusCodesAre200 = result.every(
          (res) => res.statusCode === 200
        );
        if (allStatusCodesAre200) {
          const proctorDetails = await new proctorModel({
            profileKey: assessorToCheck,
            cvKey: cvToCheck,
            highSchoolCertificateKey: highSchoolToCheck,
            intermediateCertificateKey: intermediateToCheck,
            diplomaCertificateKey: diplomaToCheck,
            undergraduateCertificateKey: undergradToCheck,
            postgraduateCertificateKey: postgradToCheck,
            otherCertificateKey: otherCertificateToCheck,
            aadharCardKey: aadharToCheck,
            panCardKey: panToCheck,
            agreementCertificateKey: agreementToCheck,
            proctorId: proctorautoId,
            proctorName,
            email: email,
            mobile: mobile,
            gender: gender,
            dob: dob,
            address: address,
            state: state,
            district: district,
            pinCode: pinCode,
            aadharNo: aadharNo,
            panCardNo: panCardNo,
            bankName: bankName,
            bankAccount: bankAccount,
            bankIFSC: bankIFSC,
            experience: experience,
            agreementSigned: agreementSigned,
            agreementValidity: agreementValidity,
            modeofAgreement: modeofAgreement,
            otherCertificate: otherCert,
            postgradCertificate: postgradCert,
            undergradCertificate: undergradCert,
            diplomaCertificate: diplomaCert,
            intermediateCertificate: intermediateCert,
            highSchoolCertificate: highSchoolCert,
            agreementCertificate: agreementCert,
            assessorCertificate: assessorCert,
            panCardCertificate: panCert,
            aadharCardCertificate: aadharCert,
            cvCertificate: cvCert,
            experienceCertificate: expCert,
            clientDetail: clientDetail,
            isAllDocumentUploaded: true,
          });
          const imageDetails = await proctorDetails.save();
          if (imageDetails) {
            return sendResponse(
              res,
              200,
              responseMessage.proctor_added_successfully,
              imageDetails
            );
          } else {
            return errorResponse(
              res,
              400,
              responseMessage.proctor_not_saved,
              responseMessage.errorMessage
            );
          }
        } else {
          //we can apply here delet key from s3 when not upload
          return errorResponse(
            res,
            400,
            responseMessage.proctor_file_upload_failed,
            result
          );
        }
      })
      .catch((err) => {
        return errorResponse(
          res,
          422,
          responseMessage.image_not_found,
          err.message
        );
      });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//---->get all proctor list
exports.proctorList = async (req, res, next) => {
  try {

    let filter = getFilter(req, ["email", "proctorName", "proctorId"]);
    const { page, limit, skip, sortOrder } = Paginate(req);
    // let query = filter ? filter.query : {};

    //====>proctorFilter list<====
    // Define additional filter criteria
    const modeofAgreement = req?.query?.modeofAgreement;
    const agreementSigned = req?.query?.agreementSigned;
    const from = req?.query?.from;
    const to = req?.query?.to;
    delete filter.query.clientId
    let query = filter ? filter.query : {};

    if (modeofAgreement) {
      query.modeofAgreement = modeofAgreement;
    }

    if (agreementSigned) {
      query.agreementSigned = agreementSigned;
    }

    if (from && to) {
      query.createdAt = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    } else if (from) {
      query.createdAt = {
        $gte: new Date(from),
      };
    } else if (to) {
      query.createdAt = {
        $lte: new Date(to),
      };
    }


    //===>END<===

    const totalCounts = await proctorModel.countDocuments(query);

    const totalPages = Math.ceil(totalCounts / limit);

    const proctorData = await proctorModel
      .find(query)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)

    if (proctorData.length < 1)
      return sendResponse(
        res,
        200,
        responseMessage.proctor_profile_not_found,
        {});

    const imgUrl = proctorData.map((data) => {
      if (data.isAllDocumentUploaded) {
        // Dynamically create the fileKeys array based on uploaded files
        const fileKeys = [];
        if (data.cvCertificate && data.cvCertificate.cvKey) {
          fileKeys.push('cv');
        }

        if (
          data.experienceCertificate &&
          data.experienceCertificate.experienceCertificateKey
        ) {
          fileKeys.push('experienceCertificate');
        }

        if (
          data.aadharCardCertificate &&
          data.aadharCardCertificate.aadharCardKey
        ) {
          fileKeys.push('aadharCard');
        }

        if (
          data.panCardCertificate &&
          data.panCardCertificate.panCardKey
        ) {
          fileKeys.push('panCard');
        }

        if (
          data.assessorCertificate &&
          data.assessorCertificate.profileKey
        ) {
          fileKeys.push('assessorPhoto');
        }

        if (
          data.agreementCertificate &&
          data.agreementCertificate.agreementCertificateKey
        ) {
          fileKeys.push('agreementCertificate');
        }

        if (
          data.highSchoolCertificate &&
          data.highSchoolCertificate.highSchoolCertificateKey
        ) {
          fileKeys.push('highSchoolCertificate');
        }

        if (
          data.intermediateCertificate &&
          data.intermediateCertificate.intermediateCertificateKey
        ) {
          fileKeys.push('intermediateCertificate');
        }

        if (
          data.diplomaCertificate &&
          data.diplomaCertificate.diplomaCertificateKey
        ) {
          fileKeys.push('diplomaCertificate');
        }

        if (
          data.undergradCertificate &&
          data.undergradCertificate.undergraduateCertificateKey
        ) {
          fileKeys.push('undergradCertificate');
        }

        if (
          data.postgradCertificate &&
          data.postgradCertificate.postgraduateCertificateKey
        ) {
          fileKeys.push('postgradCertificate');
        }

        if (
          data.otherCertificate &&
          data.otherCertificate.otherCertificateKey
        ) {
          fileKeys.push('otherCertificate');
        }
        return getProctorFileUrl(data, fileKeys)
      } else {
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
          experience,
          aadharNo,
          panCardNo,
          bankName,
          bankAccount,
          bankIFSC,
          agreementSigned,
          agreementValidity,
          modeofAgreement,
          client_status,
          isAllDocumentUploaded,
        } = data;

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
          experience,
          aadharNo,
          panCardNo,
          bankName,
          bankAccount,
          bankIFSC,
          agreementSigned,
          agreementValidity,
          client_status,
          isAllDocumentUploaded,
          modeofAgreement,
          url: null,
        };

        return [newData];
      }
    });

    Promise.all(imgUrl)
      .then((result) => {

        return sendResponse(res, 200, responseMessage.proctor_profile_get, {
          result,
          page,
          totalCounts,
          totalPages,
        });
      })
      .catch((err) => {
        return errorResponse(
          res,
          422,
          responseMessage.image_not_found,
          responseMessage.image_not_found
        );
      });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//--->get filtered proctor list
exports.proctorFilterList = async (req, res, next) => {
  try {
    const filterOptions = ["email", "proctorName", "proctorId"];
    const filter = getFilter(req, filterOptions);
    const { page, limit, skip, sortOrder } = Paginate(req);
    const query = filter ? filter.query : {};

    // Define additional filter criteria
    const modeofAgreement = req.query.modeofAgreement;
    const agreementSigned = req.query.agreementSigned;
    const from = req.query.from;
    const to = req.query.to;

    if (modeofAgreement) {
      query.modeofAgreement = modeofAgreement;
    }

    if (agreementSigned) {
      query.agreementSigned = agreementSigned;
    }

    if (from && to) {
      query.createdAt = {
        $gte: new Date(from),
        $lte: new Date(to),
      };
    } else if (from) {
      query.createdAt = {
        $gte: new Date(from),
      };
    } else if (to) {
      query.createdAt = {
        $lte: new Date(to),
      };
    }

    const totalCounts = await proctorModel.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);

    const proctorData = await proctorModel
      .find(query)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    if (!proctorData) {
      return errorResponse(
        res,
        404,
        responseMessage.proctor_profile_not_found,
        responseMessage.errorMessage
      );
    }

    if (proctorData.length < 1) {
      return errorResponse(
        res,
        404,
        responseMessage.proctor_profile_not_found,
        responseMessage.proctor_not_found
      );
    }

    const imgUrlPromises = proctorData.map((data) => {
      if (data.isAllDocumentUploaded) {
        return getProctorFileUrl(data);
      } else {
        // Handle the case when documents are not uploaded
        const {
          _id,
          proctorId,
          proctorName,
          email,
          mobile,
          // Include other fields here
        } = data;

        const newData = {
          _id,
          proctorId,
          proctorName,
          email,
          mobile,
          // Include other fields here
          url: null,
        };

        return newData;
      }
    });

    Promise.all(imgUrlPromises)
      .then((result) => {
        return sendResponse(res, 200, responseMessage.proctor_profile_get, {
          result,
          page,
          totalCounts,
          totalPages,
        });
      })
      .catch((err) => {
        return errorResponse(
          res,
          422,
          responseMessage.image_not_found,
          responseMessage.image_not_found
        );
      });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};


//getproctor by Id
exports.getProctor = async (req, res) => {
  try {
    let proctorId = req.params.id;

    const proctorDetail = await proctorModel.findById(proctorId);
      if (proctorDetail) {
        const fileKeys = [];

        if (proctorDetail.cvCertificate && proctorDetail.cvCertificate.cvKey) {
          fileKeys.push('cv');
        }

        if (
          proctorDetail.experienceCertificate &&
          proctorDetail.experienceCertificate.experienceCertificateKey
        ) {
          fileKeys.push('experienceCertificate');
        }

        if (
          proctorDetail.aadharCardCertificate &&
          proctorDetail.aadharCardCertificate.aadharCardKey
        ) {
          fileKeys.push('aadharCard');
        }

        if (
          proctorDetail.panCardCertificate &&
          proctorDetail.panCardCertificate.panCardKey
        ) {
          fileKeys.push('panCard');
        }

        if (
          proctorDetail.assessorCertificate &&
          proctorDetail.assessorCertificate.profileKey
        ) {
          fileKeys.push('assessorPhoto');
        }

        if (
          proctorDetail.agreementCertificate &&
          proctorDetail.agreementCertificate.agreementCertificateKey
        ) {
          fileKeys.push('agreementCertificate');
        }

        if (
          proctorDetail.highSchoolCertificate &&
          proctorDetail.highSchoolCertificate.highSchoolCertificateKey
        ) {
          fileKeys.push('highSchoolCertificate');
        }

        if (
          proctorDetail.intermediateCertificate &&
          proctorDetail.intermediateCertificate.intermediateCertificateKey
        ) {
          fileKeys.push('intermediateCertificate');
        }

        if (
          proctorDetail.diplomaCertificate &&
          proctorDetail.diplomaCertificate.diplomaCertificateKey
        ) {
          fileKeys.push('diplomaCertificate');
        }

        if (
          proctorDetail.undergradCertificate &&
          proctorDetail.undergradCertificate.undergraduateCertificateKey
        ) {
          fileKeys.push('undergradCertificate');
        }

        if (
          proctorDetail.postgradCertificate &&
          proctorDetail.postgradCertificate.postgraduateCertificateKey
        ) {
          fileKeys.push('postgradCertificate');
        }

        if (
          proctorDetail.otherCertificate &&
          proctorDetail.otherCertificate.otherCertificateKey
        ) {
          fileKeys.push('otherCertificate');
        }

        const dataWithUrl = await getProctorFileUrl(proctorDetail,fileKeys);
        if (dataWithUrl) {
          return sendResponse(
            res,
            200,
            responseMessage.proctor_details_available,
            dataWithUrl
          );
        } else {
          const {
            
            _id,
            proctorId,
            proctorName,
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
            client_status,
          } = proctorDetail;

          const newData = {
            _id,
            proctorId,
            proctorName,
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
            client_status,
            url: null,
          };

          return [newData];
        }
      }
    return errorResponse(
      res,
      400,
      responseMessage.proctor_not_found,
      responseMessage.errorMessage
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//----->Remove proctor
exports.deleteProctor = async (req, res, next) => {
  try {
    let proctorId = req.params.id;

    if (!proctorId) {
      return errorResponse(
        res,
        403,
        responseMessage.no_proctor_id_provided,
        responseMessage.no_proctor_id_provided
      );
    }
    const proctorData = await proctorModel.findOne({ _id: proctorId });
    // check user if found or not
    if (!proctorData)
      return errorResponse(
        res,
        404,
        responseMessage.proctor_profile_not_found,
        responseMessage.errorMessage
      );


    const isProctorAssigned = await Batch.findOne({ proctorId: proctorId })
    if (isProctorAssigned) {
      return errorResponse(res, 400, "This proctor is assinged to a batch", "This proctor is assinged to a batch")
    }

    const result = await proctorModel.deleteOne({ _id: proctorId });
    // send data to client
    if (!result)
      return errorResponse(
        res,
        400,
        responseMessage.proctor_not_able_delete,
        responseMessage.errorMessage
      );

    return sendResponse(
      res,
      200,
      responseMessage.proctor_profile_delete,
      result
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};


//update proctoror as Assessor update
// exports.updateProctor = async (req, res) => {
//   try {
//     const requestBody = req.body;
//     //if(!_.isEmpty(requestBody)){
//     const { error, value } = validateAddProctor(requestBody);
//     if (error)
//       return errorResponse(
//         res,
//         400,
//         responseMessage.request_invalid,
//         error.message
//       );
//     let files = req.files;
//     //let filesip = req.file;
//     const requestId = req?.params?.id;
//     if (!requestId)
//       return errorResponse(
//         res,
//         402,
//         responseMessage.no_proctor_id_provided,
//         responseMessage.no_proctor_id_provided
//       );

//     //get data from body
//     const {
//       proctorName,
//       email,
//       mobile,
//       gender,
//       dob,
//       address,
//       state,
//       district,
//       pinCode,
//       experience,
//       aadharNo,
//       panCardNo,
//       bankName,
//       bankAccount,
//       bankIFSC,
//       agreementSigned,
//       agreementValidity,
//       modeofAgreement
//     } = requestBody;

//     //to check duplicate email
//     const isExistingProctor = await proctorModel.findOne({ email: email });

//     if (isExistingProctor && isExistingProctor._id.toString() !== requestId)
//       // if (isExistAssesor)
//       return errorResponse(
//         res,
//         400,
//         responseMessage.proctor_not_create,
//         responseMessage.proctor_already_register
//       );

//     //for getting file name and size
//     const formatFileSize = (bytes) => {
//       if (bytes < 1024) {
//         return bytes + " B";
//       } else if (bytes < 1024 * 1024) {
//         return (bytes / 1024).toFixed(2) + " KB";
//       } else {
//         return (bytes / (1024 * 1024)).toFixed(2) + " MB";
//       }
//     };

//     // const expFile = files.experienceCertificate?.[0];

//     // let experienceCertificateName = expFile ? expFile.originalname : null;

//     // let experienceCertificateSize = expFile
//     //   ? `(${formatFileSize(expFile.size)})`
//     //   : null;

//     const expFile = files.experienceCertificate?.[0];

//     let experienceCertificateName = expFile ? expFile.originalname : null;

//     let experienceCertificateSize = expFile
//       ? `(${formatFileSize(expFile.size)})`
//       : null;

//     // Define default values for optional fields (if not provided)
//     const cvFile = files.cv?.[0];
//     let cvName = cvFile?.originalname || null;
//     let cvSize = cvFile ? `(${formatFileSize(cvFile.size)})` : null;

//     const aadharCardFile = files.aadharCard?.[0];
//     let aadharCardName = aadharCardFile?.originalname || null;
//     let aadharCardSize = aadharCardFile
//       ? `(${formatFileSize(aadharCardFile.size)})`
//       : null;

//     const panCardFile = files.panCard?.[0];
//     let panCardName = panCardFile?.originalname || null;
//     let panCardSize = panCardFile
//       ? `(${formatFileSize(panCardFile.size)})`
//       : null;

//     const assessorFile = files.assessorPhoto?.[0] || null;
//     let assessorImageName = assessorFile?.originalname || null;
//     let assessorImageSize = assessorFile
//       ? `(${formatFileSize(assessorFile.size)})`
//       : null;

//     const agreementFile = files.agreementCertificate?.[0] || null;
//     let agreementCertificateName = agreementFile?.originalname || null;
//     let agreementSize = agreementFile
//       ? `(${formatFileSize(agreementFile.size)})`
//       : null;

//     const highSchoolFile = files.highSchoolCertificate?.[0];
//     let highSchoolCertificateName = highSchoolFile?.originalname || null;
//     let highSchoolCertificateSize = highSchoolFile
//       ? `(${formatFileSize(highSchoolFile.size)})`
//       : null;

//     const intermediateFile = files.intermediateCertificate?.[0];
//     let intermediateCertificateName = intermediateFile?.originalname || null;
//     let intermediateCertificateSize = intermediateFile
//       ? `(${formatFileSize(intermediateFile.size)})`
//       : null;

//     const diplomaFile = files.diplomaCertificate?.[0];
//     let diplomaCertificateName = diplomaFile?.originalname || null;
//     let diplomaCertificateSize = diplomaFile
//       ? `(${formatFileSize(diplomaFile.size)})`
//       : null;

//     const undergradFile = files.undergradCertificate?.[0];
//     let undergradCertificateName = undergradFile?.originalname || null;
//     let undergradCertificateSize = undergradFile
//       ? `(${formatFileSize(undergradFile.size)})`
//       : null;

//     const postgradFile = files.postgradCertificate?.[0];
//     let postgradCertificateName = postgradFile?.originalname || null;
//     let postgradCertificateSize = postgradFile
//       ? `(${formatFileSize(postgradFile.size)})`
//       : null;

//     const otherFile = files.otherCertificate?.[0] || null;
//     let otherCertificateName = otherFile?.originalname || null;
//     let otherCertificateSize = otherFile
//       ? `(${formatFileSize(otherFile.size)})`
//       : null;

//     const newArray = Object.entries(files).map(([key, value]) => {
//       return { key, value };
//     });

//     // if (!req.files) {
//     //   return errorResponse(
//     //     res,
//     //     401,
//     //     responseMessage.file_not_received,
//     //     responseMessage.file_not_received
//     //   );
//     // }

//     //to check key value
//     let assessorImageToCheck = "";
//     let cvToCheck = "";
//     let experienceToCheck = "";
//     let aadharToCheck = "";
//     let panToCheck = "";
//     let agreementToCheck = "";
//     let highSchoolToCheck = "";
//     let intermediateToCheck = "";
//     let diplomaToCheck = "";
//     let undergradToCheck = "";
//     let postgradToCheck = "";
//     let otherCertificateToCheck = "";
//     const uploadedFilePromises = newArray.map(async (file) => {
//       switch (file.key) {
//         case "assessorPhoto":
//           assessorImageToCheck = file.key;
//           break;
//         case "cv":
//           cvToCheck = file.key;
//           break;
//         case "experienceCertificate":
//           experienceToCheck = file.key;
//           break;
//         case "aadharCard":
//           aadharToCheck = file.key;
//           break;
//         case "panCard":
//           panToCheck = file.key;
//           break;
//         case "agreementCertificate":
//           agreementToCheck = file.key;
//           break;
//         case "highSchoolCertificate":
//           highSchoolToCheck = file.key;
//           break;
//         case "intermediateCertificate":
//           intermediateToCheck = file.key;
//           break;
//         case "diplomaCertificate":
//           diplomaToCheck = file.key;
//           break;
//         case "undergradCertificate":
//           undergradToCheck = file.key;
//           break;
//         case "postgradCertificate":
//           postgradToCheck = file.key;
//           break;
//         case "otherCertificate":
//           otherCertificateToCheck = file.key;
//           break;

//         default:
//           "";
//           break;
//       }
//       //upload file on s3 bucket
//       return uploadProctorFile({
//         buffer: file.value[0].buffer,
//         key: file.key,
//         mimetype: file.value[0].mimetype,
//         email: req.body.email,
//       });
//     });

//     const expCert = {
//       experienceCertificateName: experienceCertificateName,
//       experienceCertificateSize: experienceCertificateSize,
//       experienceCertificateKey: experienceToCheck,
//     };
//     const cvCert = {
//       cvName: cvName,
//       cvCertificateSize: cvSize,
//       cvKey: cvToCheck,
//     };
//     const aadharCert = {
//       aadharName: aadharCardName,
//       aadharCertificateSize: aadharCardSize,
//       aadharCardKey: aadharToCheck,
//     };
//     const panCert = {
//       panCardName: panCardName,
//       panCardCertificateSize: panCardSize,
//       panCardKey: panToCheck,
//     };
//     const assessorPCert = {
//       assessorName: assessorImageName,//assessorPhotoName,
//       assessorPhotoSize: assessorImageSize,//assessorSize,
//       profileKey: assessorImageToCheck//assessorToCheck,
//     };

//     const agreementCert = {
//       agreementName: agreementCertificateName,
//       agreementCertificateSize: agreementSize,
//       agreementCertificateKey: agreementToCheck,
//     };
//     const highSchoolCert = {
//       highSchoolCertificateName: highSchoolCertificateName,
//       highSchoolCertificateSize: highSchoolCertificateSize,
//       highSchoolCertificateKey: highSchoolToCheck,
//     };
//     const intermediateCert = {
//       intermediateCertificateName: intermediateCertificateName,
//       intermediateCertificateSize: intermediateCertificateSize,
//       intermediateCertificateKey: intermediateToCheck,
//     };
//     const diplomaCert = {
//       diplomaCertificateName: diplomaCertificateName,
//       diplomaCertificateSize: diplomaCertificateSize,
//       diplomaCertificateKey: diplomaToCheck,
//     };
//     const undergradCert = {
//       undergraduateCertificateName: undergradCertificateName,
//       undergradCertificateSize: undergradCertificateSize,
//       undergraduateCertificateKey: undergradToCheck,
//     };
//     const postgradCert = {
//       postgraduateCertificateName: postgradCertificateName,
//       postgradCertificateSize: postgradCertificateSize,
//       postgraduateCertificateKey: postgradToCheck,
//     };
//     const otherCert = {
//       otherCertificateName: otherCertificateName,
//       otherCertificateSize: otherCertificateSize,
//       otherCertificateKey: otherCertificateToCheck,
//     };

//     const updateObject = {
//       proctorName: proctorName,
//       email: email,
//       mobile: mobile,
//       gender: gender,
//       dob: dob,
//       address: address,
//       state: state,
//       district: district,
//       pinCode: pinCode,
//       aadharNo: aadharNo,
//       panCardNo: panCardNo,
//       bankName: bankName,
//       bankAccount: bankAccount,
//       bankIFSC: bankIFSC,
//       experience: experience,
//       agreementSigned: agreementSigned,
//       agreementValidity: agreementValidity,
//       modeofAgreement: modeofAgreement,
//       otherCertificate: otherCert,
//       postgradCertificate: postgradCert,
//       undergradCertificate: undergradCert,
//       diplomaCertificate: diplomaCert,
//       intermediateCertificate: intermediateCert,
//       highSchoolCertificate: highSchoolCert,
//       agreementCertificate: agreementCert,
//       assessorCertificate: assessorPCert,
//       panCardCertificate: panCert,
//       aadharCardCertificate: aadharCert,
//       cvCertificate: cvCert,
//       experienceCertificate: expCert,
//       isAllDocumentUploaded: true,
//     };


//     if (!otherCertificateName && !otherCertificateSize && !otherCertificateToCheck) {
//       delete updateObject["otherCertificate"]
//     }

//     if (!postgradCertificateName && !postgradCertificateSize && !postgradToCheck) {
//       delete updateObject["postgradCertificate"]
//     }

//     if (!undergradCertificateName && !undergradCertificateSize && !undergradToCheck) {
//       delete updateObject["undergradCertificate"]
//     }

//     if (!diplomaCertificateName && !diplomaCertificateSize && !diplomaToCheck) {
//       delete updateObject["diplomaCertificate"]
//     }

//     if (!intermediateCertificateName && !intermediateCertificateSize && !intermediateToCheck) {
//       delete updateObject["intermediateCertificate"]
//     }

//     if (!highSchoolCertificateName && !highSchoolCertificateSize && !highSchoolToCheck) {
//       delete updateObject["highSchoolCertificate"]
//     }

//     if (!agreementCertificateName && !agreementSize && !agreementToCheck) {

//       delete updateObject["agreementCertificate"]

//     }


//     if (!assessorImageName && !assessorImageSize && !assessorImageToCheck) {

//       delete updateObject["assessorCertificate"];
//       // delete updateObject["assessorPhoto"]
//     }

//     if (!panCardName && !panCardSize && !panToCheck) {
//       delete updateObject["panCard"]
//     }

//     if (!aadharCardName && !aadharCardSize && !aadharToCheck) {
//       delete updateObject["aadharCard"]
//     }

//     if (!experienceCertificateName && !experienceCertificateSize && !experienceToCheck) {
//       delete updateObject["experienceCertificate"]
//     }

//     if (!cvName && !cvSize && !cvToCheck) {
//       delete updateObject["cv"]
//     }

//     Promise.all(uploadedFilePromises)
//       .then(async (result) => {
//         const allStatusCodesAre200 = result.every(
//           (res) => res.statusCode === 200
//         );
//         if (allStatusCodesAre200) {
//           const updateProctorProfile = await proctorModel.findOneAndUpdate(
//             { _id: requestId },
//             { $set: updateObject },
//             { new: true }
//           );
//           if (!updateProctorProfile)
//             return errorResponse(
//               res,
//               404,
//               responseMessage.proctor_profile_not_found,
//               responseMessage.proctor_profile_not_found
//             );

//           return sendResponse(
//             res,
//             200,
//             responseMessage.proctor_profile_update,
//             updateProctorProfile
//           );
//         } else {
//           return errorResponse(
//             res,
//             405,
//             responseMessage.image_upload_failed,
//             data
//           );
//         }
//       })
//       .catch((err) => {
//         return errorResponse(
//           res,
//           422,
//           responseMessage.image_not_found,
//           err.message
//         );
//       });
//   } catch (error) {
//     return errorResponse(res, 500, responseMessage.errorMessage, error.message);
//   }
// };

exports.updateProctor = async (req, res) => {
  try {
    const requestBody = req.body;
    //if(!_.isEmpty(requestBody)){
    const { error, value } = validateUpdateProctor(requestBody);
    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );
    let files = req.files;
    const requestId = req?.params?.id;
    if (!requestId)
      return errorResponse(
        res,
        402,
        responseMessage.no_proctor_id_provided,
        responseMessage.no_proctor_id_provided
      );

    //get data from body
    const {
      proctorName,
      email,
      mobile,
      gender,
      dob,
      address,
      state,
      district,
      pinCode,
      experience,
      aadharNo,
      panCardNo,
      bankName,
      bankAccount,
      bankIFSC,
      agreementSigned,
      agreementValidity,
      modeofAgreement
    } = requestBody;

    //to check duplicate email
    const isExistingProctor = await proctorModel.findOne({ email: email });
    //console.log("isExistingProctor===>", isExistingProctor)

    if (isExistingProctor && isExistingProctor._id.toString() !== requestId) {
      // if (isExistAssesor)
      return errorResponse(
        res,
        400,
        responseMessage.proctor_not_create,
        responseMessage.proctor_already_register
      );
    }
    //for getting file name and size
    const formatFileSize = (bytes) => {
      if (bytes < 1024) {
        return bytes + " B";
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      }
    };

   
    const expFile = files.experienceCertificate?.[0];

    let experienceCertificateName = expFile?.originalname || isExistingProctor.experienceCertificate.experienceCertificateName || null;

    let experienceCertificateSize = expFile
      ? `(${formatFileSize(expFile.size)})` : isExistingProctor.experienceCertificate.experienceCertificateSize ? isExistingProctor.experienceCertificate.experienceCertificateSize : null ;

    // Define default values for optional fields (if not provided)
    const cvFile = files.cv?.[0] || null;
    let cvName = cvFile?.originalname || isExistingProctor.cvCertificate.cvName || null;
    let cvSize = cvFile ? `(${formatFileSize(cvFile.size)})` : isExistingProctor.cvCertificate.cvCertificateSize ? isExistingProctor.cvCertificate.cvCertificateSize : null ;

    const aadharCardFile = files.aadharCard?.[0];
    let aadharCardName = aadharCardFile?.originalname || isExistingProctor.aadharCardCertificate.aadharName || null;
    let aadharCardSize = aadharCardFile
      ? `(${formatFileSize(aadharCardFile.size)})`
      : isExistingProctor.aadharCardCertificate.aadharCertificateSize ? isExistingProctor.aadharCardCertificate.aadharCertificateSize : null;

    const panCardFile = files.panCard?.[0];
    let panCardName = panCardFile?.originalname || isExistingProctor.panCardCertificate.panCardName || null;
    let panCardSize = panCardFile
      ? `(${formatFileSize(panCardFile.size)})`
      : isExistingProctor.panCardCertificate.panCardCertificateSize ? isExistingProctor.panCardCertificate.panCardCertificateSize : null;

    const assessorFile = files.assessorPhoto?.[0] ||  null;
    let assessorImageName = assessorFile?.originalname || isExistingProctor.assessorCertificate.assessorName || null;
    let assessorImageSize = assessorFile
      ? `(${formatFileSize(assessorFile.size)})`
      : isExistingProctor.assessorCertificate.assessorPhotoSize ? isExistingProctor.assessorCertificate.assessorPhotoSize : null;


    const agreementFile = files.agreementCertificate?.[0] || null;
    let agreementCertificateName = agreementFile?.originalname || isExistingProctor.agreementCertificate.agreementName || null;
    let agreementSize = agreementFile
      ? `(${formatFileSize(agreementFile.size)})`
      : isExistingProctor.agreementCertificate.agreementCertificateSize ? isExistingProctor.agreementCertificate.agreementCertificateSize : null;

    const highSchoolFile = files.highSchoolCertificate?.[0];
    let highSchoolCertificateName = highSchoolFile?.originalname || isExistingProctor.highSchoolCertificate.highSchoolCertificateName || null;
    let highSchoolCertificateSize = highSchoolFile
      ? `(${formatFileSize(highSchoolFile.size)})`
      : isExistingProctor.highSchoolCertificate.highSchoolCertificateSize ? isExistingProctor.highSchoolCertificate.highSchoolCertificateSize : null;

    const intermediateFile = files.intermediateCertificate?.[0];
    let intermediateCertificateName = intermediateFile?.originalname || isExistingProctor.intermediateCertificate.intermediateCertificateName || null;
    let intermediateCertificateSize = intermediateFile
      ? `(${formatFileSize(intermediateFile.size)})`
      : isExistingProctor.intermediateCertificate.intermediateCertificateSize ? isExistingProctor.intermediateCertificate.intermediateCertificateSize : null;


    const diplomaFile = files.diplomaCertificate?.[0];
    let diplomaCertificateName = diplomaFile?.originalname || isExistingProctor.diplomaCertificate.diplomaCertificateName || null;
    let diplomaCertificateSize = diplomaFile
      ? `(${formatFileSize(diplomaFile.size)})`
      :  isExistingProctor.diplomaCertificate.diplomaCertificateSize ? isExistingProctor.diplomaCertificate.diplomaCertificateSize : null;

    const undergradFile = files.undergradCertificate?.[0];
    let undergradCertificateName = undergradFile?.originalname || isExistingProctor.undergradCertificate.undergraduateCertificateName || null;
    let undergradCertificateSize = undergradFile
      ? `(${formatFileSize(undergradFile.size)})`
      :  isExistingProctor.undergradCertificate.undergradCertificateSize ? isExistingProctor.undergradCertificate.undergradCertificateSize : null;


    const postgradFile = files.postgradCertificate?.[0];
    let postgradCertificateName = postgradFile?.originalname || isExistingProctor.postgradCertificate.postgraduateCertificateName || null;
    let postgradCertificateSize = postgradFile
      ? `(${formatFileSize(postgradFile.size)})`
      : isExistingProctor.postgradCertificate.postgradCertificateSize ? isExistingProctor.postgradCertificate.postgradCertificateSize : null;


    const otherFile = files.otherCertificate?.[0] || null;
    let otherCertificateName = otherFile?.originalname || isExistingProctor.otherCertificate.otherCertificateName || null;
    let otherCertificateSize = otherFile
      ? `(${formatFileSize(otherFile.size)})`
      :  isExistingProctor.otherCertificate.otherCertificateSize ? isExistingProctor.otherCertificate.otherCertificateSize : null;


    const newArray = Object.entries(files).map(([key, value]) => {
      return { key, value };
    });

    //to check key value
    let assessorImageToCheck = "";
    let cvToCheck = "";
    let experienceToCheck = "";
    let aadharToCheck = "";
    let panToCheck = "";
    let agreementToCheck = "";
    let highSchoolToCheck = "";
    let intermediateToCheck = "";
    let diplomaToCheck = "";
    let undergradToCheck = "";
    let postgradToCheck = "";
    let otherCertificateToCheck = "";
    const uploadedFilePromises = newArray.map(async (file) => {
      //console.log("file===>",file,"fileKey--->",file.key)
      switch (file.key) {
        case "assessorPhoto":
          assessorImageToCheck = file.key ;
          break;
        case "cv":
          cvToCheck = file.key ? file.key : cvkey;
          break;
        case "experienceCertificate":
          experienceToCheck = file.key;
          break;
        case "aadharCard":
          aadharToCheck = file.key;
          break;
        case "panCard":
          panToCheck = file.key;
          break;
        case "agreementCertificate":
          agreementToCheck = file.key;
          break;
        case "highSchoolCertificate":
          highSchoolToCheck = file.key;
          break;
        case "intermediateCertificate":
          intermediateToCheck = file.key;
          break;
        case "diplomaCertificate":
          diplomaToCheck = file.key;
          break;
        case "undergradCertificate":
          undergradToCheck = file.key;
          break;
        case "postgradCertificate":
          postgradToCheck = file.key;
          break;
        case "otherCertificate":
          otherCertificateToCheck = file.key;
          break;

        default:
          //"";
          break;
      }

      //upload file on s3 bucket
      return uploadProctorFile({
        buffer: file.value[0].buffer,
        key: file.key,
        mimetype: file.value[0].mimetype,
        email: req.body.email,
      });
    });

    console.log("cvToCheck==>",cvToCheck)

    const expCert = {
      experienceCertificateName: experienceCertificateName,
      experienceCertificateSize: experienceCertificateSize,
      experienceCertificateKey: experienceToCheck ? experienceToCheck : isExistingProctor.experienceCertificate.experienceCertificateKey,
    };
    const cvCert = {
      cvName: cvName,
      cvCertificateSize: cvSize,
      cvKey: cvToCheck ? cvToCheck : isExistingProctor.cvCertificate.cvKey ,
    };
    const aadharCert = {
      aadharName: aadharCardName,
      aadharCertificateSize: aadharCardSize,
      aadharCardKey: aadharToCheck ? aadharToCheck : isExistingProctor.aadharCardCertificate.aadharCardKey,
    };
    const panCert = {
      panCardName: panCardName,
      panCardCertificateSize: panCardSize,
      panCardKey: panToCheck ? panToCheck : isExistingProctor.panCardCertificate.panCardKey,
    };
    const assessorPCert = {
      assessorName: assessorImageName,//assessorPhotoName,
      assessorPhotoSize: assessorImageSize,//assessorSize,
      profileKey: assessorImageToCheck ? assessorImageToCheck : isExistingProctor.assessorCertificate.profileKey//assessorToCheck,
    };

    const agreementCert = {
      agreementName: agreementCertificateName,
      agreementCertificateSize: agreementSize,
      agreementCertificateKey: agreementToCheck ? agreementToCheck : isExistingProctor.agreementCertificate.agreementCertificateKey,
    };
    const highSchoolCert = {
      highSchoolCertificateName: highSchoolCertificateName,
      highSchoolCertificateSize: highSchoolCertificateSize,
      highSchoolCertificateKey: highSchoolToCheck ? highSchoolToCheck : isExistingProctor.highSchoolCertificate.highSchoolCertificateKey,
    };
    const intermediateCert = {
      intermediateCertificateName: intermediateCertificateName,
      intermediateCertificateSize: intermediateCertificateSize,
      intermediateCertificateKey: intermediateToCheck ? intermediateToCheck : isExistingProctor.intermediateCertificate.intermediateCertificateKey,
    };
    const diplomaCert = {
      diplomaCertificateName: diplomaCertificateName,
      diplomaCertificateSize: diplomaCertificateSize,
      diplomaCertificateKey: diplomaToCheck ? diplomaToCheck : isExistingProctor.diplomaCertificate.diplomaCertificateKey,
    };
    const undergradCert = {
      undergraduateCertificateName: undergradCertificateName,
      undergradCertificateSize: undergradCertificateSize,
      undergraduateCertificateKey: undergradToCheck ? undergradToCheck : isExistingProctor.undergradCertificate.undergraduateCertificateKey,
    };
    const postgradCert = {
      postgraduateCertificateName: postgradCertificateName,
      postgradCertificateSize: postgradCertificateSize,
      postgraduateCertificateKey: postgradToCheck ? postgradToCheck : isExistingProctor.postgradCertificate.postgraduateCertificateKey,
    };
    const otherCert = {
      otherCertificateName: otherCertificateName,
      otherCertificateSize: otherCertificateSize,
      otherCertificateKey: otherCertificateToCheck ? otherCertificateToCheck : isExistingProctor.otherCertificate.otherCertificateKey,
    };

    const updateObject = {
      proctorName: proctorName,
      email: email,
      mobile: mobile,
      gender: gender,
      dob: dob,
      address: address,
      state: state,
      district: district,
      pinCode: pinCode,
      aadharNo: aadharNo,
      panCardNo: panCardNo,
      bankName: bankName,
      bankAccount: bankAccount,
      bankIFSC: bankIFSC,
      experience: experience,
      agreementSigned: agreementSigned,
      agreementValidity: agreementValidity,
      modeofAgreement: modeofAgreement,
      otherCertificate: otherCert,
      postgradCertificate: postgradCert,
      undergradCertificate: undergradCert,
      diplomaCertificate: diplomaCert,
      intermediateCertificate: intermediateCert,
      highSchoolCertificate: highSchoolCert,
      agreementCertificate: agreementCert,
      assessorCertificate: assessorPCert,
      panCardCertificate: panCert,
      aadharCardCertificate: aadharCert,
      cvCertificate: cvCert,
      experienceCertificate: expCert,
      isAllDocumentUploaded: true,
    };


   // console.log("updateObject==>", updateObject)

    if (!otherCertificateName && !otherCertificateSize && !otherCertificateToCheck) {
      delete updateObject["otherCertificate"]
    }

    if (!postgradCertificateName && !postgradCertificateSize && !postgradToCheck) {
      delete updateObject["postgradCertificate"]
    }

    if (!undergradCertificateName && !undergradCertificateSize && !undergradToCheck) {
      delete updateObject["undergradCertificate"]
    }

    if (!diplomaCertificateName && !diplomaCertificateSize && !diplomaToCheck) {
      delete updateObject["diplomaCertificate"]
    }

    if (!intermediateCertificateName && !intermediateCertificateSize && !intermediateToCheck) {
      delete updateObject["intermediateCertificate"]
    }

    if (!highSchoolCertificateName && !highSchoolCertificateSize && !highSchoolToCheck) {
      delete updateObject["highSchoolCertificate"]
    }

    if (!agreementCertificateName && !agreementSize && !agreementToCheck) {

      delete updateObject["agreementCertificate"]

    }


    if (!assessorImageName && !assessorImageSize && !assessorImageToCheck) {

      delete updateObject["assessorCertificate"];
      // delete updateObject["assessorPhoto"]
    }

    if (!panCardName && !panCardSize && !panToCheck) {
      delete updateObject["panCard"]
    }

    if (!aadharCardName && !aadharCardSize && !aadharToCheck) {
      delete updateObject["aadharCard"]
    }

    if (!experienceCertificateName && !experienceCertificateSize && !experienceToCheck) {
      delete updateObject["experienceCertificate"]
    }

    if (!cvName && !cvSize && !cvToCheck) {
      delete updateObject["cv"]
    }

    Promise.all(uploadedFilePromises)
      .then(async (result) => {
        const allStatusCodesAre200 = result.every(
          (res) => res.statusCode === 200
        );
        if (allStatusCodesAre200) {
          const updateProctorProfile = await proctorModel.findOneAndUpdate(
            { _id: requestId },
            { $set: updateObject },
            { new: true }
          );
          if (!updateProctorProfile)
            return errorResponse(
              res,
              404,
              responseMessage.proctor_profile_not_found,
              responseMessage.proctor_profile_not_found
            );

          return sendResponse(
            res,
            200,
            responseMessage.proctor_profile_update,
            updateProctorProfile
          );
        } else {
          return errorResponse(
            res,
            405,
            responseMessage.image_upload_failed,
            data
          );
        }
      })
      .catch((err) => {
        return errorResponse(
          res,
          422,
          responseMessage.image_not_found,
          err.message
        );
      });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//end of update proctor as Assessor proctor
//--->Proctor status change 
exports.proctorStatusChange = async (req, res) => {
  try {
    const getProctorId = req.params.id;

    // Find the existing proctor
    const existingProctor = await proctorModel.findById(getProctorId);

    if (!existingProctor)
      return errorResponse(
        res,
        400,
        responseMessage.proctor_not_found,
        responseMessage.errorMessage
      );

    // Check if the new status is the same as the current status
    if (existingProctor.client_status === req.body.status)
      return errorResponse(
        res,
        400,
        responseMessage.status_same_exists,
        responseMessage.errorMessage
      );

    // Update the proctor's client_status
    const updatedProctor = await proctorModel.findByIdAndUpdate(
      getProctorId,
      { client_status: req.body.status },
      { new: true }
    );

    if (!updatedProctor)
      return errorResponse(
        res,
        400,
        responseMessage.status_not_change,
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, responseMessage.status_change, updatedProctor);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};


exports.downloadProctorSampleFile = (req, res) => {
  const filepath = `public/files/bulkuploadsamplefile`;
  const file = `${filepath}/bulkProctorSample.xlsx`;
  return res.status(200).download(file);
};

async function validateAddProctor(data) {
  try {

    const schema = Joi.object({
      proctorName: Joi.string().min(2).max(255).required(),
      //  clientId:Joi.string().required(),
      email: Joi.string().min(5).trim().max(255).email().required(),
      mobile: Joi.string().min(10).max(10).required(),
      gender: Joi.string().required(),
      dob: Joi.string()
        .regex(/^\d{2}-\d{2}-\d{4}$/)
        .message("Invalid D.O.B format")
        .required(),
      address: Joi.string().min(7).max(250).trim().required(),
      state: Joi.string().min(3).max(100).trim().required(),
      district: Joi.string().min(3).max(100).trim().required(),
      pinCode: Joi.string().min(6).max(6).trim().required(),
      //sector: Joi.string().min(2).max(255).empty("").allow(),
      panCardNo: Joi.string().pattern(new RegExp(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)),
      aadharNo: Joi.string()
        .pattern(/^[2-9]\d{3}\d{4}\d{4}$/)
        .message("Invalid aadhaar card number")
        .required(),
      bankName: Joi.string().min(2).max(255).required(),
      bankAccount: Joi.string()
        .pattern(/^\d{9,18}$/)
        .message("Invalid bank account number")
        .trim()
        .required(),
      bankIFSC: Joi.string()
        .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
        .message("Invalid IFSC code format")
        .required(),
      experience: Joi.string().required(),
      //education: Joi.string().min(3).max(100).trim().required(),
      agreementSigned: Joi.string().required(),
      modeofAgreement: Joi.string().empty(''),
      agreementValidity: Joi.string()
        .pattern(/^\d{2}-\d{2}-\d{4}$/)
        .message("Invalid agreement date format")
        .empty(''),
      //sipDetails: Joi.array().items(sipDetailSchema),
      intermediateCertificate: Joi.string().empty(''),
      diplomaCertificate: Joi.string().empty(''),
      undergradCertificate: Joi.string().empty(''),
      postgradCertificate: Joi.string().empty(''),
      otherCertificate: Joi.string().empty(''),
      assessorPhoto: Joi.string().empty(''),
      agreementCertificate: Joi.string().empty('')

    });
    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
}


module.exports.bulkUploadProctor = async (req, res, next) => {

  try {
    const workbook = reader.readFile(req.file.path)
    const sheet_name_list = workbook.SheetNames
    let xlData = reader.utils.sheet_to_json(
      workbook.Sheets[sheet_name_list[0]]
    );

    if (xlData.length < 1) {
      await fs.unlink(req.file.path)
      return errorResponse(res, 400, "empty file", { error: "empty file" })
    }
    console.log("xlData==>", xlData)
    let errors
    const records = []
    const existingEmail = []

    // checking duplicate value in excel
    for (let i = 0; i < xlData.length; i++) {
      for (let j = i + 1; j < xlData.length; j++) {

        if (xlData[i].Email === xlData[j].Email) {
          errors = { _original: { email: xlData[i].Email }, message: "duplicate vallue in excel" }
          break
        }
        if (xlData[i]['Mobile'] === xlData[j]['Mobile']) {
          errors = { _original: { email: xlData[i].Email }, message: "duplicate vallue in excel" }
          break
        }
      }
    }

    // assessorSipId:assessorSipId,
    // assessorId: assessorautoId,

    // checking validation for each row of excel 
    xlData.forEach((row) => {

      let email = row.Email
      let address = row.Address
      let proctorName = row['Proctor Name']

      let mobile = row.Mobile && row.Mobile?.toString()
      let pinCode = row.Pincode && row.Pincode?.toString()
      let state = row.State
      let district = row.District
      let dob = row.DOB;
      let gender = row.Gender//?.toLowerCase()?.trim()
      gender = (gender === "notSpecify") ? "notSpecify" : gender.toLowerCase().trim();

      //let modeofAgreement = row['Mode of Agreement']?.toLowerCase()?.trim()
      let assessorautoId = `RD${Math.floor(1000 + Math.random() * 9000)}`;

      const { value, error } = validateBulkProctor({
        proctorName, email, mobile, pinCode,
        address, state, dob, district, gender
      }) //, modeofAgreement,, dob

      // let sipid = row['Sip Id']        
      // if(sipid){
      //  // value["sipid"] = sipid
      //  value["assessorSipId"] =  sipid
      // }

      value["proctorId"] = assessorautoId

      if (error) {
        errors = error
        return false
      }
      else {
        records.push(value)
        return true
      }

    })


    //checking duplicate value in the database 
    xlData.forEach((row) => {
      console.log("row==>", row)
      const existingAssessor = proctorModel.findOne({ $or: [{ email: row.Email }, { mobile: row.Mobile }] })
      if (existingAssessor) {
        existingEmail.push(existingAssessor)
      }
    })

    //checking for duplicate email in the db then send response accordingly

    const existingValue = await Promise.all(existingEmail)

    if (existingValue.length > 0) {
      existingValue?.forEach(value => {
        if (value) {
          if (!errors) {
            errors = { _original: { email: value?.email }, message: "email or mobile already exist" }
          }

        }
      })
    }
    if (errors) {
      await fs.unlink(req.file.path)
      return errorResponse(res, 400, responseMessage.something_wrong, { user: errors._original.email, error: errors.message })
    } else {
      const result = await proctorModel.insertMany(records)

      console.log("result==>", result)
      //  if(result){
      //       const isMailSend = result.every(async (item)=> {
      //           let randomString = generateRandomAlphanumeric(10);
      //           const salt = await bcrypt.genSalt(8);
      //           const encodedPassword = await bcrypt.hash(randomString, salt); 
      //           const isSend =  await sendMailToAssessor(item, randomString)
      //           if(isSend){
      //             item.isInitialPasswordMailSend = true
      //             item.password = encodedPassword
      //             await item.save()
      //             return true
      //           }
      //       })
      if (result) {
        await fs.unlink(req.file.path)
        return sendResponse(res, 200, "all the proctor successfully added", `${result.length} "all the proctor successfully added"`)
      }
      else {
        await fs.unlink(req.file.path)
        return err(res, 400, "proctor unable to added")
      }

      //  }     
      // else{
      //  await fs.unlink(req.file.path)
      //  return errorResponse(res, 400, responseMessage.something_wrong, err.message)
      // }
    }

  } catch (error) {
    await fs.unlink(req.file.path)
    return errorResponse(res, 500, responseMessage.something_wrong, error.message)
  }
};

//--->for validate uploade
async function validateUpdateProctor(data) {
  try {
    const schema = Joi.object({
      proctorName: Joi.string().min(2).max(255).required(),
      //  clientId:Joi.string().required(),
      email: Joi.string().min(5).trim().max(255).email().required(),
      mobile: Joi.string().min(10).max(10).required(),
      gender: Joi.string().required(),
      dob: Joi.string()
        .regex(/^\d{2}-\d{2}-\d{4}$/)
        .message("Invalid D.O.B format")
        .required(),
      address: Joi.string().min(2).max(50).trim().required(),
      state: Joi.string().min(3).max(100).trim().required(),
      district: Joi.string().min(3).max(100).trim().required(),
      pinCode: Joi.string().min(6).max(6).trim().required(),
      //sector: Joi.string().min(2).max(255).empty("").allow(),
      panCardNo: Joi.string().pattern(new RegExp(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)),
      aadharNo: Joi.string()
        .pattern(/^[2-9]\d{3}\d{4}\d{4}$/)
        .message("Invalid aadhaar card number")
        .required(),
      bankName: Joi.string().min(2).max(255).required(),
      bankAccount: Joi.string()
        .pattern(/^\d{9,18}$/)
        .message("Invalid bank account number")
        .trim()
        .required(),
      bankIFSC: Joi.string()
        .pattern(/^[A-Z]{4}0[A-Z0-9]{6}$/)
        .message("Invalid IFSC code format")
        .required(),
      experience: Joi.string().required(),
      //education: Joi.string().min(3).max(100).trim().required(),
      agreementSigned: Joi.string().required(),
      modeofAgreement: Joi.string().empty(''),
      agreementValidity: Joi.string()
        .pattern(/^\d{2}-\d{2}-\d{4}$/)
        .message("Invalid agreement date format")
        .empty(''),//.required(),
      //sipDetails: Joi.array().items(sipDetailSchema),
      intermediateCertificate: Joi.string().empty(''),
      diplomaCertificate: Joi.string().empty(''),
      undergradCertificate: Joi.string().empty(''),
      postgradCertificate: Joi.string().empty(''),
      otherCertificate: Joi.string().empty(''),
      assessorPhoto: Joi.string().empty(''),
      agreementCertificate: Joi.string().empty('')
    });
    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
}

function validateBulkProctor(data) {
  try {

    const schema = Joi.object({
      proctorName: Joi.string().min(2).max(50).trim().required(),
      email: Joi.string().min(5).trim().max(255).email().required(),
      mobile: Joi.string().min(10).max(10).required(),
      gender: Joi.string().required(),
      dob: Joi.string()
        .regex(/^\d{2}-\d{2}-\d{4}$/)
        .message("Invalid D.O.B format")
        .required(),
      address: Joi.string().min(7).max(250).trim().required(),
      state: Joi.string().min(3).max(100).trim().required(),
      district: Joi.string().min(3).max(100).trim().required(),
      pinCode: Joi.string().min(6).max(6).trim().required(),
      //modeofAgreement: Joi.string().required(),
    });

    return schema.validate(data);
  } catch (err) {
    console.log(err);
  }
}