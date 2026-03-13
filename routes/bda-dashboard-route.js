const express = require('express')
const router = express.Router()

const { listOfAllClients ,clientsByOrganisationType, clientsByMonth , bdaWidgetStats,getUpcomingAssignment} = require("../controller/bda-dashboard-controller")
//update upcoming assignment route
router.post("/upcoming-assignment", getUpcomingAssignment);
router.get('/listofallclients', listOfAllClients)
router.get('/clientsbyorgtype', clientsByOrganisationType)
router.get('/clientsbymonthwise', clientsByMonth)
router.get('/bdawidgetstats', bdaWidgetStats)


module.exports = router 