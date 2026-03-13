const router = require("express").Router();

const { contentDashboardCard, questionAnalytics, languageAnalytics, jobRoleOccurrence , teamMembers,
    clientWithJobRole } = require("../controller/content-dashboard")

router.get('/content-dashboard-top-card', contentDashboardCard)

router.get('/question-analytics', questionAnalytics)
router.get('/language-analytics', languageAnalytics)
router.get('/jobrole-occurrence', jobRoleOccurrence)
router.get('/team-members', teamMembers)
router.get('/client-with-job-role', clientWithJobRole)

//occurred

module.exports = router;