const mongoose = require('mongoose');

const followRequestSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['pending', 'accepted'], default: 'pending' }
}, { timestamps: true });

// NAYA: FIX — Pehle sirf application-level check (findOne before save) tha, jo race
// condition ka shikar ho sakta hai: agar same request 2 dafa (double-click, network
// retry, ya 2 tabs) bilkul saath mein bheji jaye, dono ek dusre se pehle "existing nahi
// hai" dekh lete hain aur dono save ho jaate hain — isi liye Ali ne Tayyab ko 2 baar
// follow kar liya tha.
//
// Yeh unique compound index database level pe guarantee deta hai ke ek requester-recipient
// pair sirf EK dafa exist kar sakta hai, chahe kitni bhi requests parallel mein aayen.
// Doosri request MongoDB khud reject kar dega (duplicate key error).
followRequestSchema.index({ requester: 1, recipient: 1 }, { unique: true });

module.exports = mongoose.model('FollowRequest', followRequestSchema);