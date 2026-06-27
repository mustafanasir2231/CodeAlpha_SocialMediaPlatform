import React, { useState, useEffect } from 'react';
import axios from 'axios';

const CommentSection = ({ postId, socket }) => {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null); // { commentId, username } ya null
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

  // Jab toggle open ho, tabhi comments load hon
  useEffect(() => {
    if (isOpen) fetchComments();
  }, [isOpen, postId]);

  // Real-time: koi naya comment/reply aaye toh dropdown khula ho to refresh kar do
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

  // NAYA: Comment ya reply ko like/unlike karna
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

      // NAYA: state mein sahi jagah update karna hai — ya toh top-level comment, ya kisi ke andar reply
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

  // NAYA: chhota reusable like button — comment aur reply dono ke liye use hoga
  const LikeButton = ({ item }) => {
    const isLiked = item.likes?.includes(myUsername);
    return (
      <button
        onClick={() => handleToggleLike(item._id)}
        style={{
          marginLeft: '8px', fontSize: '12px', border: 'none', background: 'none',
          color: isLiked ? '#ed4956' : '#888', cursor: 'pointer'
        }}
      >
        {isLiked ? '❤️' : '🤍'} {item.likes?.length > 0 ? item.likes.length : ''}
      </button>
    );
  };

  return (
    <div style={{ marginTop: '10px' }}>
      {/* Instagram style Comment Icon */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={{ border: 'none', background: 'none', cursor: 'pointer', fontSize: '18px' }}
      >
        💬 {totalCount}
      </button>

      {isOpen && (
        <div style={{ marginTop: '10px', padding: '10px', border: '1px solid #eee', borderRadius: '5px' }}>
          <div style={{ display: 'flex', gap: '5px' }}>
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
              placeholder="Write a comment..."
              style={{ flex: 1, padding: '5px' }}
            />
            <button onClick={handleAddComment}>Post</button>
          </div>

          <div style={{ marginTop: '10px' }}>
            {comments.map(c => (
              <div key={c._id} style={{ marginBottom: '10px' }}>
                <div style={{ fontSize: '14px', display: 'flex', alignItems: 'center' }}>
                  <span>
                    <strong>{c.username}:</strong> {c.text}
                  </span>
                  {/* NAYA: comment like button */}
                  <LikeButton item={c} />
                  <button
                    onClick={() => setReplyingTo(replyingTo?.commentId === c._id ? null : { commentId: c._id, username: c.username })}
                    style={{ marginLeft: '8px', fontSize: '12px', border: 'none', background: 'none', color: '#0095f6', cursor: 'pointer' }}
                  >
                    Reply
                  </button>
                </div>

                {/* Replies — thoda indent karke dikhao */}
                {c.replies?.length > 0 && (
                  <div style={{ marginLeft: '20px', marginTop: '5px', borderLeft: '2px solid #eee', paddingLeft: '10px' }}>
                    {c.replies.map(r => (
                      <div key={r._id} style={{ fontSize: '13px', marginBottom: '4px', display: 'flex', alignItems: 'center' }}>
                        <span>
                          <strong>{r.username}:</strong> {r.text}
                        </span>
                        {/* NAYA: reply like button */}
                        <LikeButton item={r} />
                      </div>
                    ))}
                  </div>
                )}

                {/* Reply input box — sirf jab "Reply" pe click ho */}
                {replyingTo?.commentId === c._id && (
                  <div style={{ marginLeft: '20px', marginTop: '6px', display: 'flex', gap: '5px' }}>
                    <input
                      autoFocus
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleAddReply(c._id)}
                      placeholder={`Reply to ${c.username}...`}
                      style={{ flex: 1, padding: '5px', fontSize: '13px' }}
                    />
                    <button onClick={() => handleAddReply(c._id)} style={{ fontSize: '13px' }}>Reply</button>
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