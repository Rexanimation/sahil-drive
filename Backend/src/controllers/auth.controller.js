const userModel = require('../models/user.model');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { OAuth2Client } = require('google-auth-library');
const { encrypt } = require("../utils/crypto");
const { validateCredentials, getStorageForUser } = require("../services/mega.service");
const { sendMegaSuccessEmail } = require("../services/email.service");
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);


async function registerUser(req, res) {
    try {
        const { email, password, fullName } = req.body;

        if (!email || !password || !fullName?.firstName || !fullName?.lastName) {
            return res.status(400).json({ message: "All fields are required" });
        }

        const isUserAlreadyExists = await userModel.findOne({ email });
        if (isUserAlreadyExists) {
            return res.status(400).json({ message: "User already exists" });
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

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax"
        });

        res.status(201).json({
            message: "User registered successfully",
            user: {
                email: user.email,
                _id: user._id,
                fullName: user.fullName
            }
        });
    } catch (err) {
        console.error("Register error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

async function loginUser(req, res) {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        const user = await userModel.findOne({ email });

        if (!user) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        if (!user.password) {
            return res.status(400).json({ message: "You registered using Google Sign-In. Please click the Google button to log in, or reset your password to log in manually." });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);

        if (!isPasswordValid) {
            return res.status(400).json({ message: "Invalid email or password" });
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax"
        });

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
        console.error("Login error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}


async function getMe(req, res) {
    try {
        const user = req.user;
        if (!user) {
            return res.status(401).json({ message: "Unauthorized" });
        }

        // Auto-correct storage desync issues
        const assetModel = require('../models/asset.model');
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
                // This validates and caches the connection for future use, preventing repeated slow logins
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

async function linkMega(req, res) {
    try {
        const { megaEmail, megaPassword } = req.body;
        if (!megaEmail || !megaPassword) {
            return res.status(400).json({ message: "MEGA email and password are required" });
        }

        const user = await userModel.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Validate credentials against real MEGA servers
        try {
            await validateCredentials(megaEmail, megaPassword);
        } catch (validationErr) {
            console.error("MEGA Validation Failed:", validationErr.message);
            return res.status(401).json({ message: "Invalid MEGA credentials. Please check your email and password." });
        }

        const encryptedPassword = encrypt(megaPassword);

        user.isMegaLinked = true;
        user.megaConnected = true;
        user.megaEmail = megaEmail;
        user.megaPassword = encryptedPassword;
        user.storageQuota = 21474836480; // 20 GB exactly
        await user.save();

        // Send success email asynchronously
        sendMegaSuccessEmail(user.email, user.fullName);

        res.status(200).json({
            message: "MEGA account linked successfully",
            isMegaLinked: true
        });
    } catch (err) {
        console.error("Link MEGA error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

async function logoutUser(req, res) {
    try {
        res.clearCookie("token");
        res.status(200).json({ message: "Logged out successfully" });
    } catch (err) {
        console.error("Logout error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

async function googleLoginUser(req, res) {
    try {
        const { credential } = req.body;
        if (!credential) {
            return res.status(400).json({ message: "Google credential token is required" });
        }

        let payload;
        if (!process.env.GOOGLE_CLIENT_ID || credential.startsWith("mock_")) {
            // Fallback for development/testing without real client ID
            payload = {
                email: "mock.user@gmail.com",
                given_name: "Sahil",
                family_name: "User",
                sub: "mock_123456789",
                picture: ""
            };
        } else {
            const ticket = await client.verifyIdToken({
                idToken: credential,
                audience: process.env.GOOGLE_CLIENT_ID
            });
            payload = ticket.getPayload();
        }

        const { email, given_name, family_name, sub, picture } = payload;
        if (!email) {
            return res.status(400).json({ message: "Email not provided in Google token" });
        }

        // Find or create user
        let user = await userModel.findOne({ 
            $or: [
                { email }, 
                { googleId: sub }
            ] 
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
            // Update user with Google details if needed
            if (!user.googleId) user.googleId = sub;
            if (!user.avatar && picture) user.avatar = picture;
            user.fullName.firstName = given_name || user.fullName.firstName;
            user.fullName.lastName = family_name || user.fullName.lastName;
            await user.save();
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

        res.cookie("token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax"
        });

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
        console.error("Google login error:", err);
        res.status(500).json({ message: "Internal server error during Google Authentication" });
    }
}

module.exports = {
    registerUser,
    loginUser,
    googleLoginUser,
    getMe,
    logoutUser,
    linkMega
}