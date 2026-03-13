const Joi = require("@hapi/joi");
const instructionModel = require("../models/instruction-model");
const { sendResponse, errorResponse } = require("../utils/response");
const responseMessage = require("../utils/responseMessage");
const { getFilter } = require("../utils/custom-validators");
const { Paginate } = require("../utils/paginate");

module.exports.addInstruction = async (req, res) => {
  try {
    
    const { instructions,instructionListId, instructionName, languagesToDelete } = req.body;
    
    let instructionautoId = `ID${Math.floor(1000 + Math.random() * 9000)}`;

    
    // Check if the provided instructionListId exists
    const isExistInstructionId = await instructionModel.findById(instructionListId);
    
    if (isExistInstructionId) {
    
       // If languages to delete are provided, filter out those instructions
       if (Array.isArray(languagesToDelete) && languagesToDelete.length > 0) {
        const deleteLangs = languagesToDelete.map(lang => lang.toLowerCase());

        isExistInstructionId.instructions = isExistInstructionId.instructions.filter(
          existingInstr => !deleteLangs.includes(existingInstr.language.toLowerCase())
        );
      }

      //Only check for duplicates and add new instructions if instructions are provided
  if (Array.isArray(instructions) && instructions.length > 0) {
    const existingLangs = isExistInstructionId.instructions.map(instr => instr.language.toLowerCase());

    const duplicateLangs = instructions
      .map(instr => instr.language.toLowerCase())
      .filter(lang => existingLangs.includes(lang));

    if (duplicateLangs.length > 0) {
      return errorResponse(
        res,
        400,
        "Duplicate languages not allowed.",
        `Instructions already exist for languages: ${duplicateLangs.join(', ')}`
      );
    }

    const newInstructions = instructions.map(instr => ({
      language: instr.language,
      instructionDescription: instr.description
    }));

    isExistInstructionId.instructions.push(...newInstructions);
  }
   //save the updated document 
      const saveInstruction = await isExistInstructionId.save();
    
      if (saveInstruction) {
        return sendResponse(
          res,
          200,
          responseMessage.instruction_create,
          saveInstruction
        );
      } else {
        return errorResponse(
          res,
          400,
          responseMessage.instruction_create,
          responseMessage.errorMessage
        );
      }
    } else {

      // Validate that instructions is an array and contains at least one instruction
    if (!Array.isArray(instructions) || instructions.length === 0) {
      return errorResponse(
        res,
        400,
        "Instructions must be a non-empty.",
        "Instructions must be a non-empty."
      );
    }

      // Check for duplicate instruction by name for new instructions
      const isExistInstruction = await instructionModel.findOne({
        instructionName: instructionName
      });
 
      if (isExistInstruction) {
        return errorResponse(
          res,
          400,
          responseMessage.instruction_already_register,
          responseMessage.instruction_already_register
        );
      }


      // Check if primary language is not in English
    const hasNonEnglish = instructions.some(instr => instr.language.toLowerCase() !== 'english');
    if (hasNonEnglish) {
        return errorResponse(
        res,
        400,
        "Primary language must be English.",
        "Only English is allowed as primary instruction language"
    );
}

      // Prepare new instruction model data
      const newInstructionModel = new instructionModel({
        instructions: instructions.map(instr => ({
          language: instr.language,
          instructionDescription: instr.description
        })),
        instructionId: instructionautoId,
        instructionName: instructionName,
        status: 'active' 
      });

      // Save the new instruction model
      const saveInstruction = await newInstructionModel.save();
      if (saveInstruction) {
        return sendResponse(
          res,
          200,
          responseMessage.instruction_create,
          saveInstruction
        );
      } else {
        return errorResponse(
          res,
          400,
          responseMessage.instruction_create,
          responseMessage.errorMessage
        );
      }
    }
  } catch (err) {
    return errorResponse(res, 500, responseMessage.errorMessage, err.message);
  }
};

module.exports.getInstructionlist = async (req, res) => {
  try {
    // Get filters based on request parameters
    let filter = getFilter(req, ["instructionId","instructionName", "instructions.language"]);
    const { page, limit, skip, sortOrder } = Paginate(req);

    let query = filter ? filter.query : {};

    // Get total counts of documents matching the query
    const totalCounts = await instructionModel.countDocuments(query);

    // Calculate total pages
    const totalPages = Math.ceil(totalCounts / limit);

    // Fetch instruction details with pagination and sorting
    const instructionDetails = await instructionModel
      .find(query)
      .sort(sortOrder)
      .skip(skip)
      .limit(limit);

    if (!instructionDetails || instructionDetails.length === 0) {
      return sendResponse(
        res,
        200,
        [],
        []
      );
    }

    // Check if instructionName query parameter is provided
    if (req.query.instructionName) {
      
      const instructionDetails = await instructionModel
      .find({ instructionName: req.query.instructionName });
  
      const totalCounts = await instructionModel.countDocuments({ instructionName: req.query.instructionName });
      // Calculate total pages
      const totalPages = Math.ceil(totalCounts / limit);
      // Respond with the fetched and filtered instruction details
      return sendResponse(res, 200, responseMessage.instruction_found, {
        instructionDetails,//: filteredInstructionDetails,
        page,
        totalCounts,
        totalPages,
      });
    }
    else if (req.query.language) {
      const filteredInstructionDetails = instructionDetails.map(doc => {
        const filteredInstructions = doc.instructions.filter(instr => 
          instr.language === req.query.language
        );
        return {
          ...doc.toObject(),
          instructions: filteredInstructions
        };
      }).filter(doc => doc.instructions.length > 0); // Ensure we only include documents that have matching instructions

      const totalCounts = filteredInstructionDetails.reduce((count, doc) => count + doc.instructions.length, 0);

      // Calculate total pages
      const totalPages = Math.ceil(totalCounts / limit);
      // Respond with the fetched and filtered instruction details
      return sendResponse(res, 200, responseMessage.instruction_found, {
        instructionDetails: filteredInstructionDetails,
        page,
        totalCounts,
        totalPages,
      });
    } else {
      // Respond with the fetched instruction details without filtering
      return sendResponse(res, 200, responseMessage.instruction_found, {
        instructionDetails,
        page,
        totalCounts,
        totalPages,
      });
    }
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.getInstructionById = async (req, res) => {
  try {
    const instructionId = req.params.id;

    // Find the instruction document that contains the instruction with the given ID
    const instructionDetail = await instructionModel.findOne({
      "instructions._id": instructionId
    }, {
      "instructions.$": 1 // Only include the matched instruction in the result
    });

    if (!instructionDetail)
      return errorResponse(
        res,
        400,
        responseMessage.instructionId_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(
      res,
      200,
      responseMessage.instruction_found,
      instructionDetail.instructions[0] // Only return the matched instruction
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.updateInstruction = async (req, res) => {
  try {
    const instructionListId = req.params.id;
    const {
      instructionName,
      instructions,
      language,
      descriptionEnglish,
      descriptionHindi
    } = req.body;

    // Find the current instruction document
    const instructionData = await instructionModel.findById(instructionListId);
    if (!instructionData) {
      return errorResponse(
        res,
        400,
        responseMessage.instructionId_not_found,
        responseMessage.errorMessage
      );
    }

    // If instructionId is not present, update the basic fields
    if (!instructionData.instructionId) {
      instructionData.instructionName = instructionName;
      instructionData.language = language;
      instructionData.descriptionEnglish = descriptionEnglish;
      instructionData.descriptionHindi = descriptionHindi;

      const updatedInstructionDetail = await instructionData.save();

      return sendResponse(
        res,
        200,
        responseMessage.instruction_update,
        updatedInstructionDetail
      );
    }

    // Check if instructionName already exists in another document
    if (instructionName) {
      const existingInstructionName = await instructionModel.findOne({
        instructionName: instructionName,
        _id: { $ne: instructionListId } // exclude current doc
      });

      if (existingInstructionName) {
        return errorResponse(
          res,
          400,
          "Instruction name already exists.",
          responseMessage.errorMessage
        );
      }

      instructionData.instructionName = instructionName;
    }

    // Update instructions array (by matching language)
    if (Array.isArray(instructions)) {
      instructions.forEach(newInstruction => {
        const existingInstruction = instructionData.instructions.find(
          instr => instr.language.toLowerCase() === newInstruction.language.toLowerCase()
        );

        if (existingInstruction) {
          existingInstruction.instructionDescription = newInstruction.instructionDescription;
        } 
      });
    }

    const updatedInstruction = await instructionData.save();

    return sendResponse(
      res,
      200,
      responseMessage.instruction_update,
      updatedInstruction
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.removeInstruction = async (req, res) => {
  try {
    let instructionId = req.params.id;

    const instructionDetail = await instructionModel.findById(instructionId);
    if (!instructionDetail)
      return arrorResponse(
        res,
        400,
        responseMessage.instructionId_not_found,
        responseMessage.errorMessage
      );

    const result = await instructionModel.deleteOne({ _id: instructionId });
    
    if (!result) return errorResponse(res, 400, responseMessage.instruction_not_able_delete, responseMessage.errorMessage);

    return sendResponse(res, 200, responseMessage.instruction_delete, result);
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};


module.exports.getInstructionListById = async (req, res) => {
  try {
    const instructionId = req.params.id;

    const instructionDetail = await instructionModel.findById(instructionId);

    if (!instructionDetail)
      return errorResponse(
        res,
        400,
        responseMessage.instructionId_not_found,
        responseMessage.errorMessage
      );

    return sendResponse(
      res,
      200,
      responseMessage.instruction_found,
      instructionDetail
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};

module.exports.changeStatus = async (req, res) => {
  try {
    const instructionId = req.params.id;

    const findInstruction = await instructionModel.findById(instructionId);
    if (!findInstruction)
      return errorResponse(
        res,
        400,
        responseMessage.instruction_not_found,
        responseMessage.errorMessage
      );

    if (findInstruction["status"] === req.body.status)
      return errorResponse(
        res,
        400,
        responseMessage.status_same_exists,
        responseMessage.errorMessage
      );

    findInstruction["status"] = req.body.status;

    const changedStatus = await findInstruction.save();

    if (!changedStatus)
      return errorResponse(
        res,
        400,
        responseMessage.status_not_change,
        responseMessage.errorMessage
      );

    return sendResponse(
      res,
      200,
      responseMessage.status_change,
      changedStatus.status
    );
  } catch (error) {
    return errorResponse(res, 500, responseMessage.errorMessage, error.message);
  }
};


