const UserRoleModel = require('../models/userRole-model')
const { featureList } = require("../utils/constants")
const { sendResponse, errorResponse } = require("../utils/response")
const responseMessage = require('../utils/responseMessage')
const { Paginate } = require("../utils/paginate");
const { getFilter } = require("../utils/custom-validators");
const { USER_PERMISSION_CACHE } = require('../constants/redis');
const RedisService = require('../utils/redisService');
const UserModel = require('../models/user-model');

const redisDB1 = new RedisService("db1");

exports.createUserRole = async (req, res, next) => {
    try {


          const requestbody = req.body
          if(requestbody?.userRoleName){
        
            const existedUserRole = await UserRoleModel.findOne({userRoleName:requestbody.userRoleName, userId: req.user._id})
            if(existedUserRole){
              return errorResponse(res, 400, responseMessage.user_role_already_exist, responseMessage.user_role_already_exist)
            }
            
            const newUserRole = new UserRoleModel({...requestbody, userId: req.user._id})
            const response = await newUserRole.save()
            if(response){
              return sendResponse(res, 200, responseMessage.user_role_successfully_created, response)
            }
          } 
          else{ 
            return errorResponse(res, 400, responseMessage.no_user_role_data_provided_for_user_role_creation, responseMessage.no_user_role_data_provided_for_user_role_creation)
          }
    
    } catch (error) {
        return errorResponse(res, 500, responseMessage.something_wrong, error.message)
    }
}

const getUserRoleFilter = (req, searchOptions) => {
    
  const client_status = req.query.client_status ?? 'all';
  const search = req.query.search ?? '';

  const sortBy = req.query.sortBy ?? 'createdAt';
  const sortOrder = req.query.sortOrder ?? 'desc';

  const query = client_status === 'all' ? {} : { client_status: client_status };

  if (search) {
      query['$or'] = searchOptions.map(item => ({ [item]: { $regex: search, $options: 'i' } }))
  }

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  return { sort, query }
}

exports.getUserRoles = async (req, res, next) =>{

    try {
        const options = ["userRoleName", "features.featureName",]
        let filter = getUserRoleFilter(req, options)
        const { page, limit, skip, sortOrder } = Paginate(req);
        let query = filter ? filter.query : {}; 

        query = { ...query, userId: req.user?._id}
        console.log('query--->', query)
        const response = await UserRoleModel.find(query)
                                              .sort(sortOrder)
                                                .skip(skip)
                                                  .limit(limit)

        const totalCounts = await UserRoleModel.countDocuments(query);
        const totalPages = Math.ceil(totalCounts / limit);

        if(response.length < 1){
          return sendResponse(res, 200, responseMessage.no_user_role_found, { response, page, totalCounts, totalPages})
        }
        else{
            return sendResponse(res, 200, responseMessage.user_role_details, { response, page, totalCounts, totalPages })
        }
        
    } catch (error) {
        return errorResponse(res, 500, responseMessage.something_wrong, error.message)
    }
}

exports.editUserRolePage = async (req, res, next) =>{
    try {

        const { userRoleId } = req.query
        if(!userRoleId){
          return errorResponse(res, 400, responseMessage.no_user_id_provided, responseMessage.no_user_id_provided)
        }
        const response = await UserRoleModel.findOne({_id:userRoleId})
      
        if(response){

            const cleanResponse = JSON.parse(JSON.stringify(response.features))
            const arrayC = mergeArrays(featureList, cleanResponse);
            response.features = arrayC
            
            return sendResponse(res, 200, responseMessage.existed_user_role_details_available, response)
        }
      
        
    } catch (error) {
        return errorResponse(res, 500, responseMessage.something_wrong, error.message)
    }
}

exports.editUserRole = async ( req, res, next) =>{
    try {
        const { userRoleId } = req.query
        // console.log("userRoleId-->", req.user)
        if(!userRoleId){
          return errorResponse(res, 400, responseMessage.user_role_not_provided, responseMessage.user_role_not_provided)
        }
        const user = await UserRoleModel.findOne({_id:userRoleId});
        if(user?.superAdmin){
          return errorResponse(res, 400, responseMessage.superAdmin_can_not_be_updated, responseMessage.superAdmin_can_not_be_updated)
        }

        const requestbody = req.body
        if(requestbody){
            const response = await UserRoleModel.findOneAndUpdate({_id:userRoleId}, requestbody, { new: true})
            if(response){
                const allUsers = await UserModel.find({userRole: userRoleId}, {email: 1, _id: 0});
                const redisKeys = allUsers.map(usr => `${USER_PERMISSION_CACHE}:${usr.email}`);
                for(const key of redisKeys){
                  await redisDB1.destroy(key);
                }
                return sendResponse(res, 200, responseMessage.user_role_updated_successfully, response)
            }
        }   
        else{ 
          return errorResponse(res, 400, responseMessage.no_user_role_data_provided_for_user_role_updation, responseMessage.no_user_role_data_provided_for_user_role_updation)
        }
        
    } catch (error) {
        return errorResponse(res, 500, responseMessage.something_wrong, error.message)
    }
}


exports.getFeatures = async (req, res, next) =>{

    try {
     return sendResponse(res, 200, responseMessage.feature_list, featureList)
        
    } catch (error) {
        return errorResponse(res, 500, responseMessage.something_wrong, error.message)
    }
    
}

exports.deleteUserRole = async (req, res, next)=>{
  try {

    const { userRoleId } = req.query
    if(!userRoleId){
      return errorResponse(res, 400, responseMessage.user_role_not_provided, responseMessage.user_role_not_provided)
    }
    const response = await UserRoleModel.findOne({_id:userRoleId})
  
    if(response){

        if(response.userAssigned > 0){
          return errorResponse(res, 400, responseMessage.user_role_can_not_be_deleted, responseMessage.user_role_can_not_be_deleted)
        }
        if(response.superAdmin){
          return errorResponse(res, 400, responseMessage.superAdmin_can_not_be_deleted, responseMessage.superAdmin_can_not_be_deleted)
        }
        
        const userDeleted = await UserRoleModel.findOneAndRemove({_id: userRoleId})
        if(userDeleted)
        return sendResponse(res, 200, responseMessage.user_role_successfully_deleted, responseMessage.user_role_successfully_deleted)
    }
  
    
  } catch (error) {
      return errorResponse(res, 500, responseMessage.something_wrong, error.message)
  }
}


function mergeObjects(obj1, obj2) {
  const merged = { ...obj1 };


  for (const key in obj2) {
    if (typeof obj2[key] === 'object' && !Array.isArray(obj2[key])) {
      // console.log(obj1[key])
      // console.log(obj2[key])
      merged[key] = mergeObjects(obj1[key], obj2[key]);
    } 
    
    else if (key === "subFeatures" && Array.isArray(obj1[key]) && Array.isArray(obj2[key])) 
    {
      const subFeatureNames = new Set();
      
      const mergedSubFeatures = obj1[key].map((subFeatureA) => {
        const matchingSubFeatureB = obj2[key].find(
          (subFeatureB) => subFeatureB.subFeatureName === subFeatureA.subFeatureName
        );

        if (matchingSubFeatureB) {
          subFeatureNames.add(subFeatureA.subFeatureName);
          return mergeObjects(subFeatureA, matchingSubFeatureB);
        } else {
          return { ...subFeatureA };
        }
      });

      obj2[key].forEach((subFeatureB) => {
        if (!subFeatureNames.has(subFeatureB.subFeatureName)) {
          mergedSubFeatures.push({ ...subFeatureB });
        }
      });

      merged[key] = mergedSubFeatures;

    } else {
      merged[key] = obj2[key];
      console.log(merged[key])
    }
  }

  return merged;
}

function mergeArrays(arrayA, arrayB) {
    
  const mergedArray = arrayA.map((itemA) => {
      
    const matchingItemB = arrayB.find((itemB) => itemB.featureName === itemA.featureName);

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