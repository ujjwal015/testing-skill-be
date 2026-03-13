const express = require("express")
const router = express.Router()
const { operationDeshboard , batchListOperationDashboard , scheduleBatchList } = require("../controller/operation-dashboard-controller")

router.get('/get-operation-details',  operationDeshboard)
router.get('/batchList-Operation-Dashboard', batchListOperationDashboard)

router.get('/get-scheduledBatch-details', scheduleBatchList)

module.exports = router 