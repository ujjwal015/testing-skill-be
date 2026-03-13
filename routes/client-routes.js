const express = require('express')
const router = express.Router()
const { createNewClient, getAllClients, updateClient, deleteClient, getOneClient, changeClientStatus, bulkUploadClients, dowloadClientSampleFile,getSectorList } = require('../controller/clientController')
const uploadHandler = require('../middleware/3sfileHandler')
const uploadFile = require('../middleware/uploadFiles')
const adminAuth = require('../middleware/adminAuth')
const checkFile = require("../middleware/checkFile")

router.post('/client', adminAuth,   uploadHandler.single('logo') ,createNewClient)
router.get('/getallclients',  getAllClients)
router.delete('/deleteclient', adminAuth,  deleteClient)
router.put('/updateclient', adminAuth, uploadHandler.single('logo'), updateClient)
router.get('/getoneclient', adminAuth, getOneClient)
router.put('/changeclientstatus', adminAuth,  changeClientStatus)
router.post('/bulkuploadclients', [ uploadFile.single('uploaded_file'),checkFile ],bulkUploadClients)
router.get('/downloadclientsamplefile', adminAuth, dowloadClientSampleFile)
router.get('/get-sector-list',adminAuth, getSectorList)

module.exports = router