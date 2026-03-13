const express = require('express');
const cacheController = require('../controller/cache.controller');

const router = express.Router();

router.delete(
  '/clear',
  cacheController.clearCache
);

module.exports = router;
