const mongoose = require('mongoose');



const userSchema = new mongoose.Schema({
    googleId: {
        type: String,
        unique: true,
        sparse: true, // Allow multiple docs without this field
    },
    email: {
        type: String,
        required: true,
        unique: true,
    },
    fullName: {
        firstName: {
            type: String,
            required: true
        },
        lastName: {
            type: String,
            required: true
        }
    },
    password: {
        type: String,
    },
    avatar: {
        type: String,
        default: "",
    },
    megaConnected: {
        type: Boolean,
        default: false,
    },
    isMegaLinked: {
        type: Boolean,
        default: false,
    },
    megaPassword: {
        type: String,
        default: "",
    },
    megaEmail: {
        type: String,
        default: "",
    },
    usedStorage: {
        type: Number,
        default: 0
    },
    storageQuota: {
        type: Number,
        default: 20 * 1024 * 1024 * 1024 // 20 GB
    },
    refreshToken: {
        type: String,
        default: null
    }
},
    {
        timestamps: true
    }
)

const userModel = mongoose.model("user", userSchema)


module.exports = userModel