require("dotenv").config()

const nodemailer = require("nodemailer");
const { sendResponse, errorResponse } = require("../utils/response");
const { MailtrapClient, MailtrapTransport } = require("mailtrap");
const ResetPasswordMOdel = require("../models/reset-password");
const {
  TOKEN,
  SENDER_EMAIL,
  BASE_FRONTEND_URL,
  BASE_ASSESSOR_FRONTEND_URL,
  MSZ91_HOST,
  MSZ91_USER,
  MSZ91_PASS,
  MSZ91_PORT,
} = require("../config/envProvider");
async function sendMailToUser(res, mailDetails) {

    try {
        const transporter = nodemailer.createTransport({
                  host: MSZ91_HOST,
                  port: MSZ91_PORT,
                  secure: false,
                  auth: {
                    user: MSZ91_USER,
                    pass: MSZ91_PASS,
                  },
        });
    
        const mailOptions = { 
            from: { 
                address: mailDetails?.senderEmail,
                name: "Testa"
            },
            to: mailDetails?.savedUser?.email,
            host: 'smtp.mailtrap.io',
            subject: "Reset Password",
            // html: `<p>You are receiving this email because you (or someone else) have requested the reset of the password for your account.</p>
            //      <p>Please click on the following link, or paste this into your browser to complete the process:</p>
            //      <a href=${mailDetails.clientUrl}/reset-password/${mailDetails.resetToken}><button>Click Here</button></a>
            //      <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>`,
            html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Password Reset Request</h2>
          <p>You are receiving this email because a password reset was requested for your account.</p>
          
          <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Security Information:</strong></p>
            <ul>
              <li>This secure link can be used only once and will automatically expire after 15 minutes.</li>
            </ul>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${mailDetails.clientUrl}/reset-password/${mailDetails.resetToken}" 
               style="background-color: #007bff; color: white; padding: 12px 30px; 
                      text-decoration: none; border-radius: 5px; display: inline-block;">
              Reset Password Securely
            </a>
          </div>
          
          <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
            <p><strong>Security Notice:</strong></p>
            <p>If you did not request this password reset, please ignore this email. 
               Your password will remain unchanged and this link will automatically expire.</p>
          </div>
          
          <p style="color: #666; font-size: 12px;">
            For security reasons, do not share this link with anyone. 
            If you're having trouble with the button above, copy and paste the following URL into your browser:
            <br><br>
            ${mailDetails.clientUrl}/reset-password/${mailDetails.resetToken}
          </p>
        </div>
      `,     

        }

        let responseData = {};

        // const transporter = nodemailer.createTransport(MailtrapTransport({
        //     token: mailDetails.token
        // }))

        transporter.sendMail(mailOptions, async (error, info) => {

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

                const passwordReset = new ResetPasswordMOdel({
                    userId: mailDetails.savedUser._id,
                    email: mailDetails.savedUser.email,
                    jwtToken: mailDetails.resetToken,
                    expiresAt: new Date(Date.now() + 15 * 60 * 1000) // 15 minutes
                });

                await passwordReset.save();

                return sendResponse(res, 200, mailDetails.message, responseDetails);
                
            }
        });
    } catch (error) {
        return errorResponse(res, 500, 'Oops! Something went wrong here...', error.message);
        // return res.status(500).send({ statusCode: 500, success: false, message: 'Oops! Something went wrong here...', error: error.message });
    }
}

module.exports = sendMailToUser;