const Notification = require('../models/Notification');
const { emitToUser } = require('../utils/socket');

// Internal helper — this function will be called by controllers (like, comment, follow, story) themselves
const createNotification = async ({ recipientId, senderId, senderUsername, type, postId = null, storyId = null }) => {
  if (recipientId.toString() === senderId.toString()) return; // don't send notification to self

  try {
    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      post: postId,
      story: storyId // NEW
    });

    // Real-time: send to recipient immediately
    emitToUser(recipientId.toString(), 'new-notification', {
      _id: notification._id,
      type,
      senderUsername,
      post: postId,
      story: storyId, // NEW
      isRead: false,
      createdAt: notification.createdAt
    });
  } catch (err) {
    console.error("Notification create error:", err);
  }
};

// GET /api/notifications — all notifications (latest first)
exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.id })
      .populate('sender', 'username profilePic')
      .sort({ createdAt: -1 })
      .limit(30);

    res.json(notifications);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

// GET /api/notifications/unread-count — just the count for the badge
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user.id, isRead: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch count" });
  }
};

// PUT /api/notifications/mark-read — mark all as read when bell dropdown is opened
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark read" });
  }
};

module.exports.createNotification = createNotification;