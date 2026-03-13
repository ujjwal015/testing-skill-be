const JobRole=require('../models/jobRole-model');
const Role=require('../models/RoleSchema');
const { Paginate } = require("../utils/paginate");
const Joi = require("@hapi/joi");
const {getFilter}=require("../utils/custom-validators")
const { sendResponse, errorResponse } = require("../utils/response");
const responseMessage = require("../utils/responseMessage");
const ClientModel = require('../models/client-model')

module.exports.addJobRole=async(req,res)=>{
       try{
        const {error}= validateJobRole(req.body);
       
        if(error) return errorResponse(
            res,
            400,
            error.message,
            error.message
        );
        
      const {jobRole,clientId,qpCode}=req.body;
      const jobRoleExist=await JobRole.findOne({$or:[{jobRole},{qpCode}]});
      
      if(jobRoleExist?.jobRole==jobRole) return errorResponse(
        res,
        400,
        'JobRole already exist',
        responseMessage.errorMessage
    );
    if(jobRoleExist?.qpCode==qpCode) return errorResponse(
      res,
      400,
      'QPCode already exist',
      responseMessage.errorMessage
  );
      const jobRoleCreate=await new JobRole({
        jobRole,
        clientId,
        qpCode
      }).save();
      if(jobRoleCreate){
             return sendResponse(res, 200, responseMessage.jobe_role_create, jobRoleCreate);
      }else{
        return errorResponse(
            res,
            400,
            responseMessage.request_invalid,
            responseMessage.jobe_role_not_create
        );
      }
       }catch(err){
        console.log('error',err)
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
    const { error } = validateStatusChange(req.body);
    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );
    const { status, job_role_id } = req.body;
    let change = (status == true) ? true : false;

    const updateStatus = await JobRole.findByIdAndUpdate(job_role_id, { status: change });
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
module.exports.jobRoleList = async (req, res) => {
  try {
    const { page, limit, skip, sortOrder } = await Paginate(req);
    let filter= getFilter(req,["jobRole","qpCode"],true)
    
     query = filter ? filter.query : {};
    
    const totalCounts = await JobRole.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);
    const jobRoleDetails = await JobRole.find(query).populate({select:"clientname",path:"clientId"})
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    if (!jobRoleDetails)
      return errorResponse(
        res,
        400,
        responseMessage.job_role_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, responseMessage.job_role_found, {
      jobRoleDetails,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};
exports.updateJobRole = async (req,res) => {

  try {
  
      const jobRoleId = req.params.id;
      const { error } = validateJobRole(req.body);
     
      if (error)
        return errorResponse(
          res,
          400,
          responseMessage.request_invalid,
          error.message
        );
      
        const {
          jobRole,clientId,qpCode
        } = req.body;

      const jobRoleDetail = await JobRole.findById(jobRoleId);
    
      if(!jobRoleDetail) return errorResponse(res, 400,responseMessage.jobRole_not_found, responseMessage.errorMessage);
      
          // const updateJobeRolelist = await JobRole.findOneAndUpdate({_id:jobRoleId},
          //   { 
          //     jobRole,
          //     clientId
          //   },
          //   {new:true});

          // if(!updateJobeRolelist) 
          // return errorResponse(
          //     res, 
          //     400, 
          //     "jobRole not able to update", 
          //     responseMessage.errorMessage);

          return sendResponse(res, 200, "jobRole updated successfully", "jobRole updated successfully");

  } catch (error) {

      return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.removeJobRole = async (req, res) => {

  try {

      let jobRoleId = req.params.id;
      
      const jobRoleDetail = await JobRole.findById(jobRoleId)
    
      if (!jobRoleDetail) return errorResponse(res, 400, responseMessage.jobRole_not_found, responseMessage.errorMessage);
      
     
      const result = await JobRole.deleteOne({_id:jobRoleId})
      
      // send data to client
      return sendResponse(res, 200, responseMessage.job_role_list_delete);

  } catch (error) {
      return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
}

exports.getUpdatejobRoledetail = async (req,res) => {
  try {   
    
       const jobRoleId = req.params.id;
    
       const jobRoleDetail = await JobRole.findById(jobRoleId);
       
        if(!jobRoleDetail) return errorResponse(res, 400, responseMessage.jobRole_not_found, responseMessage.errorMessage);

      return sendResponse(res, 200, "JobRole get data successfully", jobRoleDetail);

  } catch (error) {
    
      return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};
module.exports.RoleList=async(req,res)=>{
    try{
        
        // const roleCreate=await new Role({
        //     name:"Business Manager",
        //     permissions:[
        //       {dashboard:{create:true,view:true,edit:true,delete:true,status:true}},
        //       {client:{create:true,view:true,edit:true,delete:true,status:true}},
        //       {JobRoleManagement:{create:true,view:true,edit:true,delete:true,status:true}},
        //       {leadManagement:{create:true,view:true,edit:true,delete:true,status:true}},
        //       {assesorManagement:{create:true,view:true,edit:true,delete:true,status:true}},
        //       {schemeManagement:{create:true,view:true,edit:true,delete:true,status:true}},
        //       {qbManagement:{create:true,view:true,edit:true,delete:true,status:true}},
        //       {examManagement:{create:true,view:true,edit:true,delete:true,status:true}},
        //       {userManagement:{create:true,view:true,edit:true,delete:true,status:true}},
        //       {logsManagement:{create:true,view:true,edit:true,delete:true,status:true}}],
        //     description:'he can only view'
        // }).save();
        // const findPermission=await Role.find({name:"Business Manager"});
        // findPermission.permissions=[
        //           {dashboard:{create:true,view:true,edit:true,delete:true,status:true}},
        //           {client:{create:true,view:true,edit:true,delete:true,status:true}},
        //           {JobRoleManagement:{create:true,view:true,edit:true,delete:true,status:true}},
        //           {leadManagement:{create:true,view:true,edit:true,delete:true,status:true}},
        //           {assesorManagement:{create:true,view:true,edit:true,delete:true,status:true}},
        //           {schemeManagement:{create:true,view:true,edit:true,delete:true,status:true}},
        //           {qbManagement:{create:true,view:true,edit:true,delete:true,status:true}},
        //           {examManagement:{create:true,view:true,edit:true,delete:true,status:true}},
        //           {userManagement:{create:true,view:true,edit:true,delete:true,status:true}},
        //           {logsManagement:{create:true,view:true,edit:true,delete:true,status:true}}
                  

        //         ]
        //           await findPermission.save()
       let {permissions}=req.permissions
        if(permissions){
            sendResponse(res, 200, 'permission  found', permissions);
        }else{
            errorResponse(
                res,
                404,
                'permission not found',
                responseMessage.errorMessage
            );
        }
        permissions.map(item=>{console.log(item.client)})
        // console.log('reeeeeee>>>>>>>>>>>',req.permissions)
        
    }catch(error){
        console.log('error',error)
        return errorResponse(
            res,
            500,
            responseMessage.jobeRole_exist,
            responseMessage.errorMessage
        );
    }
   
        
}
function validateStatusChange(body) {
  try {
    const schema = Joi.object({
      job_role_id: Joi.string().required(),
      status: Joi.bool().required(),
    });
    return schema.validate(body);
  } catch (err) {
    console.log(err);
  }
}
 function validateJobRole(data) {
  
    try {
       
      const schema = Joi.object({
        jobRole: Joi.string().min(3).message('Job Role must have at least 3 characteristics').required(),
        clientId:Joi.string().required(),
        qpCode:Joi.string().min(6).max(25).required(),
      });
      return schema.validate(data);
    } catch (err) {
      console.log(err);
    }
  }

module.exports.getAllClientsList = async (req, res, next) =>{
    
    try {

      let filter = getClientFilter(req, [], true)
      const { page, limit, skip, sortOrder } = Paginate(req);

      const organisationType = req?.query?.organisationType
      const state = req?.query?.state  
      let query = filter ? filter.query : {}; 
      

      const assigndClientsCount = await ClientModel.countDocuments({_id: {$in: req.user.assigndClients}})
      // console.log('assigndClientsCount--->', assigndClientsCount)

      if(organisationType && state){
        query = { ...query, organisationType: organisationType, state: state }
      }
      else{ 
        query = (req?.query?.organisationType)? { ...query, organisationType: organisationType}
        : (req?.query?.state) ? { ...query, state: state} : query
      }

      
      const clientsData = await ClientModel.find({...query,client_status:'Active'})
        .select('clientname')
        .sort(sortOrder)
        .skip(skip).limit(assigndClientsCount)
        ;

        const totalCounts = await ClientModel.countDocuments(query);
        const totalPages = Math.ceil(totalCounts / limit);

        if (clientsData.length < 1) return sendResponse(res, 200, 
                                    responseMessage.no_client_found, 
                                    {});

        return sendResponse(res, 200, responseMessage.client_profile_get, 
          { clientsData, page, totalCounts, totalPages })
          
    } catch (error) {
          return errorResponse(res, 500, responseMessage.errorMessage, error.message);
    }
}

const getClientFilter = (req, searchOptions,enableClientFilter=false) => {
    
  const client_status = req.query.client_status ?? 'all';
  const search = req.query.search ?? '';
  const replaceSpecialCharacter = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&")

  const sortBy = req.query.sortBy ?? 'createdAt';
  const sortOrder = req.query.sortOrder ?? 'desc';

  const query = client_status === 'all' ? {} : { client_status: client_status };
  if(req?.user?.assigndClients && enableClientFilter){
      query["_id"]={$in:req.user.assigndClients}
  }
  if (search) {
      query['$or'] = searchOptions.map(item => ({ [item]: { $regex: replaceSpecialCharacter, $options: 'i' } }))
  }

  const sort = {};
  sort[sortBy] = sortOrder === 'desc' ? -1 : 1;
  return { sort, query }
}