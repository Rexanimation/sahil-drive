const userModel = require('../models/user.model');

class UserRepository {
    async findById(id) {
        return await userModel.findById(id);
    }

    async findByEmail(email) {
        return await userModel.findOne({ email });
    }

    async createUser(userData) {
        return await userModel.create(userData);
    }

    async updateStorage(userId, usedStorageDelta) {
        const user = await this.findById(userId);
        if (user) {
            user.usedStorage = Math.max(0, user.usedStorage + usedStorageDelta);
            await user.save();
            return user;
        }
        return null;
    }

    async setStorageExact(userId, exactStorage) {
        const user = await this.findById(userId);
        if (user) {
            user.usedStorage = Math.max(0, exactStorage);
            await user.save();
            return user;
        }
        return null;
    }

    async saveUser(userInstance) {
        return await userInstance.save();
    }
}

module.exports = new UserRepository();
