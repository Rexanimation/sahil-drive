const chatModel = require('../models/chat.model');
const messageModel = require('../models/message.model');
const aiService = require('../services/ai.service');


async function createChat(req, res) {

    const { title } = req.body;
    const user = req.user;

    const chat = await chatModel.create({
        user: user._id,
        title
    });

    res.status(201).json({
        message: "Chat created successfully",
        chat: {
            _id: chat._id,
            title: chat.title,
            lastActivity: chat.lastActivity,
            user: chat.user
        }
    });

}

async function getChats(req, res) {
    const user = req.user;

    const chats = await chatModel.find({ user: user._id });

    res.status(200).json({
        message: "Chats retrieved successfully",
        chats: chats.map(chat => ({
            _id: chat._id,
            title: chat.title,
            lastActivity: chat.lastActivity,
            user: chat.user
        }))
    });
}

async function getMessages(req, res) {

    const chatId = req.params.id;

    const messages = await messageModel.find({ chat: chatId }).sort({ createdAt: 1 });

    res.status(200).json({
        message: "Messages retrieved successfully",
        messages: messages
    })

}

async function chatWithAi(req, res) {
    try {
        const { message, parentFolderId } = req.body;
        const user = req.user;

        if (!message) {
            return res.status(400).json({ error: "Message is required" });
        }

        const response = await aiService.generateResponse(
            [{ role: "user", content: message }],
            "",
            { userId: user._id, parentFolderId, socket: null }
        );

        res.status(200).json({
            response: response
        });
    } catch (err) {
        console.error("[chatWithAi Error]:", err);
        res.status(500).json({ error: "Failed to process AI chat" });
    }
}

module.exports = {
    createChat,
    getChats,
    getMessages,
    chatWithAi
};