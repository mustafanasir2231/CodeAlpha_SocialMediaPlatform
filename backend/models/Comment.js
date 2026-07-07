const mongoose = require('mongoose');
const commentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  text: { type: String, required: true },
  // replyTo: null means this is a main (top-level) comment,
  // if it contains a comment ID, then this is a "reply" to that comment
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  // NEW: usernames who liked this comment/reply
  likes: { type: [String], default: [] }
}, { timestamps: true });
module.exports = mongoose.model('Comment', commentSchema);