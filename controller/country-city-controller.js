require("dotenv").config()
const { CountryState } = require("../models/country-city-model");
const { sendResponse, errorResponse } = require("../utils/response");
const responseMessage = require("../utils/responseMessage");

exports.getAllCitiesByState = async (req, res) => {
    try {
        if (req.body.fipsCode) {
            let state = await CountryState.findOne({ "states.fipsCode": req.body.fipsCode })
            let cityData = state.states;
            if (cityData && cityData !== null && cityData.length) {
                for (data of cityData) {
                    if (data.fipsCode === req.body.fipsCode) {
                        return sendResponse(res, 200, responseMessage.city_get, { cities: data.cities });
                    }
                }
            } else {
                return errorResponse(res, 400, responseMessage.state_not_found, responseMessage.errorMessage);
            }
        } else {
            return errorResponse(res, 400, responseMessage.state_fips_required, responseMessage.errorMessage);
        }
    } catch (error) {
        //send 500 error if something goes wrong 
        return errorResponse(res, 500, responseMessage.errorMessage, error.message);
    }
}

exports.getStateByCountry = async (req, res) => {
    try {
        if (req.body.country) {
            var country = req.body.country;
            var states = await CountryState.distinct("states", {
                "name": country
            });

            let responseData = states.map((list) => {
                return {
                    name: list.name,
                    fipsCode: list.fipsCode,
                    _id: list._id
                }
            });
            // console.log("**********", states.length)
            return sendResponse(res, 200, responseMessage.state_get, { states: responseData });
        } else {
            return errorResponse(res, 400, responseMessage.country_name_required, responseMessage.errorMessage);
        }
    } catch (error) {

        return errorResponse(res, 500, responseMessage.errorMessage, error.message);
    }
}


exports.getDistrictByState = async (req, res) => {

    try {

        const requestId = req.params.id;

        const getDistrict = await CountryState.findOne({});

        let findRequiredStateDistrict = {};

        for (let i = 0; i < getDistrict.states.length; i++) {
            if (getDistrict.states[i]._id.toString() == requestId.toString()) {
                findRequiredStateDistrict = getDistrict.states[i];
            }
        }

        let responseData = {
            "name": findRequiredStateDistrict.name,
            "countryCode": findRequiredStateDistrict.countryCode,
            "fipsCode": findRequiredStateDistrict.fipsCode,
            "iso": findRequiredStateDistrict.iso,
            "latitude": findRequiredStateDistrict.latitude,
            "longitude": findRequiredStateDistrict.longitude,
            "_id": findRequiredStateDistrict._id,
            "districts": findRequiredStateDistrict.district
        }

        if (getDistrict) return sendResponse(res, 200, responseMessage.district_get_successfully, { stateDetails: responseData });

        return errorResponse(res, 400, responseMessage.district_not_able_get, responseMessage.errorMessage);

    } catch (error) {

        return errorResponse(res, 500, responseMessage.errorMessage, error.message);

    }
};