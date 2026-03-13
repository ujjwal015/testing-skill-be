const express = require("express");
const router = express.Router();
const {
    addInstruction, 
    getInstructionlist, 
    getInstructionById,
    updateInstruction,
    removeInstruction,
    getInstructionListById,
    changeStatus
} = require("../controller/instructionController");

router.post("/add-instruction",addInstruction);
router.get("/get-instruction",getInstructionlist);
router.get("/get-instructionById/:id",getInstructionById);
router.put("/update-instruction/:id",updateInstruction);
router.delete("/remove-instruction/:id",removeInstruction);
router.get("/get-instructionListById/:id",getInstructionListById);
router.put("/change-status/:id",changeStatus);


module.exports = router;