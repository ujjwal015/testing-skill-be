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
        cb(null, true)
  
      
    }});
  module.exports=upload;

//const multer = require("multer");

// const storage = multer.memoryStorage(); // Store file in memory as buffer
// const allowedFileTypes = ["image/jpeg", "image/png", "image/gif", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]; // Add allowed MIME types

// const fileFilter = (req, file, cb) => {
//   if (allowedFileTypes.includes(file.mimetype)) {
//     cb(null, true);
//   } else {
//     cb(new Error("File type not supported"));
//   }
// };

// const upload = multer({
//   storage: storage,
//   fileFilter: fileFilter,
// });

//module.exports = upload;
// const multer = require('multer')

// const storage = multer.memoryStorage()
// const upload = multer({ storage:storage })

// module.exports = upload