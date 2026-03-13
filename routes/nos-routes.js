const express = require('express')
const router = express.Router()
const {bulkuploadNosTheory,changeNosStatus, dowloadNosTheorySampleFile,nosTheoryList,bulkuploadNosViva,nosVivalist,dowloadNosVivaSampleFile,getTheoryNosById,getVivaNosById,getallNosList,getnosDetailById, updateNosDetail,removeNosDetail,getallNosListBySection} = require('../controller/nosController')
const uploadFile = require('../middleware/uploadFiles')
//ss
router.post('/bulkupload-theory-nos', uploadFile.single('uploaded_file'), bulkuploadNosTheory)
router.post('/bulkupload-viva-nos', uploadFile.single('uploaded_file'), bulkuploadNosViva)
router.get('/download-nos-theory-samplefile',dowloadNosTheorySampleFile)
router.get('/download-nos-viva-samplefile',dowloadNosVivaSampleFile)
router.get('/nos-theory-List',nosTheoryList)
router.get('/nos-viva-List',nosVivalist)
router.get("/get-theorynosById/:id",getTheoryNosById);
router.get("/get-vivanosById/:id",getVivaNosById);
router.get('/allnos-List',getallNosList);
router.post("/change-nos-status",changeNosStatus)
router.get("/get-nosById/:id",getnosDetailById);
router.put('/nos-updateById',updateNosDetail);
router.delete('/nos-removeById/:id',removeNosDetail);
router.get('/noslistBySection',getallNosListBySection);
module.exports = router