const FollowRequest = require('../models/FollowRequest');
const User = require('../models/User');
const { emitToUser } = require('../utils/socket');
const { createNotification } = require('./notificationController');

// 1. Follow Request Bhejna
exports.sendFollowRequest = async (req, res) => {
  const { recipientId } = req.body; // yeh actually username hai
  const requesterId = req.user.id;

  try {
    const recipientUser = await User.findOne({ username: recipientId });
    if (!recipientUser) return res.status(404).json({ error: "User not found" });

    if (recipientUser._id.toString() === requesterId) {
      return res.status(400).json({ error: "You can't follow yourself" });
    }

    const existing = await FollowRequest.findOne({ requester: requesterId, recipient: recipientUser._id });
    if (existing) return res.status(400).json({ error: "Request already sent" });

    const newRequest = new FollowRequest({ requester: requesterId, recipient: recipientUser._id });
    await newRequest.save();

    // Real-time: doosre user ko foran batao
    emitToUser(recipientUser._id.toString(), 'new-follow-request', {
      requesterUsername: req.user.username
    });

    // Notification banao
    await createNotification({
      recipientId: recipientUser._id,
      senderId: requesterId,
      senderUsername: req.user.username,
      type: 'follow_request'
    });

    res.status(200).json({ message: "Request sent successfully!" });
  } catch (err) {
    // NAYA: FIX — agar database ka unique index (FollowRequest.js mein) duplicate
    // ko reject kare (race condition wali doosri request), MongoDB error code 11000
    // dega. Yeh case ko alag se handle karte hain taake user ko "already sent" ka
    // sahi, samajhne wala message mile, na ke generic server error.
    if (err.code === 11000) {
      return res.status(400).json({ error: "Request already sent" });
    }
    console.error(err);
    res.status(500).json({ error: "Failed to send request" });
  }
};

// 2. Pending Requests Dekhna
exports.getPendingRequests = async (req, res) => {
  try {
    const requests = await FollowRequest.find({ recipient: req.user.id, status: 'pending' })
      .populate('requester', 'username profilePic'); // NAYA: profilePic add
    res.json(requests);
  } catch (err) { res.status(500).json({ error: "Error fetching requests" }); }
};

// 3. Request Accept Karna
exports.acceptRequest = async (req, res) => {
  const { requestId } = req.params;
  try {
    const updatedRequest = await FollowRequest.findByIdAndUpdate(
      requestId,
      { status: 'accepted' },
      { new: true }
    ).populate('requester recipient', 'username profilePic'); // NAYA: profilePic add

    if (!updatedRequest) return res.status(404).json({ error: "Request not found" });

    // Real-time: requester ko batao ke accept ho gaya
    emitToUser(updatedRequest.requester._id.toString(), 'follow-was-accepted', {
      accepterUsername: updatedRequest.recipient.username
    });

    // Notification banao — accepter (recipient) requester ko batata hai
    await createNotification({
      recipientId: updatedRequest.requester._id,
      senderId: updatedRequest.recipient._id,
      senderUsername: updatedRequest.recipient.username,
      type: 'follow_accept'
    });

    res.json({ message: "Request accepted!" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to accept" });
  }
};

// 4. Follow Status Check
exports.getFollowStatus = async (req, res) => {
  const { username } = req.params;
  const myId = req.user.id;

  try {
    const recipientUser = await User.findOne({ username });
    if (!recipientUser) return res.json({ status: 'none' });

    const request = await FollowRequest.findOne({ requester: myId, recipient: recipientUser._id });
    if (!request) return res.json({ status: 'none' });
    res.json({ status: request.status });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Server Error" });
  }
};

// 5. Followers List
exports.getFollowers = async (req, res) => {
  const { username } = req.params;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const followers = await FollowRequest.find({ recipient: user._id, status: 'accepted' })
      .populate('requester', 'username profilePic');
    res.json(followers.map(f => f.requester));
  } catch (err) {
    res.status(500).json({ error: "Failed to load followers" });
  }
};

// 6. Following List
exports.getFollowing = async (req, res) => {
  const { username } = req.params;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const following = await FollowRequest.find({ requester: user._id, status: 'accepted' })
      .populate('recipient', 'username profilePic');
    res.json(following.map(f => f.recipient));
  } catch (err) {
    res.status(500).json({ error: "Failed to load following" });
  }
};

// 7. Followers/Following Counts
exports.getFollowCounts = async (req, res) => {
  const { username } = req.params;
  try {
    const user = await User.findOne({ username });
    if (!user) return res.status(404).json({ error: "User not found" });

    const followersCount = await FollowRequest.countDocuments({ recipient: user._id, status: 'accepted' });
    const followingCount = await FollowRequest.countDocuments({ requester: user._id, status: 'accepted' });
    res.json({ followersCount, followingCount });
  } catch (err) {
    res.status(500).json({ error: "Failed to load counts" });
  }
};

// 8. Unfollow
exports.unfollowUser = async (req, res) => {
  const { username } = req.params;
  const myId = req.user.id;

  try {
    const targetUser = await User.findOne({ username });
    if (!targetUser) return res.status(404).json({ error: "User not found" });

    // Dono direction check karo — chahe maine follow kiya ho, ya mujhe follow kiya gaya ho
    const deleted = await FollowRequest.findOneAndDelete({
      $or: [
        { requester: myId, recipient: targetUser._id },
        { requester: targetUser._id, recipient: myId }
      ]
    });

    if (!deleted) return res.status(404).json({ error: "No relationship found" });

    res.json({ message: "Unfollowed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to unfollow" });
  }
};