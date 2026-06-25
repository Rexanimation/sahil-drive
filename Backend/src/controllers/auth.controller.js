const authService = require('../services/auth.service');
const { setAuthCookies, clearAuthCookies } = require('../services/cookie.service');
const { getStorageForUser } = require('../services/mega.service');
const assetModel = require('../models/asset.model');

/**
 * Controller: Registers a new user
 */
async function registerUser(req, res) {
    try {
        const { user, accessToken, refreshToken } = await authService.register(req.body);
        
        setAuthCookies(res, accessToken, refreshToken);

        res.status(201).json({
            message: "User registered successfully",
            user: {
                email: user.email,
                _id: user._id,
                fullName: user.fullName
            }
        });
    } catch (err) {
        if (err.message === "All fields are required" || err.message === "User already exists") {
            return res.status(400).json({ message: err.message });
        }
        console.error("Register error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

/**
 * Controller: Logs in a user manually
 */
async function loginUser(req, res) {
    try {
        const { email, password } = req.body;
        const { user, accessToken, refreshToken } = await authService.login(email, password);

        setAuthCookies(res, accessToken, refreshToken);

        res.status(200).json({
            message: "User logged in successfully",
            user: {
                email: user.email,
                _id: user._id,
                fullName: user.fullName,
                avatar: user.avatar,
                isMegaLinked: user.isMegaLinked || false
            }
        });
    } catch (err) {
        if (err.message.includes("required") || err.message.includes("Invalid") || err.message.includes("Google Sign-In")) {
            return res.status(400).json({ message: err.message });
        }
        console.error("Login error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

/**
 * Controller: Logs in or registers via Google
 */
async function googleLoginUser(req, res) {
    try {
        const { credential } = req.body;
        const { user, accessToken, refreshToken } = await authService.googleLogin(credential);

        setAuthCookies(res, accessToken, refreshToken);

        res.status(200).json({
            message: "Logged in with Google successfully",
            user: {
                email: user.email,
                _id: user._id,
                fullName: user.fullName,
                avatar: user.avatar,
                isMegaLinked: user.isMegaLinked || false
            }
        });
    } catch (err) {
        if (err.message.includes("required") || err.message.includes("provided")) {
            return res.status(400).json({ message: err.message });
        }
        console.error("Google login error:", err);
        res.status(500).json({ message: "Internal server error during Google Authentication" });
    }
}

/**
 * Controller: Links MEGA account to logged in user
 */
async function linkMega(req, res) {
    try {
        const { megaEmail, megaPassword } = req.body;
        const result = await authService.linkMegaAccount(req.user.id, megaEmail, megaPassword);
        
        res.status(200).json({
            message: "MEGA account linked successfully",
            isMegaLinked: result.isMegaLinked
        });
    } catch (err) {
        if (err.message.includes("required") || err.message.includes("Invalid")) {
            return res.status(401).json({ message: err.message });
        }
        if (err.message === "User not found") {
            return res.status(404).json({ message: err.message });
        }
        console.error("Link MEGA error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

/**
 * Controller: Fetches current authenticated user data (Current User)
 */
async function getMe(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Auto-correct storage desync issues
        const storageResult = await assetModel.aggregate([
            { $match: { userId: user._id, isFolder: false } },
            { $group: { _id: null, totalBytes: { $sum: "$size" } } }
        ]);
        const actualStorageUsed = storageResult.length > 0 ? storageResult[0].totalBytes : 0;
        
        if (user.usedStorage !== actualStorageUsed) {
            user.usedStorage = actualStorageUsed;
            await user.save();
        }

        let megaError = false;
        
        if (user.isMegaLinked && user.megaEmail && user.megaPassword) {
            try {
                await getStorageForUser(user);
            } catch (err) {
                console.error("[getMe] MEGA validation failed:", err.message);
                user.isMegaLinked = false;
                user.megaConnected = false;
                await user.save();
                megaError = true;
            }
        }

        res.status(200).json({
            user: {
                email: user.email,
                _id: user._id,
                fullName: user.fullName,
                avatar: user.avatar,
                isMegaLinked: user.isMegaLinked || false,
                megaConnected: user.megaConnected,
                megaEmail: user.megaEmail,
                usedStorage: user.usedStorage,
                storageQuota: user.storageQuota,
                megaError
            }
        });
    } catch (err) {
        console.error("GetMe error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

/**
 * Controller: Logs out a user and invalidates tokens
 */
async function logoutUser(req, res) {
    try {
        const user = req.user;
        if (user) {
            // Invalidate refresh token in DB
            user.refreshToken = null;
            await user.save();
        }

        clearAuthCookies(res);
        res.status(200).json({ message: "Logged out successfully" });
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

/**
 * Controller: Unlinks MEGA account from logged in user
 */
async function unlinkMega(req, res) {
    try {
        const result = await authService.unlinkMegaAccount(req.user.id);
        
        res.status(200).json({
            message: "MEGA account unlinked successfully",
            isMegaLinked: result.isMegaLinked
        });
    } catch (err) {
        if (err.message === "User not found") {
            return res.status(404).json({ message: err.message });
        }
        console.error("Unlink MEGA error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = {
    registerUser,
    loginUser,
    googleLoginUser,
    linkMega,
    unlinkMega,
    getMe,
    logoutUser
};