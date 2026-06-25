/**
 * Auth Service
 * Handles core authentication business logic (login, registration, etc.).
 */
const bcrypt = require('bcryptjs');
const userModel = require('../models/user.model');
const { verifyGoogleToken } = require('./google.service');
const { generateAccessToken, generateRefreshToken } = require('./token.service');
const { encrypt } = require('../utils/crypto');
const { validateCredentials, getStorageForUser } = require('./mega.service');
const { sendMegaSuccessEmail } = require('./email.service');

/**
 * Registers a new user manually
 * @param {Object} userData - Contains email, password, fullName
 * @returns {Promise<Object>} - Newly created user object and tokens
 */
async function register(userData) {
    const { email, password, fullName } = userData;

    if (!email || !password || !fullName?.firstName || !fullName?.lastName) {
        throw new Error("All fields are required");
    }

    const isUserAlreadyExists = await userModel.findOne({ email });
    if (isUserAlreadyExists) {
        throw new Error("User already exists");
    }

    const hashPassword = await bcrypt.hash(password, 10);

    const user = await userModel.create({
        fullName: {
            firstName: fullName.firstName,
            lastName: fullName.lastName
        },
        email,
        password: hashPassword
    });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    return { user, accessToken, refreshToken };
}

/**
 * Logs in a user manually
 * @param {string} email
 * @param {string} password
 * @returns {Promise<Object>} - User object and tokens
 */
async function login(email, password) {
    if (!email || !password) {
        throw new Error("Email and password are required");
    }

    const user = await userModel.findOne({ email });
    if (!user) {
        throw new Error("Invalid email or password");
    }

    if (!user.password) {
        throw new Error("You registered using Google Sign-In. Please click the Google button to log in, or reset your password to log in manually.");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
        throw new Error("Invalid email or password");
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    return { user, accessToken, refreshToken };
}

/**
 * Logs in or registers a user via Google
 * @param {string} credential - Google ID Token
 * @returns {Promise<Object>} - User object and tokens
 */
async function googleLogin(credential) {
    if (!credential) {
        throw new Error("Google credential token is required");
    }

    const payload = await verifyGoogleToken(credential);
    const { email, given_name, family_name, sub, picture } = payload;
    
    if (!email) {
        throw new Error("Email not provided in Google token");
    }

    let user = await userModel.findOne({
        $or: [{ email }, { googleId: sub }]
    });

    if (!user) {
        user = await userModel.create({
            email,
            googleId: sub,
            fullName: {
                firstName: given_name || "Google",
                lastName: family_name || "User"
            },
            avatar: picture || ""
        });
    } else {
        if (!user.googleId) user.googleId = sub;
        if (!user.avatar && picture) user.avatar = picture;
        user.fullName.firstName = given_name || user.fullName.firstName;
        user.fullName.lastName = family_name || user.fullName.lastName;
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    // Save refresh token in DB
    user.refreshToken = refreshToken;
    await user.save();

    return { user, accessToken, refreshToken };
}

/**
 * Links a MEGA account to the current user
 * @param {string} userId - ID of the logged-in user
 * @param {string} megaEmail - MEGA account email
 * @param {string} megaPassword - MEGA account password
 * @returns {Promise<Object>} - Status object
 */
async function linkMegaAccount(userId, megaEmail, megaPassword) {
    if (!megaEmail || !megaPassword) {
        throw new Error("MEGA email and password are required");
    }

    const user = await userModel.findById(userId);
    if (!user) {
        throw new Error("User not found");
    }

    // Validate credentials against real MEGA servers
    try {
        await validateCredentials(megaEmail, megaPassword);
    } catch (validationErr) {
        throw new Error("Invalid MEGA credentials. Please check your email and password.");
    }

    const encryptedPassword = encrypt(megaPassword);

    user.isMegaLinked = true;
    user.megaConnected = true;
    user.megaEmail = megaEmail;
    user.megaPassword = encryptedPassword;
    user.storageQuota = 21474836480; // 20 GB exactly
    await user.save();

    // Send success email asynchronously
    sendMegaSuccessEmail(user.email, user.fullName).catch(console.error);

    return { isMegaLinked: true };
}

/**
 * Unlinks a MEGA account from the current user
 * @param {string} userId - ID of the logged-in user
 * @returns {Promise<Object>} - Status object
 */
async function unlinkMegaAccount(userId) {
    const user = await userModel.findById(userId);
    if (!user) {
        throw new Error("User not found");
    }

    user.isMegaLinked = false;
    user.megaConnected = false;
    user.megaEmail = "";
    user.megaPassword = "";
    user.storageQuota = 0; // Reset quota
    user.usedStorage = 0; // Reset used storage
    await user.save();

    return { isMegaLinked: false };
}

module.exports = {
    register,
    login,
    googleLogin,
    linkMegaAccount,
    unlinkMegaAccount
};
