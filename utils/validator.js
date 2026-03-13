const Joi = require('@hapi/joi');
const validator=async function(ValidateData,submitData) {
    try {
       const schema = Joi.object(ValidateData);
        return schema.validate(submitData);
    } catch (err) {
        console.log(err);
    }
}
module.exports=validator
