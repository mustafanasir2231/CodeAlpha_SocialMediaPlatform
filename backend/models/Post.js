const mongoose = require('mongoose');
const postSchema = new mongoose.Schema({
    username: { type: String, required: true },
    content: { type: String, default: "" },
    media: [{
        url: { type: String, required: true },
        type: { type: String, enum: ['image', 'video'], required: true }
    }],
    likes: {
        type: [String],
        default: []
    },
    edited: { type: Boolean, default: false },
    hashtags: {
        type: [String],
        default: []
    },
    createdAt: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Post', postSchema);