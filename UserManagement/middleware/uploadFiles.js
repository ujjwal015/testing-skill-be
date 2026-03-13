const multer=require('multer');
const path = require('path');
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        
      cb(null, 'public/files')
    },
    filename: function (req, file, cb) {
      // const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, file.originalname)
    }
  })
 
  const upload = multer({ storage: storage,
  
    fileFilter: (req, file, cb) => {
      const filetypes = /jpeg|jpg|png|gif|xlsx/;
      const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
      const mimetype = filetypes.test(file.mimetype);
      if (!extname) {
        return cb(new Error('file is not allowed Please select only these jpeg,jpg,png,gif,xlsx'))
      }else{
        cb(null, true)
      }
  
      
    }});
  module.exports=upload;