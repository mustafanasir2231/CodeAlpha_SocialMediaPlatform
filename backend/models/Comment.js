const mongoose = require('mongoose');
const commentSchema = new mongoose.Schema({
  postId: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: { type: String, required: true },
  text: { type: String, required: true },
  // replyTo: null ka matlab hai ye main comment hai, 
  // agar ismein kisi comment ki ID hogi, to ye uska "reply" hoga
  replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', default: null },
  // NAYA: comment/reply ko like karne wale usernames
  likes: { type: [String], default: [] }
}, { timestamps: true });
module.exports = mongoose.model('Comment', commentSchema);