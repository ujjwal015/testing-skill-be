const ClientModel = require("../models/client-model")
const AssignmentModel = require("../models/createAssesment-model")
const LeadModel = require("../models/userdemo-model")
const { errorResponse, sendResponse } = require("../utils/response")
const responseMessage = require("../utils/responseMessage")
const { Paginate } = require("../utils/paginate")
const Assignment = require("../models/assignment-model");
const { getFileUrl } = require("../utils/s3bucket")
const { months, monthResponse } = require('../utils/custom-validators');

exports.getUpcomingAssignment = async (req, res) => {

    try {

        if (req.body) {

            const startDate = new Date(req.body.startDate);

            const endDate = new Date(req.body.endDate);

            if (startDate > endDate) {

                return errorResponse(res, 400, "End date is not valid", "End date should after than start date");

            }

            const getAssignmentData = await Assignment.find({ createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } });

            if (getAssignmentData) {

                return sendResponse(res, 200, "upcoming assessment get successfully", getAssignmentData);

            } else {

                return sendResponse(res, 200, "upcoming assessment is empty", []);

            }

        } else {

            let responseData = {
                isVisible: req.body.isVisible,
                assessmentDetail: []
            }
            return sendResponse(res, 200, "upcoming assessment is not visible", responseData);
        }
    } catch (error) {
        return errorResponse(res, 500, responseMessage.errorMessage, error.message);
    }
};
exports.listOfAllClients = async (req, res, next) => {

    try {

        const { page, limit, skip, sortOrder } = Paginate(req);

        const totalCounts = await ClientModel.countDocuments({});
        const totalPages = Math.ceil(totalCounts / limit);

        const response = await ClientModel.find({}, { password: 0 }).sort(sortOrder).skip(skip).limit(limit)

        if (!response) {
            return errorResponse(res, 404, responseMessage.no_client_found, responseMessage.no_client_found)
        }

        const newArr = response.map((data) => {

            if (data.isProfilePicUploaded === true) {

                return getFileUrl(data)
            }

            else {
                const { clientname, _id,
                    address ,
                    client_city,
                    clientcode ,
                    email ,
                    mobile,
                    organisationType ,
                    pincode ,
                    state,
                    client_status,
                    isProfilePicUploaded,
                    spoke ,
                    webpage } = data

                const newData = { clientname, _id,
                    address ,
                    client_city,
                    clientcode ,
                    email ,
                    mobile,
                    organisationType ,
                    pincode ,
                    state,
                    client_status,
                    isProfilePicUploaded,
                    spoke,
                    webpage,
                    url: null } 

                return newData
            }

        })

        Promise.all(newArr).then((result) => {
            return sendResponse(res, 200, responseMessage.client_profile_get,
                { result, page, totalCounts, totalPages })

        }).catch((err) => {
            return errorResponse(res, 422, responseMessage.image_not_found, responseMessage.image_not_found)
        })

        //return sendResponse(res, 200, responseMessage.client_details_available, {response, page, totalPages, totalCounts})

    } catch (error) {

        return errorResponse(res, 400, responseMessage.something_wrong, error.message)
    }
}

exports.clientsByOrganisationType = async (req, res, next) => {

    try {

        const response = await ClientModel.aggregate([
            {
                $group: {
                    _id: "$organisationType",
                    count: { $sum: 1 }
                }
            }
        ])

        const response2 = await ClientModel.countDocuments()


        if (!response && !response2) {
            return errorResponse(res, 404, responseMessage.no_client_found, responseMessage.no_client_found)
        }

        return sendResponse(res, 200, responseMessage.client_details_available, { categorziedData: response, totalClient: response2 })

    } catch (error) {

        return errorResponse(res, 400, responseMessage.something_wrong, error.message)
    }
}

exports.clientsByMonth = async (req, res, next) => {

    try {

        const response = await ClientModel.aggregate([
            { $project: { month: { $month: "$createdAt" } } },
            { $group: { _id: "$month", monthNumber: { $first: "$month" }, value: { $sum: 1 } } },

        ])
        // maping response month no with months name
        monthResponse.forEach((value) => {

            response.map(data => {

                if (data.monthNumber === value.monthNo) {
                    value.value = data.value

                }
            })
        })


        if (!response) {
            return errorResponse(res, 404, responseMessage.no_client_found, responseMessage.no_client_found)
        }

        return sendResponse(res, 200, responseMessage.client_details_available, monthResponse)

    } catch (error) {

        return errorResponse(res, 400, responseMessage.something_wrong, error.message)
    }
}

exports.bdaWidgetStats = async (req, res, next) => {
    try {
        // onboardingClients
        const onboardingClients = await ClientModel.countDocuments({ client_status: 'Inactive' })
  

        //activeClients
        const activeClients = await ClientModel.countDocuments({ client_status: 'Active' })

        //totalAssessments
        const totalAssessments = await AssignmentModel.countDocuments()

        //activeLeads
        const activeLeads = await LeadModel.countDocuments({ status: 'active' })


        return sendResponse(res, 200, "details available",
            {
                onboardingClients: onboardingClients || 0,
                activeClients: activeClients || 0,
                totalAssessments: totalAssessments || 0,
                activeLeads: activeLeads || 0
            })

    } catch (error) {
        return errorResponse(res, 400, responseMessage.something_wrong, error.message)
    }
}


