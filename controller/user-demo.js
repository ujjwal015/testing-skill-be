require("dotenv").config();
const Joi = require("@hapi/joi");
const axios = require("axios");
const {
  getdemoFilter,
  validateMobileNumber,
  validatePassword
} = require("../utils/custom-validators");
const { Paginate } = require("../utils/paginate");
const CreateUsers = require("../models/userdemo-model");
const CreateOTP = require("../models/otp-model");
const { sendResponse, errorResponse } = require("../utils/response");
const responseMessage = require("../utils/responseMessage");
const { API_KEY, SENDER, JWT_SECRET } = require("../config/keys");
const moment = require("moment");
const {verifyCaptcha} = require("../middleware/verifyCaptcha");
const Assesor = require("../models/AssesorModel");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { 
  checkAccountLockout, 
  handleFailedLogin, 
  handleSuccessfulLogin, 
  getLockoutMessage,
  shouldAutoUnlock 
} = require("../utils/accountLockout");

exports.registerdemoUser = async (req, res) => {
  try {

    const isValidCaptcha = await verifyCaptcha(req.body.sToken, 'register')
    if(!isValidCaptcha){
      return errorResponse(res, 400, responseMessage.invalid_captcha, responseMessage.invalid_captcha)
    }

    if (req.body) {
      const { error } = validateRegisterData(req.body);

      if (error)
        return errorResponse(
          res,
          400,
          responseMessage.request_invalid,
          error.message
        );

      const {
        firstName,
        lastName,
        email,
        userRole,
        mobile,
        acceptTermCondition,
        organisationName,
      } = req.body;

      let check = await validateMobileNumber(mobile);

      if (!check)
        return errorResponse(
          res,
          400,
          responseMessage.mobile_num_invalid,
          responseMessage.errorMessage
        );

      if (!acceptTermCondition)
        return errorResponse(
          res,
          400,
          responseMessage.accept_terms_invalid,
          responseMessage.errorMessage
        );

      const user = await CreateUsers.findOne({
        $and: [{ email: { $eq: email } }, { isMobileVerified: true }],
      });

      if (user)
        return errorResponse(
          res,
          400,
          responseMessage.user_exist_already,
          responseMessage.errorMessage
        );

      const findUser = await CreateUsers.find({
        $and: [{ mobile: { $eq: mobile } }, { isMobileVerified: true }],
      });

      if (findUser.length > 0)
        return errorResponse(
          res,
          400,
          responseMessage.mobile_num_exists,
          responseMessage.errorMessage
        );

      const saveUsers = await new CreateUsers({
        firstName: firstName,
        lastName: lastName,
        email: email,
        mobile: mobile,
        userRole: userRole,
        organisationName: organisationName,
        acceptTermCondition: acceptTermCondition,
      }).save();

      if (saveUsers) {
        return sendResponse(
          res,
          200,
          responseMessage.userdemo_create,
          saveUsers
        );
      } else {
        return errorResponse(
          res,
          400,
          responseMessage.user_not_exist,
          responseMessage.errorMessage
        );
      }
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};


module.exports.userdemoList = async (req, res) => {
  try {
    let filter = getdemoFilter(req, [
      "firstName",
      "lastName",
      "email",
      "mobile",
      "userRole",
      "organisationName",
      "remark",
    ]);

    const { page, limit, skip, sortOrder } = Paginate(req);

   // const organisationName = req?.query?.organisationName; // Government, Private, colleges
    const isMobileVerified = req?.query?.isMobileVerified;
    const userRole = req?.query?.userRole; // Company Director, Manager, Individual, others
    const status = req?.query?.status; // Active, Inactive

    let query = filter ? filter.query : {};
   
    // if (organisationName) {
    //   query.organisationName = organisationName;
    // }
    if (isMobileVerified) {
      query.isMobileVerified = isMobileVerified;
    }

    if (userRole) {
      query.userRole = userRole;
    }

    if (status) {
      if (status === "all") {
        query.status = { $in: ["active", "inactive"] };
      } else {
        query.status = status;
      }
    }

    const totalCounts = await CreateUsers.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);

    const userdemoDetails = await CreateUsers.find(query)
      .select("firstName lastName email mobile organisationName userRole remark isMobileVerified isremark status failedLoginAttempts isAccountLocked lockoutExpiry lastFailedLogin createdAt updatedAt")
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);
     
    if (!userdemoDetails || userdemoDetails.length === 0) {
      // return errorResponse(res, 400, responseMessage.user_not_exist, responseMessage.errorMessage);
      return sendResponse(res, 200, responseMessage.user_not_exist, {userdemoDetails});
    }

    return sendResponse(res, 200, responseMessage.user_found, {
      userdemoDetails,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};


exports.getdemoUser = async (req, res) => {
  try {
    let userId = req.params.id;

    const userDetail = await CreateUsers.findById(userId);

    if (!userDetail)
      return errorResponse(
        res,
        400,
        responseMessage.user_not_exist,
        responseMessage.errorMessage
      );

    // send data to client
    return sendResponse(res, 200, responseMessage.user_found, userDetail);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.userDemoStatusChange = async (req, res) => {
  try {
    const getuserDemoId = req.params.id;

    const finduserDemo = await CreateUsers.findById(getuserDemoId);

    if (!finduserDemo)
      return errorResponse(
        res,
        400,
        responseMessage.user_not_found,
        responseMessage.errorMessage
      );

    if (finduserDemo["status"] === req.body.status)
      return errorResponse(
        res,
        400,
        responseMessage.status_same_exists,
        responseMessage.errorMessage
      );

    finduserDemo["status"] = req.body.status;

    const changedStatus = await finduserDemo.save();

    if (!changedStatus)
      return errorResponse(
        res,
        400,
        responseMessage.status_not_change,
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, responseMessage.status_change, {
      status: changedStatus.status,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.updateDemouser = async (req, res) => {
  try {
    const userloginId = req.params.id;
    if (!userloginId)
      return errorResponse(
        res,
        400,
        "userId  is required",
        responseMessage.errorMessage
      );

    const { error } = validateRegisterData(req.body);

    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );

    const {
      firstName,
      lastName,
      email,
      mobile,
      userRole,
      organisationName,
      acceptTermCondition,
    } = req.body;

    const findUserId = await CreateUsers.findById(userloginId);

    if (!findUserId)
      return errorResponse(
        res,
        400,
        responseMessage.user_not_found,
        responseMessage.errorMessage
      );

    //find Mobile verified user
    const findUser = await CreateUsers.find({
      $and: [{ mobile: { $eq: mobile } }, { isMobileVerified: true }],
    });

    if (findUser.length > 0)
      return errorResponse(
        res,
        400,
        responseMessage.mobile_num_exists,
        responseMessage.errorMessage
      );

    const updatedUserId = await CreateUsers.findOneAndUpdate(
      { _id: userloginId },
      {
        firstName,
        lastName,
        email,
        mobile,
        userRole,
        organisationName,
        acceptTermCondition,
      },
      { new: true }
    );

    if (!updatedUserId)
      return errorResponse(
        res,
        400,
        responseMessage.userDemo_not_update,
        responseMessage.errorMessage
      );

    return sendResponse(
      res,
      200,
      responseMessage.user_profile_update,
      updatedUserId
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

// Unlock user account functionality
exports.unlockDemoUserAccount = async (req, res) => {
  try {
    const userId = req.params.id;
    
    if (!userId) {
      return errorResponse(res, 400, "User ID is required", responseMessage.errorMessage);
    }

    const user = await CreateUsers.findById(userId);
    if (!user) {
      return errorResponse(res, 404, responseMessage.user_not_found, responseMessage.errorMessage);
    }

    // Check if account is actually locked
    if (!user.isAccountLocked) {
      return errorResponse(res, 400, "Account is not locked", responseMessage.errorMessage);
    }

    // Unlock the account
    const updatedUser = await CreateUsers.findByIdAndUpdate(
      userId,
      {
        $set: {
          isAccountLocked: false,
          failedLoginAttempts: 0,
          lockoutExpiry: null,
          lastFailedLogin: null
        }
      },
      { new: true }
    );

    if (!updatedUser) {
      return errorResponse(res, 500, "Failed to unlock account", responseMessage.errorMessage);
    }

    return sendResponse(res, 200, "Account unlocked successfully", {
      userId: updatedUser._id,
      email: updatedUser.email,
      isAccountLocked: updatedUser.isAccountLocked,
      failedLoginAttempts: updatedUser.failedLoginAttempts
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.sendOTP = async (req, res) => {
  try {
    const { error } = validateNumbers(req.body);

    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );

    const { mobile } = req.body;

    let check = validateMobileNumber(mobile);

    if (!check)
      return errorResponse(
        res,
        400,
        responseMessage.mobile_num_invalid,
        responseMessage.errorMessage
      );

    //let otp = 9876;
    let otp = Math.floor(100000 + Math.random() * 900000);

    const apikey = encodeURIComponent(API_KEY);
    const number = mobile;
    const sender = SENDER;
    let myMessage = `Your OTP is ${otp} - Radiant Infonet Pvt Ltd.`;
    const message = encodeURIComponent(myMessage);

    const url = `https://api.textlocal.in/send/?apikey=${apikey}&numbers=${number}&sender=${sender}&message=${message}`;
    const response = await axios.post(url);
    console.log('response',response)
    if (!response)
      return errorResponse(
        res,
        400,
        responseMessage.otp_not_send,
        responseMessage.errorMessage
      );

    const saveOTP = await new CreateOTP({
      phoneNumber: mobile,
      otp: otp,
    }).save();
    const resp = {
      url: url,
      msg: responseMessage.otp_create,
    };
    if (saveOTP) {
      return sendResponse(res, 200, resp.msg);
    } else {
      return errorResponse(
        res,
        400,
        responseMessage.otp_not_create,
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.verifyOTP = async (req, res) => {
  try {
    let { mobile, inputOTP } = req.body;

    const userOTP = await CreateOTP.findOne({
      phoneNumber: mobile,
    });
    

    if (inputOTP !== userOTP?.otp)
      return errorResponse(
        res,
        400,
        responseMessage.otp_not_verified,
        responseMessage.errorMessage
      );

    const data = await CreateUsers.findOneAndUpdate(
      { mobile: mobile },
      { isMobileVerified: true },
      { new: true }
    );

    return sendResponse(res, 200, responseMessage.otp_verified);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//getFilteredUsers
module.exports.getFilterdemoList = async (req, res) => {
  try {
    const { page, limit, skip, sortOrder } = Paginate(req);

    // Get filter values from query parameters
    const organisationName = req.query.organisationName; // Government, Private, colleges
    const userRole = req.query.userRole; // Company Director, Manager, Individual, others
    const status = req.query.status; // Active, Inactive
    // Define the filter query based on the provided parameters
    const filterQuery = {};

    if (organisationName) {
      filterQuery.organisationName = organisationName;
    }

    if (userRole) {
      filterQuery.userRole = userRole;
    }

    if (status) {
      //filterQuery.status = status;
      if (status === "all") {
        // Include both active and inactive records
        filterQuery.status = { $in: ["active", "inactive"] };
      } else {
        // Filter based on the specified status (active or inactive)
        filterQuery.status = status;
      }
    }

    // Query the database with the filter
    const totalCounts = await CreateUsers.countDocuments(filterQuery);
    const totalPages = Math.ceil(totalCounts / limit);
    
    const filteredUsers = await CreateUsers.find(filterQuery)
      .select(
        "firstName lastName email userRole mobile organisationName remark isremark status"
      )
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);
    if (!filteredUsers) {
      return errorResponse(
        res,
        400,
        responseMessage.user_not_exist,
        responseMessage.errorMessage
      );
    }

    return sendResponse(res, 200, responseMessage.user_found, {
      filteredUsers,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.organisationNameList = async (req, res) => {
  try {
    let filter = getdemoFilter(req, [
      "organisationName",
    ]);

    let query = filter ? filter.query : {};

    const userdemoDetails = await CreateUsers.find(query)
      .select(
        "organisationName"
      )
      
    if (!userdemoDetails)
      return errorResponse(
        res,
        400,
        responseMessage.user_not_exist,
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, responseMessage.user_found, {
      userdemoDetails,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};
module.exports.remark = async (req, res) => {
  try {
    const { error } = await validateRemark(req.body);

    if (error) {
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );
    }
    const { remark } = req.body;
    let isremark;
    if (remark) {
      isremark = true;
    }
    const demoId = req.body.demoId;
    const saveRemark = await CreateUsers.findByIdAndUpdate(
      { _id: demoId },
      {
        remark,
        isremark,
      },
      { new: true }
    ).select("remark isremark");

    if (saveRemark) {
      return sendResponse(
        res,
        200,
        responseMessage.useremark_create,
        saveRemark
      );
    } else {
      return errorResponse(
        res,
        400,
        responseMessage.user_not_exist,
        responseMessage.errorMessage
      );
    }
  } catch (err) {
    return errorResponse(res, 500, responseMessage.errorMessage, err.message);
  }
};

module.exports.remarkList = async (req, res) => {
  try {
    let filter = getFilter(req, ["remark"]);
    const { page, limit, skip, sortOrder } = Paginate(req);

    let query = filter ? filter.query : {};

    const totalCounts = await CreateUsers.countDocuments(query);

    const totalPages = Math.ceil(totalCounts / limit);

    const remarkDetails = await CreateUsers.find(query)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .select("remark isremark");

    if (!remarkDetails)
      return errorResponse(
        res,
        400,
        "remark detail not found", //responseMessage.instruction_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, "remark found", {
      remarkDetails,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.removeUserdemo = async (req, res) => {
  try {
    let userdemoId = req.params.id;

    const userdemoDetail = await CreateUsers.findById(userdemoId);
    if (!userdemoDetail)
      return errorResponse(
        res,
        400,
        responseMessage.userdemoId_not_found,
        responseMessage.errorMessage
      );

    const result = await CreateUsers.deleteOne({ _id: userdemoId });
    
    if (!result) return errorResponse(res, 400, responseMessage.userdemo_not_able_delete, responseMessage.errorMessage);

    return sendResponse(res, 200, responseMessage.userdemo_delete, result);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//delete all ismobileVerified:false value
module.exports.deleteAllList = async (req, res) => {
  try {
    // Delete all documents where isMobileVerified is false
    const result = await CreateUsers.deleteMany({ isMobileVerified: false });

    if (!result) {
      return errorResponse(
        res,
        400,
        responseMessage.userdemo_not_able_delete,
        responseMessage.errorMessage
      );
    }

    return sendResponse(res, 200, responseMessage.userdemo_delete, result);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.sendAssessorOTP = async (req, res) => {
  try {
    const { error } = validateNumbers(req.body);

    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );

    const { mobile } = req.body;

    let check = validateMobileNumber(mobile);

    if (!check)
      return errorResponse(
        res,
        400,
        responseMessage.mobile_num_invalid,
        responseMessage.errorMessage
      );

    //let otp = 9876;
    let otp = Math.floor(1000 + Math.random() * 9000);
    
    const apikey = encodeURIComponent(API_KEY);
    const number = mobile;
    const sender = SENDER;
    let myMessage = `Your OTP is ${otp} - Radiant Infonet Pvt Ltd.`;
    const message = encodeURIComponent(myMessage);
    const url = `https://api.textlocal.in/send/?apikey=${apikey}&numbers=${number}&sender=${sender}&message=${message}`;

    const response = await axios.post(url);
    if (!response)
      return errorResponse(
        res,
        400,
        responseMessage.otp_not_send,
        responseMessage.errorMessage
      );

    const saveOTP = await new CreateOTP({
      phoneNumber: mobile,
      otp: otp,
    }).save();

    const resp = {
      url: url,
      msg: responseMessage.otp_create,
    };
    if (saveOTP) {
      return sendResponse(res, 200, resp.msg);
    } else {
      return errorResponse(
        res,
        400,
        responseMessage.otp_not_create,
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.loginByAssessorOTP = async (req, res) => {
  try {
    let { mobile, inputOTP } = req.body;

    // Find the latest OTP entry for the mobile number
    //const userOTP = await CreateOTP.findOne({ phoneNumber: mobile }).sort({ createdAt: -1 });
    const userOTP = await CreateOTP.findOne({
      phoneNumber: mobile,
      otp: inputOTP.toString() 
    });
  
    if (!userOTP || inputOTP !== userOTP.otp) {
      return errorResponse(
        res,
        400,
        "Incorrect OTP, please try again.",
        responseMessage.errorMessage
      );
    }
    // Check if user already exists in the database
    let existsInDatabase = await Assesor.findOne({
      mobile: mobile,
    });

   
    if (existsInDatabase && !existsInDatabase?.email) {
      return sendResponse(res, 200, responseMessage.otp_verified, {
        _id:existsInDatabase._id,
        mobile,
        isAssessorRegister: false,
      });
    }
    if(existsInDatabase?.client_status === 'inactive'){
      return errorResponse(res, 400, responseMessage.admin_approval_pending, responseMessage.admin_approval_pending);
    }

    if (existsInDatabase) {
      // If user exists, return their details
      const userDetail = {
        fullName: existsInDatabase.fullName,
        email: existsInDatabase.email,
        mobile: existsInDatabase.mobile,
        _id: existsInDatabase._id,
        isAssessorRegister: true,
        token: jwt.sign({ email: existsInDatabase.email, id: existsInDatabase._id }, JWT_SECRET, {
          expiresIn: "1d"
        })
      };

      const removeOtp = await CreateOTP.findByIdAndDelete({_id:userOTP?._id})

      return sendResponse(res, 200, responseMessage.user_login_success, userDetail);
    }

    // If user doesn't exist, create a new entry

    const savedUser = await new Assesor({
      mobile,
      isMobileVerified: true,
    }).save();

    const responseData = {
      ...savedUser.toObject(), 
      isAssessorRegister: false, 
    };

    return sendResponse(res, 200, responseMessage.otp_verified, responseData);

  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.createAssessorloginProfile = async (req, res) => {
  try {
    const { error } = validateUserDetails(req.body);

    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );

    const {
      fullName,
      email,
      ToaType,
      RadiantFundToa,
      mobile,
      password,
      confirmPassword,
      assessorSipId,
      acceptTermCondition,
      _id
    } = req.body;
   
    const assessorEmail = email.toLowerCase();
    let check = validateMobileNumber(mobile);

    if (!check)
      return errorResponse(
        res,
        400,
        responseMessage.mobile_num_invalid,
        responseMessage.errorMessage
      );

    if (password != confirmPassword)
      return errorResponse(
        res,
        400,
        "password and confirmPassword should be same",
        error.message
      );

    let checkPassword = await validatePassword(password);

    if (!checkPassword)
      return errorResponse(
        res,
        400,
        responseMessage.password_invalid,
        responseMessage.errorMessage
      );

    //Check if user with provided email already exists
    let user = await Assesor.findOne({ email: assessorEmail });
    
    if (user)
      return errorResponse(
        res,
        400,
        responseMessage.user_email_already_register,
        responseMessage.errorMessage
      );


    if(mobile){
      const findUser = await Assesor.find({
        $and: [{ mobile: { $eq: mobile } }],
      });
     
  
      if (findUser.length > 0)
        return errorResponse(
          res,
          400,
          responseMessage.mobile_num_exists,
          responseMessage.errorMessage
        );
    }  

      
    if(assessorSipId){
      const findAssesorSipId = await Assesor.find({assessorSipId:assessorSipId});
      
        if (findAssesorSipId.length > 0)
        return errorResponse(
          res,
          400,
          responseMessage.sipId_exists,
          responseMessage.errorMessage
        );
    }
   

    let assessorautoId = `RD${Math.floor(1000 + Math.random() * 9000)}`;
    const salt = await bcrypt.genSalt(8);

    const hashPassword = await bcrypt.hash(password, salt);

    const existsData = await Assesor.findByIdAndUpdate(
      _id,
      {
        fullName,
        email: assessorEmail,
        ToaType,
        RadiantFundToa,
        assessorSipId,
        assessorId: assessorautoId,
        acceptTermCondition,
        password: hashPassword,
        client_status:'active' 
      },
      { new: true } 
    );
    
    if (existsData) {
      const token = jwt.sign({ email: existsData.email }, JWT_SECRET, { expiresIn: "1d" });
    
      return sendResponse(res, 200, "Registered successfully", { 
        ...existsData.toObject?.(), 
        token 
      });
    }
    const saveUser = await new Assesor({
      //userId:userautoId,
      fullName,
      email:assessorEmail,
      ToaType,
      RadiantFundToa,
      mobile,
      assessorSipId,
      assessorId:assessorautoId,
      acceptTermCondition,
      password: hashPassword,
      client_status: 'active'
    }).save();

    if (saveUser) {
      return sendResponse(res, 200, responseMessage.user_create, {
        ...saveUser.toObject(),
        token : jwt.sign({ email: saveUser?.email }, JWT_SECRET, { expiresIn: "1d" })
      });
    } else {
      return errorResponse(
        res,
        400,
        responseMessage.user_not_create,
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

function validateUserDetails(userBody) {
  try {
    const schema = Joi.object({
      _id:Joi.string(),
      fullName: Joi.string().min(2).max(50).trim().required(),
      assessorSipId: Joi.string().allow(""),
      email: Joi.string().min(5).trim().max(255).email().required(),
      ToaType:Joi.string().required(),
      RadiantFundToa:Joi.boolean(),
      mobile: Joi.string().min(10).max(10),
      assesor_id: Joi.string().allow(""),
      password: Joi.string().trim().min(8).max(20).required(),
      confirmPassword: Joi.string().trim().min(8).max(20).required(),
      acceptTermCondition: Joi.boolean(),
    });
    return schema.validate(userBody);
  } catch (err) {
    console.log(err);
  }
}


function validateRemark(body) {
  try {
    const schema = Joi.object({
      remark: Joi.string().empty(""),
      demoId: Joi.string().required(),
    });
    return schema.validate(body);
  } catch (err) {
    console.log(err);
  }
}

function validateRegisterData(registerBody) {
  try {
    const schema = Joi.object({
      firstName: Joi.string().min(3).max(50).trim().required(),
      lastName: Joi.string().min(3).max(50).allow(""),
      sToken:Joi.string().allow(""),
      email: Joi.string().min(5).trim().max(50).email().required(),
      mobile: Joi.string().min(10).max(10).required(),
      userRole: Joi.string().min(3).max(50).trim().required(),
      acceptTermCondition: Joi.boolean().required(),
      organisationName: Joi.string()
        .regex(/^[a-zA-Z0-9\s]+$/)
        .min(2)
        .max(50)
        .empty(""),
    });
    return schema.validate(registerBody);
  } catch (error) {
    console.log(error);
  }
}

function validateNumbers(registerBody) {
  try {
    const schema = Joi.object({
      mobile: Joi.string().min(10).max(10).required(),
    });
    return schema.validate(registerBody);
  } catch (error) {
    console.log(error);
  }
}

