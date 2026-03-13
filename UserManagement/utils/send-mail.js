require("dotenv").config()

const nodemailer = require("nodemailer");
const { sendResponse, errorResponse } = require("../utils/response");
async function sendMailToUser(res, mailDetails) {

    try {
        const transporter = nodemailer.createTransport({
            host: mailDetails.transporter.host,
            service: mailDetails.transporter.service,
            secure: mailDetails.transporter.secure,
            port: mailDetails.transporter.port,
            auth: mailDetails.transporter.auth
        });

        let responseData = {};

        transporter.sendMail(mailDetails.mailOptions, async (error, info) => {

            if (error) {
                return errorResponse(res, 500, 'Could not send email', error.message);
                // return res.status(500).send({ statusCode: 500, success: false, error: 'Could not send email', message: error.message });

            } else {

                if (mailDetails.type === 'register') {

                    responseData = {
                        email: mailDetails.savedUser.email,
                        userType: mailDetails.savedUser.userType,
                        firstName: mailDetails.savedUser.firstName,
                        lastName: mailDetails.savedUser.lastName
                    }
                }

                let responseDetails = (responseData) ? responseData : {};

                return sendResponse(res, 200, mailDetails.message, responseDetails);
                // return res.status(200).send({
                //     statusCode: 200,
                //     success: true,
                //     message: mailDetails.message,
                //     details: (responseData) ? responseData : {}
                // });
            }
        });
    } catch (error) {
        return errorResponse(res, 500, 'Oops! Something went wrong here...', error.message);
        // return res.status(500).send({ statusCode: 500, success: false, message: 'Oops! Something went wrong here...', error: error.message });
    }
}

module.exports = sendMailToUser;