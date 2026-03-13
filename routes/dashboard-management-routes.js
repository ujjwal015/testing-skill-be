require("dotenv").config()
const router = require("express").Router();

// components handling routes 
const { addComponent, 
        updateComponent, 
        getAllComponents, 
        getComponentById, 
        deleteComponent } = require("../controller/dashboard-management-controller")



router.post("/addComponent", addComponent)
router.put("/updateComponent/:id", updateComponent)
router.get("/getAllComponents", getAllComponents)
router.get("/getComponentById/:id", getComponentById)
router.delete("/deleteComponent/:id", deleteComponent)

// dashboard management routes
const { addDashboard,
        updateDashboard,
        getAllDashboards,
        getDashboardById,
        deleteDashboard,
        changeDashboardStatus } = require("../controller/dashboard-management-controller")


router.post("/addDashboard", addDashboard)
router.put("/updateDashboard/:id", updateDashboard)
router.put("/changeDashboardStatus", changeDashboardStatus)
router.get("/getAllDashboards", getAllDashboards)
router.get("/getDashboardById/:id", getDashboardById)
router.delete("/deleteDashboard/:id", deleteDashboard)

// user dashboard routes 

const { addUserDashboard, 
        updateUserDashboard,
        getAllUserDashboards,
        getUserDashboardById,
        deleteUserDashboard } = require("../controller/dashboard-management-controller")

router.post("/addUserDashboard", addUserDashboard)
router.put("/updateUserDashboard/:id", updateUserDashboard)
router.get("/getAllUserDashboards", getAllUserDashboards)
router.get("/getUserDashboardById/:id", getUserDashboardById)
router.delete("/deleteUserDashboard/:id", deleteUserDashboard)



module.exports = router;