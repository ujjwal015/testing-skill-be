const userModel = require("../models/user-model");
const userRoleModel = require("../models/userRole-model");
const { errorResponse, sendResponse } = require("../utils/response");
const responseMessage = require("../utils/responseMessage");
const Joi = require("@hapi/joi");
const { featureList } = require("../utils/constants");
const { Paginate } = require("../utils/paginate");
const { getFilter } = require("../utils/custom-validators");
const DeviceManager = require("../models/device-manager-model");
const {
  mobileValidateRegEx,
  passwordValidateRegEx,
  validatePassword,
} = require("../utils/custom-validators");
const nodemailer = require("nodemailer");
const {
  EMAIL_USERNAME,
  EMAIL_PASSWORD,
  EMAIL_SERVICE,
  TOKEN,
  SENDER_EMAIL,
  BASE_FRONTEND_URL,
  MSZ91_HOST,
  MSZ91_USER,
  MSZ91_PASS,
  MSZ91_PORT 
} = require("../utils/envHelper");
const jwt = require("jsonwebtoken");

const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { JWT_SECRET } = require("../config/keys");
const RedisService = require("../utils/redisService");

const fs = require("fs");
const path = require("path");
const redisDB1 = new RedisService("db1");
const redisDB4 = new RedisService("db4");

const { MailtrapClient, MailtrapTransport } = require("mailtrap");
const UserDashboard = require("../models/userDashboardModel");
const { 
  checkAccountLockout, 
  handleFailedLogin, 
  handleSuccessfulLogin, 
  getLockoutMessage,
  shouldAutoUnlock 
} = require("../utils/accountLockout");
const { verifyCaptcha } = require("../middleware/verifyCaptcha");
const { getPersmission } = require("../utils/getPermission");
const { BLACK_LIST_TOKENS } = require("../constants/redis");
const Dashboard = require("../models/dashboardModel");
const { USER_PERMISSION_CACHE } = require("../constants/redis");

function mergePermissions(existingPermissions, newPermissions) {
  return Object.keys(newPermissions).reduce((merged, key) => {
    merged[key] = existingPermissions[key] || newPermissions[key];
    return merged;
  }, { ...existingPermissions });
}

function mergeObjects(a, b) {
  return {
    ...a,
    enabled: a.enabled || b.enabled,
    subFeatures: a.subFeatures.map((subA) => {
      const subB = b.subFeatures.find(
        (s) => s.subFeatureName === subA.subFeatureName
      );
      if (!subB) return subA;
      return {
        ...subA,
        enabled: subA.enabled || subB.enabled,
        permissions: mergePermissions(subA.permissions, subB.permissions),
      };
    }),
  };
}

function mergeArrays(arrayA, arrayB) {
  return arrayA.map((itemA) => {
    const itemB = arrayB.find((b) => b.featureName === itemA.featureName);
    return itemB ? mergeObjects(itemA, itemB) : { ...itemA };
  });
}

function convertStringToFormat(str) {
  return str
    .split(" ")
    .map((word) => word.substring(0, 2).toUpperCase())
    .join("");
}

function convertPermissions(permissions) {
  const map = { view: "1", add: "2", edit: "3", delete: "4", export: "5", status: "6" };
  return Object.fromEntries(
    Object.entries(permissions).map(([key, val]) => [map[key] || key, val])
  );
}

function transformUserRole(arrayC) {
  return arrayC.map((role) => ({
    featureName: convertStringToFormat(role.featureName),
    enabled: role.enabled,
    subFeatures: role.subFeatures.map((sub) => ({
      subFeatureName: convertStringToFormat(sub.subFeatureName),
      enabled: sub.enabled,
      permissions: convertPermissions(sub.permissions),
    })),
  }));
}

function generateRandomAlphanumeric(length) {
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";

  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * chars.length);
    result += chars.charAt(randomIndex);
  }

  return result;
}

exports.createUser = async (req, res, next) => {
  try {
    const requestBody = req.body;
    const { error, value } = validateUserDetails(requestBody);
    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );

      if (requestBody.reportinManager === "") {
        requestBody.reportinManager = null;
      }  

    const existingUser = await userModel.findOne({
      $or: [
        { email: requestBody.email?.trim() },
        { userName: requestBody.userName },
      ],
    });
    if (existingUser) {
      return errorResponse(
        res,
        400,
        responseMessage.existing_userEmail_or_userName,
        responseMessage.existing_userEmail_or_userName
      );
    }

    let response = "";

    const userRole = await userRoleModel.findOne({
      _id: requestBody?.userRole[0],
    });
    if (featureList.length === userRole.features.length) {
      const newUser = new userModel({
        firstName: requestBody.firstName,
        lastName: requestBody.lastName,
        email: requestBody.email?.trim(),
        userName: requestBody.userName,
        userRole: requestBody.userRole,
        reportinManager: requestBody?.reportinManager,
        assigndClients: requestBody.assigndClients,
        assignedDashboard: requestBody.assignedDashboard,
        isUserProfileCreated: requestBody.isUserProfileCreated,
        isAdminApproved: requestBody.isAdminApproved,
        isTourComplete: requestBody.isTourComplete,
        isSuperAdmin: true,
        createdBy: req.user._id,
      });
      response = await newUser.save();
    } else {
      const newUser = new userModel({
        firstName: requestBody.firstName,
        lastName: requestBody.lastName,
        email: requestBody.email,
        userName: requestBody.userName,
        userRole: requestBody.userRole,
        reportinManager: requestBody?.reportinManager,
        assigndClients: requestBody.assigndClients,
        assignedDashboard: requestBody.assignedDashboard,
        isUserProfileCreated: requestBody.isUserProfileCreated,
        isAdminApproved: requestBody.isAdminApproved,
        isTourComplete: requestBody.isTourComplete,
        createdBy: req.user._id,
      });
      response = await newUser.save();
    }

    if (response) {
      response.userRole.map(async (role) => {
        await userRoleModel.findOneAndUpdate(
          { _id: role },
          { $inc: { userAssigned: 1 } }
        );
      });

      const dashboard = await Dashboard.findOne({_id:requestBody.assignedDashboard})
      await Dashboard.findOneAndUpdate({_id:requestBody.assignedDashboard},{$inc: { used_count : 1}})

      const components = dashboard.components.map(item=>{
          return { 
            componentId: item
          }
      })

      //put the dashboard in user-dashboard collection 
      const newUserDashboard = new UserDashboard({ 
          dashboard_id : dashboard._id,
          components : components
      })

      const userDashboard = await newUserDashboard.save()
      response.userDashboard = userDashboard._id
      await response.save()

      const data = await sendMailToUser(res, response);

    }
  } catch (error) {
    console.log("error-->", error)
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.getUsers = async (req, res, next) => {
  try {
    const options = ["firstName", "lastName", "mobile", "state"];
    let filter = getFilter(req, options);
    const { page, limit, skip, sortOrder } = Paginate(req);
    let query = filter ? filter.query : {};
    query = {
      ...query,
      createdBy: req.query.userId ? req.query.userId : req.user._id,
    };

    // console.log('user-->', req.user)
    // console.log('query-->', query)

    const response = await userModel
      .find(query)
      .populate(["assigndClients", "userRole"])
      .select("firstName lastName status userName isInitialPasswordChanged email mobile status failedLoginAttempts isAccountLocked lockoutExpiry lastFailedLogin assigndClients userRole createdAt updatedAt")
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    const totalCounts = await userModel.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);

    // const users = response.filter(
    //   (user) => user?.email !== "zaakefsotysvlrkopb@ckptr.com"
    // );

    if (response.length < 1) {
      return sendResponse(res, 200, responseMessage.no_user_found, {
        response,
        page,
        totalCounts,
        totalPages,
      });
    } else {
      return sendResponse(res, 200, responseMessage.got_users_successfully, {
        response,
        page,
        totalCounts,
        totalPages,
      });
    }
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.getOneUser = async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return errorResponse(
        res,
        400,
        responseMessage.no_user_id_provided,
        responseMessage.no_user_id_provided
      );
    }
    const userIdCheck = await checkForValidUserId(userId);
    if (!userIdCheck) {
      return errorResponse(
        res,
        400,
        responseMessage.no_such_user_id_exist,
        responseMessage.no_such_user_id_exist
      );
    }
    const response = await userModel
      .findOne({ _id: userId })
      .populate(["assigndClients", "userRole"]);
    //const response = await userModel.findOne({_id:userId}).populate([{ select: "", path: "userRole" },
    //                                                                { select: "", path: "assigndClients"}])

    if (response) {
      const resultArray = JSON.parse(JSON.stringify(response.userRole));
      const mergedResultsArray = [];

      resultArray.forEach((resultObject) => {
        const features = resultObject.features;

        features.forEach((feature) => {
          const existingFeature = mergedResultsArray.find(
            (mergedFeature) => mergedFeature.featureName === feature.featureName
          );

          if (!existingFeature) {
            mergedResultsArray.push({
              featureName: feature.featureName,
              enabled: feature.enabled,
              subFeatures: feature.subFeatures,
            });
          } else {
            existingFeature.enabled =
              existingFeature.enabled || feature.enabled;

            feature.subFeatures.forEach((subFeature) => {
              const matchingSubFeature = existingFeature.subFeatures.find(
                (existingSubFeature) =>
                  existingSubFeature.subFeatureName ===
                  subFeature.subFeatureName
              );

              if (matchingSubFeature) {
                matchingSubFeature.permissions = mergePermissions(
                  matchingSubFeature.permissions,
                  subFeature.permissions
                );
              } else {
                existingFeature.subFeatures.push(subFeature);
              }
            });
          }
        });
      });

      const arrayC = mergeArrays(featureList, mergedResultsArray);
      function mergePermissions(existingPermissions, newPermissions) {
        // set a permission to true if it's true in either set of permissions
        return Object.keys(newPermissions).reduce((merged, permission) => {
          merged[permission] =
            existingPermissions[permission] || newPermissions[permission];
          return merged;
        }, existingPermissions);
      }

      // function to create short string from full feature or subfeature name
      function convertStringToFormat(inputString) {
        return inputString
          .split(" ")
          .map((word) => word.substr(0, 2).toUpperCase())
          .join("");
      }

      // function to create number for permission keys
      function convertPermissions(permissions) {
        const convertedPermissions = {};
        for (const key in permissions) {
          let newKey;
          switch (key) {
            case "view":
              newKey = "1";
              break;
            case "add":
              newKey = "2";
              break;
            case "edit":
              newKey = "3";
              break;
            case "delete":
              newKey = "4";
              break;
            case "export":
              newKey = "5";
              break;
            case "status":
              newKey = "6";
              break;
            default:
              newKey = key; // Keep the key as is if not recognized
          }
          convertedPermissions[newKey] = permissions[key];
        }
        return convertedPermissions;
      }

      // Loop through the userRole array and apply transformations
      const transformedUserRole = arrayC.map((role) => {
        const featureName = convertStringToFormat(role.featureName);
        const subFeatures = role.subFeatures.map((subFeature) => ({
          subFeatureName: convertStringToFormat(subFeature.subFeatureName),
          enabled: subFeature.enabled,
          permissions: convertPermissions(subFeature.permissions),
        }));
        return {
          featureName,
          enabled: role.enabled,
          subFeatures,
        };
      });

      const plainResponse = JSON.parse(JSON.stringify(response));
      console.log("plainResponse--->", response);
      const newResponse = {
        ...plainResponse,
        userRole: transformedUserRole,
      };
      delete newResponse.password;
      // {featureList: featureList, mergedResultsArray: mergedResultsArray}
      return sendResponse(
        res,
        200,
        responseMessage.got_user_deatils_successfully,
        newResponse
      );
    }
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.getOneUser2 = async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return errorResponse(
        res,
        400,
        responseMessage.no_user_id_provided,
        responseMessage.no_user_id_provided
      );
    }
    const userIdCheck = await checkForValidUserId(userId);
    if (!userIdCheck) {
      return errorResponse(
        res,
        400,
        responseMessage.no_such_user_id_exist,
        responseMessage.no_such_user_id_exist
      );
    }
    const response = await userModel
      .findOne({ _id: userId })
      .populate(["assigndClients", "userRole"]);

    if (!response)
      return errorResponse(res, 400, "No user found", "No user found");

    return sendResponse(
      res,
      200,
      responseMessage.got_user_deatils_successfully,
      response
    );
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.updateUser = async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return errorResponse(
        res,
        400,
        responseMessage.no_user_id_provided,
        responseMessage.no_user_id_provided
      );
    }
    const userIdCheck = await checkForValidUserId(userId);
    if (!userIdCheck) {
      return errorResponse(
        res,
        400,
        responseMessage.no_such_user_id_exist,
        responseMessage.no_such_user_id_exist
      );
    }
    const requestBody = req.body;
    if (!requestBody) {
      return errorResponse(
        res,
        400,
        responseMessage.no_details_given_to_update,
        responseMessage.no_details_given_to_update
      );
    }
    //checking the userRole already assigned
    const alreadyAssignedUserRole = await userModel.findOne({ _id: userId });

    const response = await userModel.findOneAndUpdate(
      { _id: userId },
      requestBody,
      { new: true }
    );

    if (response && alreadyAssignedUserRole) {
      // checking the removal of userRole
      alreadyAssignedUserRole.userRole.forEach(async (beforeRole) => {
        if (!response.userRole.includes(beforeRole)) {
          await userRoleModel.findOneAndUpdate(
            { _id: beforeRole },
            { $inc: { userAssigned: -1 } }
          );
        }
      });

      //checking the addition of userRole
      response.userRole.forEach(async (afterRole) => {
        if (!alreadyAssignedUserRole.userRole.includes(afterRole)) {
          await userRoleModel.findOneAndUpdate(
            { _id: afterRole },
            { $inc: { userAssigned: 1 } }
          );
        }
      });

      if(!alreadyAssignedUserRole.assignedDashboard){
        const dashboard = await Dashboard.findOne({_id:requestBody.assignedDashboard})
        await Dashboard.findOneAndUpdate({_id:requestBody.assignedDashboard},{$inc: { used_count : 1}})
  
        const components = dashboard.components.map(item=>{
            return { 
              componentId: item
            }
        })
  
        //put the dashboard in user-dashboard collection 
        const newUserDashboard = new UserDashboard({ 
            dashboard_id : dashboard._id,
            components : components
        })
  
        const userDashboard = await newUserDashboard.save()
        response.userDashboard = userDashboard._id
        await response.save()

        // deleting the user's old user-dashboard as new dashboard assigned to the user
        await UserDashboard.findByIdAndDelete(alreadyAssignedUserRole.userDashboard)

        // decreasing the assigned count of previous dashboard 
        await Dashboard.findOneAndUpdate({_id:alreadyAssignedUserRole.assignedDashboard},{$inc: { used_count : -1}})
      }

      else{
        if(alreadyAssignedUserRole.assignedDashboard.toString()!==requestBody.assignedDashboard.toString()){
          const dashboard = await Dashboard.findOne({_id:requestBody.assignedDashboard})
          await Dashboard.findOneAndUpdate({_id:requestBody.assignedDashboard},{$inc: { used_count : 1}})
    
          const components = dashboard.components.map(item=>{
              return { 
                componentId: item
              }
          })
    
          //put the dashboard in user-dashboard collection 
          const newUserDashboard = new UserDashboard({ 
              dashboard_id : dashboard._id,
              components : components
          })
    
          const userDashboard = await newUserDashboard.save()
          response.userDashboard = userDashboard._id
          await response.save()
  
          // deleting the user's old user-dashboard as new dashboard assigned to the user
          await UserDashboard.findByIdAndDelete(alreadyAssignedUserRole.userDashboard)
  
          // decreasing the assigned count of previous dashboard 
          await Dashboard.findOneAndUpdate({_id:alreadyAssignedUserRole.assignedDashboard},{$inc: { used_count : -1}})
     
        }
      }
      await redisDB1.destroy(`${USER_PERMISSION_CACHE}:${response.email}`);
      return sendResponse(
        res,
        200,
        responseMessage.successfully_updated_the_user,
        response
      );
    } else {
      return errorResponse(
        res,
        400,
        responseMessage.wrong_user_id_provided,
        responseMessage.wrong_user_id_provided
      );
    }
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.deleteUser = async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return errorResponse(
        res,
        400,
        responseMessage.no_user_id_provided,
        responseMessage.no_user_id_provided
      );
    }
    const userIdCheck = await checkForValidUserId(userId);
    if (!userIdCheck) {
      return errorResponse(
        res,
        400,
        responseMessage.no_such_user_id_exist,
        responseMessage.no_such_user_id_exist
      );
    }

    const userBeforeDelete = await userModel.findOne({ _id: userId });
    if (userBeforeDelete?.isSuperAdmin) {
      return errorResponse(
        res,
        400,
        responseMessage.superAdmin_can_not_be_deleted,
        responseMessage.superAdmin_can_not_be_deleted
      );
    }
    const response = await userModel.findOneAndRemove({ _id: userId });

    if (response) {
      userBeforeDelete?.userRole?.forEach(async (role) => {
        await userRoleModel.findOneAndUpdate(
          { _id: role },
          { $inc: { userAssigned: -1 } }
        );
      });
      return sendResponse(
        res,
        200,
        responseMessage.user_deleted_successfully,
        response
      );
    }
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.changeUserStatus = async (req, res, next) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return errorResponse(
        res,
        400,
        responseMessage.no_user_id_provided,
        responseMessage.no_user_id_provided
      );
    }
    const { status } = req.body;
    if (!status) {
      return errorResponse(
        res,
        400,
        responseMessage.no_user_status_provided,
        responseMessage.no_user_status_provided
      );
    }
    const userIdCheck = await checkForValidUserId(userId);
    if (!userIdCheck) {
      return errorResponse(
        res,
        400,
        responseMessage.no_such_user_id_exist,
        responseMessage.no_such_user_id_exist
      );
    }

    const result = await userModel.updateOne(
      { _id: userId },
      { $set: { status: status } },
      { upsert: false, runValidators: true }
    );
    if (result)
      return sendResponse(
        res,
        200,
        responseMessage.user_status_changed_successfully,
        result
      );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

const checkForValidUserId = async (userId) => {
  const isAvailable = await userModel.findOne({ _id: userId });

  if (isAvailable) return true;
  else return false;
};

function validateUserDetails(userBody) {
  try {
    const schema = Joi.object({
      firstName: Joi.string().trim().required(),
      userName: Joi.string().trim().required(),
      lastName: Joi.string().trim().allow(""),
      email: Joi.string().min(5).trim().max(255).email().required(),
      mobile: Joi.string()
        .min(10)
        .max(10)
        .pattern(new RegExp(mobileValidateRegEx))
        .optional()
        .allow(""),
      // .messages({
      //   'string.base': 'Mobile number must be a string',
      //   'string.empty': 'Mobile number is required',
      //   'string.min': 'Mobile number must have at least {#limit} characters',
      //   'string.max': 'Mobile number must have at most {#limit} characters',
      //   'string.pattern.base': 'Mobile number must be a 10-digit numeric value',
      //   'any.required': 'Mobile number is required'
      // }),

      address: Joi.string().min(2).max(50).trim().optional().allow(""),
      state: Joi.string().min(2).max(50).trim().optional().allow(""),
      country: Joi.string().optional().allow("").min(2).max(50).trim(),
      gender: Joi.string()
        .trim()
        .valid("male", "female", "transgender", "notSpecify"),
      password: Joi.string().pattern(new RegExp(passwordValidateRegEx)),
      userRole: Joi.array().required(),
      assigndClients: Joi.array().required(),
      assignedDashboard:Joi.string().required(),
      isUserProfileCreated: Joi.allow(),
      isAdminApproved: Joi.allow(),
      isTourComplete: Joi.allow(),
      reportinManager: Joi.string().optional().allow('')
    });

    return schema.validate(userBody);
  } catch (err) {
    return res;
  }
}

async function sendMailToUser(res, response) {
  try {
    const randomString = generateRandomAlphanumeric(10);
    const filePath = path.resolve(
      __dirname,
      "..",
      "public",
      "files",
      "testa-logo.png"
    );
    const mailOptions = {
      from: {
        address: SENDER_EMAIL,
        name: "Testa",
      },
      to: response.email,
      host: "smtp.mailtrap.io",
      subject: "Create New Password for Testa",
      attachments: [
        {
          filename: "testa-logo.png",
          path: filePath, //"https://i.ibb.co/z4ZMDQj/testa-logo.png",
          cid: "testa-logo", //same cid value as in the html img src
        },
      ],

      //New template--->START<-----
      html: `
  <!DOCTYPE html>
  <html xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office" lang="en">
  
  <head>
    <title></title>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <!--[if mso]><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch><o:AllowPNG/></o:OfficeDocumentSettings></xml><![endif]--><!--[if !mso]><!-->
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@100;200;300;400;500;600;700;800;900"
      rel="stylesheet" type="text/css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@100;200;300;400;500;600;700;800;900"
      rel="stylesheet" type="text/css"><!--<![endif]-->
    <style>
      * {
        box-sizing: border-box;
      }
  
      body {
        margin: 0;
        padding: 0;
      }
  
      a[x-apple-data-detectors] {
        color: inherit !important;
        text-decoration: inherit !important;
      }
  
      #MessageViewBody a {
        color: inherit;
        text-decoration: none;
      }
  
      p {
        line-height: inherit
      }
  
      .desktop_hide,
      .desktop_hide table {
        mso-hide: all;
        display: none;
        max-height: 0px;
        overflow: hidden;
      }
  
      .image_block img+div {
        display: none;
      }
  
      @media (max-width:660px) {
        .desktop_hide table.icons-inner {
          display: inline-block !important;
        }
  
        .icons-inner {
          text-align: center;
        }
  
        .icons-inner td {
          margin: 0 auto;
        }
  
        .mobile_hide {
          display: none;
        }
  
        .row-content {
          width: 100% !important;
        }
  
        .stack .column {
          width: 100%;
          display: block;
        }
  
        .mobile_hide {
          min-height: 0;
          max-height: 0;
          max-width: 0;
          overflow: hidden;
          font-size: 0px;
        }
  
        .desktop_hide,
        .desktop_hide table {
          display: table !important;
          max-height: none !important;
        }
      }
    </style>
  </head>
  
  <body style="background-color: #f8f8f9; margin: 0; padding: 0; -webkit-text-size-adjust: none; text-size-adjust: none;">
    <table class="nl-container" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"
      style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; background-color: #f8f8f9;">
      <tbody>
        <tr>
          <td>
            <table class="row row-1" align="center" width="100%" border="0" cellpadding="0" cellspacing="0"
              role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
              <tbody>
                <tr>
                  <td>
                    <table class="row-content stack" align="center" border="0" cellpadding="0"
                      cellspacing="0" role="presentation"
                      style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; border-radius: 0; color: #000000; width: 640px; margin: 0 auto;"
                      width="640">
                      <tbody>
                        <tr>
                          <td class="column column-1" width="100%"
                            style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                            <table class="image_block block-1" width="100%" border="0"
                              cellpadding="10" cellspacing="0" role="presentation"
                              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                              <tr>
                                <td class="pad">
                                  <div class="alignment" align="center"
                                    style="line-height:10px">
                                    <div style="max-width: 80px;">
                                    <img src="cid:testa-logo" alt="testa-logo" border="0">
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
            <table class="row row-2" style="padding: 0 10px;" align="center" width="100%" border="0"
              cellpadding="0" cellspacing="0" role="presentation"
              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
              <tbody>
                <tr>
                  <td>
                    <table class="row-content stack" align="center" border="0" cellpadding="0"
                      cellspacing="0" role="presentation"
                      style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; background-color: #fff; width: 640px; margin: 0 auto;border-radius: 12px;"
                      width="640">
                      <tbody>
                        <tr>
                          <td class="column column-1" width="100%"
                            style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                            <table class="divider_block block-1" width="100%" border="0"
                              cellpadding="0" cellspacing="0" role="presentation"
                              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                              <tr>
                                <td class="pad" style="padding-top:30px;">
                                  <div class="alignment" align="center">
                                    <table border="0" cellpadding="0" cellspacing="0"
                                      role="presentation" width="100%"
                                      style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                      <tr>
                                        <td class="divider_inner"
                                          style="font-size: 1px; line-height: 1px; border-top: 0px solid #BBBBBB;">
                                          <span>&#8202;</span>
                                        </td>
                                      </tr>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <table class="paragraph_block block-2" width="100%" border="0"
                              cellpadding="0" cellspacing="0" role="presentation"
                              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                              <tr>
                                <td class="pad"
                                  style="padding-bottom:10px;padding-left:15px;padding-right:15px;padding-top:10px;">
                                  <div
                                    style="color:#1f1f1f;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:24px;font-weight:400;line-height:120%;text-align:left;mso-line-height-alt:28.799999999999997px;">
                                    <p style="margin: 0; word-break: break-word;">
                                      <strong>Welcome to Testa</strong> 👋
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <table class="paragraph_block block-3" width="100%" border="0"
                              cellpadding="0" cellspacing="0" role="presentation"
                              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                              <tr>
                                <td class="pad"
                                  style="padding-bottom:10px;padding-left:15px;padding-right:15px;padding-top:10px;">
                                  <div
                                    style="color:#333333;direction:ltr;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:13px;font-weight:400;letter-spacing:0px;line-height:120%;text-align:left;mso-line-height-alt:15.6px;">
                                    <p style="margin: 0;">Hi <span> ${response.firstName} ${response.lastName},</span></p>
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <table class="paragraph_block block-4" width="100%" border="0"
                              cellpadding="0" cellspacing="0" role="presentation"
                              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                              <tr>
                                <td class="pad"
                                  style="padding-bottom:10px;padding-left:15px;padding-right:15px;padding-top:10px;">
                                  <div
                                    style="color:#333333;direction:ltr;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:13px;font-weight:400;letter-spacing:0px;line-height:120%;text-align:left;mso-line-height-alt:16.8px;">
                                    <p style="margin: 0; margin-bottom: 12px;">Your
                                      system administrator has created an user account
                                      for you.</p>
                                    <p style="margin: 0;font-weight: 600;">Click the
                                      following
                                      link to Reset Password:
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <table class="paragraph_block block-5" width="100%" border="0"
                              cellpadding="0" cellspacing="0" role="presentation"
                              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                              <tr>
                                <td class="pad"
                                  style="padding-bottom:10px;padding-left:15px;padding-right:15px;padding-top:10px;">
                                  <div
                                    style="color:#333333;direction:ltr;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:13px;font-weight:400;letter-spacing:0px;line-height:120%;text-align:left;mso-line-height-alt:16.8px;">
                                    <p style="margin: 0; margin-bottom: 12px;">Username:
                                      <span style="font-weight: 600;">  ${response.firstName} ${response.lastName}
                                      </span>
                                    </p>
                                    <p style="margin: 0; margin-bottom: 12px;">Password:
                                      <span
                                        style="font-weight: 600;">${randomString}</span>
                                    </p>
                                    <p style="margin: 0;">Link: <span
                                        style="color: #007bff;"><u><a
                                            href=${BASE_FRONTEND_URL}/reset-password
                                            target="_blank"
                                            style="text-decoration: underline; color: #7747ff;"
                                            rel="noopener"><span
                                              style="color: #007bff;"><u>${BASE_FRONTEND_URL}/reset-password</u></span></a></u></span>
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <table class="divider_block block-6" width="100%" border="0"
                              cellpadding="0" cellspacing="0" role="presentation"
                              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                              <tr>
                                <td class="pad" style="padding-top:30px;">
                                  <div class="alignment" align="center">
                                    <table border="0" cellpadding="0" cellspacing="0"
                                      role="presentation" width="100%"
                                      style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                      <tr>
                                        <td class="divider_inner"
                                          style="font-size: 1px; line-height: 1px; border-top: 0px solid #BBBBBB;">
                                          <span>&#8202;</span>
                                        </td>
                                      </tr>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <table class="paragraph_block block-7" width="100%" border="0"
                              cellpadding="0" cellspacing="0" role="presentation"
                              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                              <tr>
                                <td class="pad"
                                  style="padding-bottom:10px;padding-left:15px;padding-right:15px;padding-top:10px;">
                                  <div
                                    style="color:#333333;direction:ltr;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:13px;font-weight:400;letter-spacing:0px;line-height:120%;text-align:left;mso-line-height-alt:16.8px;">
                                    <p style="margin: 0; margin-bottom: 12px;">If you
                                      experience difficulties accessing your account,
                                      you can contact to admin.</p>
                                    <p style="margin: 0;">Link : <u><span
                                          style="color: #007bff;"><a
                                            href="https://helpdesk@testaonline.com"
                                            target="_blank"
                                            style="text-decoration: underline; color: #007bff;"
                                            rel="noopener">https://helpdesk@testaonline.com</a></span></u>
                                    </p>
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <table class="paragraph_block block-8" width="100%" border="0"
                              cellpadding="0" cellspacing="0" role="presentation"
                              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                              <tr>
                                <td class="pad"
                                  style="padding-bottom:10px;padding-left:15px;padding-right:15px;padding-top:10px;">
                                  <div
                                    style="color:#333333;direction:ltr;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:13px;font-weight:400;letter-spacing:0px;line-height:150%;text-align:left;mso-line-height-alt:21px;">
                                    <p style="margin: 0;">Thank you,<br>Testa Team</p>
                                  </div>
                                </td>
                              </tr>
                            </table>
                            <table class="divider_block block-9" width="100%" border="0"
                              cellpadding="0" cellspacing="0" role="presentation"
                              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                              <tr>
                                <td class="pad" style="padding-top:30px;">
                                  <div class="alignment" align="center">
                                    <table border="0" cellpadding="0" cellspacing="0"
                                      role="presentation" width="100%"
                                      style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
                                      <tr>
                                        <td class="divider_inner"
                                          style="font-size: 1px; line-height: 1px; border-top: 0px solid #BBBBBB;">
                                          <span>&#8202;</span>
                                        </td>
                                      </tr>
                                    </table>
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
            <table class="row row-3" align="center" width="100%" border="0" cellpadding="0" cellspacing="0"
              role="presentation" style="mso-table-lspace: 0pt; mso-table-rspace: 0pt;">
              <tbody>
                <tr>
                  <td>
                    <table class="row-content stack" align="center" border="0" cellpadding="0"
                      cellspacing="0" role="presentation"
                      style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; color: #000000; width: 640px; margin: 0 auto;"
                      width="640">
                      <tbody>
                        <tr>
                          <td class="column column-1" width="100%"
                            style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; font-weight: 400; text-align: left; vertical-align: top; border-top: 0px; border-right: 0px; border-bottom: 0px; border-left: 0px;">
                            <table class="paragraph_block block-1" width="100%" border="0"
                              cellpadding="0" cellspacing="0" role="presentation"
                              style="mso-table-lspace: 0pt; mso-table-rspace: 0pt; word-break: break-word;">
                              <tr>
                                <td class="pad"
                                  style="padding-bottom:30px;padding-left:40px;padding-right:40px;padding-top:20px;">
                                  <div
                                    style="color:#555555;font-family:'Poppins', Arial, Helvetica, sans-serif;font-size:11px;font-weight:400;line-height:180%;text-align:center;mso-line-height-alt:19.8px;">
                                    <p style="margin: 0; word-break: break-word;">
                                      Radiant Infonet, 901 Bhikaji Cama Place, Delhi
                                      110066
                                    </p>
                                    <p style="margin: 0; word-break: break-word;">
                                      Powered by testaonline.com</p>
                                  </div>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </td>
                </tr>
              </tbody>
            </table>
          </td>
        </tr>
      </tbody>
    </table><!-- End -->
  </body>
  
  </html>`,
      //------>END<------
    };


     //Using MSZ91 SMTP 
   const transporter = nodemailer.createTransport({
     host: MSZ91_HOST, 
     port: MSZ91_PORT, 
     secure: false, 
     auth: {
       user: MSZ91_USER, 
       pass: MSZ91_PASS, 
     },
   });


    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.log('error--->', error)
        return errorResponse(
          res,
          500,
          responseMessage.something_wrong,
          error.message
        );
      } else {
        if (info.accepted && info.accepted.length > 0) {
          const salt = await bcrypt.genSalt(8);
          const hashPassword = await bcrypt.hash(randomString, salt);
          await userModel.updateOne(
            { _id: response._id },
            {
              $set: { isPasswordChangeEmailSend: true, password: hashPassword },
            },
            { upsert: false, runValidators: true }
          );
          return sendResponse(
            res,
            200,
            responseMessage.successfully_created_new_user,
            response
          );
        } else {
          return errorResponse(
            res,
            400,
            "Unable to send initial password email",
            "Unable to send initial password email"
          );
        }
      }
    });
  } catch (error) {
    console.log('')
    return errorResponse(
      res,
      500,
      "Oops! Something went wrong here...",
      error.message
    );
  }
}

function mergeArrays(arrayA, arrayB) {
  const mergedArray = arrayA.map((itemA) => {
    const matchingItemB = arrayB.find(
      (itemB) => itemB.featureName === itemA.featureName
    );

    if (matchingItemB) {
      return mergeObjects(itemA, matchingItemB);
    } else {
      // console.log("itemA-->", itemA)
      // console.log("{...itemA} --> ", { ...itemA})

      return { ...itemA };
    }
  });

  return mergedArray;
}

function mergeObjects(obj1, obj2) {
  const merged = { ...obj1 };

  for (const key in obj2) {
    if (typeof obj2[key] === "object" && !Array.isArray(obj2[key])) {
      // Merge nested objects
      merged[key] = { ...obj1[key], ...obj2[key] };
    } else if (
      key === "subFeatures" &&
      Array.isArray(obj1[key]) &&
      Array.isArray(obj2[key])
    ) {
      // Merge subFeatures
      const subFeatureMap = new Map();

      for (const subFeature of obj1[key]) {
        subFeatureMap.set(subFeature.subFeatureName, subFeature);
      }

      for (const subFeature of obj2[key]) {
        const existingSubFeature = subFeatureMap.get(subFeature.subFeatureName);
        if (existingSubFeature) {
          subFeatureMap.set(subFeature.subFeatureName, {
            ...existingSubFeature,
            ...subFeature,
          });
        } else {
          subFeatureMap.set(subFeature.subFeatureName, subFeature);
        }
      }

      merged[key] = [...subFeatureMap.values()];
    } else {
      // Copy other properties directly
      merged[key] = obj2[key];
    }
  }

  return merged;
}

exports.passwordReset = async (req, res, next) => {
  try {
    const { email, oldPassword, newPassword } = req.body;

    const user = await userModel.findOne({ email: { $regex: new RegExp('^' + email + '$', "i") } });

    if (email && oldPassword && newPassword) {
      if (!user)
        return errorResponse(
          res,
          404,
          responseMessage.user_not_found,
          responseMessage.errorMessage
        );

      const isValidPassword = await bcrypt.compare(oldPassword, user.password);

      if (!isValidPassword)
        return errorResponse(
          res,
          400,
          responseMessage.enter_old_password,
          responseMessage.errorMessage
        );

      let checkNewPassword = validatePassword(newPassword);

      if (!checkNewPassword)
        return errorResponse(
          res,
          400,
          responseMessage.password_invalid,
          responseMessage.errorMessage
        );

      let checkComparePassword = comparePassword(oldPassword, newPassword);

      if (checkComparePassword)
        return errorResponse(
          res,
          400,
          responseMessage.new_password_not_same_as_old_password,
          responseMessage.errorMessage
        );

      const salt = await bcrypt.genSalt(8);

      const hashPassword = await bcrypt.hash(newPassword, salt);

      user.password = hashPassword;
      user.isInitialPasswordChanged = true;

      const updatedUser = await user.save();

      if (!updatedUser)
        return errorResponse(
          res,
          400,
          "Not able to update password",
          "Not able to update password"
        );

      let responseData = {
        _id: updatedUser._id,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
      };

      return sendResponse(
        res,
        200,
        responseMessage.password_change_success,
        responseData
      );
    } else {
      return errorResponse(
        res,
        400,
        "something is missing in the password reset form"
      );
    }
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

function comparePassword(oldPass, newPass) {
  return oldPass !== newPass ? false : true;
}

exports.userLogin = async (req, res, next) => {
  try {
    const { email, password, device, browser, latitude, longitude, addreiss, sToken } =
      req.body;
    if (!email || !password) {
      return errorResponse(res, 400, "email or password not provided");
    }
    if (!device || !browser)
      return errorResponse(
        res,
        400,
        "Device details required",
        "Device details required"
      );

    // Verify reCAPTCHA first
    // const isValidCaptcha = await verifyCaptcha(sToken, 'admin_login');
    // if (!isValidCaptcha) {
    //   return errorResponse(res, 400, responseMessage.invalid_captcha, responseMessage.invalid_captcha);
    // }

    const response = await userModel
      .findOne({ email: email })
      .populate([{path: "assigndClients", select: "-spoke -email -mobile -landLine"}, "userRole"])
      .populate(
        {path: "userDashboard", select: "_id dashboard_id components", populate: {path: "components.componentId" , select: " "}}
      );

    if (response) {
      if (response.status === "inactive") {
        return errorResponse(
          res,
          400,
          responseMessage.user_not_enabled,
          responseMessage.user_not_enabled
        );
      }

      // Check if account should be auto-unlocked
      if (shouldAutoUnlock(response)) {
        const unlockFields = handleSuccessfulLogin(response);
        await userModel.findByIdAndUpdate(response._id, unlockFields);
        response.isAccountLocked = false;
        response.lockoutExpiry = null;
      }

      // Check account lockout status
      const lockoutStatus = checkAccountLockout(response);
      if (lockoutStatus.isLocked) {
        const message = getLockoutMessage(lockoutStatus);
        return errorResponse(res, 423, message, { 
          // remainingTime: lockoutStatus.remainingTime,
          isAccountLocked: true 
        });
      }

      const isPasswordValid = await bcrypt.compare(password, response.password);


      if (!isPasswordValid) {

         // Failed login - handle lockout logic
         const failureResult = handleFailedLogin(response);
         await userModel.findByIdAndUpdate(response._id, failureResult.updateFields);
 
         const message = getLockoutMessage(failureResult);
         const statusCode = failureResult.isLocked ? 423 : 400;
         
         return errorResponse(res, statusCode, message, {
          //  remainingAttempts: failureResult.remainingAttempts,
           isAccountLocked: failureResult.isLocked,
           lockoutDuration: failureResult.lockoutDuration
         });
      }

      //stop user from login through temp password
      if (!response.isInitialPasswordChanged) {
        return errorResponse(
          res,
          400,
          "Please reset your password.",
          "Please reset your password"
        );
      }

      let query = { $and: [{ userId: response._id }, { ipAddress: addreiss }] };
      let deviceDetails = await DeviceManager.findOne(query);
      console.log("deviceDetails", deviceDetails);
      if (deviceDetails == null) {
        deviceDetails = await new DeviceManager({
          device,
          browser,
          latitude,
          longitude,
          ipAddress: addreiss,
          isDeviceLogin: true,
          userId: response.id,
          lastSession: new Date(),
        }).save();
      }

      // user role and permission 
      const transformedUserRole = await getPersmission(response.userRole)

      // Successful login - reset failed attempts
      const successFields = handleSuccessfulLogin(response);
      await userModel.findByIdAndUpdate(response._id, successFields);
      response.isAccountLocked = false;
      response.lockoutExpiry = null;

      const plainResponse = JSON.parse(JSON.stringify(response));

      const newResponse = {
        ...plainResponse,
      };

      delete newResponse.mobile
      delete newResponse.phoneNumber
      delete newResponse.password
      delete newResponse.email
      delete newResponse.workEmail
      delete newResponse.workNumber
      delete newResponse.education
      delete newResponse.personalDetail
      delete newResponse.currentAddress
      delete newResponse.experiences
      delete newResponse.permanentAddress
      delete newResponse.assigndClients
      delete newResponse.bloodGroup
      delete newResponse.designation
      delete newResponse.dob
      delete newResponse.nationality
      delete newResponse.aboutJob
      delete newResponse.jobDescription
      delete newResponse.jobInterest
      delete newResponse.maritalStatus
      delete newResponse.homeNumber
      delete newResponse.teamId
      delete newResponse.passwordResetUsed
      delete newResponse.failedLoginAttempts
      delete newResponse.isAccountLocked
      delete newResponse.lastFailedLogin
      delete newResponse.lockoutExpiry
      delete newResponse.lastResetRequest
      delete newResponse.passwordResetAttempts
      delete newResponse.resetToken
      delete newResponse.resetTokenExpiry
      delete newResponse.resetTokenUsed
      delete newResponse.lastPasswordReset
      delete newResponse.reportinManager
      delete newResponse.isSuperAdmin

      const finalResponse = {
        ...newResponse,
        userRole: transformedUserRole,
        deviceId: deviceDetails?._id,
        // latitide: deviceDetails?.latitude,
        // longitude: deviceDetails?.longitude,
        // ipAddress: deviceDetails?.ipAddress, 
        // device: deviceDetails?.device,
        // userId: deviceDetails?.userId,
        // browser: deviceDetails?.browser,
        // isDeviceLogin: deviceDetails?.isDeviceLogin,
        token: jwt.sign({ email: response.email, ip: addreiss, id: response._id }, JWT_SECRET, {
          expiresIn: "1d",
        }),
      };

      return sendResponse(
        res,
        200,
        responseMessage.user_login_success,
        finalResponse
      );
    } else {
      return errorResponse(res, 400, responseMessage.invalid_credential, responseMessage.invalid_credential);
    }
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};
exports.logOutFromDevice = async (req, res, next) => {
  const {
    userId,
    deviceId,
    isAllLogout,
    addreiss,
    isSimpleLogOut = false,
    alsoFromCurrentDevice = false
  } = req.body;
  if (isAllLogout == false && !deviceId)
    return errorResponse(
      res,
      400,
      "DeviceId field required",
      "DeviceId field required"
    );
  if (!userId || (isAllLogout ? "" : !deviceId)) {
    return errorResponse(
      res,
      400,
      "this field required",
      "this field required"
    );
  }
  let query = {};

  if (isAllLogout) {
    if(alsoFromCurrentDevice) {
      query = { $and: [{ userId }] };
    }else {
      query = { $and: [{ userId }, { ipAddress: { $ne: addreiss } }] };
    }
  } else {
    query = { $and: [{ _id: deviceId }, { ipAddress: { $ne: addreiss } }] };
  }
  if (isSimpleLogOut) {
    await DeviceManager.deleteOne({ _id: deviceId });
    const token = req.header("x-auth-token");
    const decoded = jwt.decode(token);
    
    const expiryInSec = decoded.exp - Math.floor(Date.now() / 1000); // in seconds
    console.log("expiryInSec", expiryInSec, decoded.exp);
    if (expiryInSec > 0) {
      await redisDB4.set(
        `blacklist_${token}`,
        BLACK_LIST_TOKENS,
        expiryInSec
      );
    }
    return sendResponse(res, 200, "Logout successfully from other device");
  }
  const deviceDetails = await DeviceManager.find(query);

  if (deviceDetails.length > 0) {
    await DeviceManager.deleteMany(query);
  }
  const sameDeviceDetails =
    isAllLogout == false
      ? await DeviceManager.findOne({
          $and: [{ ipAddress: addreiss }, { _id: deviceId }],
        })
      : null;
  if (sameDeviceDetails != null && isAllLogout == false)
    return errorResponse(
      res,
      400,
      "Could not logout from same device",
      "Could not logout from same device"
    );

    const token = req.header("x-auth-token");
    const decoded = jwt.decode(token);
    
    const expiryInSec = decoded.exp - Math.floor(Date.now() / 1000); // in seconds
    console.log("expiryInSec", expiryInSec, decoded.exp);
    if (expiryInSec > 0) {
      await redisDB4.set(
        `blacklist_${token}`,
        BLACK_LIST_TOKENS,
        expiryInSec
      );
    }
  return sendResponse(res, 200, "Logout successfully from other device");
};
exports.getuserPermissions = async (req, res) => {
  try {
    const { user } = req;
    const redisKey = `${USER_PERMISSION_CACHE}:${user.email}`;

    const cached = await redisDB1.get(redisKey);
    
    if (cached) {
      return sendResponse(res, 200, "", cached, true);
    }

    const userData = await userModel
      .findOne({ email: user.email }).select("-userName -password -email -mobile -isPasswordChangeEmailSend")
      .populate([{path: "assigndClients", select: "-email -mobile -spoke.spoke_email -spoke.spoke_mobile"}, "userRole"])
      .populate(
        {path: "userDashboard", select: "_id dashboard_id components", populate: {path: "components.componentId" , select: " "}}
      )
      .lean();

    if (!userData) {
      return errorResponse(res, 400, "No such user exists");
    }

    const roleFeatures = userData.userRole || [];
    const mergedResultsArray = [];

    roleFeatures.forEach((role) => {
      (role.features || []).forEach((feature) => {
        const existing = mergedResultsArray.find(f => f.featureName === feature.featureName);
        if (!existing) {
          mergedResultsArray.push({ ...feature });
        } else {
          existing.enabled = existing.enabled || feature.enabled;

          feature.subFeatures.forEach((sub) => {
            const match = existing.subFeatures.find(s => s.subFeatureName === sub.subFeatureName);
            if (match) {
              match.permissions = mergePermissions(match.permissions, sub.permissions);
            } else {
              existing.subFeatures.push(sub);
            }
          });
        }
      });
    });

    const mergedFeatures = mergeArrays(featureList, mergedResultsArray);

    const transformedUserRole = transformUserRole(mergedFeatures);

    const finalResponse = {
      ...userData,
      userRole: transformedUserRole,
    };
    delete finalResponse.password;

    // ✅ Step 6: Cache it
    await redisDB1.set(redisKey, finalResponse, process.env.REDIS_DEFAULT_EXPIRY * 12);

    return sendResponse(res, 200, "", finalResponse);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.something_wrong, error.message);
  }
};

exports.getUserDetails = async (req, res) => {
  try {
    const response = await userModel
      .findOne({ email: req.user.email })
      .populate(["assigndClients", "userRole"]);

    if (response) {
      const resultArray = JSON.parse(JSON.stringify(response.userRole));

      const mergedResultsArray = [];

      resultArray.forEach((resultObject) => {
        const features = resultObject.features;

        features.forEach((feature) => {
          const existingFeature = mergedResultsArray.find(
            (mergedFeature) => mergedFeature.featureName === feature.featureName
          );

          if (!existingFeature) {
            // if the feature doesn't exist in the mergedResultsArray, add it
            mergedResultsArray.push({
              featureName: feature.featureName,
              enabled: feature.enabled,
              subFeatures: feature.subFeatures,
            });
          } else {
            // if the feature already exists in the mergedResultsArray, update it
            existingFeature.enabled =
              existingFeature.enabled || feature.enabled;

            // merge subFeatures by comparing and updating permissions
            feature.subFeatures.forEach((subFeature) => {
              const matchingSubFeature = existingFeature.subFeatures.find(
                (existingSubFeature) =>
                  existingSubFeature.subFeatureName ===
                  subFeature.subFeatureName
              );

              if (matchingSubFeature) {
                // Merge permissions for the matching subFeature
                matchingSubFeature.permissions = mergePermissions(
                  matchingSubFeature.permissions,
                  subFeature.permissions
                );
              } else {
                // if subFeature doesn't exist, add it
                existingFeature.subFeatures.push(subFeature);
              }
            });
          }
        });
      });

      // function to merge permissions for two subFeatures
      function mergePermissions(existingPermissions, newPermissions) {
        // set a permission to true if it's true in either set of permissions
        return Object.keys(newPermissions).reduce((merged, permission) => {
          merged[permission] =
            existingPermissions[permission] || newPermissions[permission];
          return merged;
        }, existingPermissions);
      }

      const arrayC = mergeArrays(featureList, mergedResultsArray);

      function convertStringToFormat(inputString) {
        return inputString
          .split(" ")
          .map((word) => word.substr(0, 2).toUpperCase())
          .join("");
      }

      function convertPermissions(permissions) {
        const convertedPermissions = {};
        for (const key in permissions) {
          let newKey;
          switch (key) {
            case "view":
              newKey = "1";
              break;
            case "add":
              newKey = "2";
              break;
            case "edit":
              newKey = "3";
              break;
            case "delete":
              newKey = "4";
              break;
            case "export":
              newKey = "5";
              break;
            case "status":
              newKey = "6";
              break;
            default:
              newKey = key; // Keep the key as is if not recognized
          }
          convertedPermissions[newKey] = permissions[key];
        }
        return convertedPermissions;
      }

      // to change the userRole obj with short forms
      const transformedUserRole = arrayC.map((role) => {
        const featureName = convertStringToFormat(role.featureName);
        const subFeatures = role.subFeatures.map((subFeature) => ({
          subFeatureName: convertStringToFormat(subFeature.subFeatureName),
          enabled: subFeature.enabled,
          permissions: convertPermissions(subFeature.permissions),
        }));
        return {
          featureName,
          enabled: role.enabled,
          subFeatures,
        };
      });

      const plainResponse = JSON.parse(JSON.stringify(response));
      const newResponse = {
        ...plainResponse,
        userRole: transformedUserRole,
        token: jwt.sign({ email: response.email }, JWT_SECRET, {
          expiresIn: "1d",
        }),
      };
      delete newResponse.password;

      return sendResponse(
        res,
        200,
        responseMessage.user_login_success,
        newResponse
      );
    } else {
      return errorResponse(res, 400, "no such user exist");
    }
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.updateDeviceInfo = async (req, res) => {
  try {
    const {
      ipAddress,
      userId,
      isDeviceLogin = true,
      device,
      latitude,
      longitude,
      deviceId,
    } = req.body;
    if (
      !ipAddress ||
      !userId ||
      !device ||
      !latitude ||
      !longitude ||
      !deviceId
    ) {
      return errorResponse(
        res,
        400,
        "Please provide all the required device info",
        "Please provide all the required device info"
      );
    }
    let query = { $and: [{ userId }, { ipAddress }] };
    const updatedData = await DeviceManager.findOneAndUpdate(
      query,
      {
        isDeviceLogin,
        device: deviceId,
        latitude,
        longitude,
        lastSession: new Date(),
        browser: device,
      },
      { new: true, runValidators: true }
    );
    if (!updatedData) {
      return errorResponse(
        res,
        400,
        "Issue while updating the device info",
        "Issue while updating the device info"
      );
    }
    return sendResponse(res, 200, "Data updated successfully", updatedData);
  } catch (error) {
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

// Unlock admin user account functionality
exports.unlockAdminUserAccount = async (req, res) => {

  console.log("req.params3", req.params)
  try {
    const userId = req.params.id;
    
    if (!userId) {
      return errorResponse(res, 400, "User ID is required", responseMessage.errorMessage);
    }

    const user = await userModel.findById(userId);
    if (!user) {
      return errorResponse(res, 404, responseMessage.user_not_exist, responseMessage.errorMessage);
    }

    // Check if account is actually locked
    if (!user.isAccountLocked) {
      return errorResponse(res, 400, "Account is not locked", responseMessage.errorMessage);
    }

    // Unlock the account
    const updatedUser = await userModel.findByIdAndUpdate(
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
