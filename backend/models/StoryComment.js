const mongoose = require('mongoose');

const storyCommentSchema = new mongoose.Schema({
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    text: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('StoryComment', storyCommentSchema);