
require("dotenv").config()

// app configuration
const PORT=process.env.PORT
const CLIENT_URL= process.env.CLIENT_URL  
const BACKEND_URL=process.env.BACKEND_URL
const BASE_FRONTEND_URL=process.env.BASE_FRONTEND_URL
const BASE_ASSESSOR_FRONTEND_URL=process.env.BASE_ASSESSOR_FRONTEND_URL
const USER_MANAGEMENT_SERVER_PROXY_URL=process.env.USER_MANAGEMENT_SERVER_PROXY_URL

// database configuration
const MONGOURI=process.env.MONGOURI
const MONGOURI_SKILL=process.env.MONGOURI_SKILL

// authentication & security
const SESSION_SECRET=process.env.SESSION_SECRET
const JWT_SECRET=process.env.JWT_SECRET

// email & sms configuration 
const SENDER_EMAIL=process.env.SENDER_EMAIL
const API_KEY=process.env.API_KEY
const SENDER=process.env.SENDER
const TOKEN=process.env.TOKEN
const MSZ91_HOST = process.env.MSZ91_HOST
const MSZ91_USER = process.env.MSZ91_USER
const MSZ91_PASS = process.env.MSZ91_PASS
const MSZ91_PORT = process.env.MSZ91_PORT

// google configuration
const GOOGLE_CLIENT_ID=process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET=process.env.GOOGLE_CLIENT_SECRET
const GOOGLE_RECAPTCHA_URL=process.env.GOOGLE_RECAPTCHA_URL
const GOOGLE_RECAPTCHA_KEY=process.env.GOOGLE_RECAPTCHA_KEY
const GOOGLE_RECAPTCHA_SITE_KEY=process.env.GOOGLE_RECAPTCHA_SITE_KEY

// aws configuration 
const AWS_ACCESS_KEY_ID=process.env.AWS_ACCESS_KEY_ID
const AWS_ACCESS_KEY_SECRET=process.env.AWS_ACCESS_KEY_SECRET
const AWS_BUCKET_NAME=process.env.AWS_BUCKET_NAME
const AWS_REGION=process.env.AWS_REGION

// project related configuration
const CSR_SCHEME_ID=process.env.CSR_SCHEME_ID
const PM_VISHWAKARMA=process.env.PM_VISHWAKARMA
const SUPER_ADMIN_EMAIL=process.env.SUPER_ADMIN_EMAIL

// other 




module.exports = {
    
    // app configuration 
        PORT,
        CLIENT_URL,
        BACKEND_URL,
        BASE_FRONTEND_URL,
        BASE_ASSESSOR_FRONTEND_URL,
        USER_MANAGEMENT_SERVER_PROXY_URL,

    // database configuration
        MONGOURI,
        MONGOURI_SKILL,

    // authentication & security
        SESSION_SECRET,
        JWT_SECRET,

    // email & sms configuration
        SENDER_EMAIL,
        API_KEY,
        SENDER,
        TOKEN,
        MSZ91_HOST,
        MSZ91_USER,
        MSZ91_PASS, 
        MSZ91_PORT,

    // google configuration
        GOOGLE_CLIENT_ID,
        GOOGLE_CLIENT_SECRET,
        GOOGLE_RECAPTCHA_URL,
        GOOGLE_RECAPTCHA_KEY,
        GOOGLE_RECAPTCHA_SITE_KEY,

    // aws configuration
        AWS_ACCESS_KEY_ID,
        AWS_ACCESS_KEY_SECRET,
        AWS_BUCKET_NAME,
        AWS_REGION,

    // project related configuration
        CSR_SCHEME_ID,
        PM_VISHWAKARMA,
        SUPER_ADMIN_EMAIL,

    // other 
     

}