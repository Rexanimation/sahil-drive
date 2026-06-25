const userModel = require('../models/user.model');
const { verifyAccessToken, verifyRefreshToken, generateAccessToken } = require('../services/token.service');
const { setAuthCookies, clearAuthCookies } = require('../services/cookie.service');

/**
 * Authentication Middleware
 * Checks for a valid access token.
 * If the access token is expired but a valid refresh token exists, it performs a silent login (token refresh).
 */
async function authUser(req, res, next) {
    const { token, refreshToken } = req.cookies;

    if (!token && !refreshToken) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        if (token) {
            try {
                // Try verifying the short-lived access token
                const decoded = verifyAccessToken(token);
                const user = await userModel.findById(decoded.id);
                
                if (!user) {
                    throw new Error("User not found");
                }

                req.user = user;
                req.user.id = decoded.id;
                return next();
            } catch (err) {
                // If it's not a TokenExpiredError, then the token is invalid for another reason
                if (err.name !== 'TokenExpiredError') {
                    throw err;
                }
                // If expired, fall through to refresh token logic below
            }
        }

        // Token is missing or expired, try the refresh token
        if (!refreshToken) {
            return res.status(401).json({ message: 'Unauthorized - Session Expired' });
        }

        const decodedRefresh = verifyRefreshToken(refreshToken);
        const user = await userModel.findById(decodedRefresh.id);

        if (!user || user.refreshToken !== refreshToken) {
            // Revoked or invalid refresh token
            clearAuthCookies(res);
            return res.status(401).json({ message: 'Unauthorized - Invalid Session' });
        }

        // Silent Login Success: Issue new access token
        const newAccessToken = generateAccessToken(user._id);
        
        // We reuse the existing refresh token, or we could rotate it here. For now, keep it.
        setAuthCookies(res, newAccessToken, refreshToken);

        req.user = user;
        req.user.id = decodedRefresh.id;
        next();

    } catch (err) {
        console.error("Auth Middleware Error:", err.message);
        clearAuthCookies(res);
        res.status(401).json({ message: 'Unauthorized' });
    }
}

module.exports = {
    authUser
};