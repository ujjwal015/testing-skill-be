const moment = require('moment');

// Configuration constants
const LOCKOUT_CONFIG = {
    MAX_FAILED_ATTEMPTS: 5,           // Maximum failed attempts before lockout
    LOCKOUT_DURATION_MINUTES: 30,    // Lockout duration in minutes
    RESET_ATTEMPTS_AFTER_MINUTES: 15 // Reset failed attempts after this time
};

/**
 * Check if an account is currently locked
 * @param {Object} user - User object with lockout fields
 * @returns {Object} - { isLocked: boolean, remainingTime: number }
 */
const checkAccountLockout = (user) => {
    if (!user.isAccountLocked) {
        return { isLocked: false, remainingTime: 0 };
    }

    const now = new Date();
    const lockoutExpiry = new Date(user.lockoutExpiry);

    if (now >= lockoutExpiry) {
        // Lockout has expired
        return { isLocked: false, remainingTime: 0, shouldUnlock: true };
    }

    const remainingTime = Math.ceil((lockoutExpiry - now) / (1000 * 60)); // in minutes
    return { isLocked: true, remainingTime };
};

/**
 * Handle failed login attempt
 * @param {Object} user - User object
 * @returns {Object} - Updated user fields and lockout info
 */
const handleFailedLogin = (user) => {
    const now = new Date();
    const lastFailedLogin = user.lastFailedLogin ? new Date(user.lastFailedLogin) : null;
    
    // Reset attempts if enough time has passed since last failed login
    if (lastFailedLogin && moment(now).diff(moment(lastFailedLogin), 'minutes') > LOCKOUT_CONFIG.RESET_ATTEMPTS_AFTER_MINUTES) {
        user.failedLoginAttempts = 0;
    }

    user.failedLoginAttempts = (user.failedLoginAttempts || 0) + 1;
    user.lastFailedLogin = now;

    const remainingAttempts = LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS - user.failedLoginAttempts;

    if (user.failedLoginAttempts >= LOCKOUT_CONFIG.MAX_FAILED_ATTEMPTS) {
        // Lock the account
        user.isAccountLocked = true;
        user.lockoutExpiry = moment(now).add(LOCKOUT_CONFIG.LOCKOUT_DURATION_MINUTES, 'minutes').toDate();
        
        return {
            updateFields: {
                failedLoginAttempts: user.failedLoginAttempts,
                lastFailedLogin: user.lastFailedLogin,
                isAccountLocked: user.isAccountLocked,
                lockoutExpiry: user.lockoutExpiry
            },
            isLocked: true,
            lockoutDuration: LOCKOUT_CONFIG.LOCKOUT_DURATION_MINUTES,
            remainingAttempts: 0
        };
    }

    return {
        updateFields: {
            failedLoginAttempts: user.failedLoginAttempts,
            lastFailedLogin: user.lastFailedLogin
        },
        isLocked: false,
        remainingAttempts
    };
};

/**
 * Handle successful login - reset failed attempts and unlock if needed
 * @param {Object} user - User object
 * @returns {Object} - Fields to update
 */
const handleSuccessfulLogin = (user) => {
    return {
        failedLoginAttempts: 0,
        lastFailedLogin: null,
        isAccountLocked: false,
        lockoutExpiry: null
    };
};

/**
 * Manually unlock an account (admin function)
 * @param {Object} user - User object
 * @returns {Object} - Fields to update
 */
const unlockAccount = (user) => {
    return {
        failedLoginAttempts: 0,
        lastFailedLogin: null,
        isAccountLocked: false,
        lockoutExpiry: null
    };
};

/**
 * Get lockout status message for user
 * @param {Object} lockoutInfo - Lockout information
 * @returns {string} - User-friendly message
 */
const getLockoutMessage = (lockoutInfo) => {
    if (lockoutInfo.isLocked) {
        // Use remainingTime if available, otherwise fallback to lockoutDuration
        const timeMinutes = lockoutInfo.remainingTime || lockoutInfo.lockoutDuration || LOCKOUT_CONFIG.LOCKOUT_DURATION_MINUTES;
        return `Account is locked due to multiple failed login attempts. Please try again after ${timeMinutes} minutes or contact administrator for assistance.`;
    }
    
    if (lockoutInfo.remainingAttempts !== undefined && lockoutInfo.remainingAttempts < 1) {
        return `Invalid credentials. ${lockoutInfo.remainingAttempts} attempts remaining before account lockout.`;
    }
    
    return 'Invalid credentials.';
};

/**
 * Check if account should be automatically unlocked
 * @param {Object} user - User object
 * @returns {boolean} - Whether account should be unlocked
 */
const shouldAutoUnlock = (user) => {
    if (!user.isAccountLocked || !user.lockoutExpiry) {
        return false;
    }
    
    const now = new Date();
    const lockoutExpiry = new Date(user.lockoutExpiry);
    
    return now >= lockoutExpiry;
};

module.exports = {
    LOCKOUT_CONFIG,
    checkAccountLockout,
    handleFailedLogin,
    handleSuccessfulLogin,
    unlockAccount,
    getLockoutMessage,
    shouldAutoUnlock
}; 