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
const DeviceManager = require("../models/device-manager-model");
const bcrypt = require("bcryptjs");
const { Paginate } = require("../utils/paginate");
const reader = require("xlsx");
const responseMessage = require("../utils/responseMessage");
const { sendResponse, errorResponse } = require("../utils/response");
const URL = require("url").URL;
const { getFilter } = require("../utils/custom-validators");
const getAddressUsingLatLng = require("../utils/getAddress");

module.exports.addDeviceDetails = async (req, res) => {
  try {
    let { device, browser, ipAddress, userId, location, lastSession } =
      req.body;

    const saveDeviceDetails = await new DeviceManager({
      device,
      browser,
      ipAddress,
      userId,
      location,
      lastSession,
    }).save();

    if (saveDeviceDetails)
      return sendResponse(
        res,
        200,
        "Device Details Save Successfully",
        saveDeviceDetails
      );
    if (!saveDeviceDetails)
      return errorResponse(
        res,
        404,
        "Device list not saved",
        responseMessage.errorMessage
      );
  } catch (err) {
    console.log("err", error);
    return errorResponse(res, 500, err, responseMessage.errorMessage);
  }
};
module.exports.DeviceList = async (req, res) => {
  try {
    let { userId } = req.query;
    const { page, limit, skip, sortOrder } = Paginate(req);

    let query = { userId };

    const totalCounts = await DeviceManager.countDocuments(query);

    const totalPages = Math.ceil(totalCounts / limit);
    const deviceDetails = await DeviceManager.find(query)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit)
      .lean();

    if (!deviceDetails)
      return errorResponse(
        res,
        404,
        "Device list not found",
        responseMessage.errorMessage
      );

    for (let detail of deviceDetails) {
      detail["addressName"] = await getAddressUsingLatLng(
        Number(detail.latitude),
        Number(detail.longitude)
      );
    }

    return sendResponse(res, 200, "Device Details Fetch Successfully", {
      deviceDetails,
      page,
      totalCounts,
      totalPages,
    });
  } catch (err) {
    console.log("err", err);
    return errorResponse(res, 500, err, responseMessage.errorMessage);
  }
};
