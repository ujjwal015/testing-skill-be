const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const moment = require('moment');

// Password reset security configuration
const RESET_CONFIG = {
    TOKEN_EXPIRY_MINUTES: 15,        //TOKEN_EXPIRY_HOURS: 1,           // Reset token expires in 1 hour (not 24 hours)
    MAX_RESET_ATTEMPTS: 3,           // Maximum reset attempts per day
    RESET_COOLDOWN_HOURS: 24,        // Cooldown period between reset requests
    MAX_REQUESTS_PER_DAY: 3          // Maximum forgot password requests per day
};

/**
 * Generate a secure reset token with additional security measures
 * @param {Object} user - User object
 * @returns {Object} - { token, hashedToken, expiry }
 */
const generateSecureResetToken = (user) => {
    // Generate a random token component
    const randomBytes = crypto.randomBytes(32).toString('hex');
    
    // Create JWT payload with additional security
    const payload = {
        userId: user._id,
        email: user.email,
        randomBytes: randomBytes,
        timestamp: Date.now(),
        // Add user's current password hash as part of the token validation
        // This ensures token becomes invalid if password is changed
        passwordHash: user.password.substring(0, 20) // First 20 chars of hash
    };
    
    // Generate JWT token
    const token = jwt.sign(payload, process.env.JWT_SECRET, { 
        expiresIn: `${RESET_CONFIG.TOKEN_EXPIRY_MINUTES}m` 
    });
    
    // Create a hash of the token to store in database
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    
    // Set expiry time
    const expiry = moment().add(RESET_CONFIG.TOKEN_EXPIRY_MINUTES, 'minutes').toDate();
    
    return {
        token,
        hashedToken,
        expiry
    };
};

/**
 * Validate reset token and check for reuse
 * @param {string} token - Reset token from request
 * @param {Object} user - User object from database
 * @returns {Object} - Validation result
 */
const validateResetToken = async (token, user) => {
    try {
        // Check if user has a valid reset token
        if (!user.resetToken || !user.resetTokenExpiry) {
            return {
                isValid: false,
                error: 'No valid reset token found. Please request a new password reset.'
            };
        }
        
        // Check if token has expired
        if (moment().isAfter(moment(user.resetTokenExpiry))) {
            return {
                isValid: false,
                error: 'Reset token has expired. Please request a new password reset.'
            };
        }
        
        // Check if token has already been used
        if (user.resetTokenUsed) {
            return {
                isValid: false,
                error: 'Reset token has already been used. Please request a new password reset.'
            };
        }
        
        // Verify JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        
        // Additional validation: Check if password hash matches
        // This prevents token reuse if password was changed through other means
        const currentPasswordHash = user.password.substring(0, 20);
        if (decoded.passwordHash !== currentPasswordHash) {
            return {
                isValid: false,
                error: 'Reset token is no longer valid. Please request a new password reset.'
            };
        }
        
        // Validate token hash
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        if (tokenHash !== user.resetToken) {
            return {
                isValid: false,
                error: 'Invalid reset token. Please request a new password reset.'
            };
        }
        
        return {
            isValid: true,
            decoded
        };
        
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return {
                isValid: false,
                error: 'Reset token has expired. Please request a new password reset.'
            };
        }
        
        return {
            isValid: false,
            error: 'Invalid reset token. Please request a new password reset.'
        };
    }
};

/**
 * Check if user can request password reset (rate limiting)
 * @param {Object} user - User object
 * @returns {Object} - Rate limit check result
 */
const checkResetRateLimit = (user) => {
    const now = moment();
    
    // Check if user has made too many reset requests today
    if (user.lastResetRequest) {
        const lastRequest = moment(user.lastResetRequest);
        const hoursSinceLastRequest = now.diff(lastRequest, 'hours');
        
        // If last request was within cooldown period
        if (hoursSinceLastRequest < RESET_CONFIG.RESET_COOLDOWN_HOURS) {
            // Check if user has exceeded daily limit
            if (user.passwordResetAttempts >= RESET_CONFIG.MAX_REQUESTS_PER_DAY) {
                return {
                    canRequest: false,
                    error: `Too many password reset requests. Please try again after ${RESET_CONFIG.RESET_COOLDOWN_HOURS - hoursSinceLastRequest} hours.`,
                    remainingTime: RESET_CONFIG.RESET_COOLDOWN_HOURS - hoursSinceLastRequest
                };
            }
        } else {
            // Reset counter if cooldown period has passed
            return {
                canRequest: true,
                shouldResetCounter: true
            };
        }
    }
    
    return {
        canRequest: true,
        shouldResetCounter: false
    };
};

/**
 * Mark reset token as used and update user
 * @param {Object} user - User object
 * @returns {Object} - Update fields
 */
const markTokenAsUsed = (user) => {
    return {
        resetTokenUsed: true,
        lastPasswordReset: new Date(),
        resetToken: null,
        resetTokenExpiry: null,
        passwordResetAttempts: 0,
        lastResetRequest: null
    };
};

/**
 * Update user with new reset token
 * @param {Object} user - User object
 * @param {Object} tokenData - Token data from generateSecureResetToken
 * @returns {Object} - Update fields
 */
const updateUserWithResetToken = (user, tokenData, shouldResetCounter = false) => {
    const updateFields = {
        resetToken: tokenData.hashedToken,
        resetTokenExpiry: tokenData.expiry,
        resetTokenUsed: false,
        lastResetRequest: new Date()
    };
    
    if (shouldResetCounter) {
        updateFields.passwordResetAttempts = 1;
    } else {
        updateFields.passwordResetAttempts = (user.passwordResetAttempts || 0) + 1;
    }
    
    return updateFields;
};

/**
 * Get password reset status information
 * @param {Object} user - User object
 * @returns {Object} - Reset status information
 */
const getResetStatus = (user) => {
    const now = moment();
    let status = {
        hasActiveToken: false,
        tokenExpiry: null,
        canRequestReset: true,
        resetAttempts: user.passwordResetAttempts || 0,
        maxAttempts: RESET_CONFIG.MAX_REQUESTS_PER_DAY,
        lastResetRequest: user.lastResetRequest
    };
    
    // Check if user has an active reset token
    if (user.resetToken && user.resetTokenExpiry && !user.resetTokenUsed) {
        if (moment().isBefore(moment(user.resetTokenExpiry))) {
            status.hasActiveToken = true;
            status.tokenExpiry = user.resetTokenExpiry;
        }
    }
    
    // Check rate limiting
    const rateLimitCheck = checkResetRateLimit(user);
    status.canRequestReset = rateLimitCheck.canRequest;
    if (!rateLimitCheck.canRequest) {
        status.rateLimitError = rateLimitCheck.error;
        status.remainingTime = rateLimitCheck.remainingTime;
    }
    
    return status;
};

module.exports = {
    generateSecureResetToken,
    validateResetToken,
    checkResetRateLimit,
    markTokenAsUsed,
    updateUserWithResetToken,
    getResetStatus,
    RESET_CONFIG
};
