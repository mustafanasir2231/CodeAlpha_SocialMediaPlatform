const mongoose = require('mongoose');

// Story ke neeche public comment thread — Post comments se alag rakha hai taake confuse na ho
const storyCommentSchema = new mongoose.Schema({
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', required: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    username: { type: String, required: true },
    text: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model('StoryComment', storyCommentSchema);