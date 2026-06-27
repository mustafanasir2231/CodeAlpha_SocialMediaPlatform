const mongoose = require('mongoose');
const messageSchema = new mongoose.Schema({
  conversation: { type: mongoose.Schema.Types.ObjectId, ref: 'Conversation', required: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, required: true },
  seen: { type: Boolean, default: false }, // read receipt ke liye
  // NAYA: agar yeh message kisi story ka reply hai, to uska chhota snapshot save karte hain
  // (Story document delete/expire ho jaye tab bhi DM mein preview dikh sake, isliye snapshot
  // rakha hai, sirf storyId reference nahi)
  storyReply: {
    storyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Story', default: null },
    storyType: { type: String, default: null },
    storyMediaUrl: { type: String, default: "" },
    storyText: { type: String, default: "" },
    storyBackgroundColor: { type: String, default: "" },
    storyOwnerUsername: { type: String, default: "" }
  }
}, { timestamps: true });
module.exports = mongoose.model('Message', messageSchema);