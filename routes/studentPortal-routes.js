const express = require("express");
const router = express.Router()
const candidateAuth = require("../middleware/candidateAuth")
const multer = require('multer')
const storage = multer.memoryStorage()
const uploadHandler = multer({ storage:storage})

const { getAssessment, 
        startAssessment, 
        getSingleQuestion, 
        saveQuestion , 
        submitAssessment , 
        loginStudents,
        saveAssessmentFeedback, 
        uploadFaceCapture,
        uploadIdCapture,
        createCollection,
        logoutCandidate,
        captureCandidateBrowserDetails,
        candidateBasicInputs,
        saveTime,
        suspiciousActivity,
        currentSecondaryLanguage,
        instructionStepApi,
        getInstructionListById,
        compareFace,
        getSingleCandidateQuestionReport
      } = require("../controller/studentPortal-controller")

router.get('/getAssessment/:id/:candidateId', candidateAuth, getAssessment)
router.get('/startAssessment/:id/:candidateId',  candidateAuth, startAssessment)

router.get('/getSingleQuestion/:id/:candidateId/:questionId', candidateAuth, getSingleQuestion)
router.put('/saveQuestion/:id/:candidateId/:questionId', candidateAuth, saveQuestion)

router.get('/submitAssessment/:id/:candidateId', candidateAuth, submitAssessment)
router.put('/saveAssessmentFeedback/:id/:candidateId',candidateAuth, saveAssessmentFeedback)


router.post('/uploadFaceCapture/:candidateId', candidateAuth, uploadHandler.single('pic'), uploadFaceCapture)
router.post('/uploadIdCapture/:candidateId', candidateAuth, uploadHandler.single('pic'), uploadIdCapture)
router.post('/loginStudent', loginStudents)

router.post('/createCollection',  createCollection)
router.get('/logoutCandidate', candidateAuth, logoutCandidate)

router.post('/captureCandidateBrowserDetails/:candidateId', candidateAuth, captureCandidateBrowserDetails)

router.post('/candidateBasicInputs/:candidateId', candidateAuth, candidateBasicInputs)

router.post('/saveTime/:batchId/:candidateId', candidateAuth, saveTime)

router.get('/suspiciousActivity/:batchId/:candidateId', candidateAuth, suspiciousActivity)


router.post('/currentSecondaryLanguage/:batchId/:candidateId', candidateAuth, currentSecondaryLanguage)

router.get('/instructionStepApi/:candidateId', candidateAuth, instructionStepApi)
router.get("/instructionListById/:id",candidateAuth, getInstructionListById);

router.post('/compare-face', candidateAuth, uploadHandler.fields([
  { name: 'liveImage', maxCount: 1 }
]),  compareFace)

// router.get('/startTimer/:id', (req, res) => startTimer(req.app.get('socketio'), req, res))
router.get(
  "/single-candidate-question-report/:batchId/:candidateId",
  getSingleCandidateQuestionReport
);

router.get(
  "/single-candidate-question-report/:batchId/:candidateId",
  getSingleCandidateQuestionReport
);

module.exports = router