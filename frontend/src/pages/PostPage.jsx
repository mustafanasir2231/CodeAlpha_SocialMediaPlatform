import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import io from 'socket.io-client';
import { Heart, Bookmark } from 'lucide-react';
import CommentSection from '../components/CommentSection';
import MediaCarousel from '../components/MediaCarousel';
import HashtagText from '../components/HashtagText';
import '../styles/HomePage.css';
import '../styles/PostPage.css';

const socket = io.connect("http://localhost:5000");

const PostPage = () => {
    const { postId } = useParams();
    const navigate = useNavigate();
    const [post, setPost] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    const [isSaved, setIsSaved] = useState(false);

    const savedUsername = localStorage.getItem("username");
    const token = localStorage.getItem("token")?.replace(/^"|"$/g, '');

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

    const fetchSaveStatus = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`http://localhost:5000/api/users/save-status/${postId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsSaved(res.data.saved);
        } catch (err) {
            console.error("Error fetching save status:", err);
        }
    };

    useEffect(() => {
        fetchPost();
        fetchSaveStatus();

        const handleDeleted = (deletedId) => {
            if (deletedId === postId) {
                setError("This post has been deleted.");
                setPost(null);
            }
        };

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

    const handleSaveToggle = async () => {
        if (!token) return navigate("/login");
        try {
            const res = await axios.put(`http://localhost:5000/api/users/save/${postId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setIsSaved(res.data.saved);
        } catch (err) {
            alert("Failed to save post");
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
        return <div className="post-page-status">Loading post...</div>;
    }

    if (error || !post) {
        return (
            <div className="post-page-status">
                <p>{error || "Post not found."}</p>
                <button className="btn btn-outline" onClick={() => navigate("/")}>Back to Feed</button>
            </div>
        );
    }

    return (
        <div className="post-page">
            <article className="post-card">
                <div className="post-card-header">
                    <Link to={`/profile/${post.username}`} className="post-card-author">
                        <div className="post-card-avatar">{post.username?.[0]?.toUpperCase()}</div>
                        <span className="post-card-username">{post.username}</span>
                    </Link>
                </div>

                {post.media?.length > 0 && (
                    <div className="post-card-media">
                        <MediaCarousel media={post.media} />
                    </div>
                )}

                <div className="post-card-body">
                    <div className="post-card-actions">
                        <button
                            className={`icon-btn ${post.likes?.includes(savedUsername) ? 'icon-btn-liked' : ''}`}
                            onClick={handleLike}
                        >
                            <Heart size={22} fill={post.likes?.includes(savedUsername) ? 'currentColor' : 'none'} />
                        </button>

                        <CommentSection postId={post._id} socket={socket} />

                        <button
                            className={`icon-btn post-action-save ${isSaved ? 'icon-btn-active' : ''}`}
                            onClick={handleSaveToggle}
                            title={isSaved ? "Unsave post" : "Save post"}
                        >
                            <Bookmark size={20} fill={isSaved ? 'currentColor' : 'none'} />
                        </button>
                    </div>

                    {/* FIX: likes count + "Liked by" now appear immediately after the icons, before the caption  */}
                    <p className="post-card-likes">{post.likes?.length || 0} likes</p>
                    {post.likes?.length > 0 && (
                        <p className="post-card-liked-by">
                            Liked by <strong>{post.likes[0]}</strong>
                            {post.likes.length > 1 ? ` and ${post.likes.length - 1} others` : ""}
                        </p>
                    )}

                    {post.content && (
                        <p className="post-card-caption">
                            <span className="post-card-caption-username">{post.username}</span>{' '}
                            <HashtagText text={post.content} />
                        </p>
                    )}

                    {savedUsername === post.username && (
                        <button className="btn btn-danger btn-sm post-delete-btn" onClick={handleDelete}>
                            Delete Post
                        </button>
                    )}

                    <span className="post-card-time">
                        {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : "Just now"}
                    </span>
                </div>
            </article>
        </div>
    );
};

export default PostPage;