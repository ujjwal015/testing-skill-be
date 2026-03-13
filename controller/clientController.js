const Joi = require('@hapi/joi');
const { sendResponse, errorResponse } = require("../utils/response")
const responseMessage = require("../utils/responseMessage")
const { uploadFile , getFileUrl} = require('../utils/s3bucket');
const ClientModel = require('../models/client-model')
const bcrypt = require("bcryptjs");
const { getFilter, mobileValidateRegEx, urlValidateRegEx, pinValidateRegEx,landLineValidateRegEx, clientNameValidateRegEX, clientCodeValidateRegEX, getStateIdFromCountry } = require('../utils/custom-validators');
const { Paginate } = require("../utils/paginate");
const _ = require('lodash');
const reader = require('xlsx')
const fs = require('fs/promises');
const moment = require('moment')
const {CountryState} = require("../models/country-city-model")

const UserModel = require("../models/user-model")
const sectorModel = require('../models/sectorModel')

const  { SUPER_ADMIN_EMAIL } = require('../utils/envHelper')


exports.createNewClient = async (req, res, next) =>{
     
          try {
            if (req.body.sector === "[]" || req.body.sector === "") {
            req.body.sector = [];
          } else if (typeof req.body.sector === 'string') {
            try {
              req.body.sector = JSON.parse(req.body.sector);
            } catch (e) {
              req.body.sector = []; 
            }
          }

          const { error, value } = validateClientDetails(req.body)
          if(error) return errorResponse(res, 400, responseMessage.request_invalid, error.message)

          const { email,
                  address,
                  client_city,
                  clientcode,
                  mobile,
                  landLine,
                  organisationType,
                  pincode,
                  state,
                  client_status,
                  webpage,
                  clientname,
                  logo_status,
                  spoke, 
                  sector 
                } = req.body 

          

          if(logo_status.trim() === "true"){

            if(!req.file){
              return errorResponse(res, 400, responseMessage.file_not_received, responseMessage.file_not_received)
            }
        
            const existingClient = await ClientModel.findOne({email:email})
            if(existingClient){
              return errorResponse(res, 400, "This email address is already existed.", "This email address is already existed.")
            }

            const existingClientCode = await ClientModel.findOne({clientcode:clientcode})
            if(existingClientCode){
              return errorResponse(res, 400, "This client code is already existed.", "This client code is already existed.")
            }

            if(req.file.mimetype == 'image/jpeg' || req.file.mimetype == 'image/png'){
                //get the file name after uploading to s3
                const data = await uploadFile(req)
                if(data.statusCode === 200){                  
                  const newClient = new ClientModel({
                    email:email,
                    isProfilePicUploaded:true, 
                    address:address,
                    client_city:client_city,
                    clientcode:clientcode,
                    mobile:mobile,
                    organisationType:organisationType,
                    pincode:pincode,
                    state:state,
                    landLine:landLine,
                    client_status:client_status,
                    webpage:webpage,
                    clientname:clientname,
                    logo_status:logo_status,
                    spoke: spoke,
                    sector: sector
             
                  })

                  const result = await newClient.save()
                  
                  if(!result){
                    return errorResponse(res, 400, responseMessage.something_wrong, responseMessage.client_creation_failed)
                  }
    
                  const result2 = { 
                    email:result.email,
                    address:result.address,
                    client_city:result.client_city,
                    clientcode:result.clientcode,
                    mobile:result.mobile,
                    organisationType:result.organisationType,
                    pincode:result.pincode,
                    state:result.state,
                    landLine:result.landLine,
                    client_status:result.client_status,
                    webpage:result.webpage,
                    clientname:result.clientname,
                    logo_status:result.logo_status,
                    isProfilePicUploaded: result.isProfilePicUploaded,
                    spoke: result.spoke,
                    sector: result.sector,
                    _id: result._id,
                     
                  }
                  
                  // auto assign new client to super admin 
                  const user = await UserModel.findOne({email: SUPER_ADMIN_EMAIL })
                  await UserModel.updateOne({ _id: user._id }, { $addToSet: { assigndClients: result._id } });
                  
                  return sendResponse(res, 200, responseMessage.client_added_successfully, result2)
                }
                else{
                  return errorResponse(res, 400, responseMessage.image_upload_failed, data)
                }

            }
            else{
              return errorResponse(res, 400, responseMessage.wrong_file_type, responseMessage.file_type_should_be)
            }
          }
          else{ 

            const existingClient = await ClientModel.findOne({email:email})
            if(existingClient){
              return errorResponse(res, 400, "This email address is already existed.", "This email address is already existed.")
            }

            const existingClientCode = await ClientModel.findOne({clientcode:clientcode})
            if(existingClientCode){
              return errorResponse(res, 400, "This client code is already existed.", "This client code is already existed.")
            }
                  
                const newClient = new ClientModel({
                    email:email,
                    address:address,
                    client_city:client_city,
                    clientcode:clientcode,
                    mobile:mobile,
                    organisationType:organisationType,
                    pincode:pincode,
                    state:state,
                    landLine:landLine,
                    client_status:client_status,
                    webpage:webpage,
                    clientname:clientname,
                    logo_status:logo_status,
                    spoke: spoke,
                    sector: sector
                    
                  })

                  
                  const result = await newClient.save()
                  if(!result){
                    return errorResponse(res, 400, responseMessage.something_wrong, responseMessage.client_creation_failed)
                  }
            
                  const result2 = { 
                    email:result.email,
                    address:result.address,
                    client_city:result.client_city,
                    clientcode:result.clientcode,
                    mobile:result.mobile,
                    organisationType:result.organisationType,
                    pincode:result.pincode,
                    state:result.state,
                    landLine: result.landLine,
                    client_status:result.client_status,
                    webpage:result.webpage,
                    clientname:result.clientname,
                    logo_status:result.logo_status,
                    isProfilePicUploaded: result.isProfilePicUploaded,
                    spoke: result.spoke,
                    sector: result.sector,
                    _id: result._id,
                    
                  }
                  
            // auto assign new client to super admin 
            const user = await UserModel.findOne({email: SUPER_ADMIN_EMAIL })
            await UserModel.updateOne({ _id: user._id }, { $addToSet: { assigndClients: result._id } });

            return sendResponse(res, 200, responseMessage.client_added_successfully, result2)

          }
        
    } catch (error) {
      return errorResponse(res, 500, responseMessage.something_wrong, error.message)
    }
}

exports.getSectorList = async (req, res, next) => {
const sectorDetails = await sectorModel.find({})
  .select('sector _id')
  return sendResponse(res, 200, "Sector List Found", sectorDetails)
}

exports.getAllClients = async (req, res, next) =>{
    
        try {

          const options = ['clientname', 'clientcode', 'client_city', 'state', 'mobile','email','address','organisationType']

          let filter = getFilter(req, options)
          const { page, limit, skip, sortOrder } = Paginate(req);

          const organisationType = req?.query?.organisationType
          const state = req?.query?.state  
            delete filter.query.clientId
         let query = filter ? filter.query : {}; 

         // filter based on assigned clients
        if (req.user.assigndClients && req.user.assigndClients.length > 0) {
        query._id = { $in: req.user.assigndClients };
        }
          
          if(organisationType && state){
            query = { ...query, organisationType: organisationType, state: state }
          }
          else{ 
            query = (req?.query?.organisationType)? { ...query, organisationType: organisationType}
            : (req?.query?.state) ? { ...query, state: state} : query
          }
          
          const clientsData = await ClientModel.find(query).select("-mobile -spoke.spoke_mobile")
            .sort(sortOrder)
            .skip(skip).limit(limit)
            ;

            const totalCounts = await ClientModel.countDocuments(query);
            const totalPages = Math.ceil(totalCounts / limit);

            if (clientsData.length < 1) return sendResponse(res, 200, 
                                        responseMessage.no_client_found, 
                                        {});

            
            const allData = []

            clientsData.forEach((data)=> {

              if(data.isProfilePicUploaded){
                allData.push(getFileUrl(data))
              }
              else{
                const { clientname, _id,
                  address ,
                  client_city,
                  clientcode ,
                  landLine,
                  organisationType ,
                  pincode ,
                  state,
                  client_status,
                  isProfilePicUploaded,
                  spoke ,
                  sector ,
                  webpage, email } = data

              const newData = { clientname, _id,
                                address ,
                                client_city,
                                clientcode ,
                                landLine,
                                organisationType ,
                                pincode ,
                                state,
                                client_status,
                                isProfilePicUploaded,
                                spoke,
                                sector,
                                webpage,
                                url: null, email } 

                allData.push(newData)
               
              } 
            
            })

            Promise.all(allData).then((result)=>{
               return sendResponse(res, 200, responseMessage.client_profile_get, 
                { result, page, totalCounts, totalPages })
           
            }).catch((err)=>{
                return errorResponse(res, 400, responseMessage.image_not_found, responseMessage.image_not_found)
            })

        } catch (error) {
              return errorResponse(res, 500, responseMessage.errorMessage, error.message);
        }
}

exports.updateClient = async (req, res, next) =>{

    try {

      const requestBody = req.body;
      if(!_.isEmpty(requestBody)){

        if (requestBody.sector === "[]" || requestBody.sector === "") {
        requestBody.sector = [];
        } else if (typeof requestBody.sector === 'string') {
          try {
            requestBody.sector = JSON.parse(requestBody.sector);
          } catch (e) {
            requestBody.sector = []; 
          }
        }

        const { error , value } = validateClientUpdateDetails(requestBody)
        if(error) 
          return errorResponse(res, 400, responseMessage.request_invalid, error.message)

        const requestId = req?.query?.id
        if(!requestId)
          return errorResponse(res,400, responseMessage.no_client_id_provided, responseMessage.no_client_id_provided)
  
        const existingEmail = await ClientModel.findOne({_id: requestId})
        if(!existingEmail){
          return errorResponse(res, 400, responseMessage.no_client_found, responseMessage.no_client_found);
        }
        
        if(requestBody.email !== existingEmail.email)
          return errorResponse(res, 400, responseMessage.email_address_can_not_be_changed, responseMessage.email_address_can_not_be_changed)
        
        if(requestBody.clientcode !== existingEmail.clientcode)
          return errorResponse(res, 400, responseMessage.client_code_can_not_be_changed, responseMessage.client_code_can_not_be_changed)
          
        
        if(requestBody.logo_status.trim() == "true"){
          if(!req.file)
            return errorResponse(res, 400, responseMessage.file_not_received, responseMessage.file_not_received)
          
          if(req.file.mimetype == 'image/jpeg' || req.file.mimetype == 'image/png'){
            //get the file name after uploading to s3
            const data = await uploadFile(req)
            if(data.statusCode === 200){
              requestBody['isProfilePicUploaded'] = true
              const updateClientProfile = await ClientModel.findOneAndUpdate({ _id: requestId }, requestBody, { new: true})
              if (!updateClientProfile) 
                return errorResponse(res, 400, responseMessage.client_profile_not_found, responseMessage.client_profile_not_found);
              
              return sendResponse(res, 200, responseMessage.client_profile_update, updateClientProfile);
            }
            else{
              return errorResponse(res, 400, responseMessage.image_upload_failed, data)
            }

          }
          else{
            return errorResponse(res, 400, responseMessage.wrong_file_type, responseMessage.file_type_should_be)
          }

        }
        else{ 
          const updateClientProfile = await ClientModel.findOneAndUpdate({ _id: requestId }, requestBody, { new: true})
          if (!updateClientProfile) 
            return errorResponse(res, 400, responseMessage.client_profile_not_found, responseMessage.client_profile_not_found);
     
          return sendResponse(res, 200, responseMessage.client_profile_update, updateClientProfile);
        }

      }
      else{
        return errorResponse(res, 400, responseMessage.nothing_provided_to_update, 
          responseMessage.nothing_provided_to_update)
      }
     

    } catch (error) {

        return errorResponse(res, 500, responseMessage.errorMessage, error.message);

    }
}

exports.getOneClient = async (req, res, next) =>{

    try {
      const clientId = req.query.id

      if(clientId){
          const result = await ClientModel.findOne({_id: clientId})


          if(result){

      
             if(result.isProfilePicUploaded){
              const dataWithUrl = await getFileUrl(result)

              if(dataWithUrl){
                return sendResponse(res, 200, responseMessage.client_details_available,dataWithUrl)
              }
              else{
                const { clientname, _id,
                  address ,
                  client_city,
                  clientcode ,
                  email ,
                  mobile,
                  landLine,
                  organisationType ,
                  pincode ,
                  state,
                  client_status,
                  isProfilePicUploaded,
                  spoke ,
                  sector ,
                  webpage } = result

               const newData = { clientname, _id,
                  address ,
                  client_city,
                  clientcode ,
                  email ,
                  mobile,
                  organisationType ,
                  pincode ,
                  state,
                  landLine,
                  client_status,
                  isProfilePicUploaded,
                  spoke,
                  sector,
                  webpage,
                  url: null } 

        
                return sendResponse(res, 200, responseMessage.client_fount_but_no_logo_image, newData)
              }
             }
            
             else {
              const { clientname, _id,
                address ,
                client_city,
                clientcode ,
                email ,
                mobile,
                landLine,
                organisationType ,
                pincode ,
                state,
                client_status,
                isProfilePicUploaded,
                spoke ,
                sector ,
                webpage } = result

                const newData = { clientname, _id,
                  address ,
                  client_city,
                  clientcode ,
                  email ,
                  mobile,
                  landLine,
                  organisationType ,
                  pincode ,
                  state,
                  client_status,
                  isProfilePicUploaded,
                  spoke,
                  sector ,
                  webpage,
                  url: null } 

                sendResponse(res, 200, responseMessage.client_details_available, newData)
             }
          }
          else{ 
              return errorResponse(res, 400, responseMessage.no_client_found, responseMessage.no_client_found)
          }
      }
      else{ 
        return errorResponse(res, 400, responseMessage.no_client_id_provided, responseMessage.no_client_id_provided)
      }
      
    } catch (error) {
      return errorResponse(res, 500, responseMessage.errorMessage, error.message);
    }
}

exports.deleteClient = async (req, res, next) =>{

  try {

    let clientId = req.query.id;

    if(!clientId){
      return errorResponse(res, 400, responseMessage.no_client_id_provided, responseMessage.no_client_id_provided);
    }

    const clientData = await ClientModel.findOne({ _id: clientId });
    // check user if found or not 
    if (!clientData) return errorResponse(res, 400, responseMessage.client_profile_not_found, responseMessage.errorMessage);

    const result = await ClientModel.deleteOne({ _id: clientId });
    // send data to client
    if (!result) return errorResponse(res, 400, responseMessage.client_not_able_delete, responseMessage.errorMessage);

    return sendResponse(res, 200, responseMessage.client_profile_delete, result);

  } catch (error) {
      return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
}

exports.changeClientStatus = async (req, res, next) =>{

  try {
    let clientId  = req.query.id;
    let { clientstatus } = req.body
    

    if(!clientId){
      return errorResponse(res, 400, responseMessage.no_client_id_provided, responseMessage.no_client_id_provided);
    }
    if(!clientstatus){
      return errorResponse(res, 400, responseMessage.no_client_status_provided, responseMessage.no_client_status_provided);
    }
    

    const clientData = await ClientModel.findOne({ _id: clientId });
    // check user if found or not 
    if (!clientData) return errorResponse(res, 400, responseMessage.client_profile_not_found, responseMessage.errorMessage);

    const result = await ClientModel.updateOne({ _id: clientId }, {$set : { client_status: clientstatus}}, {upsert:false, runValidators: true});
    // send data to client
    if (!result) return errorResponse(res, 400, responseMessage.client_not_able_delete, responseMessage.errorMessage);

    return sendResponse(res, 200, responseMessage.client_status_changed_successfully, result);

  } catch (error) {
      return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
}

function validateClientUpdateDetails(clientBody) {

  try {

      const spokeSchema = Joi.object().keys({
        spoke_name: Joi.string().min(3).max(255).required(),
        spoke_email:Joi.string().min(5).trim().max(255).email().required(),
        spoke_mobile:Joi.string()
                        .optional().allow('')
                        .min(10)
                        .max(10)
                        .pattern(new RegExp(mobileValidateRegEx)),
        spoke_designation:Joi.string().optional().allow('').min(2).max(255),
        spoke_department:Joi.string().min(2).max(255).required(),
      })

      const sectorItemSchema = Joi.object().keys({
      sectorId: Joi.string()
        .trim()
        .length(24)
        .hex()
        .required()
        .messages({
          'string.length': 'Invalid Sector ID format',
        }),
      sectorName: Joi.string()
        .trim()
        .min(2)
        .max(100)
        .required()
    });



      const schema = Joi.object({
          logo_status:Joi.string().trim().required(),
          clientname : Joi.string().min(3).max(255).required().pattern(new RegExp(clientNameValidateRegEX)),
          email: Joi.string().min(5).trim().max(255).email().required(),
          mobile: Joi.string()
                      .min(10)
                      .max(10)
                      .pattern(new RegExp(mobileValidateRegEx)),

          landLine: Joi.string().allow('').pattern(new RegExp(landLineValidateRegEx)).messages({
            'string.pattern.base': 'Landline Number is not valid format (0000-000000)'
          }),

          address: Joi.string().ruleset.min(7).max(250).rule({
            message: "Address must be between 7 to 250 characters."
          }).trim().required(),
          webpage: Joi.string().optional().allow('').min(2).max(50).trim(),
          state: Joi.string().min(2).max(50).trim().required(),
          client_city: Joi.string().optional().allow('').min(2).max(50).trim(),
          client_status: Joi.string().trim().required().valid('Active','Inactive'),
          pincode: Joi
                      .string()
                      .trim()
                      .min(6)
                      .max(6)
                      .pattern(new RegExp(pinValidateRegEx))
                      .required(),
          organisationType: Joi.string().min(2).max(500).required().valid('Government','Private','Others'),
          clientcode: Joi.string().trim().min(4).max(20).required().pattern(new RegExp(clientCodeValidateRegEX)),
          spoke: Joi.array().items(spokeSchema),
          sector: Joi.array()
                      .items(sectorItemSchema) // Kam se kam ek sector hona chahiye (optional agar required nahi hai toh)
                      .optional()
      })

      return schema.validate(clientBody);

  } catch (err) {
      return err
  }
}


function validateClientDetails(clientBody) {

    try {

        const spokeSchema = Joi.object().keys({
          spoke_name: Joi.string().min(3).max(255).required().messages({
            'string.base': "POC Name should be a string",
            'string.empty': "POC Name should not be empty",
            'string.min': "POC Name should be a min 3 words",
            'any.required': "POC Name is required field"
          }),
          spoke_email:Joi.string().min(5).trim().max(255).email().required().messages({
            'string.base': "POC Email should be a string",
            'string.empty': "POC Email should not be empty",
            'string.min': "POC Email should be a min 3 words",
            'any.required': "POC Email is required field"
          }),
          spoke_mobile:Joi.string()
                          .optional().allow('')
                          .min(10)
                          .max(10)
                          .pattern(new RegExp(mobileValidateRegEx)).messages({
                            'string.base': "POC Mobile Number should be a string",
                            'string.empty': "POC Mobile Number should not be empty",
                            'any.required': "POC Mobile Number is required field",
                            'string.max': "POC Mobile Number length must be less than or equal to 10 characters long",
                            'string.pattern.base': 'POC Mobile Number is not valid format'
                          }),
          spoke_designation:Joi.string().optional().allow('').min(2).max(255).messages({
            'string.base': "POC Designation should be a string",
          }),
          spoke_department:Joi.string().min(2).max(255).required().messages({
            'string.base': "POC Department should be a string",
            'string.empty': "POC Department should not be empty",
            'string.min': "POC Department should be a min 3 words",
            'any.required': "POC Department is required field"
          }),
        })

        const sectorItemSchema = Joi.object().keys({
        sectorId: Joi.string()
          .trim()
          .length(24) // MongoDB ObjectId length
          .hex()
          .required()
          .messages({
            'string.length': 'Invalid Sector ID format',
          }),
        sectorName: Joi.string()
          .trim()
          .min(2)
          .max(100)
          .required()
        });

        const schema = Joi.object({
            logo_status:Joi.string().trim().required().messages({
              'string.base': "Logo Status should be a string",
              'string.empty': "Logo Status should not be empty",
              'any.required': "Logo Status is required field"
            }),
			      clientname : Joi.string().min(3).max(255).required().pattern(new RegExp(clientNameValidateRegEX)).messages({
              'string.base': "Client Name should be a string",
              'string.empty': "Client Name should not be empty",
              'any.required': "Client Name is required field"
            }),
            email: Joi.string().min(5).trim().max(255).email().required().messages({
              'string.base': "Email should be a string",
              'string.empty': "Email should not be empty",
              'any.required': "Email is required field"
            }),
            mobile: Joi.string()
                        .min(10)
                        .max(10)
                        .pattern(new RegExp(mobileValidateRegEx))
                        .messages({
                          'string.base': "Mobile Number should be a string",
                          'string.empty': "Mobile Number should not be empty",
                        }),

            landLine: Joi.string().allow('').pattern(new RegExp(landLineValidateRegEx)).messages({
              'string.pattern.base': 'Landline Number is not valid format (0000-000000)'
            }),

            address: Joi.string().min(7).max(250).trim().required(),
            webpage: Joi.string().optional().allow('').min(2).max(50).trim().pattern(urlValidateRegEx).messages({
              'string.empty': 'Website field cannot be empty.',
              'string.pattern.base': 'Website must be a valid URL',
              'any.required': 'Website field is required.'
            }),
            state: Joi.string().min(2).max(50).trim().required(),
            client_city: Joi.string().optional().allow('').min(2).max(50).trim(),
            client_status: Joi.string().trim().required().valid('Active','Inactive'),
            pincode: Joi
                        .string()
                        .trim()
                        .min(6)
                        .max(6)
                        .pattern(new RegExp(pinValidateRegEx))
                        .required(),
            organisationType: Joi.string().min(2).max(500).required().valid('Government','Private','Others'),
            clientcode: Joi.string().trim().min(4).max(20).required().pattern(new RegExp(clientCodeValidateRegEX)),

            spoke: Joi.array().items(spokeSchema), 
            sector: Joi.array()
                      .items(sectorItemSchema)
                      .optional()
        })
        return schema.validate(clientBody);

    } catch (err) {
        return err
    }
}

exports.bulkUploadClients = async (req, res, next) =>{
        
  try {

        //if(!req.file) return errorResponse(res, 400, "no file provided", "No file provided")

        const workbook = reader.readFile(req.file.path)
        const sheet_name_list = workbook.SheetNames
        let xlData = reader.utils.sheet_to_json(
          workbook.Sheets[sheet_name_list[0]]
        );
        
        if(xlData.length < 1 ){
          await fs.unlink(req.file.path)
          return errorResponse(res, 400, responseMessage.can_not_insert_empty_file, { error: responseMessage.can_not_insert_empty_file })
        }

        const stateCity = await CountryState.findOne({name:"India"})
        //stateList
        const validateState = (state) => { 
          const stateList = stateCity.states.map(item=>item.name)
          if(stateList.includes(state)){
            return false
          }else{ 
            return true
          }
        } 

        const validateCity = (state, city) => { 
          const currentState = stateCity.states.find(item=>item.name===state)
          const cityList = currentState.cities.map(item => item.name)
   
          if(cityList.includes(city)){
            return false
          }else{ 
            return true
          }
        }
    
      
        let errors 
        const records = []
        const existingEmail = []
        
        // checking duplicate value in excel
        for(let i=0; i < xlData.length; i++){
            for(let j= i+1 ; j < xlData.length ; j++){

              if(xlData[i].Email === xlData[j].Email) {
                errors = {_original:{ Email: xlData[i].Email}, message:responseMessage.duplicate_email_in_excel}
                break
              }
              if(xlData[i]['Client Code'] === xlData[j]['Client Code']) {
                errors = {_original:{ email: xlData[i].Email}, message:responseMessage.duplicate_client_code_in_excel}
                break
              }
            }
        }
        
        // checking validation for each row of excel 

        xlData.forEach((row) => 
        {

          let email = row.Email
          let address = row.Address
          let client_city = row['Client City']
          let clientcode = row['Client Code']
          let mobile = row.Mobile && row.Mobile?.toString()

          let formattedOrganisationType = row['Organisation Type']?.charAt(0).toUpperCase() 
                                        + row['Organisation Type']?.slice(1).toLowerCase()

          let organisationType = formattedOrganisationType
          let pincode = row.Pincode && row.Pincode?.toString() 
          let state = row.State

          let formattedClientStatus = row['Client Status']?.charAt(0).toUpperCase() 
                                    + row['Client Status']?.slice(1).toLowerCase()

          let client_status = formattedClientStatus
          let webpage = row.Webpage
          let clientname = row['Client Name']?.toLowerCase()
          let logo_status = "false"
          let spoke_department = row['POC Department']
          let spoke_designation = row['POC Designation']
          let spoke_email = row['POC Email'] 
          let spoke_mobile = row['POC Mobile']?.toString()
          let spoke_name = row['POC Name'] 

          
          const { value , error } = validateClientDetails({clientname, clientcode, email, mobile, pincode, 
                  address, state, client_city, organisationType, client_status, logo_status, webpage,
                    spoke: [ { spoke_name, spoke_department, spoke_designation , spoke_email, spoke_mobile} ]} )
            
          
 

          if(error){ 
            errors = error
            return false 
          }   
          else{ 
            records.push(value)

            if(validateState(state)){
              errors = {_original:{ Email: email}, message:"Not a valid state"}
              return false
            }
  
            if(validateCity(state, client_city)){
              errors = {_original:{ Email: email}, message:"Not a valid city"}
              return false
            }

            return true
          }

          
                
        })



        //checking duplicate value in the database 
        xlData.forEach((row) =>{
          const existingClient = ClientModel.findOne({ $or: [ {email:row.Email}, {clientcode: row['Client Code']}]})
          if(existingClient){
              existingEmail.push(existingClient)
          }
        })
        
        //checking for duplicate email in the db then send response accordingly
        Promise.all(existingEmail).then(async(result)=>{
          result?.forEach(value=> { 
              if(value){
                errors = {_original:{ email: value?.email}, message:responseMessage.email_or_client_code_is_already_exist}
              }
          })

          if(errors) {
            await fs.unlink(req.file.path)
            return errorResponse(res, 400, responseMessage.something_wrong, { user: errors._original.email, error: errors.message })
          } 
          else{
            const result =  await ClientModel.insertMany(records)
             if(result){
                  await fs.unlink(req.file.path)
                  const clientIds = result.map(item=>item._id)

                  const user = await UserModel.findOne({email: SUPER_ADMIN_EMAIL })
                  await UserModel.updateOne({ _id: user._id }, { $addToSet: { assigndClients: {$each: clientIds} } });
                  return sendResponse(res, 200, responseMessage.all_client_has_been_added_successfully,`${result.length} ${responseMessage.clients_has_been_added_successfully}`)
             }     
            else{
            await fs.unlink(req.file.path)
             return errorResponse(res, 400, responseMessage.something_wrong, err.message)
            }
          }

        }).catch((err)=>{
          errorResponse(res, 500, responseMessage.something_wrong, err.message)
        })
    

    } catch (error) {
        await fs.unlink(req.file.path)
        return errorResponse(res, 500, responseMessage.something_wrong, error.message)
    }
}

exports.dowloadClientSampleFile = (req, res) => {
  const filepath = `public/files/bulkuploadsamplefile`;
  const file = `${filepath}/bulkuploadsample.xlsx`;
  return res.status(200).download(file);
};














