const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const Story = require('../models/Story'); // NEW — for story reply
const { emitToUser } = require('../utils/socket');

const findOrCreateConversation = async (userId1, userId2) => {
  let conversation = await Conversation.findOne({
    participants: { $all: [userId1, userId2], $size: 2 }
  });
  if (!conversation) {
    conversation = await Conversation.create({ participants: [userId1, userId2] });
  }
  return conversation;
};

// Inbox: list of all conversations
exports.getConversations = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user.id })
      .populate('participants', 'username')
      .sort({ lastMessageAt: -1 });

    const formatted = conversations.map(conv => {
      const otherUser = conv.participants.find(p => p._id.toString() !== req.user.id);
      return {
        username: otherUser?.username,
        lastMessage: conv.lastMessage,
        lastMessageAt: conv.lastMessageAt
      };
    });
    res.json(formatted);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load conversations" });
  }
};

// Full chat history with a specific user
exports.getMessages = async (req, res) => {
  const { username } = req.params;
  try {
    const otherUser = await User.findOne({ username });
    if (!otherUser) return res.status(404).json({ error: "User not found" });

    const conversation = await Conversation.findOne({
      participants: { $all: [req.user.id, otherUser._id], $size: 2 }
    });
    if (!conversation) return res.json([]);

    const messages = await Message.find({ conversation: conversation._id })
      .populate('sender', 'username')
      .sort({ createdAt: 1 });

    // Upon opening the chat — mark as seen any messages sent by the other user that are not yet seen
    const unseenIds = messages
      .filter(m => m.sender._id.toString() !== req.user.id && !m.seen)
      .map(m => m._id);

    if (unseenIds.length > 0) {
      await Message.updateMany({ _id: { $in: unseenIds } }, { seen: true });

      emitToUser(otherUser._id.toString(), 'messages-seen', {
        seenBy: req.user.username,
        conversationId: conversation._id.toString()
      });

      unseenIds.forEach(id => {
        const msg = messages.find(m => m._id.toString() === id.toString());
        if (msg) msg.seen = true;
      });
    }

    res.json(messages);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to load messages" });
  }
};

// Count messages from all conversations that were sent by others (not me) and not yet seen.
exports.getUnreadMessageCount = async (req, res) => {
  try {
    const conversations = await Conversation.find({ participants: req.user.id });
    const conversationIds = conversations.map(c => c._id);

    const count = await Message.countDocuments({
      conversation: { $in: conversationIds },
      sender: { $ne: req.user.id },
      seen: false
    });

    res.json({ count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch unread count" });
  }
};

// Send message — also accepts optional storyId (for replying to a story via DM)
exports.sendMessage = async (req, res) => {
  const { username } = req.params;
  const { text, storyId } = req.body; // NEW: storyId
  if (!text?.trim()) return res.status(400).json({ error: "Message can't be empty" });

  try {
    const otherUser = await User.findOne({ username });
    if (!otherUser) return res.status(404).json({ error: "User not found" });

    const conversation = await findOrCreateConversation(req.user.id, otherUser._id);

    // NEW: If storyId is provided, fetch the story snapshot (if not yet expired)
    let storyReply = undefined;
    if (storyId) {
      const story = await Story.findById(storyId);
      if (story) {
        storyReply = {
          storyId: story._id,
          storyType: story.type,
          storyMediaUrl: story.mediaUrl,
          storyText: story.text,
          storyBackgroundColor: story.backgroundColor,
          storyOwnerUsername: story.username
        };
      }
    }

    const messageData = {
      conversation: conversation._id,
      sender: req.user.id,
      text: text.trim()
    };
    if (storyReply) messageData.storyReply = storyReply;

    let message = await Message.create(messageData);
    message = await message.populate('sender', 'username');

    conversation.lastMessage = storyId ? "Replied to a story" : text.trim();
    conversation.lastMessageAt = new Date();
    await conversation.save();

    // Real-time: send immediately to the other user
    emitToUser(otherUser._id.toString(), 'receive-message', message);

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to send message" });
  }
};