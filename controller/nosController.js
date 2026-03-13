const Joi = require("@hapi/joi");
const { sendResponse, errorResponse } = require("../utils/response");
const responseMessage = require("../utils/responseMessage");
const { Paginate } = require("../utils/paginate");
const { getFilter } = require("../utils/custom-validators");
const nosModel = require("../models/nos-theory-model");
const nosVivaModel = require("../models/nos-viva-model");
const JobRole = require("../models/jobRole-model");
const _ = require("lodash");
const reader = require("xlsx");
const fs = require("fs/promises");
const { Console } = require("console");
const mongoose = require("mongoose");
const sanitizeExcelCell = require("../utils/excelCellSanitization");
const ObjectId = mongoose.Types.ObjectId;

exports.bulkuploadNosTheory = async (req, res, next) => {
  try {
    const { jobRole, section } = req.body;

    const jobData = await JobRole.findOne({ jobRole: jobRole });

    if(!jobData) return errorResponse(res, 400, "JobRole not found", "JobRole not found")

    let jobQPcode = jobData.qpCode.trim();
    let clientId = jobData.clientId;
    //allow only excel sheet which qpCode have same as user entered qpCode

    const workbook = reader.readFile(req.file.path);

    const sheet_name_list = workbook.SheetNames;

    let xlData = reader.utils.sheet_to_json(
      workbook.Sheets[sheet_name_list[0]],
      {
        range: 1, // Skip the first row (header row)
        header: 2, // Treat the second row as headers
      }
    );
    // Remove the "S.No" column from each row of data
    xlData = xlData.map((row) => {
      const { "S.No": _, ...rest } = row;
      return rest;
    });

    // Rename duplicate column names to make them unique
    xlData = xlData.map((row) => {
      
      const renamedRow = {};
      const columnCounts = {}; // Track occurrences of column names
      for (const columnName in row) {
        const sanitizedColumnName = columnName.replace(/\s+/g, ""); // Remove spaces
        if (columnCounts[sanitizedColumnName] === undefined) {
          columnCounts[sanitizedColumnName] = 1;
          renamedRow[sanitizedColumnName] = row[columnName];
        } else {
          columnCounts[sanitizedColumnName]++;
          renamedRow[
            `${sanitizedColumnName}_${columnCounts[sanitizedColumnName]}`
          ] = row[columnName];
        }
      }
      return renamedRow;
    });

    if (xlData.length < 1) {
      await fs.unlink(req.file.path);
      return errorResponse(
        res,
        400,
        responseMessage.can_not_insert_empty_nos_file,
        responseMessage.can_not_insert_empty_nos_file
      );
    }

    // let errors;
    let qpMessage = "";
    let errors;
    const records = [];
    const existingNOS = [];
    // Checking validation for each row of the Excel

    // checking duplicate value in excel
    for (let i = 0; i < xlData.length; i++) {
      for (let j = i + 1; j < xlData.length; j++) {
        if (xlData[i].NOS === xlData[j].NOS 
              && xlData[i].level === xlData[j].level
                && xlData[i].version === xlData[j].version ) {

          errors= {
            _original: { NOS: xlData[i].NOS },
            message: responseMessage.duplicate_nos_in_excel,
          };
          break;
        }
      }
    }
    if(errors){
      return errorResponse(res,400,errors)
   }

    //checking all the level,version are same or not 
let firstLevel = xlData[0]?.LEVEL;
let firstVersion = xlData[0]?.Version;

for (let i = 1; i < xlData.length; i++) {
  if (xlData[i]?.LEVEL !== firstLevel || xlData[i]?.Version !== firstVersion) {
    errors = {
      _original: {
        level: xlData[i]?.LEVEL,
        version: xlData[i]?.Version,
      },
      message: responseMessage?.nos_version_or_level_in_excel,
    };
    break; 
  }
}
    if(errors){
      return errorResponse(res,400,errors)
   }
    // checking validation for each row of excel
    xlData.forEach((row) => {
      let NOS =sanitizeExcelCell(row.NOS) 
      let qpCode = sanitizeExcelCell(row.QPCODE)
      let level = sanitizeExcelCell(row.LEVEL);
      let version = sanitizeExcelCell(row.Version);
      let language = sanitizeExcelCell(row.Language);
      let outOf = sanitizeExcelCell(row.Outof);
      let theory = sanitizeExcelCell(row.Theory);
      let easyNOQ = sanitizeExcelCell(row.Easy);
      let mediumNOQ = sanitizeExcelCell(row.Medium);
      let difficultNOQ = sanitizeExcelCell(row.Difficult);
      let totalNOQ = sanitizeExcelCell(row.Total);
      let easyMPQ = sanitizeExcelCell(row.Easy_1);
      let mediumMPQ = sanitizeExcelCell(row.Medium_1);
      let difficultMPQ = sanitizeExcelCell(row.Difficult_1);
      let totalMPQ = sanitizeExcelCell(row.Total_1);
      let easyTMPQ = sanitizeExcelCell(row.Easy_2);
      let mediumTMPQ = sanitizeExcelCell(row.Medium_2);
      let difficultTMPQ = sanitizeExcelCell(row.Difficult_2);
      let totalTMPQ = sanitizeExcelCell(row.Total_2);

      // allow only qp code which matched with request qpCode
      if (jobQPcode !== qpCode) {
       qpMessage = "QP code in excel row does not match the QP code of the jobRole."
        // throw new Error(
        //   `QP code '${qpCode}' in excel row does not match the QP code in the jobRole.`
        // ); //(`QP code '${qpCode}' not found`);
      }

      const { value, error } = validateNosDetails({
        NOS,
        qpCode,
        level,
        version,
        language,
        outOf,
        theory,
        easyNOQ,
        mediumNOQ,
        difficultNOQ,
        totalNOQ,
        easyMPQ,
        mediumMPQ,
        difficultMPQ,
        totalMPQ,
        easyTMPQ,
        mediumTMPQ,
        difficultTMPQ,
        totalTMPQ,
      });
      if (error) {
        errors = error;
        return false;
      } else {
        records.push(value);
        return true;
      }
    });
    


    if (qpMessage.length > 0 ){
      return errorResponse(
        res,
        400,
        '',
        qpMessage
      );
    }
    // if (validationErrors.length > 0) {
    //   const validationErrorMessage = validationErrors.join(', ');
    //   await fs.unlink(req.file.path);
      // return errorResponse(
      //   res,
      //   400,
      //   'Validation Errors',
      //   validationErrorMessage
      // );
    // }

    xlData.forEach(async (row) => {
      // const existingNosData = nosModel.findOne({
      //   $or: [{ "nosData.NOS": row.NOS }],
      // });

     let existingNosData =await nosModel.findOne({ $and: [
          // {"nosData.NOS": row.NOS},
          {"nosData.version": row.Version},
          {"nosData.qpCode": row.QPCODE},
          {"nosData.level": row.LEVEL},
          {jobRole: jobRole},
          {section: section},
        ]
      } );
      if (existingNosData) { 
        console.log("Inside ")
        return errorResponse(
            res,
            400,
            responseMessage.nos_is_already_exist,
            responseMessage.nos_is_already_exist, //'Please check your Excel sheet for valid input fields. Make sure you have the required fields with the necessary values.' errors.message //nos: errors._original.NOS,
          );
      }
      else{
        console.log("Else")
        existingNOS.push(existingNosData);
      }
    });

    Promise.all(existingNOS)
      .then(async (result) => {
        result?.forEach((value) => {
          console.log('value-->', value)
          if (value) {
            errors = {
              _original: { NOS: value.NOS },
              message: responseMessage.nos_is_already_exist,
            };
          }
        });
        if (errors) {
          await fs.unlink(req.file.path);
          return errorResponse(
            res,
            400,
            responseMessage.something_wrong,
            errors.message //'Please check your Excel sheet for valid input fields. Make sure you have the required fields with the necessary values.' errors.message //nos: errors._original.NOS,
          );
        } else {
          const newTheorynos =await new nosModel({
            jobRole: jobRole,
            section: section,
            clientId:clientId,
            nosData: records,
          });

          const result = await newTheorynos.save();

          // const result = await nosModel.insertMany(records);
          if (result) {
            await fs.unlink(req.file.path);
            return sendResponse(
              res,
              200,
              responseMessage.all_nos_has_been_added_successfully,
              `${responseMessage.nos_has_been_added_successfully}` //${result.length}
            );
          } else {
            await fs.unlink(req.file.path);
            return errorResponse(
              res,
              400,
              responseMessage.something_wrong,
              err.message
            );
          }
        }
      })
      .catch(async(err) => {
        await fs.unlink(req.file.path);
        errorResponse(res, 500, responseMessage.something_wrong, err.message);
      });
  } catch (error) {
    await fs.unlink(req.file.path);
    return errorResponse(
      res,
      500,
      responseMessage.something_wrong,
      error.message
    );
  }
};

exports.dowloadNosTheorySampleFile = (req, res) => {
  const filepath = `public/files/bulkuploadsamplefile`;
  const file = `${filepath}/bulkuploadNosTheorysample.xlsx`;
  return res.status(200).download(file);
};

exports.dowloadNosVivaSampleFile = (req, res) => {
  const filepath = `public/files/bulkuploadsamplefile`;
  const file = `${filepath}/bulkuploadNosVivasample.xlsx`;
  return res.status(200).download(file);
};
module.exports.changeNosStatus = async (req, res) => {
  try {
    const { error } = validateStatusChange(req.body);
    if (error)
      return errorResponse(
        res,
        400,
        responseMessage.request_invalid,
        error.message
      );
    const { status, nos_id,section } = req.body;
    let change = (status == 'active') ? 'active' : 'inactive';
  
    const updateStatus = await section=='theory'?await nosModel.findByIdAndUpdate(nos_id, { status: change }):await nosVivaModel.findByIdAndUpdate(nos_id, { status: change });
    
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
module.exports.nosTheoryList = async (req, res) => {
  try {
    const { page, limit, skip, sortOrder } = await Paginate(req);
    let filter = getFilter(req, ["NOS", "qpCode", "jobRole"]);

    let query = filter ? filter.query : {};
    const totalCounts = await nosModel.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);
    const nosDetails = await nosModel
      .find(query)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    const nosDetailsWithIndex = nosDetails.map((data, index) => ({
      index: index,
      data: data,
    }));

    if (!nosDetails)
      return errorResponse(
        res,
        400,
        responseMessage.nos_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, responseMessage.nos_found, {
      nosDetails,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

exports.bulkuploadNosViva = async (req, res, next) => {
  try {
    const { jobRole, section } = req.body;
    const jobData = await JobRole.findOne({ jobRole: jobRole });
    // const jobData = await JobRole.findById("673c68ecbe8038bc82d4db0b")
    let clientId = jobData.clientId;
    let jobQPcode = jobData.qpCode;

    const workbook = reader.readFile(req.file.path);
    const sheet_name_list = workbook.SheetNames;

    let xlData = reader.utils.sheet_to_json(
      workbook.Sheets[sheet_name_list[0]],
      {
        range: 1, // Skip the first row (header row)
        header: 2, // Treat the second row as headers
      }
    );


    // Remove the "S.No" column from each row of data
    xlData = xlData.map((row) => {
      const { "S.No": _, ...rest } = row;
      return rest;
    });


    // Rename duplicate column names to make them unique
    xlData = xlData.map((row) => {
      const renamedRow = {};
      const columnCounts = {}; // Track occurrences of column names
      for (const columnName in row) {
        const sanitizedColumnName = columnName.replace(/\s+/g, ""); // Remove spaces
        if (columnCounts[sanitizedColumnName] === undefined) {
          columnCounts[sanitizedColumnName] = 1;
          renamedRow[sanitizedColumnName] = row[columnName];
        } else {
          columnCounts[sanitizedColumnName]++;
          renamedRow[
            `${sanitizedColumnName}_${columnCounts[sanitizedColumnName]}`
          ] = row[columnName];
        }
      }
      return renamedRow;
    });


    if (xlData.length < 1) {
      await fs.unlink(req.file.path);
      return errorResponse(
        res,
        400,
        responseMessage.can_not_insert_empty_nos_file,
        responseMessage.can_not_insert_empty_nos_file
      );
    }

    let errors;
    const records = [];
    const existingNOS = [];
    const theoryNosLIst = []

    // checking duplicate value in excel
    // for (let i = 0; i < xlData.length; i++) {
    //   for (let j = i + 1; j < xlData.length; j++) {
    //     if (xlData[i].NOS === xlData[j].NOS) {
    //       errors = {
    //         _original: { NOS: xlData[i].NOS },
    //         message: responseMessage.duplicate_nos_in_excel,
    //       };
    //       break;
    //     }
    //   }
    // }

    for (let i = 0; i < xlData.length; i++) {
      for (let j = i + 1; j < xlData.length; j++) {
        if (xlData[i].NOS === xlData[j].NOS 
              && xlData[i].level === xlData[j].level
                && xlData[i].version === xlData[j].version ) {
          errors = {
            _original: { NOS: xlData[i].NOS },
            message: responseMessage.duplicate_nos_in_excel,
          };
          
          break;
        }
      }
    }
    if(errors){
       return errorResponse(res,400,errors)
    }
    // checking validation for each row of excel
    xlData.forEach((row) => {
      let NOS = row.NOS?.trim();
      let qpCode = row.QPCODE;
      let level = row.LEVEL;
      let version = row.Version;
      let language = row.Language;
      let outOf = row.Outof;
      let viva = row.Viva;
      let practical = row.Practical;
      let vivaNOQ = row.Viva_1;
      let practicalNOQ = row.Practical_1;
      let vivaMPQ = row.Viva_2;
      let practicalMPQ = row.Practical_2;
      let vivaTM = row.Viva_3;
      let practicalTM = row.Practical_3;

      if (jobQPcode !== qpCode) {
        throw new Error(
          `QP code '${qpCode}' in excel row does not match the QP code in the jobRole.`
        ); //(`QP code '${qpCode}' not found`);
      }
      // console.log("COMING HERE");
      
      const { value, error } = validateNosVivaDetails({
        NOS,
        qpCode,
        level,
        version,
        language,
        outOf,
        viva,
        practical,
        vivaNOQ,
        practicalNOQ,
        vivaMPQ,
        practicalMPQ,
        vivaTM,
        practicalTM,
      });

      if (error) {
        errors = error;
        return false;
      } else {
        records.push(value);
        return true;
      }
    });

    xlData.forEach((row) => {
      // const existingNosData = nosVivaModel.findOne({
      //   $and: [{ "nosData.NOS": row.NOS }, {"nosData.qpCode":jobData.qpCode} ],
      // });

      // checking in viva/practical model 
      const existingNosData = nosVivaModel.findOne({ $and: [
        {"nosData.NOS": row.NOS?.trim()},
        {"nosData.version": row.Version},
        {"nosData.level": row.LEVEL},
        {jobRole: jobRole},
        {section: section},

      ]

      } )

      // checking in viva/practical model 
      // const existingNosDataInTheory = nosModel.findOne({ $and: [
      //   {"nosData.NOS": row.NOS?.trim()},
      //   {"nosData.version": row.Version},
      //   {"nosData.level": row.LEVEL},
      //   {jobRole: jobRole},
      //   {section: "Theory"}
      // ]

      // } )
      // console.log('existingNosDataInTheory-->', existingNosDataInTheory)
      // if (existingNosDataInTheory) {
      //   theoryNosLIst.push(existingNosDataInTheory);
      // }
    
      if (existingNosData) {
        existingNOS.push(existingNosData);
      }
    });
    //console.log('existingNOS-->',existingNOS)

    // const theoryPromise = await Promise.all(theoryNosLIst)
    
    // console.log('theoryPromise-->', theoryPromise)

    // const existingTheoryNos = theoryPromise.some(item=> item === null)
    // console.log('existingTheoryNos-->', existingTheoryNos)

    // if(existingTheoryNos || theoryPromise===null){
    //   return errorResponse(
    //     res,
    //     400,
    //     "Nos not found in theory" ,
    //     "Nos not found in theory" 
    //   )
    // }

    Promise.all(existingNOS)
      .then(async (result) => {
        result?.forEach((value) => {
          if (value) {
            // console.log('value-->', value)
            errors = {
              _original: { NOS: value.NOS },
              message: "nos already exist",
            };
          }
        });

        // console.log('result-->', result)
        // if (result) {
          
        //   errors = {
        //     _original: { NOS: result.NOS },
        //     message: "nos already exist",
        //   };
        // }

        if (errors) {
          await fs.unlink(req.file.path);
          return errorResponse(
            res,
            400,
            responseMessage.something_wrong,
            errors.message
          );
        } else {


          let result
          let existingBlueprint  = await nosVivaModel.findOne({ $and: [
              {"nosData.version": xlData[0].Version},
              {"nosData.level": xlData[0].LEVEL},
              {jobRole: jobRole},
              {section: section},
    
            ]
    
            } )

          console.log('existingBlueprint-->', existingBlueprint)  

          if(existingBlueprint){

            existingBlueprint.nosData.push(...records)
            result = await existingBlueprint.save()

          }
          else{ 
            const newVivanos = new nosVivaModel({
              jobRole: jobRole,
              section: section,
              clientId:clientId,
              nosData: records,
            });
  
            result = await newVivanos.save();
          }

        

          //const result = await nosVivaModel.insertMany(records);
          if (result) {
            await fs.unlink(req.file.path);
            return sendResponse(
              res,
              200,
              responseMessage.all_nos_has_been_added_successfully,
              `${responseMessage.nos_has_been_added_successfully}`
            );
          } else {
            await fs.unlink(req.file.path);
            return errorResponse(
              res,
              400,
              responseMessage.something_wrong,
              err.message
            );
          }
        }
      })
      .catch(async (err) => {
        await fs.unlink(req.file.path);
        errorResponse(res, 500, responseMessage.something_wrong, err.message);
      });
  } catch (error) {
    console.log("error-->", error);
    
    await fs.unlink(req.file.path);
    // responseMessage.something_wrong,
    return errorResponse(
      res,
      500,
      JSON.stringify(error),
      error.message
    );
  }
};

module.exports.nosVivalist = async (req, res) => {
  try {
    const { page, limit, skip, sortOrder } = await Paginate(req);
    let filter = getFilter(req, ["NOS", "qpCode", "jobRole"]);

    let query = filter ? filter.query : {};
    const totalCounts = await nosVivaModel.countDocuments(query);
    const totalPages = Math.ceil(totalCounts / limit);
    const nosDetails = await nosVivaModel
      .find(query)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    if (!nosDetails)
      return errorResponse(
        res,
        400,
        responseMessage.nos_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, responseMessage.nos_found, {
      nosDetails,
      page,
      totalCounts,
      totalPages,
    });
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.getTheoryNosById = async (req, res) => {
  try {
    const theorynosId = req.params.id;

    const theorynosDetail = await nosModel.findById(theorynosId);

    if (!theorynosDetail)
      return errorResponse(
        res,
        400,
        responseMessage.nosId_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, responseMessage.nosId_found, theorynosDetail);
  } catch (arror) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.getVivaNosById = async (req, res) => {
  try {
    const vivanosId = req.params.id;

    const vivanosDetail = await nosVivaModel.findById(vivanosId);

    if (!vivanosDetail)
      return errorResponse(
        res,
        400,
        responseMessage.nosId_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(res, 200, responseMessage.nosId_found, nosDetail);
  } catch (arror) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.getallNosList = async (req, res) => {
  try {
    const { nos } = req.query;
    if (nos === "Theory") {
      const { page, limit, skip, sortOrder } = await Paginate(req);
      let filter = getFilter(req, ["NOS", "qpCode", "jobRole"],true);
       
      let query = filter ? filter.query : {};
      const totalCounts = await nosModel.countDocuments(query);
      const totalPages = Math.ceil(totalCounts / limit);
      const nosDetails = await nosModel
        .find(query)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit);

      if (!nosDetails)
        return errorResponse(
          res,
          400,
          responseMessage.nos_not_found,
          responseMessage.errorMessage
        );

      return sendResponse(res, 200, responseMessage.nos_found, {
        nosDetails,
        page,
        totalCounts,
        totalPages,
      });
    }

    if (nos === "viva" || nos === "practical") {
      const { page, limit, skip, sortOrder } = await Paginate(req);
      //let filter = getFilter(req, ["NOS", "qpCode", "jobRole"]);
      let filter = getFilter(req, ["NOS", "qpCode", "jobRole"],true);

      let query = filter ? filter.query : {};
      const totalCounts = await nosVivaModel.countDocuments(query);
      const totalPages = Math.ceil(totalCounts / limit);
      const nosDetails = await nosVivaModel
        .find(query)
        .sort(sortOrder)
        .skip(skip)
        .limit(limit);

      if (!nosDetails)
        return errorResponse(
          res,
          400,
          responseMessage.nos_not_found,
          responseMessage.errorMessage
        );

      return sendResponse(res, 200, responseMessage.nos_found, {
        nosDetails,
        page,
        totalCounts,
        totalPages,
      });
    }

    if (nos === "All") {
      const { page, limit, skip } = await Paginate(req);
      let filter = getFilter(req, ["NOS", "qpCode", "jobRole"],true);

      let query = filter ? filter.query : {};
      const [nosTheoryCounts, nosVivaCounts] = await Promise.all([
        nosModel.countDocuments(query),
        nosVivaModel.countDocuments(query),
      ]);

      // Sum the counts from both models
      const totalCounts = nosTheoryCounts + nosVivaCounts;
      // const nosTheoryCounts = await nosModel.countDocuments(query);
      const totalPages = Math.ceil(totalCounts / limit);

      const nosTheoryDetails = await nosModel
        .find({ ...query, section: "Theory" })
        .sort({ "nosData.createdAt": 1 })
       
      const nosVivaDetails = await nosVivaModel
       .find({
        ...query,
        section: { $in: ["viva", "practical"] },
      })
       // .sort({ "nosData.createdAt": -1 })
       .sort({ "nosData.createdAt": 1 })
     

      let allnos = [...nosTheoryDetails, ...nosVivaDetails].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      )//.slice(0, 10); // Set your desired limit;
    
    allnos = allnos.slice(skip, (page * limit));
   
      return sendResponse(res, 200, responseMessage.nos_found, {
        allnos,
        page,
        totalCounts,
        totalPages,
      });
    }
  } catch (err) {
    return errorResponse(res, 500, responseMessage.errorMessage, err.message);
  }
};

module.exports.getnosDetailById = async (req, res) => {
  try {
    const nosId = req.params.id;

    const theorynosDetail = await nosModel.findById(nosId);
    const vivanosDetail = await nosVivaModel.findById(nosId);

    if (theorynosDetail) {
      // If the document is found in the theorynosModel, send the response
      return sendResponse(
        res,
        200,
        responseMessage.nosId_found,
        theorynosDetail
      );
    } else if (vivanosDetail) {
      // If the document is found in the vivanosModel, send the response
      return sendResponse(res, 200, responseMessage.nosId_found, vivanosDetail);
    } else {
      // If the document is not found in either model, send an error response
      return errorResponse(
        res,
        400,
        responseMessage.nosId_not_found,
        responseMessage.errorMessage
      );
    }
  } catch (err) {
    return errorResponse(res, 500, responseMessage.errorMessage, err.message);
  }
};

module.exports.updateNosDetail = async (req, res) => {
  try {
    //---->started code
    const updates = req.body.updates;
    const nosId = req.body.nosId;
    const nosupdateId = req.body.updatenosId;

    // Convert the nosId to a Mongoose ObjectId
    const nestedObjectId = new ObjectId(nosupdateId);

    // Find the main document that matches the nosId and nestedObjectId
    const query = {
      _id: nosId, // Match the main document _id
      "nosData._id": nestedObjectId, // Match the nested _id within nosData
    };

    // Create an object that contains the update fields
    const updateFields = {};
    for (const update of updates) {
      const fieldName = `nosData.$.${update.fieldName}`;
      updateFields[fieldName] = update.newValue;
    }

    // Use findOneAndUpdate to update the specific element within the array
    const updatedDocument = await nosModel.findOneAndUpdate(
      query,
      { $set: updateFields },
      { new: true } // This option returns the updated document
    );

    if (!updatedDocument) {
      return errorResponse(
        res,
        404,
        "No matching document found for update",
        "No matching document was found for the update operation."
      );
    }
    if (updatedDocument) {
      return sendResponse(
        res,
        200,
        responseMessage.nos_update,
        updatedDocument
      );
    }
  } catch (err) {
    return errorResponse(res, 500, responseMessage.errorMessage, err.message);
  }
};

module.exports.removeNosDetail = async (req, res) => {
  try {
    const nosId = req.params.id;
    const theorynosDetail = await nosModel.findById(nosId);
    const vivanosDetail = await nosVivaModel.findById(nosId);

    if (theorynosDetail) {
      const result = await nosModel.deleteOne({ _id: nosId });

      // If the document is found in the theorynosModel, send the response
      return sendResponse(res, 200, responseMessage.nos_delete, result);
    } else if (vivanosDetail) {
      const result = await nosVivaModel.deleteOne({ _id: nosId });

      // If the document is found in the vivanosModel, send the response
      return sendResponse(res, 200, responseMessage.nos_delete, result);
    } else {
      // If the document is not found in either model, send an error response
      return errorResponse(
        res,
        400,
        responseMessage.nosId_not_found,
        responseMessage.errorMessage
      );
    }
  } catch (err) {
    return errorResponse(res, 500, responseMessage.errorMessage, err.message);
  }
};

//filtered nos by section and jobrole
module.exports.getallNosListBySection = async (req, res) => {
  try {
    const { jobRole, section } = req.query;
    const { page, limit, skip, sortOrder } = await Paginate(req);
    let filter = getFilter(req, ["NOS", "qpCode"]);
    const jobRoleDetails=await JobRole.findById(jobRole)
    let query = filter ? filter.query : {};
    query.jobRole = jobRoleDetails.jobRole; // Filter by jobRole

    let nosModelToSearch;
    if (section === "Theory") {
      nosModelToSearch = nosModel;
    } else if (section === "viva" || section === "practical") {
      nosModelToSearch = nosVivaModel;
    }

    if (!nosModelToSearch) {
      return errorResponse(
        res,
        400,
        responseMessage.section_not_found,
        responseMessage.errorMessage
      );
    }

    const totalCounts = await nosModelToSearch.countDocuments(query);
    const nosDetails = await nosModelToSearch
      .find(query)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    if (!nosDetails)
      return errorResponse(
        res,
        400,
        responseMessage.nos_not_found,
        responseMessage.errorMessage
      );

    nosDetails.map(item=>{ 
        item.nosData.forEach(nos=>{ 
            nos.NOS = nos.NOS + " {[( " + " Level " +nos.level + ", "+ " Version " +nos.version + " )]}";
        })
    })
    
    return sendResponse(res, 200, responseMessage.nos_found, {
      nosDetails,
      page,
      totalCounts,
      totalPages: Math.ceil(totalCounts / limit),
    });
  } catch (err) {
    return errorResponse(res, 500, responseMessage.errorMessage, err.message);
  }
};


//nos status
// exports.nosStatusChange = async (req, res) => {
//   try {
//     const getNosId = req.params.id;
    
//     // Find the existing assessor
//     const existingNos = await nosModel.findById(getNosId);
//     console.log("existingNOS===>",existingNos)
//     const existingVivaNos = await nosVivaModel.findById(getNosId);
//     console.log("existingVivaNOS===>",existingVivaNos)
    
//     if (!existingNos && !existingVivaNos)
//       return errorResponse(
//         res,
//         400,
//         'NOS not found',//responseMessage.assessor_not_found,
//         responseMessage.errorMessage
//       );
  
//       if(existingNos.section === 'Theory'){
//     // Check if the new status is the same as the current status
//     if (existingNos.client_status === req.body.status) {
//       return errorResponse(
//         res,
//         400,
//         responseMessage.status_same_exists,
//         responseMessage.errorMessage
//       );
//     }

//     const updatedNos = await nosModel.findByIdAndUpdate(
//       getNosId,
//       { status: req.body.status },
//       { new: true }
//     );

//     if (!updatedNos)
//       return errorResponse(
//         res,
//         400,
//         responseMessage.status_not_change,
//         responseMessage.errorMessage
//       );

//     return sendResponse(
//       res,
//       200,
//       responseMessage.status_change,
//       updatedNos
//     );

//   }  
//   if(existingVivaNos.section === 'viva' || existingVivaNos.section === 'practical' ){
//     if (existingVivaNos.status === req.body.status) {
//       return errorResponse(
//         res,
//         400,
//         responseMessage.status_same_exists,
//         responseMessage.errorMessage
//       );
//     }

//     const updatedNos = await nosVivaModel.findByIdAndUpdate(
//       getNosId,
//       { status: req.body.status },
//       { new: true }
//     );

//     if (!updatedNos)
//       return errorResponse(
//         res,
//         400,
//         responseMessage.status_not_change,
//         responseMessage.errorMessage
//       );

//     return sendResponse(
//       res,
//       200,
//       responseMessage.status_change,
//       updatedNos
//     );
//   }
//   } catch (error) {
//     return errorResponse(res, 500, responseMessage.errorMessage, error.message);
//   }
// };
exports.nosStatusChange = async (req, res) => {
  try {
    const getNosId = req.params.id;

    const existingNos = await nosModel.findById(getNosId);
    const existingVivaNos = await nosVivaModel.findById(getNosId);

    if (!existingNos && !existingVivaNos) {
      return errorResponse(
        res,
        400,
        'NOS not found',
        responseMessage.errorMessage
      );
    }

    let updatedNos;

    if (existingNos && existingNos.section === 'Theory') {
      if (existingNos.client_status === req.body.status) {
        return errorResponse(
          res,
          400,
          responseMessage.status_same_exists,
          responseMessage.errorMessage
        );
      }

      updatedNos = await nosModel.findByIdAndUpdate(
        getNosId,
        { status: req.body.status },
        { new: true }
      );
    } else if (
      existingVivaNos &&
      (existingVivaNos.section === 'viva' || existingVivaNos.section === 'practical')
    ) {
      if (existingVivaNos.status === req.body.status) {
        return errorResponse(
          res,
          400,
          responseMessage.status_same_exists,
          responseMessage.errorMessage
        );
      }

      updatedNos = await nosVivaModel.findByIdAndUpdate(
        getNosId,
        { status: req.body.status },
        { new: true }
      );
    }

    if (!updatedNos) {
      return errorResponse(
        res,
        400,
        responseMessage.status_not_change,
        responseMessage.errorMessage
      );
    }

    return sendResponse(
      res,
      200,
      responseMessage.status_change,
      updatedNos
    );

  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};


function validateNosDetails(nosBody) {
  try {
    const schema = Joi.object({
      NOS: Joi.string().required().messages({
        "any.required": "NOS is required.",
        "string.base": "NOS must be a string.",
      }),
      qpCode: Joi.string().required().messages({
        // "string.min": "QP code must be at least 1 character long.",
        // "string.max": "QP code cannot be longer than 255 characters.",
        "any.required": "QP code is required.",
      }),
      level: Joi.number().required().messages({
        // "number.min": "Level must be at least 0.",
        // "number.max": "Level cannot exceed 255.",
        "any.required": "Level is required.",
        "number.base": "Level must be a number.",
      }),
      language: Joi.string().min(1).max(50).required().messages({
        "string.min": "Language must be at least 3 character long.",
        "string.max": "Language cannot be longer than 20 characters.",
        "any.required": "Language is required.",
        "string.base": "Language must be alphabet",
      }),
      version: Joi.number().min(0).required().messages({
         "number.min": "Version must be at least 0.",
        // "number.max": "Version cannot exceed 255.",
        "any.required": "Version is required.",
        "number.base": "Version must be a number.",
      }),
      outOf: Joi.number().min(0).required().messages({
         "number.min": "OutOf must be at least 0.",
        // "number.max": "OutOf cannot exceed 1000.",
       // "number.greater": "OutOf must be greater than 0",
        "any.required": "OutOf is required.",
        "number.base": "OutOf must be a number.",
      }),
      theory: Joi.number().min(0).required().messages({
         "number.min": "Theory must be at least 0.",
        // "number.max": "Theory cannot exceed 1000.",
        //"number.greater": "Theory must be greater than 0",
        "any.required": "Theory is required.",
        "number.base": "Theory must be a number.",
      }),
      easyNOQ: Joi.number().min(0).required().messages({
         "number.min": "Easy-level No. of questions must be at least 0.",
        // "number.max": "Easy-level No. of questions cannot exceed 255.",
       // "number.greater": "Easy-level No. of questions must be greater than 0",
        "any.required": "Easy-level No. of questions is required.",
        "number.base": "Easy-level No. of questions must be a number.",
      }),
      mediumNOQ: Joi.number().min(0).required().messages({
         "number.min": "Medium-level No. of questions must be at least 0.",
        // "number.max": "Medium-level No. of questions cannot exceed 255.",
       // "number.greater": "Medium-level No. of questions must be greater than 0",
        "any.required": "Medium-level No. of questions is required.",
        "number.base": "Medium-level No. of questions must be a number.",
      }),
      difficultNOQ: Joi.number().min(0).required().messages({
         "number.min": "Difficult-level No. of questions must be at least 0.",
        // "number.max": "Difficult-level No. of questions cannot exceed 255.",
       // "number.greater": "Difficult-level No. of questions must be greater than 0",
        "any.required": "Difficult-level No. of questions is required.",
        "number.base": "Difficult-level No. of questions must be a number.",
      }),
      totalNOQ: Joi.number().min(0).required().messages({
        "number.min": "Total No. of questions must be at least 0.",
        // "number.max": "Total No. of questions cannot exceed 255.",
        //"number.greater": "Total No. of questions must be greater than 0",
        "any.required": "Total No. of questions is required.",
        "number.base": "Total No. of questions must be a number.",
      }),
      easyMPQ: Joi.number().min(0).required().messages({
         "number.min": "Easy-level marks per question must be at least 0.",
        // "number.max": "Easy-level marks per question cannot exceed 255.",
       // "number.greater": "Easy-level marks per questions must be greater than 0",
        "any.required": "Easy-level marks per question is required.",
        "number.base": "Easy-level marks per question must be a number.",
      }),
      mediumMPQ: Joi.number().min(0).required().messages({
         "number.min": "Medium-level marks per question must be at least 0.",
        // "number.max": "Medium-level marks per question cannot exceed 255.",
       // "number.greater": "Medium-level marks per questions must be greater than 0",
        "any.required": "Medium-level marks per question is required.",
        "number.base": "Medium-level marks per question must be a number.",
      }),

      difficultMPQ: Joi.number().min(0).required().messages({
         "number.min": "Difficult-level marks per question must be at least 0.",
        // "number.max": "Difficult-level marks per question cannot exceed 255.",
       // "number.greater": "Difficult-level marks per questions must be greater than 0",
        "any.required": "Difficult-level marks per question is required.",
        "number.base": "Difficult-level marks per question must be a number.",
      }),
      totalMPQ: Joi.number().min(0).required().messages({
         "number.min": "Total marks per question must be at least 0.",
        // "number.max": "Total marks per question cannot exceed 255.",
       // "number.greater": "Total marks per questions must be greater than 0",
        "any.required": "Total marks per question is required.",
        "number.base": "Total marks per question must be a number.",
      }),
      easyTMPQ: Joi.number().min(0).required().messages({
         "number.min":
           "The total marks per easy-level question must be at least 0.",
        // "number.max":
        //   "The total marks per easy-level question cannot exceed 255.",
       // "number.greater": "The total marks per easy-level questions must be greater than 0",
        "any.required": "The total marks per easy-level question is required.",
        "number.base":
          "The total marks per easy-level question must be a number.",
      }),
      mediumTMPQ: Joi.number().min(0).required().messages({
         "number.min":
           "The total marks per medium-level question must be at least 0.",
        // "number.max":
        //   "The total marks per medium-level question cannot exceed 255.",
        //"number.greater": "The total marks per medium-level questions must be greater than 0",
        "any.required":
          "The total marks per medium-level question is required.",
        "number.base":
          "The total marks per medium-level question must be a number.",
      }),
      difficultTMPQ: Joi.number().min(0).required().messages({
         "number.min":
           "The total marks per difficult-level question must be at least 0.",
        // "number.max":
        //   "The total marks per difficult-level question cannot exceed 255.",
        //"number.greater": "The total marks per difficult-level questions must be greater than 0",
        "any.required":
          "The total marks per difficult-level question is required.",
        "number.base":
          "The total marks per difficult-level question must be a number.",
      }),
      totalTMPQ: Joi.number().min(0).required().messages({
         "number.min": "Total marks per question must be at least 0.",
        // "number.max": "Total marks per question cannot exceed 255.",
       // "number.greater": "Total marks per questions must be greater than 0",
        "any.required": "Total marks per question is required.",
        "number.base": "Total marks per question must be a number.",
      }),
    });
    return schema.validate(nosBody);
  } catch (err) {
    return err;
  }
}
function validateStatusChange(body) {
  try {
    const schema = Joi.object({
      nos_id: Joi.string().required(),
      section:Joi.string().required(),
      status: Joi.string().required(),
    });
    return schema.validate(body);
  } catch (err) {
    console.log(err);
  }
}

function validateNosVivaDetails(nosBody) {
  try {
    const schema = Joi.object({
      NOS: Joi.string().required().messages({
        "any.required": "NOS is required.",
        "string.base": "NOS must be a string.",
      }),
      qpCode: Joi.string().required().messages({
        // "string.min": "QP code must be at least 1 character long.",
        // "string.max": "QP code cannot be longer than 255 characters.",
        "any.required": "QP code is required.",
      }),
      level: Joi.number().min(0).required().messages({
        // "number.min": "Level must be at least 0.",
        // "number.max": "Level cannot exceed 50.",
        "any.required": "Level is required.",
        "number.base": "Level must be a number.",
      }),
      language: Joi.string().min(2).max(50).required().messages({
        "string.min": "Language must be at least 3 character long.",
        "string.max": "Language cannot be longer than 50 characters.",
        "any.required": "Language is required.",
        "string.base": "Language must be alphabet",
      }),
      version: Joi.number().min(0).required().messages({
         "number.min": "Version must be at least 0.",
        // "number.max": "Version cannot exceed 255.",
        "any.required": "Version is required.",
        "number.base": "Version must be a number.",
      }),
      outOf: Joi.number().min(0).required().messages({
         "number.min": "OutOf must be at least 0.",
        // "number.max": "OutOf cannot exceed 255.",
        //"number.greater": "OutOf must be greater than 0",
        "any.required": "OutOf is required.",
        "number.base": "OutOf must be a number.",
      }),
      viva: Joi.number().min(0).required().messages({
        "number.min": "Viva marks must be at least 0.",
        // "number.max": "Viva marks cannot exceed 255.",
        //"number.greater": "OutOf must be greater than 0",
        "any.required": "Viva marks is required.",
        "number.base": "Viva marks must be a number.",
      }),
      practical: Joi.number().min(0).required().messages({
         "number.min": "Practical marks must be at least 0.",
        // "number.max": "Practical marks cannot exceed 255.",
        //"number.greater": "practical marks must be greater than 0",
        "any.required": "Practical marks is required.",
        "number.base": "Practical marks must be a number.",
      }),
      vivaNOQ: Joi.number().min(0).required().messages({
         "number.min": "Viva No. of questions must be at least 0.",
        // "number.max": "Viva No. of questions cannot exceed 255.",
       // "number.greater": "Viva No. of questions must be greater than 0",
        "any.required": "Viva No. of questions is required.",
        "number.base": "Viva No. of questions must be a number.",
      }),
      practicalNOQ: Joi.number().min(0).required().messages({
         "number.min": "Practical No. of questions must be at least 0.",
        // "number.max": "Practical No. of questions cannot exceed 255.",
        //"number.greater": "Practical No. of questions must be greater than 0",
        "any.required": "Practical No. of questions is required.",
        "number.base": "Practical No. of questions must be a number.",
      }),
      vivaMPQ: Joi.number().min(0).required().when('vivaNOQ', {
          is: Joi.number().greater(0), // Condition: fieldA > 0
          then: Joi.number().min(1).messages({
            'number.min': 'viva marks per question must be at least 1 when viva number count is greater than 0',
          }),
        })
        .messages({
          "number.min": "Viva marks per question must be at least 0.",
          // "number.max": "Viva marks per question cannot exceed 255.",
          //"number.greater": "Viva marks per questions must be greater than 0",
          "any.required": "Viva marks per question is required.",
          "number.base": "Viva marks per question must be a number.",
      }),
      practicalMPQ: Joi.number().min(0).required().when('practicalNOQ', {
        is: Joi.number().greater(0), // Condition: fieldA > 0
        then: Joi.number().min(1).messages({
          'number.min': 'practical marks per question must be at least 1 when practical number count is greater than 0',
        }),
        })
        .messages({
         "number.min": "Practical marks per question must be at least 0.",
        // "number.max": "Practical marks per question cannot exceed 255.",
        //"number.greater": "Practical marks per questions must be greater than 0",
        "any.required": "Practical marks per question is required.",
        "number.base": "Practical marks per question must be a number.",
      }),
      vivaTM: Joi.number().min(0).required().messages({
         "number.min": "Viva total marks must be at least 0.",
        // "number.max": "Viva total marks cannot exceed 255.",
        //"number.greater": "Viva total marks must be greater than 0",
        "any.required": "Viva total marks is required.",
        "number.base": "Viva total marks must be a number.",
      }),
      practicalTM: Joi.number().min(0).required().messages({
         "number.min": "Practical total marks must be at least 0.",
        // "number.max": "Practical total marks cannot exceed 255.",
        //"number.greater": "Practical total marks must be greater than 0",
        "any.required": "Practical total marks is required.",
        "number.base": "Practical total marks must be a number.",
      }),
    });

    return schema.validate(nosBody);
  } catch (err) {
    return err;
  }
}
