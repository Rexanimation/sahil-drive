const assetModel = require('../models/asset.model');
const aiService = require('../services/ai.service');
const megaService = require('../services/mega.service');
const userModel = require('../models/user.model');
const fs = require('fs');
const path = require('path');
const mime = require('mime-types');

async function uploadAsset(req, res) {
    try {
        const user = req.user;
        
        if (!req.file) {
            return res.status(400).json({ message: "No file was uploaded" });
        }

        const name = req.file.originalname;
        // Fallback to strict mime-type detection if multer's guess is generic or missing
        let type = req.file.mimetype;
        if (!type || type === 'application/octet-stream') {
            type = mime.lookup(name) || 'application/octet-stream';
        }
        
        const size = req.file.size;
        
        // Quota check
        const userRecord = await userModel.findById(user._id);
        if (!userRecord) {
            return res.status(404).json({ message: "User not found" });
        }
        if (userRecord.usedStorage + size > userRecord.storageQuota) {
            if (req.file.path) {
                fs.unlink(req.file.path, () => {});
            }
            return res.status(403).json({ message: "Quota exceeded: You do not have enough storage space left." });
        }

        // Upload to MEGA
        let megaHandle = "";
        let url = "";
        try {
            const buffer = fs.readFileSync(req.file.path);
            megaHandle = await megaService.uploadFile(req.user, name, size, buffer);
            fs.unlink(req.file.path, () => {});
        } catch (megaErr) {
            console.warn("[MEGA] Upload failed, falling back to local storage:", megaErr.message);
            url = `/uploads/${req.file.filename}`;
        }

        // Call Gemini to generate tags, summary, dominant colors, and resolution
        const analysis = await aiService.analyzeAsset(name, type, size);

        const asset = await assetModel.create({
            user: user._id,
            userId: user._id,
            name,
            type,
            size,
            url,
            megaHandle,
            tags: analysis.tags || [],
            summary: analysis.summary || "",
            colors: analysis.colors || [],
            resolution: analysis.resolution || "Unknown",
            mimeType: type
        });

        if (megaHandle) {
            asset.url = `/api/assets/stream/${asset._id}`;
            await asset.save();
        }

        // Update storage quota
        userRecord.usedStorage += size;
        await userRecord.save();

        res.status(201).json({
            message: "Asset uploaded and analyzed successfully",
            asset
        });
    } catch (err) {
        console.error("Upload Asset error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

async function getAssets(req, res) {
    try {
        const user = req.user;
        const { type, favorite, search, parentFolderId } = req.query;

        let query = { userId: req.user.id };

        if (type === 'image') {
            query.type = { $regex: '^image/', $options: 'i' };
            query.isFolder = false;
        } else if (type === 'video') {
            query.type = { $regex: '^video/', $options: 'i' };
            query.isFolder = false;
        } else if (favorite === 'true') {
            query.isFavorite = true;
        } else if (search) {
            query.$or = [
                { name: { $regex: search, $options: 'i' } },
                { tags: { $regex: search, $options: 'i' } }
            ];
        }

        const assets = await assetModel.find(query).sort({ createdAt: -1 });

        // Trigger an asynchronous sync with MEGA to detect any discrepancies.
        // We do not await this to avoid slowing down the response.
        if (user.megaEmail && user.megaPassword) {
            const syncService = require('../services/sync.service');
            syncService.syncAccount(user._id).catch(e => console.error("Sync failed:", e));
        }

        res.status(200).json({
            message: "Assets retrieved successfully",
            assets
        });
    } catch (err) {
        console.error("Get Assets error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

async function toggleFavorite(req, res) {
    try {
        const { id } = req.params;
        const user = req.user;

        const asset = await assetModel.findOne({ _id: id, userId: req.user.id });
        if (!asset) {
            return res.status(404).json({ message: "Asset not found" });
        }

        asset.isFavorite = !asset.isFavorite;
        await asset.save();

        res.status(200).json({
            message: `Asset ${asset.isFavorite ? 'favorited' : 'unfavorited'} successfully`,
            asset
        });
    } catch (err) {
        console.error("Toggle Favorite error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

async function deleteAsset(req, res) {
    try {
        const { id } = req.params;
        const user = req.user;

        const asset = await assetModel.findOne({ _id: id, userId: req.user.id });
        if (!asset) {
            return res.status(404).json({ message: "Asset not found" });
        }

        async function getChildrenRecursively(parentId) {
            let children = await assetModel.find({ parentFolderId: parentId });
            let allDescendants = [...children];
            for (let child of children) {
                if (child.isFolder) {
                    allDescendants = allDescendants.concat(await getChildrenRecursively(child._id.toString()));
                }
            }
            return allDescendants;
        }

        let assetsToDelete = [asset];
        if (asset.isFolder) {
            const descendants = await getChildrenRecursively(asset._id.toString());
            assetsToDelete = assetsToDelete.concat(descendants);
        }

        let totalSizeDeleted = 0;

        for (const item of assetsToDelete) {
            if (item.megaHandle) {
                try {
                    await megaService.deleteFile(user, item.megaHandle);
                } catch (megaErr) {
                    console.error(`[MEGA] Failed to delete file ${item.name}:`, megaErr.message);
                }
            } else if (item.url && item.url.startsWith('/uploads/')) {
                const filePath = path.join(__dirname, '../../public', item.url);
                fs.unlink(filePath, (err) => {
                    if (err) console.error(`[Disk] Failed to delete file ${item.name}:`, err.message);
                });
            }
            totalSizeDeleted += (item.size || 0);
            await assetModel.deleteOne({ _id: item._id });
        }

        // Update storage quota
        const userRecord = await userModel.findById(user._id);
        if (userRecord) {
            userRecord.usedStorage = Math.max(0, userRecord.usedStorage - totalSizeDeleted);
            await userRecord.save();
        }

        res.status(200).json({
            message: "Asset deleted successfully",
            assetId: id
        });
    } catch (err) {
        console.error("Delete Asset error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

async function getStorageSummary(req, res) {
    try {
        const userRecord = await userModel.findById(req.user.id);
        if (!userRecord) {
            return res.status(404).json({ message: "User not found" });
        }
        // Auto-correct storage desync issues
        const storageResult = await assetModel.aggregate([
            { $match: { userId: userRecord._id } },
            { $group: { _id: null, totalBytes: { $sum: "$size" } } }
        ]);
        const actualStorageUsed = storageResult.length > 0 ? storageResult[0].totalBytes : 0;
        
        if (userRecord.usedStorage !== actualStorageUsed) {
            userRecord.usedStorage = actualStorageUsed;
            await userRecord.save();
        }

        res.status(200).json({
            message: "Storage summary calculated successfully",
            totalBytes: actualStorageUsed,
            quotaBytes: userRecord.storageQuota
        });
    } catch (err) {
        console.error("Storage summary error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

async function getAnalytics(req, res) {
    try {
        const userRecord = await userModel.findById(req.user.id);
        if (!userRecord) {
            return res.status(404).json({ message: "User not found" });
        }

        const assets = await assetModel.find({ userId: req.user.id });

        let totalFiles = 0;
        let totalFolders = 0;
        let videoSize = 0;
        let imageSize = 0;
        let otherSize = 0;
        
        // Storage Velocity (last 7 days uploads)
        const weeklyUploads = Array(7).fill(0);
        const now = new Date();

        assets.forEach(asset => {
            totalFiles++;
                if (asset.type.startsWith('video/')) {
                    videoSize += asset.size;
                } else if (asset.type.startsWith('image/')) {
                    imageSize += asset.size;
                } else {
                    otherSize += asset.size;
                }

            // calculate day difference
            const assetDate = new Date(asset.createdAt);
            const diffTime = now.getTime() - assetDate.getTime();
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            
            if (diffDays < 7 && diffDays >= 0) {
                weeklyUploads[6 - diffDays] += asset.size;
            }
        });

        // Weekly uploads array mapping to Mon, Tue, etc.
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const chartData = [];
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(now.getDate() - i);
            chartData.push({
                name: days[d.getDay()],
                uploads: Number((weeklyUploads[6 - i] / (1024 * 1024)).toFixed(2)) // MB
            });
        }

        res.status(200).json({
            message: "Analytics generated successfully",
            totalBytes: userRecord.usedStorage,
            quotaBytes: userRecord.storageQuota,
            totalFiles,
            totalFolders,
            videoSize,
            imageSize,
            otherSize,
            velocityData: chartData
        });
    } catch (err) {
        console.error("Analytics error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

async function chatAsset(req, res) {
    try {
        const { id } = req.params;
        const { message } = req.body;
        const user = req.user;

        if (!message) {
            return res.status(400).json({ message: "Message is required" });
        }

        const asset = await assetModel.findOne({
            _id: id,
            $or: [
                { userId: req.user.id },
                { "sharedUsers.userId": req.user.id },
                { publicLinkAccess: { $in: ['view', 'comment', 'edit'] } }
            ]
        });
        if (!asset) {
            return res.status(404).json({ message: "Asset not found or access denied" });
        }

        const contextMessages = [
            {
                role: "user",
                content: `Here is the metadata of the file we are discussing:
Name: ${asset.name}
Type: ${asset.type}
Size: ${(asset.size / (1024 * 1024)).toFixed(2)} MB
Resolution: ${asset.resolution}
Tags: ${asset.tags.join(', ')}
Smart Summary: ${asset.summary}

Please answer questions specifically about this file. Keep the answers concise and professional.`
            },
            {
                role: "user",
                content: message
            }
        ];

        const aiResponse = await aiService.generateResponse(contextMessages);

        res.status(200).json({
            message: "Response generated successfully",
            response: aiResponse
        });
    } catch (err) {
        console.error("Chat Asset error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

async function streamAsset(req, res) {
    try {
        const { id } = req.params;

        const asset = await assetModel.findOne({
            _id: id,
            $or: [
                { userId: req.user.id },
                { "sharedUsers.userId": req.user.id },
                { publicLinkAccess: { $in: ['view', 'comment', 'edit'] } }
            ]
        });

        if (!asset) {
            return res.status(404).json({ message: "Asset not found or access denied" });
        }

        if (asset.megaHandle) {
            try {
                const range = req.headers.range;
                let start, end;
                
                // Fast-fetch size if missing, but we expect it to be in asset.size
                let fileSize = asset.size; 
                
                if (range) {
                    const parts = range.replace(/bytes=/, "").split("-");
                    start = parseInt(parts[0], 10);
                    end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
                    
                    if (start >= fileSize) {
                        res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + fileSize);
                        return;
                    }

                    const chunksize = (end - start) + 1;
                    const { stream } = await megaService.getFileStream(req.user, asset.megaHandle, start, end);
                    
                    res.writeHead(206, {
                        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
                        'Accept-Ranges': 'bytes',
                        'Content-Length': chunksize,
                        'Content-Type': asset.mimeType || 'application/octet-stream',
                        'Content-Disposition': `inline; filename="${encodeURIComponent(asset.name)}"`,
                        'Cache-Control': 'no-cache'
                    });
                    
                    stream.on('error', (err) => {
                        console.error("[MEGA] Range stream error:", err.message);
                        if (!res.headersSent) res.status(500).end();
                        else res.end();
                    });
                    
                    stream.pipe(res);
                } else {
                    const { stream } = await megaService.getFileStream(req.user, asset.megaHandle);
                    res.writeHead(200, {
                        'Content-Length': fileSize,
                        'Content-Type': asset.mimeType || 'application/octet-stream',
                        'Content-Disposition': `inline; filename="${encodeURIComponent(asset.name)}"`,
                        'Accept-Ranges': 'bytes',
                        'Cache-Control': 'no-cache'
                    });
                    
                    stream.on('error', (err) => {
                        console.error("[MEGA] Full stream error:", err.message);
                        if (!res.headersSent) res.status(500).end();
                        else res.end();
                    });
                    
                    stream.pipe(res);
                }
            } catch (megaErr) {
                console.error("[MEGA] Streaming failed:", megaErr.message);
                if (!res.headersSent) res.status(500).json({ message: "Failed to stream file from cloud storage" });
                else res.end();
            }
        } else if (asset.url.startsWith('/uploads/')) {
            const filePath = path.join(__dirname, '../../public', asset.url);
            if (fs.existsSync(filePath)) {
                res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(asset.name)}"`);
                res.setHeader('Content-Type', asset.mimeType || 'application/octet-stream');
                fs.createReadStream(filePath).pipe(res);
            } else {
                res.status(404).json({ message: "Local file not found on disk" });
            }
        } else {
            res.redirect(asset.url);
        }
    } catch (err) {
        console.error("Stream Asset error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

async function renameAsset(req, res) {
    try {
        const { id } = req.params;
        const { newName } = req.body;
        
        if (!newName) {
            return res.status(400).json({ message: "New name is required" });
        }

        const asset = await assetModel.findOne({ _id: id, userId: req.user.id });
        if (!asset) {
            return res.status(404).json({ message: "Asset not found" });
        }

        asset.name = newName;
        await asset.save();

        res.status(200).json({
            message: "Asset renamed successfully",
            asset
        });
    } catch (err) {
        console.error("Rename Asset error:", err);
        res.status(500).json({ message: "Internal server error" });
    }
}

module.exports = {
    uploadAsset,
    getAssets,
    toggleFavorite,
    deleteAsset,
    getStorageSummary,
    getAnalytics,
    chatAsset,
    streamAsset,
    renameAsset
};
