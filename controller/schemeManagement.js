const Joi = require("@hapi/joi");
const schemeModel = require("../models/scheme-model");
const { getFilter } = require("../utils/custom-validators");
const { Paginate } = require("../utils/paginate");
const { sendResponse, errorResponse } = require("../utils/response");
const responseMessage = require("../utils/responseMessage");

exports.registerScheme = async (req, res) => {
  try {
    if (req.body) {
      const { error } = validateRegisterData(req.body);

      if (error)
        return errorResponse(
          res,
          400,
          responseMessage.request_invalid,
          error.message
        );

      const { schemeName, schemeCode } = req.body;

      let schemeNameExists = await schemeModel.findOne({
        $or: [{ schemeName: req.body.schemeName }],
      });
      if (schemeNameExists) {
        return errorResponse(
          res,
          400,
          responseMessage.scheme_name_exists,
          responseMessage.errorMessage
        );
      }

      let schemeCodeExists = await schemeModel.findOne({
        $or: [{ schemeCode: req.body.schemeCode }],
      });
      if (schemeCodeExists) {
        return errorResponse(
          res,
          400,
          responseMessage.scheme_code_exists,
          responseMessage.errorMessage
        );
      }

      const saveSchemes = await new schemeModel({
        schemeName: schemeName,
        schemeCode: schemeCode,
      }).save();

      if (saveSchemes) {
        return sendResponse(res, 200, responseMessage.scheme_create, saveSchemes);
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

module.exports.schemeList = async (req, res) => {
  try {
    let filter = getFilter(req, ["schemeName", "schemeCode"]);

    const { page, limit, skip, sortOrder } = Paginate(req);
    delete filter.query.clientId
    let query = filter ? filter.query : {};

    const totalCounts = await schemeModel.countDocuments(query);

    const totalPages = Math.ceil(totalCounts / limit);

    const schemeDetails = await schemeModel
      .find(query)
      .select("schemeName schemeCode status")
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    if (!schemeDetails)
      return errorResponse(
        res,
        400,
        responseMessage.scheme_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, responseMessage.scheme_found, {
      schemeDetails,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.getScheme = async (req, res) => {
  try {
    let schemeId = req.params.id;

    const schemeDetail = await schemeModel.findById(schemeId);

    if (!schemeDetail)
      return errorResponse(
        res,
        400,
        responseMessage.scheme_not_found,
        responseMessage.errorMessage
      );

    // send data to client
    return sendResponse(res, 200, responseMessage.scheme_found, schemeDetail);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.removeScheme = async (req, res) => {
  try {
    let schemeId = req.params.id;

    const schemeDetail = await schemeModel.findById(schemeId);

    if (!schemeDetail)
      return errorResponse(
        res,
        400,
        responseMessage.scheme_not_found,
        responseMessage.errorMessage
      );

    const result = await schemeModel.deleteOne({ _id: schemeId });

    // send data to client
    return sendResponse(res, 200, responseMessage.scheme_list_delete, result);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

// exports.updateScheme = async (req, res) => {
//   try {
//     const requestUpdateSchemeId = req.params.id;

//     if (!requestUpdateSchemeId)
//       return errorResponse(
//         res,
//         400,
//         responseMessage.scheme_id_required,
//         responseMessage.errorMessage
//       );

//     const { error } = validateRegisterData(req.body);

//     if (error)
//       return errorResponse(
//         res,
//         400,
//         responseMessage.request_invalid,
//         error.message
//       );

//     const { schemeName, schemeCode } = req.body;

//     const findschemeId = await schemeModel.findById(requestUpdateSchemeId);

//     if (!findschemeId)
//       return errorResponse(
//         res,
//         400,
//         responseMessage.scheme_id_not_found,
//         responseMessage.errorMessage
//       );

//       let schemeNameExists = await schemeModel.findOne({
//         $or: [{ schemeName: req.body.schemeName }],
//       });
//       if (schemeNameExists) {
//         return errorResponse(
//           res,
//           400,
//           responseMessage.scheme_name_exists,
//           responseMessage.errorMessage
//         );
//       }

//       let schemeCodeExists = await schemeModel.findOne({
//         $or: [{ schemeCode: req.body.schemeCode }],
//       });
//       if (schemeCodeExists) {
//         return errorResponse(
//           res,
//           400,
//           responseMessage.scheme_code_exists,
//           responseMessage.errorMessage
//         );
//       }
//     const updatedSchemeId = await schemeModel.findOneAndUpdate(
//       { _id: requestUpdateSchemeId },
//       {
//         schemeName,
//         schemeCode,
//       },
//       { new: true }
//     );

//     if (!updatedSchemeId)
//       return errorResponse(
//         res,
//         400,
//         responseMessage.scheme_not_update,
//         responseMessage.errorMessage
//       );

//     return sendResponse(
//       res,
//       200,
//       responseMessage.scheme_update,
//       updatedSchemeId
//     );
//   } catch (error) {
//     return errorResponse(res, 500, responseMessage.errorMessage, error.message);
//   }
// };

exports.updateScheme = async (req, res) => {
  try {
    const requestUpdateSchemeId = req.params.id;

    if (!requestUpdateSchemeId)
      return errorResponse(
        res,
        400,
        responseMessage.scheme_id_required,
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

    const { schemeName, schemeCode } = req.body;

    const findschemeId = await schemeModel.findById(requestUpdateSchemeId);

    if (!findschemeId)
      return errorResponse(
        res,
        400,
        responseMessage.scheme_id_not_found,
        responseMessage.errorMessage
      );

    // Check if the new schemeName conflicts with any existing records
    let schemeNameExists = await schemeModel.findOne({
      $and: [
        { _id: { $ne: requestUpdateSchemeId } }, // Exclude the current record being updated
        { schemeName: req.body.schemeName }
      ]
    });
    if (schemeNameExists) {
      return errorResponse(
        res,
        400,
        responseMessage.scheme_name_exists,
        responseMessage.errorMessage
      );
    }

    // Check if the new schemeCode conflicts with any existing records
    let schemeCodeExists = await schemeModel.findOne({
      $and: [
        { _id: { $ne: requestUpdateSchemeId } }, // Exclude the current record being updated
        { schemeCode: req.body.schemeCode }
      ]
    });
    if (schemeCodeExists) {
      return errorResponse(
        res,
        400,
        responseMessage.scheme_code_exists,
        responseMessage.errorMessage
      );
    }

    // Update the scheme
    const updatedSchemeId = await schemeModel.findOneAndUpdate(
      { _id: requestUpdateSchemeId },
      {
        schemeName,
        schemeCode,
      },
      { new: true }
    );

    if (!updatedSchemeId)
      return errorResponse(
        res,
        400,
        responseMessage.scheme_not_update,
        responseMessage.errorMessage
      );

    return sendResponse(
      res,
      200,
      responseMessage.scheme_update,
      updatedSchemeId
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};


module.exports.changeStatus = async (req, res) => {
  try {
    const { error } = validateStatusChange(req.body);
    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );
    const { status, scheme_id } = req.body;
    let change = status == "active" ? "active" : "inactive";

    const updateStatus = await schemeModel.findByIdAndUpdate(scheme_id, {
      status: change,
    });
    if (updateStatus) {
      return sendResponse(res, 200, responseMessage.status_change, {
        status: change,
      });
    } else {
      return errorResponse(
        res,
        400,
        responseMessage.status_not_change,
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

function validateStatusChange(body) {
  try {
    const schema = Joi.object({
      scheme_id: Joi.string().required(),
      status: Joi.string().required(),
    });
    return schema.validate(body);
  } catch (err) {
    console.log(err);
  }
}

function validateRegisterData(body) {
  try {
    const schema = Joi.object({
      schemeName: Joi.string().min(2).max(255).trim().required(),
      schemeCode: Joi.string().min(2).max(255).trim().required(),
    });
    return schema.validate(body);
  } catch (err) {
    console.log(err);
  }
}
