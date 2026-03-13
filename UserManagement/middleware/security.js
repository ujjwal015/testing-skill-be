const { getCspDirectives, buildCspString } = require('../config/csp-config');

const securityMiddleware = (req, res, next) => {
    // Get CSP directives based on environment
    const environment = process.env.NODE_ENV || 'production';
    const cspDirectives = getCspDirectives(environment);
    
    // Convert directives object to CSP string
    const cspString = buildCspString(cspDirectives);

    // Set comprehensive security headers
    res.setHeader('Content-Security-Policy', cspString);
    
    // X-Frame-Options
    res.setHeader('X-Frame-Options', 'DENY');
    
    // X-Content-Type-Options
    res.setHeader('X-Content-Type-Options', 'nosniff');
    
    // X-XSS-Protection
    res.setHeader('X-XSS-Protection', '1; mode=block');
    
    // Strict-Transport-Security
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    
    // Referrer Policy
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    
    // Permissions Policy (formerly Feature Policy)
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=()');
    
    // Remove X-Powered-By header for security
    res.removeHeader('X-Powered-By');
    
    next();
};

module.exports = securityMiddleware; 