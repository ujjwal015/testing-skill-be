const cron = require("node-cron");
const createAssesorModel = require("../models/AssesorModel");
const { SENDER_EMAIL, TOKEN } = require("./envHelper");
const nodemailer = require("nodemailer");
const { MailtrapTransport } = require("mailtrap");
const moment = require("moment");

cron.schedule("* * 1 * *", async () => {
  console.log(SENDER_EMAIL, TOKEN);
  const thirtyDaysFromNow = moment().add(30, "days").format("MM-DD-YYYY");

  const currentDate = moment().format("MM-DD-YYYY");

  const query = {
    "jobRole.validUpto": {
      $lte: thirtyDaysFromNow,
    },
    //  isJobRoleCertificatMailSend:false
  };
  console.log(query);

  const assesorDetails = await createAssesorModel.find(query);
  for (let item of assesorDetails) {
    let jobRoles = item.jobRole
      .map((item) => {
        if (
          currentDate > item.validUpto &&
          item.validUpto <= thirtyDaysFromNow
        ) {
          return `<p>Your Jobrole certificate will be expire in upcoming 30 days.Please upload new jobrole certificate with valid date.Your jobRole certificate of ${item.jobroleName} is valid upto ${item.validUpto}</p>`;
        } else {
          return `<p>Your Jobrole certificate has been expired.Please upload new jobrole certificate with valid date.Your jobRole certificate of ${item.jobroleName} is valid upto ${item.validUpto}</p>`;
        }
      })
      .join("<br></br>");
      const { email, fullName } = item;
    let mailSend = await sendMailToUser({ email, fullName, jobRoles });

    

    console.log("mailSend", mailSend);
  }

  //console.log('assesor Details',assesorDetails);
});

async function sendMailToUser(response) {
  
  try {
    console.log("response", response);
    const mailOptions = {
      from: {
        address: SENDER_EMAIL,
        name: "Testa",
      },
      to: response.email,
      host: "smtp.mailtrap.io",
      subject: "Your JobRole Certificate Expired with in 30 days",
      attachments: [
        {
          filename: "testa-logo.png",
          path: "https://i.ibb.co/z4ZMDQj/testa-logo.png",
          cid: "testa-logo", //same cid value as in the html img src
        },
        {
          filename: "testa-logo.png",
          path: "https://i.ibb.co/GTkNybW/bg-testa.png",
          cid: "bg-testa",
        },
        {
          filename: "Union.png",
          path: "https://i.ibb.co/w0JwsJ3/Union.png",
          cid: "Union",
        },
        {
          filename: "Union-1.png",
          path: "https://i.ibb.co/HrWXkBs/Union-1.png",
          cid: "Union-1",
        },
        {
          filename: "Union-2.png",
          path: "https://i.ibb.co/7J62VZF/Union-2.png",
          cid: "Union-2",
        },
        {
          filename: "Union-3.png",
          path: "https://i.ibb.co/xsTmm4P/Union-3.png",
          cid: "Union-3",
        },
        {
          filename: "Union-4.png",
          path: "https://i.ibb.co/4KGLZYM/Union-4.png",
          cid: "Union-4",
        },
      ],
      html: `<body bgcolor="#FFFFFF" leftmargin="0" marginwidth="-10" topmargin="0" marginheight="0" >
        <table border="0" cellpadding="0" cellspacing="0" height="100%" width="100%" id="bodyTbl" style="max-width: 970px!important;margin: auto;">
          <tr>
            <td align="center"  id="bodyCell">
              <table bgcolor="#FFFFFF" border="0" cellpadding="0" cellspacing="0" width="100%" id="emailBody" >
                <tr>
                  <td>
                    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color:transparent">
                      <tr>
                        <td align="center" >
                          <table border="0" cellpadding="0" cellspacing="0" width="95%" class="flexibleContainer" style="margin: 20px auto;border-radius: 20px;border: 1px solid #0000001f;overflow: hidden;">
                            <tr class="demo">
                              <td align="center"  width="95%" class="flexibleContainerCell">
                                <table border="0" cellpadding="30" cellspacing="0" width="100%">
                                  <tr>
                                    <td style="padding: 0px;">
                                      <table border="0" cellpadding="0" cellspacing="0" width="100%" bgcolor="#FFFFFF" style="font-size:16px;
                                      max-width: 100%;
                                      margin: auto;">
                                        <tr>
                                          <td  style="
                                            padding: 0;
                                            text-align:left;
                                            font-size:15px;
                                            margin-bottom:0;
                                            color: #2c2c2a;
                                            margin-top: 40px;
                                            border: solid 1px #eee;
                                            border-radius: 20px;
                                            overflow: hidden;
                                            width: 100%;
                                          ">
                                            <div class="overall-content"
                                              style="
                                                padding: 12px 0 0;
                                                width: 100%;
                                                box-sizing: border-box;
                                              "
                                            >
                                              <div class="testa-topcontent" style="width: 100%;padding-left: 40px;">
                                                <div class="right-content" style="width:50%;display: inline-block;">
                                                  <div
                                                  style="
                                                    display: block;
                                                    max-width: 100%;
                                                    padding-top: 28px;
                                                  "
                                                >
                                                  <p style="display: inline-block;">
                                                    <img src="cid:testa-logo" alt="testa-logo" border="0">
                                                  </p>
                                                  <p
                                                    style="
                                                      font-weight: 400;
                                                      font-size: 20px;
                                                      line-height: 22px;
                                                      letter-spacing: 0.02em;
                                                      color: #000000;
                                                      margin: 0;
                                                      padding-left: 17px;
                                                      display: inline-block;
                                                    "
                                                  >
                                                    Testa
                                                  </p>
                                                  </div>
                                                  <h1
                                                    style="
                                                      font-weight: 400;
                                                      font-size: 48px;
                                                      line-height: 58px;
                                                      text-transform: capitalize;
                                                      color: #000000;
                                                      max-width: 100%;
                                                      padding-bottom: 57px;
                                                    "
                                                  >
                                                    Welcome to Testa
                                                  </h1>
                                                  <div style="max-width:100%;">
                                                    <p
                                                      style="
                                                        font-weight: 700;
                                                        font-size: 15px;
                                                        line-height: 22px;
                                                        letter-spacing: 0.02em;
                                                        color: #000000;
                                                        margin: 0;
                                                        padding-bottom: 10px;
                                                      "
                                                    >
                                                      Hi ${response.fullName} 
                                                    </p>
                                                    <h3>Please Upload your new JobRole Certificate</h3>
                                                    <p
                                                      style="
                                                        font-style: normal;
                                                        font-weight: 400;
                                                        font-size: 14px;
                                                        line-height: 19px;
                                                        color: #000000;
                                                        margin: 0;
                                                        padding-bottom: 30px;
                                                      "
                                                    >
                                                      ${response.jobRoles}
                                                    </p>
                                        
                                                  </div>
                                                </div>
                                                <div class="left-image" style="width:50%;display: inline-block; float: right;text-align: right;">
                                                  <a href="#">
                                                    <img src="cid:bg-testa" alt="bg-testa" border="0">
                                                  </a>
                                                </div>
                                              </div>
                                              <div style="display: block;width: 100%;padding-left: 40px;">
                                                <p class="verify-btn"
                                                  style="
                                                    background: #2EA8DB;
                                                    box-shadow: 5.5758px 27.879px 22.3032px rgba(0, 0, 0, 0.04);
                                                    border-radius: 5px;
                                                    font-weight: 700;
                                                    font-size: 18px;
                                                    line-height: 22px;
                                                    color: #FDFDFD;
                                                    margin: 0 0 45px;
                                                    padding: 12px 46px;
                                                    display: inline-block;
                                                    width: auto;
                                                  "
                                                >
                                                
                                                </p>
                                                <p class="access-account"
                                                  style="
                                                    font-style: normal;
                                                    font-weight: 400;
                                                    font-size: 14px;
                                                    line-height: 19px;
                                                    color: #000000;
                                                    display: inline-block;
                                                    width: 100%;
                                                    margin: 0 0 21px;
                                                  "
                                                >
                                                 
                                                </p>
                                                <p class="testa-regards"
                                                  style="
                                                    font-style: normal;
                                                    font-weight: 400;
                                                    font-size: 14px;
                                                    line-height: 19px;
                                                    color: #000000;
                                                    display: block;
                                                    width: 100%;
                                                    margin: 0 0 52px;
                                                    text-align: left;
                                                  "
                                                >
                                                  <span style="display: block;" >We hope you have an enriching experience.</span>
                                                  <span style="display: block;" >Regards,</span>
                                                  <span style="display: block;" >Testa Team</span>
                                                </p>
                                                <div class="socail-icons"
                                                  style="
                                                    display: inline-block;
                                                    text-align: center;
                                                    width: 100%;
                                                    margin: 0 0 31px;
                                                  "
                                                >
                                                  <span style="padding-right: 23px;display: inline-block;">
                                                    <a href="#">
                                                      <img src="cid:Union" alt="Union" border="0">
                                                    </a>
                                                  </span>
                                                  <span style="padding-right: 23px;display: inline-block;">
                                                    <a href="#">
                                                      <img src="cid:Union-1" alt="Union-1" border="0">
                                                    </a>
                                                  </span>
                                                  <span style="padding-right: 23px;display: inline-block;">
                                                    <a href="#">
                                                      <img src="cid:Union-2" alt="Union-2" border="0">
                                                    </a>
                                                  </span>
                                                  <span style="padding-right: 23px;display: inline-block;">
                                                    <a href="#">
                                                      <img src="cid:Union-3" alt="Union-3" border="0">
                                                    </a>
                                                  </span>
                                                  <span style="display: inline-block;">
                                                    <a href="#">
                                                      <img src="cid:Union-4" alt="Union-4" border="0">
                                                    </a>
                                                  </span>
                                                </div>
                                              </div>
                                              <div
                                                style="
                                                  display: block;
                                                  text-align: center;
                                                  width: 100%;
                                                  background: #F9F9F9;
                                                  padding: 22px 0;
                                                "
                                              >
                                                <p
                                                  style="
                                                    font-weight: 700;
                                                    font-size: 15px;
                                                    line-height: 22px;
                                                    letter-spacing: 0.02em;
                                                    color: #000000;
                                                    display: inline-block;
                                                    width: auto;
                                                    margin: 0;
                                                    padding-right: 15px;
                                                  "
                                                >
                                                  POWERED BY
                                                </p>
                                                <p
                                                  style="
                                                    font-weight: 400;
                                                    font-size: 20px;
                                                    line-height: 22px;
                                                    letter-spacing: 0.02em;
                                                    color: #022A50;
                                                    display: inline-block;
                                                    width: auto;
                                                    margin: 0;
                                                  "
                                                >
                                                  Testa Online
                                                </p>
                                              </div>
                                            </div>
                                          </td>
                                        </tr>
                                      </table>
                                    </td>
                                  </tr>
                                </table>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
    </body>`,
    };

    const transporter = nodemailer.createTransport(
      MailtrapTransport({
        token: TOKEN,
      })
    );

    transporter.sendMail(mailOptions, async (error, info) => {
      if (error) {
        console.log("error--->", error);
        return { isMailSend: false, error };
      } else {
        if (info.success) {
          await createAssesorModel.updateOne(
            { _id: response._id },
            { $set: { isJobRoleCertificatMailSend: true } },
            { upsert: false, runValidators: false }
          );
          return { isMailSend: true, message: "email send" };
        } else {
          return { isMailSend: false, error: "Unable to send Email" };
        }
      }
    });
  } catch (error) {
    console.log("error", error);
    return { isMailSend: false, message: error.message };
  }
}
