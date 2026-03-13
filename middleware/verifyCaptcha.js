const axios = require("axios");
const { GOOGLE_RECAPTCHA_URL, GOOGLE_RECAPTCHA_KEY, GOOGLE_RECAPTCHA_SITE_KEY } = require("../config/keys");



const verifyCaptcha = async (token, action) => { 

  const url = `${GOOGLE_RECAPTCHA_URL}key=${GOOGLE_RECAPTCHA_KEY}`

  try {
    const response = await axios.post(
      url,
      {
        "event":{
          "expectedAction": action,
          "siteKey": GOOGLE_RECAPTCHA_SITE_KEY,
          "token":token,
        }
      }
    );
    
    const data = response.data;
    if (data.tokenProperties.valid) {
      return true;
    } else {
      return false;
    }
  } catch (error) {
    console.error("Error verifying CAPTCHA:", error);
    return false;
  }
};

module.exports = { verifyCaptcha }
