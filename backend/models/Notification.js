const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Kisko notification mil rahi hai
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Kis ne action kiya (like, comment, reply, follow request, follow accept)
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  type: {
    type: String,
    enum: [
      'like', 'comment', 'reply', 'follow_request', 'follow_accept', 'comment-like',
      // NAYA: story-related notification types
      'story_like', 'story_comment', 'story_reply'
    ],
    required: true
  },

  // Agar like/comment/reply hai to konsi post — follow events ke liye null
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },

  // NAYA: agar story-related notification hai to konsi story
  story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', default: null },

  isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);