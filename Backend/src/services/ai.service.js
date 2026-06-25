const Groq = require("groq-sdk");
const { HfInference } = require("@huggingface/inference");
const assetModel = require("../models/asset.model");
const userModel = require("../models/user.model");
const megaService = require("./mega.service");
const analyticsService = require("./analytics.service");

// Initialize Groq
let groq = null;
if (process.env.GROQ_API_KEY) {
    try {
        groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    } catch (err) {
        console.error("[AI] Failed to initialize Groq SDK:", err.message);
    }
} else {
    console.warn("[AI] GROQ_API_KEY is not defined in the environment.");
}

// Initialize Hugging Face for Embeddings
const hf = new HfInference(process.env.HF_API_KEY);
const GROQ_MODEL = "llama-3.3-70b-versatile";

const SYSTEM_PROMPT = `
You are Sahil GPT.
You are the intelligent operating system of Sahil Drive.
You never pretend to perform actions.
Whenever a user asks to perform an operation on storage, immediately execute the appropriate backend tool.
Every authenticated request belongs only to the currently logged-in user.
Never access another user's data.
Always return confirmation after successful execution.
Do not tell the user to refresh, the frontend will refresh automatically if you return refreshRequired.
When asked about analytics, storage usage, or recent files, execute the corresponding tool.
`;

function toGroqHistory(contents) {
    if (!Array.isArray(contents)) return [];
    return contents.map(item => {
        const role = (item.role === "assistant" || item.role === "model") ? "assistant" : "user";
        let text = "";
        if (Array.isArray(item.parts)) {
            text = item.parts.map(p => p.text).join("");
        } else if (typeof item.content === "string") {
            text = item.content;
        }
        return { role, content: text };
    });
}

const toolsDefinition = [
    {
        type: "function",
        function: {
            name: "createFolder",
            description: "Creates a new folder",
            parameters: {
                type: "object",
                properties: {
                    folderName: { type: "string" },
                    parentFolderId: { type: "string", description: "Optional parent ID. Use 'root' for root." }
                },
                required: ["folderName"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "deleteItem",
            description: "Deletes a file or folder (moves to trash)",
            parameters: {
                type: "object",
                properties: { itemId: { type: "string" } },
                required: ["itemId"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "emptyTrash",
            description: "Permanently deletes all items in the trash",
            parameters: { type: "object", properties: {} }
        }
    },
    {
        type: "function",
        function: {
            name: "searchFiles",
            description: "Searches files or folders by name or keyword",
            parameters: {
                type: "object",
                properties: { searchQuery: { type: "string" } },
                required: ["searchQuery"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "getStorageUsage",
            description: "Gets detailed storage analytics",
            parameters: { type: "object", properties: {} }
        }
    },
    {
        type: "function",
        function: {
            name: "triggerUpload",
            description: "Triggers the frontend to open the file upload picker",
            parameters: { type: "object", properties: {} }
        }
    },
    {
        type: "function",
        function: {
            name: "renameItem",
            description: "Renames a file or folder",
            parameters: {
                type: "object",
                properties: {
                    itemId: { type: "string" },
                    newName: { type: "string" }
                },
                required: ["itemId", "newName"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "addFavorite",
            description: "Marks an item as favorite",
            parameters: {
                type: "object",
                properties: { itemId: { type: "string" } },
                required: ["itemId"]
            }
        }
    }
];

async function executeLocalTool(name, args, context) {
    const { userId, parentFolderId, socket } = context;
    if (!userId) return { success: false, humanReadableMessage: "User is not authenticated.", refreshRequired: false };

    let result = { success: false, actionPerformed: name, updatedData: null, humanReadableMessage: "", refreshRequired: false };

    try {
        switch (name) {
            case "createFolder": {
                const folderName = args.folderName;
                const pId = args.parentFolderId || parentFolderId || null;
                const finalParentId = (pId === 'root' || pId === 'null') ? null : pId;

                const newFolder = await assetModel.create({
                    user: userId, userId: userId,
                    name: folderName, type: "application/vnd.google-apps.folder",
                    mimeType: "application/vnd.google-apps.folder",
                    isFolder: true, parentFolderId: finalParentId
                });

                if (socket) socket.emit("refresh-assets");
                result = { success: true, actionPerformed: name, updatedData: newFolder, humanReadableMessage: `Folder '${folderName}' created successfully.`, refreshRequired: true };
                break;
            }
            case "deleteItem": {
                const asset = await assetModel.findOne({ _id: args.itemId, userId });
                if (!asset) {
                    result.humanReadableMessage = "Item not found.";
                    break;
                }
                asset.isDeleted = true;
                asset.deletedAt = new Date();
                await asset.save();
                if (socket) socket.emit("refresh-assets");
                result = { success: true, actionPerformed: name, updatedData: asset, humanReadableMessage: `Moved '${asset.name}' to trash.`, refreshRequired: true };
                break;
            }
            case "emptyTrash": {
                const trashAssets = await assetModel.find({ userId, isDeleted: true });
                const user = await userModel.findById(userId);
                let freedSpace = 0;
                for (const a of trashAssets) {
                    if (a.megaHandle) {
                        try { await megaService.deleteFile(user, a.megaHandle); } catch (e) { console.error("Mega delete error", e); }
                    }
                    freedSpace += (a.size || 0);
                    await assetModel.findByIdAndDelete(a._id);
                }
                if (user) {
                    user.usedStorage = Math.max(0, user.usedStorage - freedSpace);
                    await user.save();
                }
                if (socket) socket.emit("refresh-assets");
                result = { success: true, actionPerformed: name, humanReadableMessage: `Trash emptied. Freed ${freedSpace} bytes.`, refreshRequired: true };
                break;
            }
            case "searchFiles": {
                const files = await assetModel.find({ userId, isDeleted: false, name: { $regex: args.searchQuery, $options: "i" } }).limit(10).lean();
                result = { success: true, actionPerformed: name, updatedData: files, humanReadableMessage: `Found ${files.length} items matching '${args.searchQuery}'.`, refreshRequired: false };
                break;
            }
            case "getStorageUsage": {
                const stats = await analyticsService.getStorageAnalytics(userId);
                result = { success: true, actionPerformed: name, updatedData: stats, humanReadableMessage: `You are using ${stats.storage.percentage}% of your ${stats.storage.total / (1024*1024*1024)}GB quota.`, refreshRequired: false };
                break;
            }
            case "triggerUpload": {
                // Return a special flag that the frontend can interpret to open the file dialog
                result = { success: true, actionPerformed: name, updatedData: { triggerAction: "OPEN_UPLOAD_DIALOG" }, humanReadableMessage: "Opening the upload dialog for you...", refreshRequired: false };
                break;
            }
            case "renameItem": {
                const asset = await assetModel.findOneAndUpdate({ _id: args.itemId, userId }, { name: args.newName }, { new: true });
                if (!asset) { result.humanReadableMessage = "Item not found."; break; }
                if (socket) socket.emit("refresh-assets");
                result = { success: true, actionPerformed: name, updatedData: asset, humanReadableMessage: `Renamed to '${args.newName}'.`, refreshRequired: true };
                break;
            }
            case "addFavorite": {
                const asset = await assetModel.findOneAndUpdate({ _id: args.itemId, userId }, { isFavorite: true }, { new: true });
                if (!asset) { result.humanReadableMessage = "Item not found."; break; }
                if (socket) socket.emit("refresh-assets");
                result = { success: true, actionPerformed: name, updatedData: asset, humanReadableMessage: `Added '${asset.name}' to favorites.`, refreshRequired: true };
                break;
            }
            default:
                result.humanReadableMessage = `Function ${name} is not fully implemented yet.`;
        }
    } catch (err) {
        result.humanReadableMessage = `Error executing ${name}: ${err.message}`;
    }

    return result;
}

async function generateResponse(content, contextString = "", context = {}) {
    try {
        if (!groq) throw new Error("Groq API key is not configured.");

        let systemInstruction = SYSTEM_PROMPT;
        systemInstruction += `\n\nCurrent Context:\nUserId: ${context.userId}\nCurrent Folder Id: ${context.parentFolderId || 'root'}\nUsed Storage: ${context.usedStorage || 0}\n`;
        if (contextString) {
            systemInstruction += `\n[Directory Content]\n${contextString}`;
        }

        const messages = [ { role: "system", content: systemInstruction }, ...toGroqHistory(content) ];

        if (messages.length === 1) return "Hello! I am Sahil AI. How can I assist you with your files today?";

        let response = await groq.chat.completions.create({
            model: GROQ_MODEL, messages, tools: toolsDefinition, tool_choice: "auto"
        });

        let responseMessage = response.choices[0].message;
        let finalResponseData = { type: 'text', content: "" };

        while (responseMessage.tool_calls && responseMessage.tool_calls.length > 0) {
            messages.push(responseMessage);
            for (const toolCall of responseMessage.tool_calls) {
                const name = toolCall.function.name;
                let args = {};
                try { args = JSON.parse(toolCall.function.arguments); } catch (e) {}

                console.log(`[Groq Tool] ${name}`, args);
                const toolOutput = await executeLocalTool(name, args, context);

                messages.push({
                    role: "tool", tool_call_id: toolCall.id, name: name, content: JSON.stringify(toolOutput)
                });
                
                // Keep track of the last tool output to send back structured data to the frontend
                finalResponseData = { type: 'tool_result', toolOutput };
            }

            response = await groq.chat.completions.create({ model: GROQ_MODEL, messages, tools: toolsDefinition });
            responseMessage = response.choices[0].message;
            finalResponseData.content = responseMessage.content;
        }

        if (finalResponseData.type === 'text') {
            finalResponseData.content = responseMessage.content;
        }

        // We return a JSON stringified object that the chat controller will send to the client
        return JSON.stringify(finalResponseData);

    } catch (error) {
        console.error("[Groq] generateResponse error:", error.message);
        return JSON.stringify({ type: 'error', content: "Sorry, I encountered an issue." });
    }
}

async function analyzeAsset(fileName, fileType, fileSize) {
    // Keeping this the same
    try {
        if (!groq) throw new Error("Groq API key is not configured.");
        const prompt = `Analyze file metadata: ${fileName}, ${fileType}, ${(fileSize / (1024 * 1024)).toFixed(2)} MB. Provide JSON: { "tags": [], "summary": "", "colors": [], "resolution": "" }`;
        const response = await groq.chat.completions.create({
            model: GROQ_MODEL, messages: [ { role: "user", content: prompt } ], response_format: { type: "json_object" }
        });
        let text = response.choices[0].message.content.trim();
        if (text.startsWith("\`\`\`json")) text = text.substring(7);
        if (text.startsWith("\`\`\`")) text = text.substring(3);
        if (text.endsWith("\`\`\`")) text = text.substring(0, text.length - 3);
        return JSON.parse(text.trim());
    } catch (error) {
        const isVideo = fileType.startsWith("video/");
        return { tags: ["Asset"], summary: `Analyzed ${fileName}`, colors: ["#06B6D4", "#7C3AED"], resolution: isVideo ? "1080p" : "4K" };
    }
}

async function generateVector(content) {
    try {
        const text = typeof content === "string" ? content : (Array.isArray(content) ? content.map(c => Array.isArray(c.parts) ? c.parts.map(p => p.text).join(" ") : (c.content || "")).join(" ") : "");
        const output = await hf.featureExtraction({ model: "sentence-transformers/all-mpnet-base-v2", inputs: text });
        return Array.isArray(output[0]) ? output[0] : output;
    } catch (error) {
        return null;
    }
}

module.exports = { generateResponse, generateVector, analyzeAsset };
