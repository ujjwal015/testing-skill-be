require("dotenv").config();

switch(process.env.NODE_ENV){
    case 'development':
        module.exports = require('./dev');
    break;
    case 'staging':
        module.exports = require('./uit');
    break;
    default:
       module.exports = require('./prod');
        break;
}

