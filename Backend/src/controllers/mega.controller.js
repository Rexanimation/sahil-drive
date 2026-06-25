const megaService = require('../services/mega.service');
const userModel = require('../models/user.model');
const { encrypt } = require('../utils/crypto');

async function connectMega(req, res) {
    try {
        const { email, password } = req.body;
        const userId = req.user._id;

        if (!email || !password) {
            return res.status(400).json({ error: "Email and password are required" });
        }

        // Validate credentials first
        await megaService.validateCredentials(email, password);

        // If valid, save to user model
        const encryptedPassword = encrypt(password);
        
        await userModel.findByIdAndUpdate(userId, {
            megaEmail: email,
            megaPassword: encryptedPassword,
            megaConnected: true,
            isMegaLinked: true
        });

        res.status(200).json({ message: "MEGA account connected successfully" });
    } catch (err) {
        console.error("[MEGA Connect Error]:", err);
        res.status(401).json({ error: "Invalid MEGA credentials" });
    }
}

async function disconnectMega(req, res) {
    try {
        const userId = req.user._id;

        await userModel.findByIdAndUpdate(userId, {
            megaEmail: "",
            megaPassword: "",
            megaConnected: false,
            isMegaLinked: false
        });

        megaService.disconnectUser(userId.toString());

        res.status(200).json({ message: "MEGA account disconnected successfully" });
    } catch (err) {
        console.error("[MEGA Disconnect Error]:", err);
        res.status(500).json({ error: "Failed to disconnect MEGA account" });
    }
}

async function getMegaStatus(req, res) {
    try {
        const user = await userModel.findById(req.user._id);
        res.status(200).json({
            megaConnected: user.megaConnected,
            megaEmail: user.megaEmail
        });
    } catch (err) {
        res.status(500).json({ error: "Failed to get MEGA status" });
    }
}

module.exports = {
    connectMega,
    disconnectMega,
    getMegaStatus
};
