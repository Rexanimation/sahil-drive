const assetModel = require('../models/asset.model');

class AssetRepository {
    async findById(id) {
        return await assetModel.findById(id);
    }

    async findByUserId(userId, queryOptions = {}) {
        const query = { userId, ...queryOptions };
        return await assetModel.find(query).sort({ createdAt: -1 });
    }

    async findActiveAssets(userId) {
        return await assetModel.find({ userId, isDeleted: false });
    }

    async findDeletedAssets(userId) {
        return await assetModel.find({ userId, isDeleted: true });
    }

    async createAsset(assetData) {
        return await assetModel.create(assetData);
    }

    async batchInsert(assetsArray) {
        return await assetModel.insertMany(assetsArray);
    }

    async deleteAssetPermanent(assetId) {
        return await assetModel.findByIdAndDelete(assetId);
    }

    async calculateTotalSize(userId) {
        const storageResult = await assetModel.aggregate([
            { $match: { userId, isFolder: false, isDeleted: false } },
            { $group: { _id: null, totalBytes: { $sum: "$size" } } }
        ]);
        return storageResult.length > 0 ? storageResult[0].totalBytes : 0;
    }

    async findOrphanedByMegaHandle(userId, validHandles) {
        // Find assets that have a megaHandle but that handle is not in the validHandles list
        return await assetModel.find({
            userId,
            isFolder: false,
            isDeleted: false,
            megaHandle: { $exists: true, $nin: validHandles, $ne: null }
        });
    }

    async findByMegaHandle(megaHandle) {
        return await assetModel.findOne({ megaHandle });
    }
}

module.exports = new AssetRepository();
