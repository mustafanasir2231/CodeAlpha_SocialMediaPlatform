import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { MessageCircle, Heart } from 'lucide-react';
import '../styles/CommentSection.css';

const CommentSection = ({ postId, socket }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');

  const myUsername = localStorage.getItem("username");

  const getToken = () => {
    let token = localStorage.getItem('token');
    if (token) token = token.replace(/^"|"$/g, '');
    return token;
  };

  const fetchComments = async () => {
    try {
      const res = await axios.get(`http://localhost:5000/api/comments/${postId}`);
      setComments(res.data);
    } catch (err) {
      console.error("Error fetching comments:", err);
    }
  };

  useEffect(() => {
    if (isOpen) fetchComments();
  }, [isOpen, postId]);

  useEffect(() => {
    if (!socket) return;

    const handleNewComment = ({ postId: incomingPostId }) => {
      if (incomingPostId === postId && isOpen) {
        fetchComments();
      }
    };

    socket.on('comment-added', handleNewComment);
    return () => socket.off('comment-added', handleNewComment);
  }, [socket, postId, isOpen]);

  const postComment = async (commentText, replyToId = null) => {
    const token = getToken();
    if (!token || token === "undefined") {
      alert("Token missing! Please login again.");
      return false;
    }
    if (!commentText.trim()) return false;

    try {
      await axios.post('http://localhost:5000/api/comments',
        { postId, text: commentText, replyTo: replyToId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      fetchComments();
      if (socket) socket.emit('new-comment', { postId, comment: { text: commentText } });
      return true;
    } catch (err) {
      console.error("Error details:", err.response?.data);
      alert("Failed to post: " + (err.response?.data?.error || "Invalid token"));
      return false;
    }
  };

  const handleAddComment = async () => {
    const ok = await postComment(text);
    if (ok) setText('');
  };

  const handleAddReply = async (parentId) => {
    const ok = await postComment(replyText, parentId);
    if (ok) {
      setReplyText('');
      setReplyingTo(null);
    }
  };

  const handleToggleLike = async (commentId) => {
    const token = getToken();
    if (!token || token === "undefined") {
      alert("Token missing! Please login again.");
      return;
    }
    try {
      const res = await axios.put(`http://localhost:5000/api/comments/like/${commentId}`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const updated = res.data;

      setComments((prev) => prev.map(c => {
        if (c._id === updated._id) {
          return { ...c, likes: updated.likes };
        }
        if (c.replies?.length > 0) {
          return {
            ...c,
            replies: c.replies.map(r => r._id === updated._id ? { ...r, likes: updated.likes } : r)
          };
        }
        return c;
      }));
    } catch (err) {
      console.error("Error toggling comment like:", err);
      alert("Failed to like comment");
    }
  };

  const totalCount = comments.reduce((sum, c) => sum + 1 + (c.replies?.length || 0), 0);

  const LikeButton = ({ item }) => {
    const isLiked = item.likes?.includes(myUsername);
    return (
      <button
        className={`comment-like-btn ${isLiked ? 'comment-like-btn-active' : ''}`}
        onClick={() => handleToggleLike(item._id)}
      >
        <Heart size={13} fill={isLiked ? 'currentColor' : 'none'} />
        {item.likes?.length > 0 ? item.likes.length : ''}
      </button>
    );
  };

  return (
    <div className="comment-section">
      {/* NEW: use actual Lucide icon instead of emoji */}
      <button className="icon-btn comment-toggle-btn" onClick={() => setIsOpen(!isOpen)}>
        <MessageCircle size={22} />
      </button>
      {totalCount > 0 && <span className="comment-count">{totalCount}</span>}

      {isOpen && (
        <div className="comment-panel">
          <div className="comment-input-row">
            <input
              className="comment-input"
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              placeholder="Write a comment..."
            />
            <button className="btn btn-primary btn-sm" onClick={handleAddComment}>Post</button>
          </div>

          <div className="comment-list">
            {comments.map(c => (
              <div key={c._id} className="comment-item">
                <div className="comment-line">
                  <span>
                    <strong>{c.username}:</strong> {c.text}
                  </span>
                  <LikeButton item={c} />
                  <button
                    className="comment-reply-btn"
                    onClick={() => setReplyingTo(replyingTo?.commentId === c._id ? null : { commentId: c._id, username: c.username })}
                  >
                    Reply
                  </button>
                </div>

                {c.replies?.length > 0 && (
                  <div className="comment-replies">
                    {c.replies.map(r => (
                      <div key={r._id} className="comment-reply-line">
                        <span>
                          <strong>{r.username}:</strong> {r.text}
                        </span>
                        <LikeButton item={r} />
                      </div>
                    ))}
                  </div>
                )}

                {replyingTo?.commentId === c._id && (
                  <div className="comment-reply-input-row">
                    <input
                      autoFocus
                      className="comment-input comment-input-sm"
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddReply(c._id)}
                      placeholder={`Reply to ${c.username}...`}
                    />
                    <button className="btn btn-outline btn-sm" onClick={() => handleAddReply(c._id)}>Reply</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default CommentSection;