require("dotenv").config();
const router = require("express").Router();
const uploadHandler = require("../middleware/3sfileHandler");
const { changePassword } = require("../controller/change-password-controller");
const uploadassesorHandler = require("../middleware/3sassesFileHandler");
const {
  createUserProfile,
  getUserProfile,
  updateUserProfile,
  getAllUserProfile,
  createAdminProfile,
  updateUserSocialProfile,
  updateMyProfileExperience,
  updateMyProfileDegree,
  updateProfilePersonalInformation,
  getProfileExperience,
  getProfileDegree,
  getAssessorPersonalDocById,
  updateIndentityInfo,
  deleteProfileExperienceById,
  deleteProfileEducation,
  deleteProfilePersonalDocumentById,
  deleteUserProfile
} = require("../controller/userProfile-controller");
// router.post("/createProfile", createUserProfile);
router.get("/getUserProfile/:id", getUserProfile);
router.post("/changePassword", changePassword);
router.put(
  "/updateProfile/:id",
  uploadHandler.single("userPhoto"),
  updateUserProfile
);
router.delete("/deleteProfile/:id",deleteUserProfile)
router.patch(
  "/update-identityInfo/:id",
  uploadHandler.fields([
    { name: "aadharCard", maxCount: 1 },
    { name: "panCard", maxCount: 1 },
  ]),
  updateIndentityInfo
);
// router.get("/getAllUserProfile",getAllUserProfile);
// router.post("/createSuperAdmin",createAdminProfile);
// router.put("/update-user-social-profile/:id",updateUserSocialProfile);
router.put(
  "/update-profileExperience",
  uploadassesorHandler.fields([{ name: "experienceCertificate" }]),
  updateMyProfileExperience
);

router.get("/getProfile-experienceList/:id", getProfileExperience);

// //updateMyProfileEducation
router.put(
  "/update-profileDegree",
  uploadassesorHandler.fields([{ name: "degreeCertificate" }]),
  updateMyProfileDegree
);

router.get("/get-profileDegree/:id", getProfileDegree);

router.put(
  "/update-profile-personalDoc",
  uploadassesorHandler.fields([{ name: "card" }]),
  updateProfilePersonalInformation
);

router.get("/get-profile-personalDoc/:id", getAssessorPersonalDocById);

router.delete("/deleteProfile-experienceDetail",deleteProfileExperienceById);

router.delete("/deleteProfile-educationDetail",deleteProfileEducation);
router.delete("/deleteProfile-personalDetail",deleteProfilePersonalDocumentById);


module.exports = router;
