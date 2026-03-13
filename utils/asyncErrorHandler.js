const { errorResponse } = require("./response");
const responseMessage = require("./responseMessage");

const asyncErrorHandler = (func) => {
    return (req, res)=> { 
     func(req, res).catch(err => {
         return errorResponse(res, 500, responseMessage.something_wrong , err.message)
     }) 
    } 
}

module.exports =  { asyncErrorHandler }