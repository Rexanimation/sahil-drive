/**
 * Token Service
 * Handles generation and verification of JWT Access and Refresh tokens.
 */
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret_for_dev';
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET || 'fallback_refresh_secret_for_dev';

// Expirations
const ACCESS_TOKEN_EXPIRES_IN = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 days

/**
 * Generates an Access Token
 * @param {string} userId - The user's ID
 * @returns {string} - JWT Access Token
 */
function generateAccessToken(userId) {
    return jwt.sign({ id: userId }, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
}

/**
 * Generates a Refresh Token
 * @param {string} userId - The user's ID
 * @returns {string} - JWT Refresh Token
 */
function generateRefreshToken(userId) {
    return jwt.sign({ id: userId }, REFRESH_TOKEN_SECRET, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
}

/**
 * Verifies an Access Token
 * @param {string} token - JWT Access Token
 * @returns {Object} - Decoded payload
 * @throws {Error} - If token is invalid or expired
 */
function verifyAccessToken(token) {
    return jwt.verify(token, JWT_SECRET);
}

/**
 * Verifies a Refresh Token
 * @param {string} token - JWT Refresh Token
 * @returns {Object} - Decoded payload
 * @throws {Error} - If token is invalid or expired
 */
function verifyRefreshToken(token) {
    return jwt.verify(token, REFRESH_TOKEN_SECRET);
}

module.exports = {
    generateAccessToken,
    generateRefreshToken,
    verifyAccessToken,
    verifyRefreshToken
};
