const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  // Who is receiving the notification
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  // Who performed the action (like, comment, reply, follow request, follow accept)
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

  type: {
    type: String,
    enum: [
      'like', 'comment', 'reply', 'follow_request', 'follow_accept', 'comment-like',
      // NEW: story-related notification types
      'story_like', 'story_comment', 'story_reply'
    ],
    required: true
  },

  // If like/comment/reply, which post — null for follow-related events
  post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },

  // NEW: if story-related notification, which story
  story: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', default: null },

  isRead: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model('Notification', notificationSchema);