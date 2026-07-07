const Comment = require('../models/Comment');
const Post = require('../models/Post');
const User = require('../models/User');
const { createNotification } = require('./notificationController');

// 1. Add a Comment 
exports.addComment = async (req, res) => {
  try {
    const { postId, text, replyTo } = req.body;
    if (!postId || !text) {
      return res.status(400).json({ error: "Post ID and Comment Text are required" });
    }
    const newComment = new Comment({
      postId,
      userId: req.user.id,
      username: req.user.username,
      text,
      replyTo: replyTo || null
    });
    const savedComment = await newComment.save();


    try {
      if (replyTo) {
        const parentComment = await Comment.findById(replyTo);
        if (parentComment && parentComment.userId.toString() !== req.user.id) {
          await createNotification({
            recipientId: parentComment.userId,
            senderId: req.user.id,
            senderUsername: req.user.username,
            type: 'reply', 
            postId
          });
        }
      } else {
        const post = await Post.findById(postId);
        if (post) {
          const postOwner = await User.findOne({ username: post.username });
          if (postOwner) {
            await createNotification({
              recipientId: postOwner._id,
              senderId: req.user.id,
              senderUsername: req.user.username,
              type: 'comment',
              postId: post._id
            });
          }
        }
      }
    } catch (notifErr) {
      console.error("Comment notification error:", notifErr); 
    }

    res.status(201).json(savedComment);
  } catch (err) {
    console.error("Add Comment Error:", err);
    res.status(500).json({ error: "Failed to add comment" });
  }
};

// 2. Get All Comments for a Post — in a structured way (top-level + their replies)
exports.getComments = async (req, res) => {
  try {
    const allComments = await Comment.find({ postId: req.params.postId }).sort({ createdAt: 1 });
    const topLevel = allComments.filter(c => !c.replyTo);
    const replies = allComments.filter(c => c.replyTo);
    const structured = topLevel.map(comment => ({
      ...comment.toObject(),
      replies: replies
        .filter(r => r.replyTo.toString() === comment._id.toString())
        .map(r => r.toObject())
    }));
    structured.reverse();
    res.json(structured);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch comments" });
  }
};

// 3. Delete Comment
exports.deleteComment = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });
    if (comment.userId.toString() !== req.user.id) {
      return res.status(403).json({ error: "You can only delete your own comment" });
    }
    await comment.deleteOne();
    res.json({ message: "Comment deleted" });
  } catch (err) {
    res.status(500).json({ error: "Failed to delete" });
  }
};

// NEW: 4. Like/Unlike a Comment or Reply (toggle) — same pattern as Post like
exports.toggleCommentLike = async (req, res) => {
  try {
    const comment = await Comment.findById(req.params.commentId);
    if (!comment) return res.status(404).json({ error: "Comment not found" });

    const username = req.user.username;
    const alreadyLiked = comment.likes.includes(username);

    if (alreadyLiked) {
      await comment.updateOne({ $pull: { likes: username } });
    } else {
      await comment.updateOne({ $push: { likes: username } });

      // Notification — only when someone likes another's comment, not their own
      try {
        if (comment.userId.toString() !== req.user.id) {
          await createNotification({
            recipientId: comment.userId,
            senderId: req.user.id,
            senderUsername: req.user.username,
            type: 'comment-like',
            postId: comment.postId
          });
        }
      } catch (notifErr) {
        console.error("Comment like notification error:", notifErr);
      }
    }

    const updatedComment = await Comment.findById(req.params.commentId);
    res.json(updatedComment);
  } catch (err) {
    console.error("Toggle Comment Like Error:", err);
    res.status(500).json({ error: "Failed to like/unlike comment" });
  }
};