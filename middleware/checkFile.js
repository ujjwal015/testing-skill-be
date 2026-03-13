const path = require('path');
const checkFile = (req, res, next) => { 

    const filetypes = /jpeg|jpg|png|gif|xlsx/;
    const extname = filetypes.test(path.extname(req.file.originalname).toLowerCase());
    const mimetype = filetypes.test(req.file.mimetype);
    if (!extname) {
        res.status(400).send("File type is not valid")
    }else{
        next()
    }
}

module.exports = checkFile