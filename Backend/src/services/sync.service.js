const assetRepository = require('../repositories/asset.repository');
const userRepository = require('../repositories/user.repository');
const megaService = require('./mega.service');

class StorageSyncService {
    /**
     * Complete synchronization of an account. 
     * Validates MongoDB records against actual MEGA storage and rectifies differences.
     * @param {string} userId - ID of the user to sync
     */
    async syncAccount(userId) {
        try {
            console.log(`[Sync Engine] Starting background sync for user: ${userId}`);
            
            const user = await userRepository.findById(userId);
            if (!user || !user.isMegaLinked || !user.megaEmail) {
                console.log(`[Sync Engine] User ${userId} is not eligible for sync. Aborting.`);
                return;
            }

            // 1. Get exact snapshot of MEGA storage
            let megaFilesObj;
            try {
                megaFilesObj = await megaService.getAllMegaFiles(user);
            } catch (err) {
                console.error(`[Sync Engine] Failed to pull MEGA state for ${userId}:`, err.message);
                return; // Abort if we can't reach MEGA
            }
            
            const megaHandles = Object.keys(megaFilesObj);
            
            // 2. Get snapshot of DB state
            const dbAssets = await assetRepository.findByUserId(userId, { isFolder: false, isDeleted: false });

            let deletedSize = 0;
            let recoveredFiles = 0;
            let deletedFiles = 0;
            
            // --- Cleanup Orphaned Database Records ---
            // If it's in DB but not in MEGA (and it's not brand new)
            for (const asset of dbAssets) {
                if (asset.megaHandle && !megaHandles.includes(asset.megaHandle)) {
                    // Check if it's older than 15 minutes to prevent race conditions with active uploads
                    const ageInMs = Date.now() - new Date(asset.createdAt).getTime();
                    if (ageInMs < 15 * 60 * 1000) {
                        continue; 
                    }

                    console.warn(`[Sync Engine] Found orphaned DB record: ${asset.name} (${asset.megaHandle}). Soft-deleting.`);
                    asset.isDeleted = true; // Soft delete instead of hard delete for recovery options
                    await asset.save();
                    
                    deletedSize += (asset.size || 0);
                    deletedFiles++;
                }
            }

            // --- Storage Recalculation ---
            // Instead of trusting deltas, we recalculate the EXACT exact storage used by valid DB files
            const exactStorage = await assetRepository.calculateTotalSize(userId);
            if (user.usedStorage !== exactStorage) {
                console.log(`[Sync Engine] Storage discrepancy detected. DB: ${user.usedStorage}, Exact: ${exactStorage}. Correcting.`);
                await userRepository.setStorageExact(userId, exactStorage);
            }

            console.log(`[Sync Engine] Completed sync for ${userId}. Cleaned: ${deletedFiles}, Recovered: ${recoveredFiles}`);
        } catch (error) {
            console.error(`[Sync Engine] Critical failure during sync for user ${userId}:`, error);
        }
    }
}

module.exports = new StorageSyncService();
