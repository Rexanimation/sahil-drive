const { Storage } = require('megajs');
const { decrypt } = require('../utils/crypto');

const userStorageInstances = {};
const initializingPromises = {};

/**
 * Gets or initializes a MEGA storage instance for a specific user
 */
async function getStorageForUser(user) {
    if (!user || !user.megaEmail || !user.megaPassword) {
        throw new Error("User does not have MEGA credentials linked.");
    }

    const userId = user._id.toString();

    // Return cached instance if ready
    if (userStorageInstances[userId] && userStorageInstances[userId].ready) {
        return userStorageInstances[userId];
    }

    // Return pending promise if already initializing
    if (initializingPromises[userId]) {
        return initializingPromises[userId];
    }

    const email = user.megaEmail;
    const password = decrypt(user.megaPassword);

    if (!password) {
        throw new Error("Failed to decrypt MEGA password. Please re-link your account.");
    }

    initializingPromises[userId] = new Promise((resolve, reject) => {
        try {
            const storage = new Storage({
                email,
                password,
                autologin: true
            }, (err) => {
                if (err) {
                    console.error(`[MEGA] Failed to connect for user ${email}:`, err.message);
                    delete initializingPromises[userId];
                    reject(new Error("Invalid MEGA credentials"));
                } else {
                    console.log(`[MEGA] Connected to MEGA account successfully for user: ${email}`);
                    userStorageInstances[userId] = storage;
                    delete initializingPromises[userId];
                    resolve(storage);
                }
            });
        } catch (err) {
            console.error(`[MEGA] Initialization threw an error for user ${email}:`, err.message);
            delete initializingPromises[userId];
            reject(err);
        }
    });

    return initializingPromises[userId];
}

/**
 * Upload a file buffer/stream to the user's personal MEGA account
 * @param {Object} user - The authenticated user object containing mega credentials
 * @param {string} name - File name
 * @param {number} size - File size in bytes
 * @param {Buffer} buffer - File buffer
 * @returns {Promise<string>} - The MEGA node handle
 */
async function uploadFile(user, name, size, buffer) {
    const storage = await getStorageForUser(user);
    const file = await storage.upload({
        name: name,
        size: size
    }, buffer).complete;

    return file.handle;
}

/**
 * Delete a file node by its MEGA handle from the user's personal account
 * @param {Object} user - The authenticated user object
 * @param {string} handle - MEGA node handle
 */
async function deleteFile(user, handle) {
    const storage = await getStorageForUser(user);
    const file = storage.files[handle];
    if (file) {
        await file.delete(true); // Permanent deletion
        console.log(`[MEGA] Deleted file node: ${handle} for user ${user.megaEmail}`);
    } else {
        console.warn(`[MEGA] Node handle not found in account files: ${handle}`);
    }
}

/**
 * Get a decryption stream from a MEGA file handle
 * @param {Object} user - The user object containing credentials
 * @param {string} handle - The MEGA file handle
 * @param {number} [start] - Starting byte offset
 * @param {number} [end] - Ending byte offset
 * @returns {Promise<{ stream: ReadableStream, size: number }>} - Readable decryption stream and total size
 */
async function getFileStream(user, handle, start, end) {
    const storage = await getStorageForUser(user);
    const file = storage.files[handle];
    if (!file) {
        throw new Error("File not found in your MEGA storage");
    }
    
    // megajs allows passing { start, end } to download() or read() for partial streams
    const options = {};
    if (start !== undefined && end !== undefined) {
        options.start = start;
        options.end = end;
    }

    return { 
        stream: file.download(options), 
        size: file.size || 0 
    };
}

/**
 * Validate credentials without permanently caching the instance (used during linking)
 */
async function validateCredentials(email, password) {
    return new Promise((resolve, reject) => {
        try {
            const storage = new Storage({
                email,
                password,
                autologin: true
            }, (err) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
            });
        } catch (err) {
            reject(err);
        }
    });
}

/**
 * Get all files from MEGA directly without DB
 */
async function getAllMegaFiles(user) {
    const storage = await getStorageForUser(user);
    return storage.files;
}

/**
 * Disconnect a user's MEGA session
 */
function disconnectUser(userId) {
    if (userStorageInstances[userId]) {
        delete userStorageInstances[userId];
    }
    if (initializingPromises[userId]) {
        delete initializingPromises[userId];
    }
}

module.exports = {
    getStorageForUser,
    uploadFile,
    deleteFile,
    getFileStream,
    validateCredentials,
    getAllMegaFiles,
    disconnectUser
};
