const UserProfile = require("../models/userProfile-model");
const CommonUsers = require("../models/common-user-model");
const { sendResponse, errorResponse } = require("../utils/response");
const Subadminprofile = require("../models/subadminModel");
const AdminProfile = require("../models/superAdminModel");
const responseMessage = require('../utils/responseMessage');
const DashboardNotification = require("../models/notification-model");
const { setDashboardNotification } = require("../utils/custom-validators");

exports.tour = async (req, res) => {

    try {

        const getUserId = req.params.id;

        const findUserType = await CommonUsers.findById(getUserId);

        if (!findUserType) return errorResponse(res, 400, responseMessage.user_not_found, responseMessage.errorMessage);

        if (findUserType.isTourComplete) return errorResponse(res, 400, "web tour already completed", responseMessage.errorMessage);

        if (findUserType.isTourComplete === undefined) findUserType.isTourComplete = false;

        const reqUserType = findUserType.userType;

        switch (reqUserType) {
            case 1:
                const adminUser = await AdminProfile.findOneAndUpdate({ email: findUserType.email }, { isTourComplete: true }, { new: true });
                if (!adminUser) {
                    return errorResponse(res, 404, responseMessage.user_not_found, responseMessage.errorMessage);
                } else {
                    findUserType.isTourComplete = true;
                    await findUserType.save();
                    await setDashboardNotification(`${findUserType.firstName} ${findUserType.lastName} completed web tour`);
                    return sendResponse(res, 200, "admin tour update successfully", adminUser);
                }
            case 2:
                const subadminUser = await Subadminprofile.findOneAndUpdate({ email: findUserType.email }, { isTourComplete: true }, { new: true });
                if (!subadminUser) {
                    return errorResponse(res, 404, responseMessage.user_not_found, responseMessage.errorMessage);
                } else {
                    findUserType.isTourComplete = true;
                    await findUserType.save();
                    await setDashboardNotification(`${findUserType.firstName} ${findUserType.lastName} completed web tour`);
                    return sendResponse(res, 200, "client tour update successfully", subadminUser);
                }
            case 4:
            case 5:
                const user = await UserProfile.findOneAndUpdate({ email: findUserType.email }, { isTourComplete: true }, { new: true });
                if (!user) {
                    return errorResponse(res, 404, responseMessage.user_not_found, responseMessage.errorMessage);
                } else {
                    findUserType.isTourComplete = true;
                    await findUserType.save();
                    await setDashboardNotification(`${findUserType.firstName} ${findUserType.lastName} completed web tour`);
                    return sendResponse(res, 200, "User tour update successfully", user);
                }
            default:
                return errorResponse(res, 400, responseMessage.user_type_invalid, responseMessage.errorMessage);
        }

    } catch (error) {

        return errorResponse(res, 500, responseMessage.errorMessage, error.message);

    }
}


exports.updateTour = async (req, res) => {

    try {

        const user = await CommonUsers.findByIdAndUpdate(req.params.id, { isTourComplete: req.body.value }, { new: true });

        if (!user) return errorResponse(res, 400, responseMessage.user_not_found, responseMessage.errorMessage);

        return sendResponse(res, 200, "User tour update successfully", user);

    } catch (error) {
        return errorResponse(res, 500, responseMessage.errorMessage, error.message);
    }
}

