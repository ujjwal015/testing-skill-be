require("dotenv").config();
const Joi = require("@hapi/joi");
const _ = require("lodash");
const {
  validateMobileNumber,
  userTypeArr,
  validatePincode,
  validatePassword,
  validateUserType,
  getStateIdFromCountry,
  setDashboardNotification,
} = require("../utils/custom-validators");
const { default: mongoose } = require("mongoose");
const { uploadFile, getFileUrl } = require("../utils/s3bucket");
const {
  getassessorPersonalFileUrl,
  uploadAssessorExperienceFile,
  getMyProfileExperienceFileUrl,
  getMyProfileEducationUrl,
  deleteImageFromS3
} = require("../utils/s3bucketAssessor");

const UserProfile = require("../models/userProfile-model");
const UserRoleModel = require("../models/userRole-model")
const bcrypt = require("bcryptjs");
const { Paginate } = require("../utils/paginate");
const reader = require("xlsx");
const responseMessage = require("../utils/responseMessage");
const { sendResponse, errorResponse } = require("../utils/response");
const URL = require("url").URL;
const { getFilter } = require("../utils/custom-validators");

exports.createAdminProfile = async (req, res) => {
  try {
    if (req.body) {
      const { error } = await validateSuperAdminDetails(req.body);

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
        userType,
        mobile,
        password,
        state,
        city,
        pincode,
        description,
        address,
        gender,
        status,
      } = req.body;

      let userProfile = await AdminProfile.findOne({
        $or: [{ email: email }],
      });

      if (userProfile)
        return errorResponse(
          res,
          400,
          responseMessage.user_exist_already,
          responseMessage.errorMessage
        );

      let checkPassword = await validatePassword(password);

      if (!checkPassword)
        return errorResponse(
          res,
          400,
          responseMessage.password_invalid,
          responseMessage.errorMessage
        );

      let check = validateMobileNumber(mobile);

      if (!check)
        return errorResponse(
          res,
          400,
          responseMessage.mobile_num_invalid,
          responseMessage.errorMessage
        );

      const findUserType = validateUserType(userTypeArr, userType);

      if (!findUserType.status)
        return errorResponse(
          res,
          400,
          responseMessage.user_role_invalid,
          responseMessage.errorMessage
        );

      if (findUserType.id !== 1)
        return errorResponse(
          res,
          400,
          responseMessage.user_type_admin,
          responseMessage.errorMessage
        );

      let addAdminData = {
        firstName: firstName,
        lastName: lastName,
        email: email,
        mobile: mobile,
        userType: userType,
        userRole: findUserType.name,
        isEmailVerified: true,
        isGoogleUser: false,
        isUserProfileCreated: true,
        isAdminApproved: "accepted",
      };

      let addExtraData = {
        ...addAdminData,
        country: "India",
        state: state,
        city: city,
        pincode: pincode,
        address: address,
        description: description,
        gender: gender,
        status: status,
      };

      var states = await getStateIdFromCountry("India", state);

      states
        ? (addExtraData["fipsCode"] = states.fipsCode)
        : (addExtraData["fipsCode"] = "");

      const newUserProfile = new AdminProfile(addExtraData);

      const savedUser = await newUserProfile.save();

      const salt = await bcrypt.genSalt(8);

      const hashPassword = await bcrypt.hash(password, salt);

      if (savedUser) {
        const userStoredInCommonCollection = new CommonUsers({
          ...addAdminData,
          password: hashPassword,
        });

        await userStoredInCommonCollection.save();
        await setDashboardNotification(
          `${userStoredInCommonCollection.firstName} ${userStoredInCommonCollection.lastName} created admin account`
        );
        return sendResponse(res, 200, responseMessage.user_created, savedUser);
      } else {
        return errorResponse(
          res,
          400,
          responseMessage.user_not_create,
          responseMessage.errorMessage
        );
      }
    } else {
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

// exports.createUserProfile = async (req, res) => {
//     try {

//         if (req.body) {

//             const { error } = await validateUserProfileData(req.body);

//             if (error) return errorResponse(res, 400, responseMessage.request_invalid, error.message);

//             const { firstName, lastName, email, description, userType, mobile, country, state, gender, address, city, pincode, organisationName } = req.body;

//             let userProfile = await UserProfile.findOne({
//                 $or: [
//                     { email: email }
//                 ]
//             });

//             if (userProfile) return errorResponse(res, 400, responseMessage.user_exist_already, responseMessage.errorMessage);

//             let check = validateMobileNumber(mobile);

//             if (!check) return errorResponse(res, 400, responseMessage.mobile_num_invalid, responseMessage.errorMessage);

//             let checkPincode = validatePincode(pincode);

//             if (!checkPincode) return errorResponse(res, 400, responseMessage.pincode_invalid, responseMessage.errorMessage);

//             const findUserType = validateUserType(userTypeArr, userType);

//             if (!findUserType.status) return errorResponse(res, 400, responseMessage.user_role_invalid, responseMessage.errorMessage);

//             let getUser = await CommonUsers.findOne({
//                 $or: [
//                     { email: email }
//                 ]
//             });

//             const getOrganisation = await Subadminprofile.findOne({ organisationName: organisationName });

//             if (!getOrganisation) return errorResponse(res, 404, responseMessage.org_not_found, responseMessage.errorMessage);

//             if (!getUser.isEmailVerified) return errorResponse(res, 400, responseMessage.email_not_verified, responseMessage.errorMessage);

//             if (!getUser) {

//                 return errorResponse(res, 400, responseMessage.email_not_register, responseMessage.errorMessage);

//             } else {

//                 let createUserId;

//                 let checkId = true;

//                 do {

//                     createUserId = Math.floor(Math.random() * 90000) + 10000;

//                     const checkIfIdPresentInDb = await UserProfile.findOne({ usersId: createUserId });

//                     (checkIfIdPresentInDb) ? checkId = true : checkId = false;

//                 } while (checkId);

//                 const newUserProfile = new UserProfile({
//                     firstName: firstName,
//                     lastName: lastName,
//                     email: email,
//                     description: description,
//                     mobile: mobile,
//                     country: country,
//                     state: state,
//                     gender: gender,
//                     address: address,
//                     userType: userType,
//                     userRole: findUserType.name,
//                     city: city,
//                     usersId: createUserId,
//                     organisationName: organisationName,
//                     organisationId: getOrganisation._id,
//                     isUserProfileCreated: true,
//                     isAdminApproved: 'pending',
//                     pincode: pincode
//                 });

//                 var states = await getStateIdFromCountry(country, state);

//                 if (states) newUserProfile["fipsCode"] = states.fipsCode;

//                 const savedUser = await newUserProfile.save();

//                 if (getUser) {
//                     getUser.userProfile = mongoose.Types.ObjectId(savedUser._id);
//                     getUser.isUserProfileCreated = true;
//                     await getUser.save();
//                 }
//                 if (savedUser) {
//                     await setDashboardNotification(`${savedUser.firstName} ${savedUser.lastName} created profile`);
//                     return sendResponse(res, 200, responseMessage.user_profile_create, newUserProfile);

//                 } else {

//                     return errorResponse(res, 400, responseMessage.request_invalid, responseMessage.errorMessage);
//                 }
//             }
//         } else {

//             return errorResponse(res, 400, responseMessage.user_profile_not_create, responseMessage.errorMessage);

//         }
//     } catch (error) {

//         return errorResponse(res, 500, responseMessage.errorMessage, error.message);

//     }
// }

exports.getUserProfile = async (req, res) => {
  try {
    
    let getUserProfileId = req.params.id;

    const user = await UserProfile.findOne({ _id: getUserProfileId }).select("-failedLoginAttempts -isPasswordChangeEmailSend -isInitialPasswordChanged -password -ProfileKey -passwordResetUsed -failedLoginAttempt -isAccountLocked -lastFailedLogin -lockoutExpiry -lastResetRequest -passwordResetAttempts -resetToken -resetTokenExpiry -resetTokenUsed")
    .populate({ path: "reportinManager", select: "firstName lastName"})
    .populate({ path: "userRole", select: "userRoleName" });
    
    if (!user) {
      return errorResponse(
        res,
        404,
        responseMessage.user_not_found,
        responseMessage.errorMessage
      );
    } else {
      userDetail = { user: user, userId: getUserProfileId };
      return sendResponse(
        res,
        200,
        responseMessage.user_profile_get,
        userDetail
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};
exports.getAllUserProfile = async (req, res) => {
  try {
    let filter = getFilter(req, [
      "firstName",
      "lastName",
      "email",
      "mobile",
      "state",
      "city",
      "pincode",
      "gender",
      "userRole",
    ]);
    const { page, limit, skip, sortOrder } = Paginate(req);
    let query = filter ? filter.query : {};
    const userProfile = await UserProfile.find(query)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);
    const totalCounts = await UserProfile.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);
    // check user if found or not
    if (!userProfile)
      return errorResponse(
        res,
        400,
        responseMessage.user_not_found,
        responseMessage.errorMessage
      );
    // check user is enabled
    // if (!userProfile.enabled) return res.status(400).send({ statusCode: 400, error: 'Invalid Reqeust', message: 'user is not in active state. Please contact admin to enable user' });
    // send data to client
    return sendResponse(res, 200, responseMessage.user_profile_list, {
      userProfile,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

// exports.updateUserProfile = async (req, res) => {
//     try {

//         if (req.params.id) {

//             let states;

//             const { error } = validateUpdateUser(req.body);

//             if (error) return errorResponse(res, 400, responseMessage.request_invalid, error.message);

//             const { firstName, lastName, gender,mobile, email,country, state,isProfilePicUploaded, address } = req.body;

//             if (country.length && state.length !== 0) {
//                 states = await getStateIdFromCountry(country, state);
//             }

//             const userUpdate = await UserProfile.findOne({_id:req.params.id})
//             if (!userUpdate) return errorResponse(res, 400, responseMessage.user_not_found, responseMessage.errorMessage);

//             (firstName && firstName.length != 0) ? userUpdate.firstName = firstName : userUpdate.firstName;
//             (lastName && lastName.length != 0) ? userUpdate.lastName = lastName : userUpdate.lastName;
//             userUpdate.updatedAt = Date.now();
//             await userUpdate.save();
//            let updatedFile="";

//               if(isProfilePicUploaded=='true'){
//                  updatedFile=await uploadFile(req);
//                   let url= await getFileUrl({email:updatedFile.key})

//                  console.log('updatedFile',updatedFile)

//             let inputData={}
//             if(updatedFile.statusCode==200){
//                  inputData = {
//                     firstName: firstName,
//                     lastName: lastName,
//                     gender: gender,
//                     mobile:mobile,
//                     address:address,
//                     country:country,
//                     ProfileKey:updatedFile.key,
//                     ProfileUrl:url,
//                     isProfilePicUploaded:true,
//                     state:state,
//                     email:email,
//                     updatedAt: Date.now()
//                 }

//             let userDetail = {};
//             console.log('updateStudent',inputData)

//             const userStudent = await UserProfile.findOneAndUpdate({ email: userUpdate.email }, inputData, { new: true });
//             console.log('userStudent',userStudent)
//             if (!userStudent) {
//                 return errorResponse(res, 404, responseMessage.user_not_found, responseMessage.errorMessage);
//             } else {
//                 userDetail = { updatedUser: userStudent, userId: userUpdate._id }
//                 await setDashboardNotification(`${userStudent.firstName} ${userStudent.lastName} updated profile`);
//                 return sendResponse(res, 200, responseMessage.user_profile_update, userDetail);
//             }
//         }
//     }else{

//             let userDetail = {};
//             inputData = {
//                 firstName: firstName,
//                 lastName: lastName,
//                 gender: gender,
//                 mobile:mobile,
//                 address:address,
//                 country:country,
//                 profileKey:"",
//                 isProfilePicUploaded:false,
//                 state:state,
//                 email:email,
//                 updatedAt: Date.now()
//             }

//             const userStudent = await UserProfile.findOneAndUpdate({ email: userUpdate.email }, inputData, { upsert: true });

//             if (!userStudent) {
//                 return errorResponse(res, 404, responseMessage.user_not_found, responseMessage.errorMessage);
//             } else {
//                 userDetail = { updatedUser: userStudent, userId: userUpdate._id }
//                 await setDashboardNotification(`${userStudent.firstName} ${userStudent.lastName} updated profile`);
//                 return sendResponse(res, 200, responseMessage.user_profile_update, userDetail);
//             }
//         }

//         } else {

//             return errorResponse(res, 400, responseMessage.request_invalid, responseMessage.errorMessage);
//         }

//     } catch (error) {
//        console.log('error',error)
//         return errorResponse(res, 500, responseMessage.errorMessage, error.message);
//     }
// }

exports.updateUserSocialProfile = async (req, res) => {
  try {
    if (
      req.params.id &&
      req.body.constructor === Object &&
      Object.keys(req.body).length !== 0
    ) {
      const userDetails = await CommonUsers.findById(req.params.id);

      if (!userDetails)
        return errorResponse(
          res,
          400,
          responseMessage.user_not_found,
          responseMessage.errorMessage
        );

      let validateUrl = [];

      Object.values(req.body).forEach((val) => {
        if (val.length !== 0) validateUrl.push(validateRequestedUrl(val));
      });

      let check = validateUrl.includes(false);

      if (check)
        return errorResponse(
          res,
          400,
          "Url is not valid",
          responseMessage.errorMessage
        );

      const query = {
        socialMedias: {
          twitter: req.body.twitter ? req.body.twitter : "",
          facebook: req.body.facebook ? req.body.facebook : "",
          youtube: req.body.youtube ? req.body.youtube : "",
          linkedIn: req.body.linkedIn ? req.body.linkedIn : "",
        },
      };

      switch (userDetails.userType) {
        case 1:
          const adminUser = await AdminProfile.updateOne(
            { email: userDetails.email },
            { $set: query },
            { new: true }
          );
          if (!adminUser) {
            return errorResponse(
              res,
              404,
              responseMessage.user_not_found,
              responseMessage.errorMessage
            );
          } else {
            await setDashboardNotification(
              `${adminUser.firstName} ${adminUser.lastName} social profile updated`
            );
            return sendResponse(
              res,
              200,
              "admin social profile updated successfully",
              adminUser
            );
          }
        case 2:
          const subadminUser = await Subadminprofile.updateOne(
            { email: userDetails.email },
            { $set: query },
            { new: true }
          );
          if (!subadminUser) {
            return errorResponse(
              res,
              404,
              responseMessage.user_not_found,
              responseMessage.errorMessage
            );
          } else {
            await setDashboardNotification(
              `${subadminUser.firstName} ${subadminUser.lastName} social profile updated`
            );
            return sendResponse(
              res,
              200,
              "client social profile updated successfully",
              subadminUser
            );
          }
        case 4:
        case 5:
          const userStudent = await UserProfile.updateOne(
            { email: userDetails.email },
            { $set: query },
            { new: true }
          );
          if (!userStudent) {
            return errorResponse(
              res,
              404,
              responseMessage.user_not_found,
              responseMessage.errorMessage
            );
          } else {
            await setDashboardNotification(
              `${userStudent.firstName} ${userStudent.lastName} social profile updated`
            );
            return sendResponse(
              res,
              200,
              "user social profile updated successfully",
              userStudent
            );
          }
        default:
          return errorResponse(
            res,
            400,
            responseMessage.user_type_invalid,
            responseMessage.errorMessage
          );
      }
    } else {
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

function validateRequestedUrl(requestUrl) {
  try {
    const newUrl = new URL(requestUrl);
    return newUrl.protocol === "http:" || newUrl.protocol === "https:";
  } catch {
    return false;
  }
}

async function validateUserProfileData(userProfileBody) {
  try {
    const schema = Joi.object({
      firstName: Joi.string().min(3).max(50).trim().required(),
      lastName: Joi.string().min(3).max(50).trim().required(),
      gender: Joi.string().min(3).trim().required(),
      mobile: Joi.string().min(10).max(10).required(),
      email: Joi.string().min(5).trim().max(50).email().required(),
      address: Joi.string().min(3).trim().required(),
      country: Joi.string().min(3).trim(),
      state: Joi.string().min(3).trim().required(),
      city: Joi.string().min(3).trim().required(),
      pincode: Joi.string().min(6).max(6).required(),
      userType: Joi.number().required(),
      description: Joi.string().allow(""),
      organisationName: Joi.string().trim().min(2).max(50).required(),
    });
    return schema.validate(userProfileBody);
  } catch (err) {
    console.log(err);
  }
}

async function validateSuperAdminDetails(superAdminBody) {
  try {
    const schema = Joi.object({
      firstName: Joi.string().min(3).max(50).trim().required(),
      lastName: Joi.string().min(3).max(50).trim().required(),
      mobile: Joi.string().min(10).max(10).required(),
      email: Joi.string().min(5).trim().max(50).email().required(),
      password: Joi.string().trim().min(8).max(20).required(),
      userType: Joi.number().required(),
      gender: Joi.string(),
      status: Joi.string(),
      address: Joi.string(),
      state: Joi.string().min(3).max(100).trim().required(),
      pincode: Joi.string().min(6).max(6).trim().required(),
      city: Joi.string().min(3).max(100).trim().required(),
      description: Joi.string().allow(""),
    });
    return schema.validate(superAdminBody);
  } catch (error) {
    console.log(err);
  }
}

// async function validateUpdateUser(updateUserBody) {
//   try {
//     const schema = Joi.object({
//       firstName: Joi.string().min(3).max(50).trim().required(),
//       lastName: Joi.string().min(3).max(50).trim().required(),
//       gender: Joi.string().min(3).trim().required(),
//       address: Joi.string().min(3).trim().required(),
//       state: Joi.string().min(3).trim().required(),
//       city: Joi.string().min(3).trim().required(),
//       pincode: Joi.string().min(6).max(6).required(),
//       description: Joi.string().allow(""),
//       id: Joi.string(),
//     });
//     return schema.validate(updateUserBody);
//   } catch (err) {
//     console.log(err);
//   }
// }

//validation according to myProfile functionality

async function validateUpdateUser(updateUserBody) {
  try {
    const schema = Joi.object({
      // firstName: Joi.string().min(3).max(50).trim().required(),
      // lastName: Joi.string().min(3).max(50).trim().required(),
      //  gender: Joi.string().min(3).trim().required(),
      gender: Joi.string()
        .valid("male", "female", "transgender", "notSpecify")
        .trim()
        .required(),
      address: Joi.string().min(3).trim().required(),
      state: Joi.string().min(3).trim().required(),
      city: Joi.string().min(3).trim().required(),
      pincode: Joi.string().length(6).pattern(/^\d+$/).required(),
      description: Joi.string().allow(""),
      id: Joi.string(),

      // Additional fields
      role: Joi.string().min(3).max(50).trim(),
      jobDescription: Joi.string()
        .max(800)
        .allow("")
        //.pattern(/^[a-zA-Z0-9\s]*$/) // Allows alphanumeric characters and spaces
        .messages({
          "string.max": "About must not exceed 800 characters.",
          //'string.pattern.base': 'AboutJob must only contain alphanumeric characters.',
        }),
      aboutJob: Joi.string().max(500).allow("").messages({
        "string.max": " must not exceed 500 characters.",
      }),
      jobInterest: Joi.string().max(500).allow("").messages({
        "string.max": "Job interests must not exceed 500 characters.",
      }),
      designation: Joi.string().max(100).trim(),
      dob: Joi.string(), //date().iso(),
      maritalStatus: Joi.string().allow(""),
      bloodGroup: Joi.string().max(10),
      nationality: Joi.string().min(3).max(100).trim(),

      // Address
      currentAddress: Joi.object({
        address1: Joi.string().min(3).max(255).trim(),
        state: Joi.string().min(2).max(50).trim(),
        city: Joi.string().min(2).max(50).trim(),
        pinCode: Joi.string().pattern(/^\d{4,10}$/),
      }),
      permanentAddress: Joi.object({
        address1: Joi.string().min(3).max(255).trim(),
        state: Joi.string().min(2).max(100).trim(),
        city: Joi.string().min(2).max(100).trim(),
        pinCode: Joi.string().pattern(/^\d{4,10}$/),
      }),

      // Contact Information
      workEmail: Joi.string().email(),
      personalEmail: Joi.string().email(),
      phoneNumber: Joi.string().length(10).pattern(/^\d+$/),
      workNumber: Joi.string().length(10).pattern(/^\d+$/).allow(""),
      homeNumber: Joi.string().length(10).pattern(/^\d+$/).allow(""),

      teamId: Joi.string().max(50).allow(""),
    });

    return schema.validate(updateUserBody);
  } catch (err) {
    console.error(err);
  }
}

exports.updateUserProfile = async (req, res) => {
  try {
    if (req.params.id) {
      let states;

      const { error } = validateUpdateUser(req.body);
      if (error)
        return errorResponse(
          res,
          400,
          responseMessage.request_invalid,
          error.message
        );

      const {
        //firstName,
        //lastName,
        gender,
        mobile,
        // email,
        country,
        state,
        isProfilePicUploaded,
        address,
        role,
        jobDescription,
        aboutJob,
        jobInterest,
        designation,
        dob,
        maritalStatus,
        bloodGroup,
        nationality,
        currentAddress,
        permanentAddress,
        workEmail,
        personalEmail,
        phoneNumber,
        workNumber,
        homeNumber,
        teamId,
      } = req.body;

      if (country?.length && state?.length !== 0) {
        states = await getStateIdFromCountry(country, state);
      }

      const userUpdate = await UserProfile.findOne({ _id: req.params.id });
      req.body.email = userUpdate.email;
      if (!userUpdate)
        return errorResponse(
          res,
          400,
          responseMessage.user_not_found,
          responseMessage.errorMessage
        );

      //   firstName && firstName?.length != 0
      //     ? (userUpdate.firstName = firstName)
      //     : userUpdate.firstName;
      //   lastName && lastName?.length != 0
      //     ? (userUpdate.lastName = lastName)
      //     : userUpdate.lastName;
      userUpdate.updatedAt = Date.now();
      await userUpdate.save();
      let updatedFile = "";

      if (isProfilePicUploaded === "true") {
        updatedFile = await uploadFile(req);
        let url = await getFileUrl({ email: updatedFile.key });
        
        let inputData = {};
        if (updatedFile.statusCode == 200) {
          inputData = {
            // firstName: firstName,
            // lastName: lastName,
            gender: gender,
            mobile: mobile,
            address: address,
            country: country,
            ProfileKey: updatedFile.key,
            ProfileUrl: url,
            isProfilePicUploaded: true,
            state: state,
            // email: email,
            updatedAt: Date.now(),
            role,
            jobDescription,
            aboutJob,
            jobInterest,
            designation,
            dob,
            maritalStatus: maritalStatus?.toLowerCase(),
            bloodGroup,
            nationality,
            currentAddress,
            permanentAddress,
            workEmail,
            personalEmail,
            phoneNumber,
            workNumber,
            homeNumber,
            teamId,
          };

          let userDetail = {};
          

          const userStudent = await UserProfile.findOneAndUpdate(
            { email: userUpdate.email },
            inputData,
            { new: true }
          ).select("-password -ProfileKey -resetToken -resetTokenExpires -passwordResetAttempts -isEmailVerified -isGoogleUser -isUserProfileCreated -isAdminApproved -resetTokenUsed -resetTokenExpiry -lockoutExpiry -lockoutCount -createdAt -updatedAt -lastFailedLogin -lastLogin -isAccountLocked -failedLoginAttempts -passwordResetUsed -lastResetRequest");
      
          if (!userStudent) {
            return errorResponse(
              res,
              404,
              responseMessage.user_not_found,
              responseMessage.errorMessage
            );
          } else {
            userDetail = { updatedUser: userStudent, userId: userUpdate._id };
            await setDashboardNotification(
              `${userStudent.firstName} ${userStudent.lastName} updated profile`
            );
            return sendResponse(
              res,
              200,
              responseMessage.user_profile_update,
              userDetail
            );
          }
        }
      } else {
        let userDetail = {};
        inputData = {
          //  firstName: firstName,
          //  lastName: lastName,
          gender: gender,
          mobile: mobile,
          address: address,
          country: country,
          profileKey: "",
          isProfilePicUploaded: false,
          state: state,
          //  email: email,
          updatedAt: Date.now(),
          role,
          jobDescription,
          aboutJob,
          jobInterest,
          designation,
          dob,
          maritalStatus: maritalStatus?.toLowerCase(),
          bloodGroup,
          nationality,
          currentAddress,
          permanentAddress,
          workEmail,
          personalEmail,
          phoneNumber,
          workNumber,
          homeNumber,
          teamId,
        };

        const userStudent = await UserProfile.findOneAndUpdate(
          { email: userUpdate.email },
          inputData,
          { upsert: true, new: true }
        ).select("-password -ProfileKey -resetToken -resetTokenExpires -passwordResetAttempts -isEmailVerified -isGoogleUser -isUserProfileCreated -isAdminApproved -resetTokenUsed -resetTokenExpiry -lockoutExpiry -lockoutCount -createdAt -updatedAt -lastFailedLogin -lastLogin -isAccountLocked -failedLoginAttempts -passwordResetUsed -lastResetRequest");

        if (!userStudent) {
          return errorResponse(
            res,
            404,
            responseMessage.user_not_found,
            responseMessage.errorMessage
          );
        } else {
          userDetail = { updatedUser: userStudent, userId: userUpdate._id };
          await setDashboardNotification(
            `${userStudent.firstName} ${userStudent.lastName} updated profile`
          );
          return sendResponse(
            res,
            200,
            responseMessage.user_profile_update,
            userDetail
          );
        }
      }
    } else {
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    console.log("error", error);
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.deleteUserProfile=async(req,res)=>{
  try {
    const profileData=await UserProfile.findById(req.params.id);
    if(!profileData){
      return errorResponse(
        res,
        404,
        "User not found",
        responseMessage.errorMessage
      );
    }

    if(!profileData.ProfileKey){
      return errorResponse(
        res,
        400,
        "User does not have a profile image to delete",
        "No profile found"
      )
    }

    await deleteImageFromS3(profileData.ProfileKey);
    profileData.isProfilePicUploaded=false;
    profileData.ProfileKey=null;
    profileData.ProfileUrl=null;
    
    await profileData.save();

    return sendResponse(res,200,"Profile image deleted successfully.",[])
      
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.errorMessage,
      error.message
    )
  }
};

exports.updateMyProfileExperience = async (req, res) => {
  try {
    const requestBody = req.body;
    const files = req.files;
    const profileId = req.query.profile_id; // Use the profileId from the query parameter
    const IdToUpdate = req.query.IdToUpdate; // Use the IdToUpdate from the query parameter

    if (!profileId) {
      return errorResponse(
        res,
        402,
        responseMessage.invalid_query_parameters,
        responseMessage.invalid_query_parameters
      );
    }

    const data = await UserProfile.findOne({ _id: profileId });

    if (!data) {
      return errorResponse(
        res,
        404,
        responseMessage.user_not_found,
        responseMessage.user_not_found
      );
    }

    const email = data.email;

    const {
      jobTitle,
      companyName,
      dateOfJoining,
      dateOfReceiving,
      experienceCertificateName,
      experienceCertificateSize,
      experienceCertificateKey,
      isExperienceUploaded,
    } = requestBody;

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
    let experienceCertificateName2 = expFile ? expFile.originalname : null;
    let experienceCertificateSize2 = expFile
      ? `(${formatFileSize(expFile?.size)})`
      : null;

    const newArray = Object.entries(files).map(([key, value]) => {
      return { key, value };
    });
    const randomNo = Math.floor(Math.random() * 90000 + 10000);
    let experienceToCheck = "";

    if (expFile) {
      const uploadedFilePromises = newArray.map(async (file) => {
        switch (file.key) {
          case "experienceCertificate":
            experienceToCheck = file.key + randomNo;
            break;
          default:
            "";
            break;
        }
        if (!file.value[0].buffer) {
          return file;
        }
        return uploadAssessorExperienceFile({
          req: {
            email: email,
            key: file.key,
            buffer: file.value[0].buffer,
            mimetype: file.value[0].mimetype,
          },
          randomNo: randomNo,
        });
      });
    } else {
      experienceToCheck = experienceCertificateKey;
    }

    if (IdToUpdate) {
      // Update existing experience
      const experienceIndex = data.experiences.findIndex(
        (exp) => exp._id.toString() === IdToUpdate
      );
      if (experienceIndex === -1) {
        return errorResponse(
          res,
          404,
          "Certificate not found",
          "Certificate not found"
        );
      }

      const updatedData = {
        jobTitle,
        companyName,
        dateOfJoining,
        dateOfReceiving,
        experienceCertificateName,
        experienceCertificateSize,
        experienceCertificateKey,
        isExperienceUploaded,
      };

      if (expFile) {
        updatedData.experienceCertificateName = experienceCertificateName2;
        updatedData.experienceCertificateSize = experienceCertificateSize2;
        updatedData.experienceCertificateKey = experienceToCheck;
        updatedData.isExperienceUploaded = true;
      }

      data.experiences[experienceIndex] = updatedData;
    } else {
      // Add new experience
      const newExperience = {
        jobTitle,
        companyName,
        dateOfJoining,
        dateOfReceiving,
        experienceCertificateName:
          experienceCertificateName2 || experienceCertificateName,
        experienceCertificateSize:
          experienceCertificateSize2 || experienceCertificateSize,
        experienceCertificateKey: experienceToCheck,
        isExperienceUploaded: expFile ? true : isExperienceUploaded,
      };

      data.experiences.push(newExperience);
    }

    // Save the updated data
    await data.save();

    const message = IdToUpdate
      ? "Experience file updated successfully"
      : "New experience added successfully";

    return sendResponse(res, 200, message, data);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.updateMyProfileDegree = async (req, res) => {
  try {
    const requestBody = req.body;
    const files = req.files;
    const profileId = req.query.profile_id; // Profile ID from query parameter
    const IdToUpdate = req.query.IdToUpdate; // Education ID to update from query parameter

    if (!profileId) {
      return errorResponse(
        res,
        402,
        responseMessage.invalid_query_parameters,
        responseMessage.invalid_query_parameters
      );
    }

    const data = await UserProfile.findOne({ _id: profileId });

    if (!data) {
      return errorResponse(
        res,
        404,
        responseMessage.user_not_found,
        responseMessage.user_not_found
      );
    }

    const email = data.email;

    const {
      degree,
      yearOfJoining,
      specilization,
      yearOfCompletion,
      educationCertificateName,
      educationCertificateSize,
      educationCertificateKey,
      isEducationUploaded,
    } = requestBody;

    const formatFileSize = (bytes) => {
      if (bytes < 1024) {
        return bytes + " B";
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      }
    };

    const degreeFile = files.degreeCertificate?.[0];
    let degreeCertificateName2 = degreeFile ? degreeFile.originalname : null;
    let degreeCertificateSize2 = degreeFile
      ? `(${formatFileSize(degreeFile?.size)})`
      : null;

    const newArray = Object.entries(files).map(([key, value]) => {
      return { key, value };
    });
    const randomNo = Math.floor(Math.random() * 90000 + 10000);
    let degreeToCheck = "";

    if (degreeFile) {
      const uploadedFilePromises = newArray.map(async (file) => {
        switch (file.key) {
          case "degreeCertificate":
            degreeToCheck = file.key + randomNo;
            break;
          default:
            "";
            break;
        }
        if (!file.value[0].buffer) {
          return file;
        }
        return uploadAssessorExperienceFile({
          req: {
            email: email,
            key: file.key,
            buffer: file.value[0].buffer,
            mimetype: file.value[0].mimetype,
          },
          randomNo: randomNo,
        });
      });
    } else {
      degreeToCheck = educationCertificateKey;
    }

    if (IdToUpdate) {
      // Update existing education
      const educationIndex = data.education.findIndex(
        (edu) => edu._id.toString() === IdToUpdate
      );
      if (educationIndex === -1) {
        return errorResponse(
          res,
          404,
          responseMessage.education_not_found,
          responseMessage.education_not_found
        );
      }

      const updatedData = {
        degree,
        yearOfJoining,
        specilization,
        yearOfCompletion,
        educationCertificateName,
        educationCertificateSize,
        educationCertificateKey,
        isEducationUploaded,
      };

      if (degreeFile) {
        updatedData.educationCertificateName = degreeCertificateName2;
        updatedData.educationCertificateSize = degreeCertificateSize2;
        updatedData.educationCertificateKey = degreeToCheck;
        updatedData.isEducationUploaded = true;
      }

      data.education[educationIndex] = updatedData;
    } else {
      // Add new education
      const newEducation = {
        degree,
        yearOfJoining,
        specilization,
        yearOfCompletion,
        educationCertificateName:
          degreeCertificateName2 || educationCertificateName,
        educationCertificateSize:
          degreeCertificateSize2 || educationCertificateSize,
        educationCertificateKey: degreeToCheck,
        isEducationUploaded: degreeFile ? true : isDegreeUploaded,
      };

      data.education.push(newEducation);
    }

    // Save the updated data
    await data.save();

    const message = IdToUpdate
      ? "Education details updated successfully"
      : "Education details added successfully";

    return sendResponse(res, 200, message, data);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.updateProfilePersonalInformation = async (req, res) => {
  try {
    const requestBody = req.body;
    const files = req.files;
    const profileId = req.query.profile_id; // Use the profileId from the query parameter
    const IdToUpdate = req.query.personal_id; // Use the IdToUpdate from the query parameter

    if (!profileId) {
      return errorResponse(
        res,
        402,
        "Invalid Profile ID", // Response message for invalid profile ID
        responseMessage.invalid_query_parameters
      );
    }

    const data = await UserProfile.findOne({ _id: profileId });
    if (!data) {
      return errorResponse(res, 404, "Profile not found", "Profile not found");
    }

    const email = data.email;
    const {
      cardType,
      cardNo,
      cardFileKey,
      cardFileName,
      cardFileSize,
      isDocumentUploaded,
    } = requestBody;

    const formatFileSize = (bytes) => {
      if (bytes < 1024) {
        return bytes + " B";
      } else if (bytes < 1024 * 1024) {
        return (bytes / 1024).toFixed(2) + " KB";
      } else {
        return (bytes / (1024 * 1024)).toFixed(2) + " MB";
      }
    };

    const cardFile = files.card?.[0];
    const cardFileName2 = cardFile ? cardFile.originalname : cardFileName;
    const cardFileSize2 = cardFile
      ? `(${formatFileSize(cardFile?.size)})`
      : cardFileSize;

    const newArray = Object.entries(files).map(([key, value]) => {
      return { key, value };
    });

    const randomNo = Math.floor(Math.random() * 90000 + 10000);
    let cardToCheck = cardFile ? `card${randomNo}` : cardFileKey;

    if (cardFile) {
      const uploadedFilePromises = newArray.map(async (file) => {
        if (file.value[0].buffer) {
          return uploadAssessorExperienceFile({
            req: {
              email: email,
              key: file.key,
              buffer: file.value[0].buffer,
              mimetype: file.value[0].mimetype,
            },
            randomNo: randomNo,
          });
        }
      });
      await Promise.all(uploadedFilePromises);
    }

    if (IdToUpdate) {
      // Update existing personal information
      const cardIndex = data.personalDetail.findIndex(
        (pd) => pd._id.toString() === IdToUpdate
      );

      if (cardIndex === -1) {
        return errorResponse(res, 404, "Data not found", "Data not found");
      }

      const updatedData = {
        cardType,
        cardNo,
        cardFileKey: cardToCheck,
        cardFileName: cardFileName2,
        cardFileSize: cardFileSize2,
        isDocumentUploaded: cardFile ? true : isDocumentUploaded,
      };

      data.personalDetail[cardIndex] = updatedData;
    } else {
      // Add new personal information
      const newPersonalInformation = {
        cardType,
        cardNo,
        cardFileKey: cardToCheck,
        cardFileName: cardFileName2,
        cardFileSize: cardFileSize2,
        isDocumentUploaded: cardFile ? true : isDocumentUploaded,
      };

      data.personalDetail.push(newPersonalInformation);
    }

    // Save the updated data
    await data.save();

    const message = IdToUpdate
      ? "Personal information updated successfully"
      : "personal information added successfully";

    return sendResponse(res, 200, message, data);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.getProfileExperience = async (req, res) => {
  try {
    const profileId = req.params.id; // Get profile ID from params
    let totalCounts = 0;

    // Find user profile by profileId
    const userProfile = await UserProfile.findById(profileId);
  
    if (userProfile) {
      // Filter experiences with a valid experienceCertificateKey
      const validExperiences = userProfile.experiences.filter(
        (experience) => experience.experienceCertificateKey
      );

      if (validExperiences.length > 0) {
        // Extract file keys from experiences
        const fileKeys = validExperiences.map(
          (experience) => experience.experienceCertificateKey
        );

        // Fetch file URLs
        const dataWithUrls = await getMyProfileExperienceFileUrl(
          userProfile,
          fileKeys
        );

        // Map the data with URLs to the required structure
        const uploadedFiles = dataWithUrls.map((experience) => ({
          isExperienceUploaded: experience.isExperienceUploaded,
          jobTitle: experience.jobTitle,
          companyName: experience.companyName,
          dateOfJoining: experience.dateOfJoining,
          dateOfReceiving: experience.dateOfReceiving,
          experienceCertificateName: experience.experienceCertificateName,
          experienceCertificateSize: experience.experienceCertificateSize,
          experienceCertificateKey: experience.experienceCertificateKey,
          status: experience.status,
          url: experience.url,
          _id: experience._id,
        }));
      
        totalCounts = uploadedFiles.length;

        // Return response if files are found
        if (uploadedFiles.length > 0) {
          return sendResponse(res, 200, "Data found", {
            uploadedFiles,
            totalCounts,
          });
        } else {
          return errorResponse(res, 200, "Data not found", []);
        }
      } else {
        return errorResponse(res, 200, "File not found", []);
      }
    }

    return errorResponse(
      res,
      400,
      "User not found",
      responseMessage.errorMessage
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.getProfileDegree = async (req, res) => {
  try {
    const profileId = req.params.id;

    let totalCounts = 0;
    const profileDetail = await UserProfile.findById(profileId);
    if (profileDetail) {
      // Fetch all education details
      const educationDetails = profileDetail.education || [];
      const fileKeys = educationDetails
        .filter((edu) => edu.educationCertificateKey)
        .map((edu) => edu.educationCertificateKey);

      if (fileKeys.length > 0) {
        const dataWithUrls = await getMyProfileEducationUrl(
          profileDetail,
          fileKeys
        );

        const uploadedFiles = dataWithUrls.map((edu) => ({
         
          isDegreeUploaded: edu.isDegreeUploaded,
          degree: edu.degree,
          yearOfJoining: edu.yearOfJoining,
          specilization: edu.specilization,
          yearOfCompletion: edu.yearOfCompletion,
          educationCertificateName: edu.educationCertificateName,
          educationCertificateSize: edu.educationCertificateSize,
          educationCertificateKey: edu.educationCertificateKey,
          url: edu.url,
          _id: edu._id,
        }));

        totalCounts = uploadedFiles.length;

        if (uploadedFiles.length > 0) {
          return sendResponse(res, 200, "Data found", {
            uploadedFiles,
            totalCounts,
          });
        } else {
          return errorResponse(res, 200, "Data not found", []);
        }
      } else {
        return errorResponse(res, 200, "File not found", []);
      }
    }

    return errorResponse(
      res,
      400,
      "Data not found",
      responseMessage.errorMessage
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.getAssessorPersonalDocById = async (req, res) => {
  try {
    const profile_id = req.params.id;

    // Fetch assessor details by ID
    const profileDetail = await UserProfile.findById(profile_id);
    if (profileDetail) {
      const fileKeys = profileDetail.personalDetail
        .filter((data) => data.cardFileKey)
        .map((data) => data.cardFileKey);

      if (fileKeys.length > 0) {
        const dataWithUrls = await getassessorPersonalFileUrl(
          profileDetail,
          fileKeys
        );

        const uploadedFiles = dataWithUrls.map((data) => ({
          isDocumentUploaded: data.isDocumentUploaded,
          cardType: data.cardType,
          cardNo: data.cardNo,
          cardFileName: data.cardFileName,
          cardFileSize: data.cardFileSize,
          cardFileKey: data.cardFileKey,
          url: data.url,
          _id: data._id,
        }));

        return sendResponse(res, 200, "Data found", uploadedFiles);
      } else {
        return errorResponse(res, 200, "File not found", []);
      }
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.updateIndentityInfo = async (req, res) => {
  try {
    const userId = req.params.id;
    const infoData = req.body;

    const uploadedCards = req.files || [];
    let aadharFile = null;
    let panFile = null;

    if (uploadedCards.aadharCard?.length) {
      aadharFile = uploadedCards.aadharCard;
    }
    if (uploadedCards.panCard?.length) {
      panFile = uploadedCards.panCard;
    }

    const userData = await UserProfile.findById(userId);

    if (!userData) {
      return errorResponse(
        res,
        404,
        "No User found",
        "No such user found in DB"
      );
    }

    const email = userData.email;

    let updatedDoc = [];
    let updateObj = {};

    const uploadDoc = async (file, cardType, cardNo) => {
      const cardFile = file[0];

      const formatFileSize = (bytes) => {
        if (bytes < 1024) {
          return bytes + " B";
        } else if (bytes < 1024 * 1024) {
          return (bytes / 1024).toFixed(2) + " KB";
        } else {
          return (bytes / (1024 * 1024)).toFixed(2) + " MB";
        }
      };

      let cardFileName = cardFile ? cardFile.originalname : null;

      let cardFileSize = cardFile
        ? `(${formatFileSize(cardFile?.size)})`
        : null;

      const newArray = Object.entries(file).map(([key, value]) => {
        return { key, value };
      });
      const fileObj = newArray[0];
      const randomNo = Math.floor(Math.random() * 9000 + 1000);
      let cardToCheck = fileObj.key + randomNo;
      if (!fileObj.value.buffer) {
        return errorResponse(res, 500, "No file found", "No file found");
      }
      const fileuploadedData = await uploadAssessorExperienceFile({
        req: {
          email: email,
          key: fileObj.key,
          buffer: fileObj.value.buffer,
          mimetype: fileObj.value.mimetype,
        },
        randomNo: randomNo,
      });
      // Add the new experience to the existing experiences array
      updateObj.personalDetail = [...userData.personalDetail] || [];
      const newData = {
        cardType,
        cardNo,
        cardFileName,
        cardFileSize,
        cardFileKey: cardToCheck,
        adminUploaded: true,
        status: "accepted",
        isDocumentUploaded: true,
        s3Url: fileuploadedData.s3Url,
      };
      let isPresent = false;
      for (let i = 0; i < updateObj.personalDetail.length; i++) {
        if (updateObj.personalDetail[i].cardType === cardType) {
          updateObj.personalDetail[i] = newData;
          isPresent = true;
          break;
        }
      }
      if (!isPresent) {
        updateObj.personalDetail.push({
          cardType,
          cardNo,
          cardFileName: cardFileName,
          cardFileSize: cardFileSize,
          cardFileKey: cardToCheck,
          adminUploaded: true,
          status: "accepted",
          isDocumentUploaded: true,
        });
      }

      // // Save the updated user document
      const newCardData = await UserProfile.findByIdAndUpdate(
        userData._id,
        { $set: updateObj },
        { new: true, runValidators: true }
      );
      userData.personalDetail = updateObj.personalDetail;
      updatedDoc = newCardData.personalDetail;
    };
    const isAadhar = infoData.aadharNo && aadharFile ? "AadharCard" : null;
    const isPan = infoData.panCardNo && panFile ? "Pancard" : null;
    if (isAadhar) {
      await uploadDoc(aadharFile, isAadhar, infoData.aadharNo);
    }
    if (isPan) {
      await uploadDoc(panFile, isPan, infoData.panCardNo);
    }
    // Handle your response accordingly
    return sendResponse(res, 200, "Data uploaded successfully", updatedDoc);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//delete assessor experience
exports.deleteProfileExperienceById = async (req, res, next) => {
  try {
    let profileId = req.query.profile_id;
    let experienceIdToDelete = req.query.IdToDelete; 
    let keyToDelete = req.query.keyToDelete;
    if (!profileId || !experienceIdToDelete || !keyToDelete) {
      return errorResponse(
        res,
        403,
        responseMessage.invalid_request,
        responseMessage.invalid_request
      );
    }

    const profileData = await UserProfile.findOne({ _id: profileId });
    if (!profileData)
      return errorResponse(
        res,
        404,
        'User not found',
        responseMessage.errorMessage
      );

    // Use $pull to remove the experience with the given _id from the experiences array
    const result = await UserProfile.updateOne(
      { _id: profileId },
      { $pull: { experiences: { _id: experienceIdToDelete } } }
    );
    if (!result.modifiedCount)
      //nModified)
      return errorResponse(
        res,
        400,
        "User Id not found ", 
        responseMessage.errorMessage
      );
    
      // Delete the image from S3
      await deleteImageFromS3(keyToDelete);

    return sendResponse(
      res,
      200,
      "Data deleted succesfully", 
      result
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

//delete assesor educationById
exports.deleteProfileEducation = async (req, res, next) => {
  try {
    let profileId = req.query.profile_id;
    let educationIdToDelete = req.query.IdToDelete; 
    let keyToDelete = req.query.keyToDelete;
    if (!profileId || !educationIdToDelete || !keyToDelete) {
      return errorResponse(
        res,
        403,
        responseMessage.invalid_request,
        responseMessage.invalid_request
      );
    }

    const profileData = await UserProfile.findOne({ _id: profileId });
    if (!profileData)
      return errorResponse(
        res,
        404,
        'User not found',
        responseMessage.errorMessage
      );

    const result = await UserProfile.updateOne(
      { _id: profileId },
      { $pull: { education: { _id: educationIdToDelete } } }
    );
    if (!result.modifiedCount)
      //nModified)
      return errorResponse(
        res,
        400,
        "User Id not found ", 
        responseMessage.errorMessage
      );

     // Delete the image from S3
     await deleteImageFromS3(keyToDelete);  

    return sendResponse(
      res,
      200,
      "Data deleted succesfully", 
      result
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.deleteProfilePersonalDocumentById = async (req, res, next) => {
  try {
    let profileId = req.query.profile_id;
    let personalIdToDelete = req.query.IdToDelete; 
    let keyToDelete = req.query.keyToDelete;
    if (!profileId || !personalIdToDelete || !keyToDelete) {
      return errorResponse(
        res,
        403,
        responseMessage.invalid_request,
        responseMessage.invalid_request
      );
    }

    const profileData = await UserProfile.findOne({ _id: profileId });
    if (!profileData)
      return errorResponse(
        res,
        404,
        'User not found',
        responseMessage.errorMessage
      );

    // Use $pull to remove the personal with the given _id from the personal array
    const result = await UserProfile.updateOne(
      { _id: profileId },
      { $pull: { personalDetail: { _id: personalIdToDelete } } }
    );
    if (!result.modifiedCount)
      
      return errorResponse(
        res,
        400,
        "User Id not found ", 
        responseMessage.errorMessage
      );
    
     // Delete the image from S3
     await deleteImageFromS3(keyToDelete);  

    return sendResponse(
      res,
      200,
      "Data deleted succesfully", 
      result
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

