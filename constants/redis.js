const redisKeys = {
  // ================== Token ==================
  BLACK_LIST_TOKENS: "BLACK_LIST_TOKENS",

  // ================== User ==================
  USER_AUTH_CACHE: "USER_AUTH_CACHE", // Used in auth middleware
  DEVICE_AUTH_CACHE: "DEVICE_AUTH_CACHE", // Used in auth middleware
  USER_ADMIN_AUTH_CACHE: "USER_ADMIN_AUTH_CACHE", // Used in adminAuth middleware
  USER_PERMISSION_CACHE: "USER_PERMISSION_CACHE",

  // ================== Others ==================
  ONLINE_RESULT_BATCH_LIST: "ONLINE_RESULT_BATCH_LIST", // used with req queries
  BATCH_LIST_EXAM_MANAGEMENT: "BATCH_LIST_EXAM_MANAGEMENT", // used with req queries
  BATCH_LIST_ASSIGN_CANDIDATE: "BATCH_LIST_ASSIGN_CANDIDATE",
  QA_VERIFICATION_ASSESSOR_NAME_LIST: "QA_VERIFICATION_ASSESSOR_NAME_LIST", // QA verification assessor names
  
  // ================== QA Verification Cache Keys ==================
  QA_VERIFICATION_LIST: "QA_VERIFICATION_LIST", // QA verification assessment list
  QA_VERIFICATION_DETAILS: "QA_VERIFICATION_DETAILS", // QA verification details
  QA_VERIFICATION_EXPORT: "QA_VERIFICATION_EXPORT", // QA verification export data
  VERIFICATION_ASSESSMENT_BATCH: "VERIFICATION_ASSESSMENT_BATCH", // Batch-specific verification data
  VERIFICATION_ASSESSMENT_ASSESSOR: "VERIFICATION_ASSESSMENT_ASSESSOR", // Assessor-specific verification data
  VERIFICATION_ASSESSMENT_DATE: "VERIFICATION_ASSESSMENT_DATE", // Date-specific verification data
};

module.exports = redisKeys;
