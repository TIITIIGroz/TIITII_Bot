const mongoose = require('mongoose');

const confessionSchema = new mongoose.Schema({
    code: { 
        type: String, 
        required: true, 
        unique: true, 
        lowercase: true, 
        trim: true 
    },
    encryptedUserId: { 
        type: String, 
        required: true 
    },
    content: { 
        type: String, 
        required: true 
    },
    url: { 
        type: String, 
        default: null 
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Confession', confessionSchema);
