const { validateMobileNumber, validatePincode, getStateIdFromCountry } = require("../utils/custom-validators");
const { sendResponse, errorResponse } = require("../utils/response");
const responseMessage = require("../utils/responseMessage");
const Joi = require('@hapi/joi');
const ExamCenter = require("../models/exam-center-model");
const TrainingPartner = require("../models/trainingPartner-model")
const { Paginate } = require("../utils/paginate");
const { getFilter } = require("../utils/custom-validators");
const mongoose = require('mongoose')
const { mobileValidateRegEx } = require('../utils/custom-validators')
const BatchModel = require("../models/batch-model")
const {CountryState} = require("../models/country-city-model")
const reader = require('xlsx')
const fs = require('fs/promises');
const RedisService = require("../utils/redisService")

exports.getTrainingPartnerName = async (req, res)  =>{
    try {

        const queryString = req.query.tpName || ""
        const regexPattern = new RegExp(queryString, 'i');
        const response = await TrainingPartner.find({ trainingPartner: regexPattern })
            .select('trainingPartner')
            .sort({ createdAt: -1 })

        if(response){
            return sendResponse(res, 200, responseMessage.successfully_fetched_trainingPartner, response)
        }
        else{ 
            return sendResponse(res, 200, responseMessage.no_existing_training_partner_with_this_name, [])
        }
        
    } catch (error) {
        return errorResponse(res, 500, responseMessage.something_wrong, error.message)
    }
}

exports.createExamCenter = async (req, res) => {

    try {
        const { error, value } = validatexamCenterInput(req?.body);
        if (error) return errorResponse(res, 400, responseMessage.request_invalid, error.message);

        let check = validateMobileNumber(value.mobile);
        if (!check) return errorResponse(res, 400, responseMessage.mobile_num_invalid, responseMessage.errorMessage);

        let checkPincode = validatePincode(value.pincode);
        if (!checkPincode) return errorResponse(res, 400, responseMessage.pincode_invalid, responseMessage.errorMessage);

        const isAlreadyExist = await TrainingPartner.findOne({ trainingPartner: value.trainingPartner });
        if (isAlreadyExist) {

            const newExamCenter = new ExamCenter({
                trainingPartner: isAlreadyExist._id,
                examCenterName: value.examCenterName,
                trainingCenterId:value.trainingCenterId,
                mobile: value.mobile,
                state: value.state,
                district: value.district,
                pincode: value.pincode,
                address: value.address,
                noOfSeats: value.noOfSeats,
                status: value.status,
                locationURL: value.locationURL,
                poc: value.poc

            })
            const addedNewExamCenter = await newExamCenter.save()

            if (addedNewExamCenter) {
                // Invalidate exam center cache
                const redisService = new RedisService();
                await redisService.destroyMatching("exam-centers");
                
                return sendResponse(res, 200, responseMessage.exam_center_added_for_existing_TP, addedNewExamCenter);
            } else {
                return errorResponse(res, 400, responseMessage.exam_center_not_able_create, responseMessage.errorMessage);
            }
        }
        else {

            const newTrainingpartner = new TrainingPartner({
                trainingPartner: value.trainingPartner
            })

            const addedNewTrainingPartner = await newTrainingpartner.save()

            const newExamCenter = new ExamCenter({
                trainingPartner: addedNewTrainingPartner?._id,
                examCenterName: value.examCenterName,
                trainingCenterId:value.trainingCenterId,
                mobile: value.mobile,
                state: value.state,
                district: value.district,
                pincode: value.pincode,
                address: value.address,
                noOfSeats: value.noOfSeats,
                status: value.status,
                locationURL: value.locationURL,
                poc: value.poc

            })
            const addedNewExamCenter = await newExamCenter.save()

            if (addedNewExamCenter) {
                // Invalidate exam center cache
                const redisService = new RedisService();
                await redisService.destroyMatching("exam-centers");
                
                return sendResponse(res, 200, responseMessage.exam_center_created_successfully_with_new_TP, addedNewExamCenter);
            } else {
                return errorResponse(res, 400, responseMessage.exam_center_not_able_create, responseMessage.errorMessage);
            }

        }

    } catch (error) {

        return errorResponse(res, 500, responseMessage.errorMessage, error.message);

    }
};

exports.getAllExamCenter = async (req, res) => {

    try {
        const redisService = new RedisService();

        const { page, limit, skip, sortOrder } = Paginate(req);
        
        // Build optimized query for exam centers
        let query = {};
        
        // Direct field filters (leverage indexes)
        if (req.query.status && req.query.status !== 'all') {
            query.status = req.query.status;
        }
        if (req.query.state) {
            query.state = { $regex: new RegExp(req.query.state, 'i') };
        }
        if (req.query.pincode) {
            query.pincode = req.query.pincode;
        }
        if (req.query.mobile) {
            query.mobile = req.query.mobile;
        }
        
        // Search functionality (use text index when available)
        if (req.query.search) {
            const searchRegex = new RegExp(req.query.search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), 'i');
            query.$or = [
                { examCenterName: { $regex: searchRegex } },
                { address: { $regex: searchRegex } },
                { mobile: { $regex: searchRegex } },
                { state: { $regex: searchRegex } },
                { pincode: { $regex: searchRegex } }
            ];
        }

        // Generate cache key based on query parameters
        const cacheKey = `exam-centers:${JSON.stringify(query)}:${page}:${limit}:${JSON.stringify(sortOrder)}`;
        
        // Try to get cached data first
        const cachedData = await redisService.get(cacheKey);
        if (cachedData) {
            return sendResponse(res, 200, responseMessage.exam_center_get_successfully, cachedData);
        }

        const pipeline = [
            { $match: query },
            {
                $lookup: {
                    from: "trainingpartners",
                    localField: "trainingPartner",
                    foreignField: "_id",
                    as: "trainingPartner",
                    pipeline: [{ $project: { trainingPartner: 1 } }]
                }
            },
            { $unwind: { path: "$trainingPartner", preserveNullAndEmptyArrays: true } },
            {
                $project: {
                    examCenterName: 1,
                    mobile: 1,
                    state: 1,
                    district: 1,
                    pincode: 1,
                    address: 1,
                    noOfSeats: 1,
                    status: 1,
                    locationURL: 1,
                    poc: 1,
                    "trainingPartner.trainingPartner": 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            },
            { $sort: sortOrder },
            { $skip: skip },
            { $limit: limit }
        ];

        // Both data and count in parallel
        const [examCenterList, totalCountResult] = await Promise.all([
            ExamCenter.aggregate(pipeline),
            ExamCenter.countDocuments(query)
        ]);

        const totalPages = Math.ceil(totalCountResult / limit);
        
        
        const responseData = {
            examCenterList,
            page,
            totalCounts: totalCountResult,
            totalPages
        };

        // Cache the result for 5 minutes (300 seconds)
        await redisService.set(cacheKey, responseData, 300);

        if (examCenterList.length !== 0) {
            return sendResponse(res, 200, responseMessage.exam_center_get_successfully, responseData);
        } else {
            return sendResponse(res, 200, responseMessage.exam_center_empty, { getAllExamCenterList: [] });
        }

    } catch (error) {
        return errorResponse(res, 500, responseMessage.errorMessage, error.message);
    }
};

exports.examCenterStatusChange = async (req, res) => {

    try {

        const getRequestId = req.params.id;
        if(!getRequestId) return errorResponse(res, 400, responseMessage.no_exam_center_id_is_provided)
        const newStatus = req.body.status
        if(!newStatus) return errorResponse(res, 400, responseMessage.no_new_status_provided, responseMessage.no_new_status_provided)
        //const examId = mongoose.Types.ObjectId(getRequestId);

        const findExamCenter = await ExamCenter.findOne({_id:getRequestId})

        if (!findExamCenter) return errorResponse(res, 400, responseMessage.exam_center_not_found, responseMessage.errorMessage);

        if (findExamCenter.status === req.body.status) return errorResponse(res, 400, responseMessage.req_status_same_already_exist, responseMessage.errorMessage);

        const updatedExamCenterStatus = await ExamCenter.findOneAndUpdate({_id: getRequestId}, 
                                                { status: req.body.status},
                                                { new: true})
        
        if (!updatedExamCenterStatus) return errorResponse(res, 400, responseMessage.status_not_able_change, responseMessage.errorMessage);

        // Invalidate exam center cache
        const redisService = new RedisService();
        await redisService.destroyMatching("exam-centers");

        return sendResponse(res, 200, responseMessage.exam_center_status_changed, updatedExamCenterStatus);

    } catch (error) {

        return errorResponse(res, 500, responseMessage.errorMessage, error.message);

    }
};

exports.getAllExamCenterList = async (req, res) => {

    try {

    let query = {};

    if (req.query.status === "active") {
      query.status = "active";
    }
    // let examCenterList = await ExamCenter.find({});
    let examCenterList = await ExamCenter.find(query).populate('trainingPartner', 'trainingPartner');

        if (examCenterList.length !== 0){ 

            const examCenterName = examCenterList.map(item=> {
                const name = { examCenterName : item?.examCenterName + " ( " + item?.address + " " + item?.pincode + " ) " ,
                                _id: item?._id,
                                trainingPartner: item?.trainingPartner?.trainingPartner}
                return name
            })

            return sendResponse(res, 200, responseMessage.exam_center_get_successfully, { examCenterList : examCenterName } ) 
        } 
        
        else return sendResponse(res, 200, responseMessage.exam_center_empty, { examCenterList: [] });

    } catch (error) {

        return errorResponse(res, 500, responseMessage.errorMessage, error.message);
    }
};




exports.removeExamCenter = async (req, res) => {

    try {

        const getRemoveId = req.params.id;
    
        const findExamCenter = await ExamCenter.findById(getRemoveId);

        if (!findExamCenter) return errorResponse(res, 400, responseMessage.exam_center_not_found, responseMessage.errorMessage);
        
        const removeExamCenter = await ExamCenter.findOneAndRemove({ _id: getRemoveId });

        if (removeExamCenter){
            const removeFromBatch = 
            await BatchModel.updateMany(
                { examCenterId: getRemoveId }, 
                { $unset: { examCenterId: "" } }
              );

            // Invalidate exam center cache
            const redisService = new RedisService();
            await redisService.destroyMatching("exam-centers");

            return sendResponse(res, 200, responseMessage.exam_center_removed_successfully, removeExamCenter);
        } 

        return errorResponse(res, 400, responseMessage.exam_center_not_able_delete, responseMessage.errorMessage);

    } catch (error) {

        return errorResponse(res, 500, responseMessage.errorMessage, error.message);

    }
};

exports.updateExamCenter = async (req, res) => {
    try {

        const requestUpdateExamCenterId = req.params.id;

        if (!requestUpdateExamCenterId) return errorResponse(res, 400,responseMessage.exam_center_id_required , responseMessage.errorMessage);

        const { error } = validateUpdatedExamCenterBody(req.body);

        if (error){
            return errorResponse(res, 400, responseMessage.request_invalid, error.message);
        } 

        const examId = mongoose.Types.ObjectId(requestUpdateExamCenterId)

        const findExamCenter = await ExamCenter.findOne({_id: requestUpdateExamCenterId})

        const updatePayload = { ...req.body }

        if (!findExamCenter) return errorResponse(res, 400, responseMessage.exam_center_not_found, responseMessage.errorMessage);


        const updatedExamCenterStatus = await ExamCenter.findOneAndUpdate(
          { _id: requestUpdateExamCenterId },
          updatePayload,
          { new: true }
        );

        if (!updatedExamCenterStatus) return errorResponse(res, 400, responseMessage.exam_center_not_able_update, responseMessage.errorMessage);

        // Invalidate exam center cache
        const redisService = new RedisService();
        await redisService.destroyMatching("exam-centers");

        return sendResponse(res, 200, responseMessage.exam_center_update_successfully, updatedExamCenterStatus);

    } catch (error) {

        return errorResponse(res, 500, responseMessage.errorMessage, error.message);

    }
};


exports.getExamCenterById = async (req, res) => {

    try {

        const getExamId = req.params.id;
        if(!getExamId) return errorResponse(res, 400, responseMessage.exam_center_id_required, responseMessage.exam_center_id_required)
        const findExamCenter = await ExamCenter.findOne({_id: getExamId}).populate('trainingPartner', 'trainingPartner')
        if (!findExamCenter) return errorResponse(res, 400, responseMessage.exam_center_not_found, responseMessage.errorMessage);

        return sendResponse(res, 200, responseMessage.exam_center_status_changed, findExamCenter);

    } catch (error) {
        return errorResponse(res, 500, responseMessage.errorMessage, error.message);
    }
};

function validateUpdatedExamCenterBody(updatedExamCenter) {
    try {
        const poc = Joi.object().keys({
            name: Joi.string().min(3).max(255).required().messages({
              'string.base': "POC Name should be a string",
              'string.empty': "POC Name should not be empty",
              'string.min': "POC Name should be a min 3 words",
              'any.required': "POC Name is required field"
            }),
            email:Joi.string().min(5).trim().max(255).email().required().messages({
              'string.base': "POC Email should be a string",
              'string.empty': "POC Email should not be empty",
              'string.min': "POC Email should be a min 3 words",
              'any.required': "POC Email is required field"
            }),
            mobile:Joi.string()
                            .optional().allow('')
                            .min(10)
                            .max(10)
                            .pattern(new RegExp(mobileValidateRegEx)).messages({
                              'string.base': "POC Mobile Number should be a string",
                              'string.empty': "POC Mobile Number should not be empty",
                              'any.required': "POC Mobile Number is required field",
                              'string.max': "POC Mobile Number length must be less than or equal to 10 characters long",
                              'string.pattern.base': 'POC Mobile Number is not valid format'
                            }),
            designation:Joi.string().optional().allow('').min(2).max(255).messages({
              'string.base': "POC Designation should be a string",
            }),
        })

        const schema = Joi.object({
            examCenterName: Joi.string().min(3).max(200).trim().required(),
            trainingCenterId: Joi.string().min(3).max(200).trim().required(),
            mobile: Joi.string().min(10).max(10).required(),
            state: Joi.string().min(3).trim().required(),
            district: Joi.string().min(3).trim().required(),
            pincode: Joi.string().min(6).max(6).required(),
            address: Joi.string().min(7).max(250).trim().required(),
            noOfSeats: Joi.number().required(),
            status: Joi.string().valid('active', 'inactive'),
            locationURL: Joi.string().required(),
            poc: Joi.array().items(poc)
        })
        return schema.validate(updatedExamCenter);
    } catch (error) {
        console.log(error);
    }
}

function validatexamCenterInput(examCenterBody) {
    try {

        const poc = Joi.object().keys({
            name: Joi.string().min(3).max(255).required().messages({
              'string.base': "POC Name should be a string",
              'string.empty': "POC Name should not be empty",
              'string.min': "POC Name should be a min 3 words",
              'any.required': "POC Name is required field"
            }),
            email:Joi.string().min(5).trim().max(255).email().required().messages({
              'string.base': "POC Email should be a string",
              'string.empty': "POC Email should not be empty",
              'string.min': "POC Email should be a min 3 words",
              'any.required': "POC Email is required field"
            }),
            mobile:Joi.string()
                            .optional().allow('')
                            .min(10)
                            .max(10)
                            .pattern(new RegExp(mobileValidateRegEx)).messages({
                              'string.base': "POC Mobile Number should be a string",
                              'string.empty': "POC Mobile Number should not be empty",
                              'any.required': "POC Mobile Number is required field",
                              'string.max': "POC Mobile Number length must be less than or equal to 10 characters long",
                              'string.pattern.base': 'POC Mobile Number is not valid format'
                            }),
            designation:Joi.string().optional().allow('').min(2).max(255).messages({
              'string.base': "POC Designation should be a string",
            }),
        })

        const schema = Joi.object({
            trainingPartner: Joi.string().min(3).max(200).trim().required(),
            examCenterName: Joi.string().min(3).max(200).trim().required(),
            trainingCenterId: Joi.string().min(3).max(200).trim().required(),
            mobile: Joi.string().min(10).max(10).required(),
            state: Joi.string().min(3).trim().required(),
            district: Joi.string().min(3).trim().required(),
            pincode: Joi.string().min(6).max(6).required(),
            address: Joi.string().min(7).max(250).trim().required(),
            noOfSeats: Joi.number().required(),
            status: Joi.string().valid('active', 'inactive'),
            locationURL: Joi.string().required(),
            poc: Joi.array().items(poc)

        })
        return schema.validate(examCenterBody);
    } catch (error) {
        console.log(error);
    }
}

const validateTrainingPartnerInput = (trainingPartnerBody) => {
    try {
        const schema = Joi.object({
            trainingPartner: Joi.string().min(3).max(200).trim().required(),
            tpId: Joi.string().min(3).max(200).trim().required(),
            address: Joi.string().min(7).max(250).trim().required(),
            pincode: Joi.string().min(6).max(6).required(),
            district: Joi.string().min(3).trim().required(),
            state: Joi.string().min(3).trim().required(),
            spocName: Joi.string().min(3).max(255).trim().required(),
            spocMobile: Joi.string().min(10).max(10).required(),
            spocEmail: Joi.string().min(5).trim().max(255).email().required(),
        })
        return schema.validate(trainingPartnerBody);
    } catch (error) {
        console.log(error);
    }
}

exports.createTrainingPartner = async (req, res) => {
    try {
        const { error } = validateTrainingPartnerInput(req.body);
        if (error) return errorResponse(res, 400, responseMessage.request_invalid, error.message);

        const trainingPartner = await TrainingPartner.findOne({ $or: [{ tpId: req.body.tpId }, { trainingPartner: req.body.trainingPartner }, { espocEmailmail: req.body.spocEmail }, { spocMobile: req.body.spocMobile }] });

        if (trainingPartner) return errorResponse(res, 400, responseMessage.training_partner_already_exist, responseMessage.errorMessage);

        const newTrainingPartner = new TrainingPartner(req.body);
        const addedTrainingPartner = await newTrainingPartner.save();

        return sendResponse(res, 200, responseMessage.training_partner_created_successfully, addedTrainingPartner);

    } catch (error) {
        return errorResponse(res, 500, responseMessage.errorMessage, error.message);
    }
}

//tp/tc bulk-upload
exports.bulkUploadExamcenter = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();

    const workbook = reader.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const xlData = reader.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (xlData.length < 1) {
      await fs.unlink(req.file.path);
      return errorResponse(res, 400, responseMessage.can_not_insert_empty_file);
    }

    const stateCity = await CountryState.findOne({ name: "India" });
    const stateList = stateCity.states.map((s) => s.name);

    const validateState = (state) => !stateList.includes(state);
    const validateCity = (state, city) => {
      const foundState = stateCity.states.find((s) => s.name === state);
      if (!foundState) return true;
      const cityList = foundState.cities.map((c) => c.name);
      return !cityList.includes(city);
    };

    const records = [];
    const examCenterNames = [];
    const pocEmails = [];
    const pocMobiles = [];

    // Track duplicate TP IDs in Excel
    const tpIdSet = new Set();

    let validationError = null;

    for (let i = 0; i < xlData.length; i++) {
      const row = xlData[i];
      const rowNumber = i + 2;

      const tpId = row['TP ID']?.toString().trim();

      // Check for duplicate TP ID in Excel
      if (tpIdSet.has(tpId)) {
        validationError = {
          error: `Duplicate TP ID '${tpId}' found in Excel`,
        };
        break;
      }
      tpIdSet.add(tpId);

      // Check if TP exists or create
      let tp = await TrainingPartner.findOne({ tpId });
      if(tp){
           validationError = {
            error: `Training Partner ${tp?.tpId} is already registered. `,
          };
          break;
      }else {
        //TP data for validation
const tpData = {
  trainingPartner: row['TP Name']?.trim(),
  tpId: tpId,
  address: row['TP Address']?.trim(),
  state: row['TP State']?.trim(),
  district: row['TP District']?.trim(),
  pincode: row['TP Pin Code']?.toString().trim(),
  spocName: row['TP SPOC Name']?.trim(),
  spocMobile: row['TP SPOC No.']?.toString().trim(),
  spocEmail: row['TP SPOC E-mail']?.trim(),
};

// Validate Training Partner input
const { value: validatedTP, error: tpValidationError } = validateTrainingPartnerInput(tpData);
if (tpValidationError && !validationError) {
  validationError = {
    error: `${tpValidationError.details[0].message.replace(/\"/g, '')}`
  };
  break;
}
    
        // Create new TP
       const newTp = new TrainingPartner({
          trainingPartner: row['TP Name']?.trim(),
          tpId: tpId,
          address: row['TP Address']?.trim(),
          state: row['TP State']?.trim(),
          district: row['TP District']?.trim(),
          pincode: row['TP Pin Code']?.toString().trim(),
          spocName: row['TP SPOC Name']?.trim(),
          spocMobile: row['TP SPOC No.']?.toString().trim(),
          spocEmail: row['TP SPOC E-mail']?.trim(),
        });

        await newTp.save({ session });
        tp = newTp; 
      }

      const record = {
        trainingPartner: tp._id.toString(),
        examCenterName: row['Exam Centre']?.trim(),
        trainingCenterId: row['Training Center Id'],
        mobile: row['EC Mobile No.']?.toString().trim(),
        state: row['EC state']?.trim(),
        district: row['EC District']?.trim(),
        pincode: row['EC Pin Code']?.toString().trim(),
        address: row['EC Address']?.trim(),
        noOfSeats: Number(row['EC Seat Available']),
        locationURL: row['EC Location URL']?.trim(),
        poc: [
          {
            designation: row['EC POC Designation']?.trim(),
            name: row['EC POC Name']?.trim(),
            email: row['EC POC Email']?.trim(),
            mobile: row['EC POC Phone NO.']?.toString().trim(),
          }
        ]
      };

      // Validate state/city
      if (validateState(record.state)) {
        validationError = { error: `Invalid state '${record.state}'` };
        break;
      }

      if (validateCity(record.state, record.district)) {
        validationError = {
          error: `Invalid district '${record.district}' for state '${record.state}'`
        };
        break;
      }

      // Validate schema
      const { error } = validatexamCenterInput(record);
      if (error) {
        validationError = {
          error: `${error.details[0].message.replace(/\"/g, '')}`
        };
        break;
      }

      // For duplicate check in DB
      examCenterNames.push(record.examCenterName);
      pocEmails.push(record.poc[0].email);
      pocMobiles.push(record.poc[0].mobile);

      records.push(record);
    }

    if (validationError) {
      await fs.unlink(req.file.path);
      await session.abortTransaction();
      return errorResponse(res, 400, responseMessage.request_invalid, validationError.error);
    }

    // Insert ECs
    const inserted = await ExamCenter.insertMany(records, { session });

    await session.commitTransaction();
    await fs.unlink(req.file.path);

    return sendResponse(res, 200, "Upload successful", `${inserted.length} exam centers added`);

  } catch (err) {
    await session.abortTransaction();
    return errorResponse(res, 500, responseMessage.something_wrong, err.message);
  } finally {
    session.endSession();
  }
};


exports.downloadTpTcSampleFile = (req, res) => {
  const filepath = `public/files/bulkuploadsamplefile`;
  const file = `${filepath}/bulkuploadsampleTpTc.xlsx`;
  return res.status(200).download(file);
};