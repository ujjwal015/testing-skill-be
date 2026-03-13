const mongoose = require("mongoose");
require("dotenv").config()
const  {MONGOURI}  = require("./keys")

mongoose.set('strictQuery', false);



const connectDB = async () => {
    try {

        mongoose.connect(MONGOURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        }).then(() => {
            console.log('MongoDB Connection successful!');
        }).catch((e) => {
            console.log('Connection failed!',e);
        })

    } catch (error) {
        console.log(error)

    }
}

module.exports = connectDB