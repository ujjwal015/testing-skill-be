const RedisService = require('../utils/redisService'); // Assuming service is in ../services
const redisKeys = require('../constants/redis'); // Assuming keys are in ../constants
const { sendResponse, errorResponse } = require('../utils/response');

const clearCache = async (req, res) => {
  const { key } = req.query;

  if (!key) {
    return errorResponse(res, 400, 'Cache key query parameter is required.');
  }

  const redisService = new RedisService();
  const allKnownKeys = Object.values(redisKeys);

  try {
    if (key === 'all') {
      // Create an array of promises for all cache clearing operations
      const clearingPromises = allKnownKeys.map(knownKey =>
        redisService.destroyMatching(knownKey)
      );

      // Wait for all promises to resolve
      await Promise.all(clearingPromises);

      return sendResponse(res, 200, true, null, 'All cache entries have been cleared.');

    } else {
      if (!allKnownKeys.includes(key)) {
        return errorResponse(res, 400, "Invalid cache key.", `Invalid cache key. Known keys are: ${allKnownKeys.join(', ')}, or use 'all' to clear everything.`);
      }

      await redisService.destroyMatching(key);

      return sendResponse(res, 200, true, null, `Cache entries matching pattern "${key}" have been cleared.`);
    }
  } catch (error) {
    console.error('Failed to clear Redis cache:', error);
    return errorResponse(res, 500, 'Failed to clear cache.', error);
  }
};

module.exports = {
  clearCache,
};
