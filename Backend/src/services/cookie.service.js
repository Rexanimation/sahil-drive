/**
 * Cookie Service
 * Handles setting and clearing secure HttpOnly cookies for session management.
 */

const isProduction = process.env.NODE_ENV === "production";

/**
 * Sets the access and refresh tokens as secure HttpOnly cookies.
 * @param {Object} res - Express response object
 * @param {string} accessToken - JWT access token
 * @param {string} refreshToken - JWT refresh token
 */
function setAuthCookies(res, accessToken, refreshToken) {
    // Access token cookie (short-lived, e.g., 15 minutes)
    res.cookie("token", accessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "strict" : "lax",
        maxAge: 15 * 60 * 1000 // 15 minutes
    });

    // Refresh token cookie (long-lived, e.g., 7 days)
    if (refreshToken) {
        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: isProduction,
            sameSite: isProduction ? "strict" : "lax",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
        });
    }
}

/**
 * Clears authentication cookies.
 * @param {Object} res - Express response object
 */
function clearAuthCookies(res) {
    res.clearCookie("token");
    res.clearCookie("refreshToken");
}

module.exports = {
    setAuthCookies,
    clearAuthCookies
};
