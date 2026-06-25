const assetRepository = require('../repositories/asset.repository');
const userRepository = require('../repositories/user.repository');

async function getStorageAnalytics(userId) {
    const user = await userRepository.findById(userId);
    if (!user) {
        throw new Error("User not found");
    }

    const assets = await assetRepository.findActiveAssets(userId);
    const trashAssets = await assetRepository.findDeletedAssets(userId);
    const favoriteAssets = await assetRepository.findByUserId(userId, { isFavorite: true, isDeleted: false });

    // Since findActiveAssets might include folders (which have size 0 or undefined usually, but to be exact we filter):
    const fileAssets = assets.filter(a => !a.isFolder);

    const usedStorage = fileAssets.reduce((acc, curr) => acc + (curr.size || 0), 0);
    const trashSize = trashAssets.reduce((acc, curr) => acc + (curr.size || 0), 0);
    
    // Categorize files
    let fileTypes = {
        Images: { count: 0, size: 0 },
        Videos: { count: 0, size: 0 },
        Documents: { count: 0, size: 0 },
        Audio: { count: 0, size: 0 },
        Code: { count: 0, size: 0 },
        Compressed: { count: 0, size: 0 },
        Other: { count: 0, size: 0 }
    };

    fileAssets.forEach(asset => {
        const mime = asset.mimeType || "";
        const size = asset.size || 0;
        
        if (mime.startsWith('image/')) {
            fileTypes.Images.count++; fileTypes.Images.size += size;
        } else if (mime.startsWith('video/')) {
            fileTypes.Videos.count++; fileTypes.Videos.size += size;
        } else if (mime.startsWith('audio/')) {
            fileTypes.Audio.count++; fileTypes.Audio.size += size;
        } else if (mime.includes('pdf') || mime.includes('document') || mime.includes('msword') || mime.includes('excel')) {
            fileTypes.Documents.count++; fileTypes.Documents.size += size;
        } else if (mime.includes('javascript') || mime.includes('json') || mime.includes('html') || mime.includes('css')) {
            fileTypes.Code.count++; fileTypes.Code.size += size;
        } else if (mime.includes('zip') || mime.includes('tar') || mime.includes('rar')) {
            fileTypes.Compressed.count++; fileTypes.Compressed.size += size;
        } else {
            fileTypes.Other.count++; fileTypes.Other.size += size;
        }
    });

    const largestFiles = [...fileAssets]
        .sort((a, b) => (b.size || 0) - (a.size || 0))
        .slice(0, 5)
        .map(f => ({ name: f.name, size: f.size, type: f.mimeType }));

    const recentUploads = [...fileAssets]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 5)
        .map(f => ({ name: f.name, size: f.size, date: f.createdAt }));

    // Calculate real storage velocity (uploads per day for last 7 days in MB)
    const weeklyUploads = Array(7).fill(0);
    const now = new Date();
    
    fileAssets.forEach(asset => {
        const assetDate = new Date(asset.createdAt);
        const diffTime = now.getTime() - assetDate.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        
        if (diffDays < 7 && diffDays >= 0) {
            weeklyUploads[6 - diffDays] += (asset.size || 0);
        }
    });

    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const storageTrend = [];
    for (let i = 6; i >= 0; i--) {
        const d = new Date(now);
        d.setDate(now.getDate() - i);
        storageTrend.push({
            name: days[d.getDay()],
            uploads: Number((weeklyUploads[6 - i] / (1024 * 1024)).toFixed(2)) // MB
        });
    }

    return {
        storage: {
            total: user.storageQuota,
            used: usedStorage,
            available: user.storageQuota - usedStorage,
            percentage: ((usedStorage / user.storageQuota) * 100).toFixed(2),
            trashSize
        },
        fileTypes,
        largestFiles,
        recentUploads,
        storageTrend,
        favoritesCount: favoriteAssets.length,
        trashCount: trashAssets.length
    };
}

module.exports = {
    getStorageAnalytics
};
