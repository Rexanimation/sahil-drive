const crypto = require('crypto');

const ALGORITHM = 'aes-256-cbc';
const getEncryptionKey = () => {
    // Generate a consistent 32-byte key from the JWT_SECRET
    return crypto.createHash('sha256').update(process.env.JWT_SECRET || 'fallback-secret').digest();
};

function encrypt(text) {
    if (!text) return text;
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    return `${iv.toString('hex')}:${encrypted}`;
}

function decrypt(text) {
    if (!text) return text;
    try {
        const parts = text.split(':');
        const iv = Buffer.from(parts[0], 'hex');
        const encryptedText = parts[1];
        const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
        let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    } catch (err) {
        console.error("Decryption failed:", err.message);
        return null;
    }
}

module.exports = {
    encrypt,
    decrypt
};
