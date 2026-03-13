const express = require("express");
const router = express.Router();
const auth = require("../middleware/newUserAuth");

const {
  createUser,
  getUsers,
  updateUser,
  deleteUser,
  getOneUser,
  getOneUser2,
  changeUserStatus,
  passwordReset,
  userLogin,
  logOutFromDevice,
  getuserPermissions,
  updateDeviceInfo,
  unlockAdminUserAccount,
} = require("../controller/userController");

const adminAuth = require("../middleware/adminAuth");
const blacklistingToken = require("../middleware/blacklistToken");
//update user routes
router.post("/createuser", auth, createUser);
router.get("/getusers", auth, getUsers);
router.put("/updateuser", auth, updateUser);
router.delete("/deleteuser", auth, deleteUser);
router.get("/getoneuser", auth, getOneUser);
router.get("/getOneUser2", auth, getOneUser2);
router.put("/changeuserstatus", auth, changeUserStatus);
router.post("/password-reset", passwordReset);
router.post("/login-user", userLogin);
router.post("/logout", logOutFromDevice);
router.get("/get-user-permissions", adminAuth, getuserPermissions);
router.patch("/update-deviceInfo", updateDeviceInfo);
router.put("/user-unlock-account/:id", auth, unlockAdminUserAccount);

module.exports = router;
