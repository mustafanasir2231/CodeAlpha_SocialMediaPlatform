import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import io from 'socket.io-client';
import CommentSection from '../components/CommentSection';

const socket = io.connect("http://localhost:5000");

const PostPage = () => {
    const { postId } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const savedUsername = localStorage.getItem("username");

    const fetchPost = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/posts/${postId}`);
            setPost(res.data);
            setError(null);
        } catch (err) {
            console.error("Error fetching post:", err);
            setError("Post not found — it may have been deleted.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchPost();

        // Real-time: agar yeh post delete ho jaye jab koi isay dekh raha ho
        const handleDeleted = (deletedId) => {
            if (deletedId === postId) {
                setError("This post has been deleted.");
                setPost(null);
            }
        };

        // Real-time: like update
        const handleLikeUpdate = (updatedPost) => {
            if (updatedPost._id === postId) {
                setPost(updatedPost);
            }
        };

        socket.on('post-deleted', handleDeleted);
        socket.on('like-updated', handleLikeUpdate);

        return () => {
            socket.off('post-deleted', handleDeleted);
            socket.off('like-updated', handleLikeUpdate);
        };
    }, [postId]);

    const handleLike = async () => {
        try {
            const res = await axios.put(`http://localhost:5000/api/posts/like/${postId}`, { username: savedUsername });
            setPost(res.data);
            socket.emit('update-like', res.data);
        } catch (err) {
            alert("Error updating like!");
        }
    };

    const handleDelete = async () => {
        if (window.confirm("Are you sure you want to delete this post?")) {
            try {
                await axios.delete(`http://localhost:5000/api/posts/delete/${postId}`, {
                    data: { username: savedUsername }
                });
                socket.emit('delete-post', postId);
                navigate("/");
            } catch (err) {
                alert("Failed to delete!");
            }
        }
    };

    if (loading) {
        return <div style={{ padding: '40px', textAlign: 'center' }}>Loading post...</div>;
    }

    if (error || !post) {
        return (
            <div style={{ padding: '40px', textAlign: 'center' }}>
                <p style={{ color: '#888' }}>{error || "Post not found."}</p>
                <button onClick={() => navigate("/")}>Back to Feed</button>
            </div>
        );
    }

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            <button onClick={() => navigate(-1)} style={{ marginBottom: '20px' }}>← Back</button>

            <div className="post-card" style={{ border: '1px solid #ccc', padding: '15px', borderRadius: '8px' }}>
                <Link to={`/profile/${post.username}`} style={{ textDecoration: 'none', color: '#333' }}>
                    <h3>{post.username}</h3>
                </Link>

                <p>{post.content}</p>

                <div className="likes-section" style={{ marginTop: '10px' }}>
                    <button onClick={handleLike} style={{ cursor: 'pointer' }}>
                        {post.likes?.includes(savedUsername) ? "❤️ Unlike" : "🤍 Like"}
                    </button>
                    <p>Likes: {post.likes?.length || 0}</p>
                    {post.likes?.length > 0 && (
                        <small>
                            Liked by: {post.likes[0]} {post.likes.length > 1 ? `and ${post.likes.length - 1} others` : ""}
                        </small>
                    )}
                </div>

                {savedUsername === post.username && (
                    <button onClick={handleDelete} style={{ color: 'white', backgroundColor: 'red', marginTop: '10px' }}>
                        Delete
                    </button>
                )}

                <div style={{ marginTop: '15px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                    <CommentSection postId={post._id} socket={socket} />
                </div>

                <small style={{ color: '#888', display: 'block', marginTop: '5px' }}>
                    {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : "Just now"}
                </small>
            </div>
        </div>
    );
};

export default PostPage;