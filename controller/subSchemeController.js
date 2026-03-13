const SubScheme=require('../models/sub-scheme-model');
const { Paginate } = require("../utils/paginate");
const Joi = require("@hapi/joi");
const {getFilter}=require("../utils/custom-validators")
const { sendResponse, errorResponse } = require("../utils/response");
const responseMessage = require("../utils/responseMessage");

module.exports.addSubScheme=async(req,res)=>{
       try{
        const {error}= validateSubScheme(req.body);
       
        if(error) return errorResponse(
            res,
            400,
            responseMessage.request_invalid,
            error.message
        );
        
      const {schemeId,subSchemeName,subSchemeCode}=req.body;
      const subSchemeCodeExist=await SubScheme.findOne({subSchemeCode:subSchemeCode});
      if(subSchemeCodeExist) return errorResponse(
        res,
        400,
        responseMessage.subScheme_Code_exist,
        responseMessage.errorMessage
    );
    const subSchemeNameExist=await SubScheme.findOne({subSchemeName:subSchemeName});
    if(subSchemeNameExist) return errorResponse(
      res,
      400,
      responseMessage.subScheme_Name_exist,
      responseMessage.errorMessage
  );
      const subSchemeCreate=await new SubScheme({
        schemeId,
        subSchemeName,
        subSchemeCode
      }).save();
      if(subSchemeCreate){
             return sendResponse(res, 200, responseMessage.sub_scheme_create, subSchemeCreate);
      }else{
        return errorResponse(
            res,
            400,
            responseMessage.request_invalid,
            responseMessage.sub_scheme_not_create
        );
      }
       }catch(err){
        return errorResponse(
            res,
            500,
            responseMessage.errorMessage,
            responseMessage.errorMessage
        );
       }
}
module.exports.changeStatus = async (req, res) => {
  try {
    const { error } = validateSubSchemeChange(req.body);
    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );
    const { status, sub_scheme_id } = req.body;
    let change = (status == true) ? true : false;

    const updateStatus = await SubScheme.findByIdAndUpdate(sub_scheme_id, { status: change });
    if (updateStatus) {
      return sendResponse(res, 200, responseMessage.status_change, { status: change })
    } else {
      return errorResponse(
        res,
        400,
        responseMessage.status_not_change,
        responseMessage.errorMessage
      );
    }
  } catch (error) {
    console.log('err', error)
    return errorResponse(res, 500, responseMessage.errorMessage, error.message)
  }


}
module.exports.subSchemeList = async (req, res) => {
  try {
    const { page, limit, skip, sortOrder } = await Paginate(req);
    let filter= getFilter(req,["subSchemeName","subSchemeCode"])
    delete filter.query.clientId
    let query = filter ? filter.query : {};
    const totalCounts = await SubScheme.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);
    const subSchemeDetails = await SubScheme.find(query).populate({select:"schemeName",path:"schemeId"})
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    if (!subSchemeDetails)
      return errorResponse(
        res,
        400,
        responseMessage.sub_scheme_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, responseMessage.sub_scheme_found, {
      subSchemeDetails,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};
exports.updateSubScheme = async (req,res) => {

  try {
  
      const subSchemeId = req.params.id;
      const { error } = validateSubScheme(req.body);
      if (error)
        return errorResponse(
          res,
          400,
          responseMessage.request_invalid,
          error.message
        );
      
        const {
          schemeId,
          subSchemeName,
          subSchemeCode
        } = req.body;

      const subSchemeDetail = await SubScheme.findById(subSchemeId);
      
      if(!subSchemeDetail) return errorResponse(res, 400, responseMessage.sub_scheme_not_found, responseMessage.errorMessage);
         // Check if the new schemeName conflicts with any existing records
    let subSchemeNameExists = await SubScheme.findOne({
      $and: [
        { _id: { $ne: subSchemeId } }, // Exclude the current record being updated
        { schemeName: req.body.subSchemeName }
      ]
    });
    if (subSchemeNameExists) {
      return errorResponse(
        res,
        400,
        responseMessage.subScheme_Name_exist,
        responseMessage.errorMessage
      );
    }

    // Check if the new schemeCode conflicts with any existing records
    let subSchemeCodeExists = await SubScheme.findOne({
      $and: [
        { _id: { $ne: subSchemeId } }, // Exclude the current record being updated
        { schemeCode: req.body.subSchemeCode }
      ]
    });
    if (subSchemeCodeExists) {
      return errorResponse(
        res,
        400,
        responseMessage.subScheme_Code_exist,
        responseMessage.errorMessage
      );
    }
          const updateSubScheme = await SubScheme.findOneAndUpdate({_id:subSchemeId},
            { 
              schemeId,
              subSchemeName,
              subSchemeCode
            },
            {new:true});

          if(!updateSubScheme) 
          return errorResponse(
              res, 
              400, 
              "SubScheme not able to update", 
              responseMessage.errorMessage);

          return sendResponse(res, 200, "SubSchemeDetail update successfully", updateSubScheme);

  } catch (error) {

      return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.removeSubScheme = async (req, res) => {

  try {

      let subSchemeId = req.params.id;
      
      const subSchemeDetail = await SubScheme.findById(subSchemeId)
    
      if (!subSchemeDetail) return errorResponse(res, 400, responseMessage.sub_scheme_not_found, responseMessage.errorMessage);
     
      const result = await SubScheme.deleteOne({_id:subSchemeId})
      
      // send data to client
      return sendResponse(res, 200, responseMessage.subScheme_list_delete);

  } catch (error) {
      return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
}

exports.getUpdateSubSchemedetail = async (req,res) => {
  try {   
    
       const questionId = req.params.id;
    
       const subSchemeDetail = await SubScheme.findById(questionId);
       
        if(!subSchemeDetail) return errorResponse(res, 400, responseMessage.sub_scheme_not_found, responseMessage.errorMessage);

      return sendResponse(res, 200, "SubSchemeDetail get data successfully", subSchemeDetail);

  } catch (error) {
    
      return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

function validateSubSchemeChange(body) {
    try {
      const schema = Joi.object({
        sub_scheme_id: Joi.string().required(),
        status: Joi.bool().required(),
      });
      return schema.validate(body);
    } catch (err) {
      console.log(err);
    }
  }
 function validateSubScheme(data) {
    try {
       
      const schema = Joi.object({
        schemeId: Joi.string().min(3).required(),
        subSchemeName:Joi.string().required(),
        subSchemeCode:Joi.string().min(3).required(),
      });
      return schema.validate(data);
    } catch (err) {
      console.log(err);
    }
  }