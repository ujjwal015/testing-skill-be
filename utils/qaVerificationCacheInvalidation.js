const RedisService = require("./redisService");
const {
  QA_VERIFICATION_ASSESSOR_NAME_LIST,
  QA_VERIFICATION_LIST,
  QA_VERIFICATION_DETAILS,
  QA_VERIFICATION_EXPORT,
  VERIFICATION_ASSESSMENT_BATCH,
  VERIFICATION_ASSESSMENT_ASSESSOR,
  VERIFICATION_ASSESSMENT_DATE,
} = require("../constants/redis");

const redis = new RedisService("db0");

/**
 * Cache invalidation utility for QA Verification Assessment module
 */
class QAVerificationCacheInvalidation {
  /**
   * Invalidate all QA verification related caches
   */
  static async invalidateAll() {
    try {
      // Invalidate specific cache keys
      await redis.destroy(QA_VERIFICATION_ASSESSOR_NAME_LIST);
      await redis.destroy(QA_VERIFICATION_LIST);
      await redis.destroy(QA_VERIFICATION_DETAILS);
      await redis.destroy(QA_VERIFICATION_EXPORT);

      // Invalidate any pattern-based caches related to QA verification
      await redis.destroyMatching("QA_VERIFICATION_*");
      await redis.destroyMatching("VERIFICATION_ASSESSMENT_*");

      console.log("✅ QA Verification caches invalidated successfully");
    } catch (error) {
      console.error(
        "❌ Error invalidating QA verification caches:",
        error.message
      );
    }
  }

  /**
   * Invalidate assessor-specific caches
   * @param {string} assessorId - The assessor ID
   */
  static async invalidateAssessorCache(assessorId) {
    try {
      await redis.destroy(QA_VERIFICATION_ASSESSOR_NAME_LIST);
      await redis.destroyMatching(
        `${VERIFICATION_ASSESSMENT_ASSESSOR}_${assessorId}_*`
      );
      await redis.destroyMatching(`QA_VERIFICATION_ASSESSOR_${assessorId}_*`);

      console.log(`✅ Assessor cache invalidated for ID: ${assessorId}`);
    } catch (error) {
      console.error("❌ Error invalidating assessor cache:", error.message);
    }
  }

  /**
   * Invalidate batch-specific caches
   * @param {string} batchId - The batch ID
   */
  static async invalidateBatchCache(batchId) {
    try {
      await redis.destroyMatching(
        `${VERIFICATION_ASSESSMENT_BATCH}_${batchId}_*`
      );
      await redis.destroyMatching(`QA_VERIFICATION_BATCH_${batchId}_*`);

      console.log(`✅ Batch cache invalidated for ID: ${batchId}`);
    } catch (error) {
      console.error("❌ Error invalidating batch cache:", error.message);
    }
  }

  /**
   * Invalidate date-specific caches
   * @param {string} date - The date in DD-MM-YYYY format
   */
  static async invalidateDateCache(date) {
    try {
      await redis.destroyMatching(`${VERIFICATION_ASSESSMENT_DATE}_${date}_*`);
      await redis.destroyMatching(`QA_VERIFICATION_DATE_${date}_*`);

      console.log(`✅ Date cache invalidated for: ${date}`);
    } catch (error) {
      console.error("❌ Error invalidating date cache:", error.message);
    }
  }

  /**
   * Invalidate verification list caches
   */
  static async invalidateVerificationListCache() {
    try {
      await redis.destroy(QA_VERIFICATION_LIST);
      await redis.destroy(QA_VERIFICATION_EXPORT);
      await redis.destroyMatching("VERIFICATION_LIST_*");
      await redis.destroyMatching("ASSESSMENT_DETAILS_*");

      console.log("✅ Verification list caches invalidated");
    } catch (error) {
      console.error(
        "❌ Error invalidating verification list caches:",
        error.message
      );
    }
  }
}

module.exports = QAVerificationCacheInvalidation;
