const router = require("express").Router();

const {
  batchList,
  candiateList,
  assesorList,
  candidateResults,
  resultList,
  assesorById,
  viewNosResult,
  partnerList,
  jobRoleList,
} = require("../Controller/Controller");

router.get("/batch-list", batchList);
router.get("/candiate-list", candiateList);
router.get("/assesor-list", assesorList);
router.get("/result-list", resultList);
router.get("/candidate-results", candidateResults);
router.get("/candidate-nos-result/:id", viewNosResult);
router.get("/partner-options", partnerList);
router.get("/jobRole-options", jobRoleList);
router.get("/assesor-details/:id",assesorById)

//occurre

module.exports = router;
