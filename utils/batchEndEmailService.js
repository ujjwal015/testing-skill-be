const nodemailer = require("nodemailer");
const { MailtrapTransport } = require("mailtrap");
const { SENDER_EMAIL, TOKEN, BASE_FRONTEND_URL } = require("./envHelper");
const jwt = require("jsonwebtoken");
const { JWT_SECRET } = require("../config/envProvider");

/**
 * Generate feedback token containing batch and user information
 * @param {Object} batch - The batch object
 * @param {String} type - Either 'assessor' or 'trainingPartner'
 * @returns {String} - JWT token
 */
const generateFeedbackToken = (batch, type) => {
  const payload = {
    batchId: batch.batchId,
    batchObjectId: batch._id,
    type: type,
    createdAt: new Date().toISOString()
  };

  if (type === 'assessor' && batch.accessorId) {
    payload.assessorId = batch.accessorId._id;
    payload.assessorEmail = batch.accessorId.email;
  } else if (type === 'trainingPartner' && batch.examCenterId?.trainingPartner) {
    payload.trainingPartnerId = batch.examCenterId.trainingPartner._id;
    payload.trainingPartnerEmail = batch.examCenterId.trainingPartner.spocEmail;
  }

  // Generate token with 30 days expiry
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
};

/**
 * Send batch end email notifications to assessor or training partner
 * @param {Object} batch - The batch object with populated fields
 * @param {String} recipientType - Either 'assessor' or 'trainingPartner'
 * @returns {Boolean} - True if email sent successfully, false otherwise
 */
const sendBatchEndEmails = async (batch, recipientType) => {
  try {
    const transporter = nodemailer.createTransport(MailtrapTransport({
      token: TOKEN
    }));

    let mailOptions;
    let recipientName;
    let recipientEmail;
    let feedbackToken;

    if (recipientType === 'assessor' && batch.accessorId) {
      recipientName = batch.accessorId.fullName || `${batch.accessorId.firstName} ${batch.accessorId.lastName}`.trim();
      recipientEmail = batch.accessorId.email;
      feedbackToken = generateFeedbackToken(batch, 'assessor');
      
      mailOptions = {
        from: {
          address: SENDER_EMAIL,
          name: "Testa"
        },
        to: recipientEmail,
        subject: `RadiantInfonet_Assessment_Batch_${batch.batchId}_Assessor_Feedback Required`,
        html: generateAssessorEmailTemplate(batch, recipientName, feedbackToken),
        attachments: [
          {
            filename: "testa-logo.png",
            path: "https://i.ibb.co/z4ZMDQj/testa-logo.png",
            cid: "testa-logo"
          }
        ]
      };
    } else if (recipientType === 'trainingPartner' && batch.examCenterId?.trainingPartner) {
      recipientName = batch.examCenterId.trainingPartner.spocName || batch.examCenterId.trainingPartner.trainingPartner;
      recipientEmail = batch.examCenterId.trainingPartner.spocEmail;
      feedbackToken = generateFeedbackToken(batch, 'trainingPartner');
      
      mailOptions = {
        from: {
          address: SENDER_EMAIL,
          name: "Testa"
        },
        to: recipientEmail,
        subject: `RadiantInfonet_Assessment_Batch_${batch.batchId}_TP_Feedback Required`,
        html: generateTrainingPartnerEmailTemplate(batch, recipientName, feedbackToken),
        attachments: [
          {
            filename: "testa-logo.png",
            path: "https://i.ibb.co/z4ZMDQj/testa-logo.png",
            cid: "testa-logo"
          }
        ]
      };
    } else {
      console.error(`Invalid recipient type or missing recipient data: ${recipientType}`);
      return false;
    }

    if (!recipientEmail) {
      console.error(`No email address found for ${recipientType} in batch ${batch.batchId}`);
      return false;
    }

    console.log(`Sending ${recipientType} email to: ${recipientEmail} for batch: ${batch.batchId}`);
    
    const result = await transporter.sendMail(mailOptions);

    if (result) {
      console.log(`Successfully sent ${recipientType} notification email for batch: ${batch.batchId}`);
      return true;
    } else {
      console.error(`Failed to send ${recipientType} notification email for batch: ${batch.batchId}`);
      return false;
    }
    
  } catch (error) {
    console.log(error);
    console.error(`Error sending ${recipientType} batch end email for batch ${batch.batchId}:`, error.message);
    return false;
  }
};

/**
 * Generate HTML email template for assessor
 */
const generateAssessorEmailTemplate = (batch, assessorName, feedbackToken) => {
  const batchEndDate = new Date(batch.batchEndDate).toLocaleDateString('en-IN');
  const feedbackUrl = `${BASE_FRONTEND_URL}/assessor-feedback?token=${encodeURIComponent(feedbackToken)}`;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Assessment Completed - Feedback Required</title>
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f8f9fa;
          margin: 0;
          padding: 20px;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #2EA8DB, #1c7bb8);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .logo {
          margin-bottom: 15px;
        }
        .content {
          padding: 30px;
        }
        .batch-info {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #2EA8DB;
        }
        .cta-button {
          background: #2EA8DB;
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 5px;
          display: inline-block;
          font-weight: bold;
          margin: 20px 0;
          text-align: center;
        }
        .cta-button:hover {
          background: #1c7bb8;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        .highlight {
          color: #2EA8DB;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">
            <img src="cid:testa-logo" alt="Testa Logo" style="max-width: 150px;">
          </div>
          <h1 style="margin: 0; font-size: 24px;">Assessment Completed</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Feedback Required</p>
        </div>
        
        <div class="content">
          <h2 style="color: #333; margin-bottom: 10px;">Dear ${assessorName},</h2>
          
          <p>We hope this email finds you well. The assessment for the following batch has been completed and we require your valuable feedback.</p>
          
          <div class="batch-info">
            <h3 style="margin-top: 0; color: #2EA8DB;">Batch Details</h3>
            <p><strong>Batch ID:</strong> <span class="highlight">${batch.batchId}</span></p>
            <p><strong>Assessment End Date:</strong> ${batchEndDate}</p>
          </div>
          
          <p>As the assigned assessor for this batch, your feedback is crucial for continuous improvement of our assessment processes. Please take a few minutes to provide your insights about the assessment experience.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${feedbackUrl}" class="cta-button">
              📝 Provide Assessor Feedback
            </a>
          </div>
          
          <p style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border: 1px solid #ffeaa7;">
            <strong>⏰ Note:</strong> Please submit your feedback within the next 7 days to help us maintain quality standards.
          </p>
          
          <p>If you have any questions or need assistance accessing the feedback form, please don't hesitate to contact our assessment team.</p>
          
          <p style="margin-top: 30px;">
            Thank you for your dedication and professionalism.<br>
            <strong>Best regards,</strong><br>
            <strong>Testa Team</strong>
          </p>
        </div>
        
        <div class="footer">
          <p>This email was sent automatically by the Testa Assessment Platform.</p>
          <p>© 2024 Testa. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

/**
 * Generate HTML email template for training partner
 */
const generateTrainingPartnerEmailTemplate = (batch, trainingPartnerName, feedbackToken) => {
  const batchEndDate = new Date(batch.batchEndDate).toLocaleDateString('en-IN');
  const feedbackUrl = `${BASE_FRONTEND_URL}/training-partner-feedback?token=${encodeURIComponent(feedbackToken)}`;
  
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
          background-color: #f8f9fa;
          margin: 0;
          padding: 20px;
          line-height: 1.6;
        }
        .container {
          max-width: 600px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 10px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
          overflow: hidden;
        }
        .header {
          background: linear-gradient(135deg, #28a745, #20713a);
          color: white;
          padding: 30px;
          text-align: center;
        }
        .logo {
          margin-bottom: 15px;
        }
        .content {
          padding: 30px;
        }
        .batch-info {
          background-color: #f8f9fa;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
          border-left: 4px solid #28a745;
        }
        .cta-button {
          background: #28a745;
          color: white;
          padding: 15px 30px;
          text-decoration: none;
          border-radius: 5px;
          display: inline-block;
          font-weight: bold;
          margin: 20px 0;
          text-align: center;
        }
        .cta-button:hover {
          background: #20713a;
        }
        .footer {
          background-color: #f8f9fa;
          padding: 20px;
          text-align: center;
          color: #666;
          font-size: 14px;
        }
        .highlight {
          color: #28a745;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="logo">
            <img src="cid:testa-logo" alt="Testa Logo" style="max-width: 150px;">
          </div>
          <h1 style="margin: 0; font-size: 24px;">Assessment Results Available</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9;">Feedback Required</p>
        </div>
        
        <div class="content">
          <h2 style="color: #333; margin-bottom: 10px;">Dear ${trainingPartnerName},</h2>
          
          <p>We are pleased to inform you that the assessment for the following batch has been completed.</p>
          
          <div class="batch-info">
            <h3 style="margin-top: 0; color: #28a745;">Batch Details</h3>
            <p><strong>Batch ID:</strong> <span class="highlight">${batch.batchId}</span></p>
            <p><strong>Assessment End Date:</strong> ${batchEndDate}</p>
          </div>
          
          <p>As our valued training partner, your feedback about the assessment process and candidate performance is extremely important to us. This helps us continuously improve our services and maintain high standards.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${feedbackUrl}" class="cta-button">
              📊 Provide Training Partner Feedback
            </a>
          </div>
          
          <p style="background-color: #d1ecf1; padding: 15px; border-radius: 5px; border: 1px solid #b8daff;">
            <strong>📋 Your feedback helps us:</strong><br>
            • Improve assessment quality and processes<br>
            • Better understand candidate preparedness<br>
            • Enhance training partner experience<br>
            • Maintain industry standards
          </p>
          
          <p style="background-color: #fff3cd; padding: 15px; border-radius: 5px; border: 1px solid #ffeaa7;">
            <strong>⏰ Timeline:</strong> Please provide your feedback within the next 7 days to help us analyze trends and make improvements.
          </p>
          
          <p>For any questions regarding the results or feedback process, please contact our support team. We appreciate your continued partnership and commitment to quality training.</p>
          
          <p style="margin-top: 30px;">
            Thank you for your valuable partnership.<br>
            <strong>Best regards,</strong><br>
            <strong>Testa Team</strong>
          </p>
        </div>
        
        <div class="footer">
          <p>This email was sent automatically by the Testa Assessment Platform.</p>
          <p>© 2024 Testa. All rights reserved.</p>
        </div>
      </div>
    </body>
    </html>
  `;
};

module.exports = {
  sendBatchEndEmails
}; 