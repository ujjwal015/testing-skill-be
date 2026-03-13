const moment = require('moment');

// OTP Lockout Configuration constants
const OTP_LOCKOUT_CONFIG = {
    MAX_FAILED_ATTEMPTS: 5,           // Maximum failed OTP attempts before lockout
    LOCKOUT_DURATION_MINUTES: 30,    // OTP lockout duration in minutes
    RESET_ATTEMPTS_AFTER_MINUTES: 15 // Reset failed OTP attempts after this time
};

/**
 * Check if OTP is currently locked
 * @param {Object} user - User object with OTP lockout fields
 * @returns {Object} - { isLocked: boolean, remainingTime: number }
 */
const checkOtpLockout = (user) => {
    if (!user.isOtpLocked) {
        return { isLocked: false, remainingTime: 0 };
    }

    const now = new Date();
    const lockoutExpiry = new Date(user.otpLockoutExpiry);

    if (now >= lockoutExpiry) {
        // Lockout has expired
        return { isLocked: false, remainingTime: 0, shouldUnlock: true };
    }

    const remainingTime = Math.ceil((lockoutExpiry - now) / (1000 * 60)); // in minutes
    return { isLocked: true, remainingTime };
};

/**
 * Handle failed OTP verification attempt
 * @param {Object} user - User object
 * @returns {Object} - Updated user fields and lockout info
 */
const handleFailedOtp = (user) => {
    const now = new Date();
    const lastFailedOtp = user.lastFailedOtp ? new Date(user.lastFailedOtp) : null;
    
    // Reset attempts if enough time has passed since last failed OTP
    if (lastFailedOtp && moment(now).diff(moment(lastFailedOtp), 'minutes') > OTP_LOCKOUT_CONFIG.RESET_ATTEMPTS_AFTER_MINUTES) {
        user.failedOtpAttempts = 0;
    }

    user.failedOtpAttempts = (user.failedOtpAttempts || 0) + 1;
    user.lastFailedOtp = now;

    const remainingAttempts = OTP_LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS - user.failedOtpAttempts;

    if (user.failedOtpAttempts >= OTP_LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS) {
        // Lock the OTP
        user.isOtpLocked = true;
        user.otpLockoutExpiry = moment(now).add(OTP_LOCKOUT_CONFIG.LOCKOUT_DURATION_MINUTES, 'minutes').toDate();
        
        return {
            updateFields: {
                failedOtpAttempts: user.failedOtpAttempts,
                lastFailedOtp: user.lastFailedOtp,
                isOtpLocked: user.isOtpLocked,
                otpLockoutExpiry: user.otpLockoutExpiry
            },
            isLocked: true,
            lockoutDuration: OTP_LOCKOUT_CONFIG.LOCKOUT_DURATION_MINUTES,
            remainingAttempts: 0
        };
    }

    return {
        updateFields: {
            failedOtpAttempts: user.failedOtpAttempts,
            lastFailedOtp: user.lastFailedOtp
        },
        isLocked: false,
        remainingAttempts
    };
};

/**
 * Handle successful OTP verification - reset failed attempts and unlock if needed
 * @param {Object} user - User object
 * @returns {Object} - Fields to update
 */
const handleSuccessfulOtp = (user) => {
    return {
        failedOtpAttempts: 0,
        lastFailedOtp: null,
        isOtpLocked: false,
        otpLockoutExpiry: null
    };
};

/**
 * Manually unlock OTP (admin function)
 * @param {Object} user - User object
 * @returns {Object} - Updated user object with unlocked OTP fields
 */
const manualUnlockOtp = async (user) => {
    const updateFields = {
        failedOtpAttempts: 0,
        lastFailedOtp: null,
        isOtpLocked: false,
        otpLockoutExpiry: null
    };

    // Update the user object with unlock fields
    Object.assign(user, updateFields);
    
    return user;
};

/**
 * Get OTP lockout status information
 * @param {Object} user - User object
 * @returns {Object} - OTP lockout status information
 */
const getOtpLockoutStatus = (user) => {
    const lockoutStatus = checkOtpLockout(user);
    
    return {
        isOtpLocked: user.isOtpLocked || false,
        failedOtpAttempts: user.failedOtpAttempts || 0,
        maxAttempts: OTP_LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS,
        remainingAttempts: Math.max(0, OTP_LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS - (user.failedOtpAttempts || 0)),
        lockoutExpiry: user.otpLockoutExpiry,
        remainingLockoutTime: lockoutStatus.remainingTime,
        lockoutDurationMinutes: OTP_LOCKOUT_CONFIG.LOCKOUT_DURATION_MINUTES
    };
};

/**
 * Get OTP lockout status message for user
 * @param {Object} lockoutInfo - OTP lockout information
 * @returns {string} - User-friendly message
 */
const getOtpLockoutMessage = (lockoutInfo) => {
    if (lockoutInfo.isLocked) {
        return `OTP verification is locked due to multiple failed attempts. Please try again after ${lockoutInfo.remainingTime} minutes or contact administrator for assistance.`;
    }
    
    if (lockoutInfo.remainingAttempts !== undefined) {
        return `Invalid OTP. ${lockoutInfo.remainingAttempts} attempts remaining before OTP lockout.`;
    }
    
    return 'Invalid OTP.';
};

/**
 * Check if OTP should be automatically unlocked
 * @param {Object} user - User object
 * @returns {boolean} - Whether OTP should be unlocked
 */
const shouldAutoUnlockOtp = (user) => {
    if (!user.isOtpLocked || !user.otpLockoutExpiry) {
        return false;
    }
    
    const now = new Date();
    const lockoutExpiry = new Date(user.otpLockoutExpiry);
    
    return now >= lockoutExpiry;
};

module.exports = {
    OTP_LOCKOUT_CONFIG,
    checkOtpLockout,
    handleFailedOtp,
    handleSuccessfulOtp,
    manualUnlockOtp,
    getOtpLockoutStatus,
    getOtpLockoutMessage,
    shouldAutoUnlockOtp
}; 