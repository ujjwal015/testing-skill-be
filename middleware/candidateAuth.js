const _ = require('lodash');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { errorResponse } = require("../utils/response");
const responseMessage = require("../utils/responseMessage");
const CandidateModel = require("../models/candidate-model")

async function auth(req, res, next) {

    try {
       
        const token = req.header('x-auth-token');

        if (!token) return errorResponse(res, 401, "responseMessage.token_for_auth", responseMessage.errorMessage);

        var decodedId = jwt.decode(token);

        const user = await CandidateModel.findOne({ _id: decodedId.candidateId });

        if (!user) return errorResponse(res, 404, "candidate do not exist", "candidate do not exist");

        if(!user.token) return res.status(401).send({ statusCode : 401, error : 'Unauthorized' , message : 'This user is not logged in.' }); 

        //checking the params candidateId against the candidateId in the token 

        const byPassRoutes = ['instructionListById', 'logoutCandidate']

        const paramsCandidateId = req.params?.candidateId?.toString()

        if(!byPassRoutes.includes(req.url.split('/')[1]) && decodedId.candidateId && paramsCandidateId !== decodedId.candidateId.toString()){
            return res.status(401).send({ statusCode : 401, error : 'Unauthorized' , message : 'Unauthorized access.' }); 
        }

        let tokenValidate = jwt.verify(token, user.tokenSecret);

        if (!tokenValidate) {
            return errorResponse(res, 410, responseMessage.token_expire, responseMessage.errorMessage);
        } else {
            req.user = user
            next();
        }
    } catch (error) {

        if(error.message === 'invalid signature'){
            return errorResponse(res, 401, responseMessage.session_expired, error.message);
        }

        if (error.message === 'jwt expired') {
            return errorResponse(res, 401, responseMessage.session_expired, error.message);
        } else {
            return errorResponse(res, 500, responseMessage.errorMessage, error.message);
        }
    }
}

module.exports = auth;
