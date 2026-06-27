const Notification = require('../models/Notification');
const { emitToUser } = require('../utils/socket');

// Internal helper — yeh function controllers (like, comment, follow, story) khud call karenge
// Khud ko notification nahi bhejni (apni hi post like ki, apna hi comment kiya)
const createNotification = async ({ recipientId, senderId, senderUsername, type, postId = null, storyId = null }) => {
  if (recipientId.toString() === senderId.toString()) return; // khud ko notification nahi

  try {
    const notification = await Notification.create({
      recipient: recipientId,
      sender: senderId,
      type,
      post: postId,
      story: storyId // NAYA
    });

    // Real-time: foran recipient ko bhej do
    emitToUser(recipientId.toString(), 'new-notification', {
      _id: notification._id,
      type,
      senderUsername,
      post: postId,
      story: storyId, // NAYA
      isRead: false,
      createdAt: notification.createdAt
    });
  } catch (err) {
    console.error("Notification create error:", err);
  }
};

// GET /api/notifications — sab notifications (latest pehle)
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

// GET /api/notifications/unread-count — badge ke liye sirf count
exports.getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({ recipient: req.user.id, isRead: false });
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch count" });
  }
};

// PUT /api/notifications/mark-read — bell dropdown khulte hi sab read mark
exports.markAllRead = async (req, res) => {
  try {
    await Notification.updateMany({ recipient: req.user.id, isRead: false }, { isRead: true });
    res.json({ message: "Marked as read" });
  } catch (err) {
    res.status(500).json({ error: "Failed to mark read" });
  }
};

module.exports.createNotification = createNotification;