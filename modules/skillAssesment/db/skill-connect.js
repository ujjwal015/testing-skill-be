const {MongoClient}=require('mongodb');
require("dotenv").config()
const  {MONGOURI_SKILL}  = require("../../../config/envProvider")
const url = MONGOURI_SKILL;
let db=null;
const dbName = "skillAssementBackup";
const client = new MongoClient(url);
 const main =async ()=>{
 
  if(!db){
    await client.connect();
    console.log(`Connected successfully to ${dbName}`);
      db = client.db(dbName);
      
  }
 
  return db;
}

module.exports={main}