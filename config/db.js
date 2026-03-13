const mongoose = require("mongoose");
require("dotenv").config();
const { MONGOURI } = require("./keys");
 
mongoose.set("strictQuery", false);
 
const options = {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  maxPoolSize: 50,
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  connectTimeoutMS: 30000,
  readPreference: 'secondary'
};
 
class MongoSingleton {
  static instance = null;
 
  constructor() {
    if (MongoSingleton.instance) {
      return MongoSingleton.instance;
    }
 
    this.connected = false;
    this.connection = mongoose.connection;
 
    this.connection.on("error", (err) => {
      console.error("MongoDB connection error:", err);
    });
 
    this.connection.once("open", () => {
      console.log("MongoDB connected successfully!");
    });
 
    MongoSingleton.instance = this;
  }
 
  async connect() {
    if (this.connected || mongoose.connection.readyState === 1) {
      return this.connection;
    }
 
    try {
      await mongoose.connect(MONGOURI, options);
      this.connected = true;
      return this.connection;
    } catch (error) {
      console.error("MongoDB connection failed:", error);
      throw error;
    }
  }
}
 
const mongoDB = new MongoSingleton();
 
const connectDB = async () => {
  try {
    await mongoDB.connect();
  } catch (err) {
    console.log("Error connecting MongoDB:", err);
  }
};
 
module.exports = connectDB;