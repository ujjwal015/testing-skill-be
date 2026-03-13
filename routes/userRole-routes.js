const express = require("express")
const router = express.Router()
const adminAuth = require('../middleware/adminAuth')



const { createUserRole, getUserRoles, editUserRolePage, editUserRole, getFeatures , deleteUserRole} = require("../controller/userRoleController")

router.post('/createuserrole',  createUserRole)
router.get('/getuserroles',  getUserRoles)
router.get('/edituserrolepage',  editUserRolePage)
router.put('/edituserrole' ,  editUserRole)
router.get('/getfeatures',  getFeatures)
router.delete('/deleteuserrole',  deleteUserRole)


module.exports = router


