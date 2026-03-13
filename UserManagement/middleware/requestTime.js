const logRequestTime=async(req,res,next)=>{
       console.log(`${req.method}-${req.originalUrl}-${ Date()}`);
       next();
}
module.exports=logRequestTime;