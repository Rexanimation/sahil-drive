/**
 * Google Service
 * Handles Google OAuth logic such as verifying Google ID tokens.
 */
const { OAuth2Client } = require('google-auth-library');
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Verifies a Google ID Token
 * @param {string} credential - The Google ID Token from the client
 * @returns {Promise<Object>} - Decoded Google payload (email, given_name, family_name, sub, picture, etc.)
 */
async function verifyGoogleToken(credential) {
    if (!process.env.GOOGLE_CLIENT_ID || credential.startsWith("mock_")) {
        // Fallback for development/testing without real client ID
        return {
            email: "mock.user@gmail.com",
            given_name: "Sahil",
            family_name: "User",
            sub: "mock_123456789",
            picture: ""
        };
    }

    const ticket = await client.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID
    });
    
    return ticket.getPayload();
}

module.exports = {
    verifyGoogleToken
};
