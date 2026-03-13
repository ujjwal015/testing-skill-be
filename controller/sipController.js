const express = require('express');
const multer = require('multer');
const app = express();
const port = 3000;

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use(express.static('uploads'));

app.post('/upload', (req, res) => {
    // Get the keys from req.body
    const keysFromRequestBody = Object.keys(req.body);

    // Construct the array for upload.fields() dynamically
    const uploadFieldsArray = keysFromRequestBody.map(key => ({ name: key }));

    // Use upload.fields() with the dynamically constructed array
    upload.fields(uploadFieldsArray)(req, res, (err) => {
        if (err) {
            console.error(err);
            return res.status(500).send('File upload failed');
        }

        // Access uploaded files from req.files
        console.log('Uploaded files:', req.files);

        // Access keys in req.body
        console.log('Keys in req.body:', keysFromRequestBody);

        res.send('Form submitted');
    });
});