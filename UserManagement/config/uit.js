require("dotenv").config()
module.exports = {
    MONGOURI: process.env.MONGOURI,
    PORT:process.env.STAGE_PORT,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
    SESSION_SECRET: process.env.SESSION_SECRET,
    JWT_SECRET: process.env.JWT_SECRET,
    GOOGLE_MAIL_ID: process.env.GOOGLE_MAIL_ID,
    GOOGLE_MAIL_PASSWORD: process.env.GOOGLE_MAIL_PASSWORD,
    EMAIL_SERVICE: process.env.EMAIL_SERVICE,
    EMAIL_USERNAME: process.env.EMAIL_USERNAME,
    EMAIL_PASSWORD: process.env.EMAIL_PASSWORD,
    EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS,
    CLIENT_URL: process.env.CLIENT_URL,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_ACCESS_KEY_SECRET: process.env.AWS_ACCESS_KEY_SECRET,
    AWS_BUCKET_NAME: process.env.AWS_BUCKET_NAME,
    AWS_REGION: process.env.AWS_REGION,
    API_KEY: process.env.API_KEY,
    SENDER: process.env.SENDER
};
