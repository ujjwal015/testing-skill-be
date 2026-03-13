require("dotenv").config()
const router = require("express").Router();
const { registerUser, singIn, forgetPassword, resetPassword, verifyEmail,changePassword,redirectToUserProfile,resendMail,validateResetToken, checkResetPasswordLinkExpiry } = require("../controller/auth");
const auth = require("../middleware/adminAuth");
router.post("/registeruser",registerUser);
router.post("/verify-email", verifyEmail);
router.post("/loginuser", singIn);
router.post("/forget-password", forgetPassword);
router.post("/reset-password",resetPassword);
router.post("/check-reset-password-link",checkResetPasswordLinkExpiry);
router.post("/validate-reset-token",validateResetToken);
router.post("/changepassword",auth,changePassword);
router.post("/basic-user-detail",redirectToUserProfile);
router.post("/resend-mail",resendMail)
module.exports = router;