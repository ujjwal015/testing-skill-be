/**
 * Content Security Policy Configuration
 * 
 * This file contains CSP directives that can be customized based on environment
 * and application requirements.
 */

const cspConfig = {
    // Development environment - more permissive for easier development
    development: {
        "default-src": ["'self'"],
        "script-src": [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "https://cdn.jsdelivr.net",
            "https://unpkg.com",
            "https://cdnjs.cloudflare.com",
            "http://localhost:*"
        ],
        "style-src": [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com"
        ],
        "font-src": [
            "'self'",
            "https://fonts.gstatic.com",
            "https://cdn.jsdelivr.net"
        ],
        "img-src": [
            "'self'",
            "data:",
            "https:",
            "http:",
            "https://testa-new.s3.ap-south-1.amazonaws.com",
            "https://*.amazonaws.com"
        ],
        "connect-src": [
            "'self'",
            "https://api.staging.assessor.testaonline.com",
            "https://*.testaonline.com",
            "https://testa-new.s3.ap-south-1.amazonaws.com",
            "https://*.amazonaws.com",
            "http://localhost:*",
            "ws://localhost:*",
            "wss:",
            "ws:"
        ],
        "frame-src": ["'none'"],
        "object-src": ["'none'"],
        "media-src": ["'self'", "https://*.amazonaws.com"],
        "child-src": ["'none'"],
        "worker-src": ["'self'"],
        "manifest-src": ["'self'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"]
    },

    // Staging environment - moderate restrictions
    staging: {
        "default-src": ["'self'"],
        "script-src": [
            "'self'",
            "'unsafe-inline'", // Consider removing this and using nonces
            "'unsafe-eval'", // Consider removing this if not needed
            "https://cdn.jsdelivr.net",
            "https://unpkg.com",
            "https://cdnjs.cloudflare.com"
        ],
        "style-src": [
            "'self'",
            "'unsafe-inline'", // Consider using nonces for inline styles
            "https://fonts.googleapis.com",
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com"
        ],
        "font-src": [
            "'self'",
            "https://fonts.gstatic.com",
            "https://cdn.jsdelivr.net"
        ],
        "img-src": [
            "'self'",
            "data:",
            "https:",
            "https://testa-new.s3.ap-south-1.amazonaws.com",
            "https://*.amazonaws.com"
        ],
        "connect-src": [
            "'self'",
            "https://api.staging.assessor.testaonline.com",
            "https://*.testaonline.com",
            "https://testa-new.s3.ap-south-1.amazonaws.com",
            "https://*.amazonaws.com",
            "wss:",
            "ws:"
        ],
        "frame-src": ["'none'"],
        "object-src": ["'none'"],
        "media-src": ["'self'", "https://*.amazonaws.com"],
        "child-src": ["'none'"],
        "worker-src": ["'self'"],
        "manifest-src": ["'self'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"]
    },

    // Production environment - strictest security
    production: {
        "default-src": ["'self'"],
        "script-src": [
            "'self'",
            // Remove 'unsafe-inline' and 'unsafe-eval' in production for better security
            // Use nonces or hashes for inline scripts instead
            "https://cdn.jsdelivr.net",
            "https://unpkg.com",
            "https://cdnjs.cloudflare.com"
        ],
        "style-src": [
            "'self'",
            "'unsafe-inline'", // Use nonces for inline styles in production
            "https://fonts.googleapis.com",
            "https://cdn.jsdelivr.net",
            "https://cdnjs.cloudflare.com"
        ],
        "font-src": [
            "'self'",
            "https://fonts.gstatic.com",
            "https://cdn.jsdelivr.net"
        ],
        "img-src": [
            "'self'",
            "data:",
            "https:",
            "https://testa-new.s3.ap-south-1.amazonaws.com",
            "https://*.amazonaws.com"
        ],
        "connect-src": [
            "'self'",
            "https://api.assessor.testaonline.com", // Production API URL
            "https://*.testaonline.com",
            "https://testa-new.s3.ap-south-1.amazonaws.com",
            "https://*.amazonaws.com",
            "wss:",
            "ws:"
        ],
        "frame-src": ["'none'"],
        "object-src": ["'none'"],
        "media-src": ["'self'", "https://*.amazonaws.com"],
        "child-src": ["'none'"],
        "worker-src": ["'self'"],
        "manifest-src": ["'self'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"],
        "upgrade-insecure-requests": [] // Force HTTPS in production
    }
};

/**
 * Get CSP directives based on environment
 * @param {string} environment - The environment (development, staging, production)
 * @returns {object} CSP directives object
 */
function getCspDirectives(environment = 'production') {
    const env = environment.toLowerCase();
    return cspConfig[env] || cspConfig.production;
}

/**
 * Convert CSP directives object to CSP header string
 * @param {object} directives - CSP directives object
 * @returns {string} CSP header string
 */
function buildCspString(directives) {
    return Object.entries(directives)
        .map(([directive, sources]) => {
            if (sources.length === 0) {
                return directive; // For directives like upgrade-insecure-requests
            }
            return `${directive} ${sources.join(' ')}`;
        })
        .join('; ');
}

module.exports = {
    getCspDirectives,
    buildCspString,
    cspConfig
}; 