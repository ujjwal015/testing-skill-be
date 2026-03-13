const router = require("express").Router();
const {
  createQuestionForm,
  getJobrole,
  getQuestionBankList,
  changeStatus,
  questionBankFilter,
  getQuestionsByQuestionBankId,
  updateQuestionbankList,
  removeQuestionbankList,
  getQuestionbankIddetail,
  getFilterQbList,
  getOptionClients,
  getQbList,
} = require("../controller/questionBankController");
//const auth = require("../middleware/userAuth");
router.post("/createQuestion", createQuestionForm);
router.get("/getJobrole", getJobrole);
router.get("/questionbank-list", getQuestionBankList);
router.get("/get-client-option", getOptionClients);
router.post("/change-questionbank-status", changeStatus);
router.get("/questionbank-filter", questionBankFilter);
router.get("/get-questionByQBankId", getQuestionsByQuestionBankId);
router.get("/questionbankId-detail/:id", getQuestionbankIddetail);
router.put("/update-questionBank-list", updateQuestionbankList);
router.delete("/removeQuestionbank-list/:id", removeQuestionbankList);
router.get("/getFilterQuestionbank-list", getFilterQbList);
router.get("/getFilterQb-list", getQbList);
module.exports = router;
