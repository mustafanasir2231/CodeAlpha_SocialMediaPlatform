import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import io from 'socket.io-client';
import { Image, Bookmark, Heart, Pencil, Trash2, MoreHorizontal } from 'lucide-react';
import CommentSection from '../components/CommentSection';
import SearchBar from '../components/SearchBar';
import MediaCarousel from '../components/MediaCarousel';
import HashtagText from '../components/HashtagText';
import StoryAvatarsStrip from '../components/StoryAvatarsStrip';
import CreateStoryModal from '../components/CreateStoryModal';
import StoryViewer from '../components/StoryViewer';
import '../styles/HomePage.css';

const socket = io.connect("http://localhost:5000");

const HomePage = () => {
    const [content, setContent] = useState("");
    const [posts, setPosts] = useState([]);
    const navigate = useNavigate();

    const [selectedFiles, setSelectedFiles] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [posting, setPosting] = useState(false);
    const fileInputRef = useRef(null);

    const [editingPostId, setEditingPostId] = useState(null);
    const [editContent, setEditContent] = useState("");

    // NEW: which post's "⋯" menu is open
    const [openMenuPostId, setOpenMenuPostId] = useState(null);
    const menuRef = useRef(null);

    const [savedPostIds, setSavedPostIds] = useState(new Set());

    const [storyGroups, setStoryGroups] = useState([]);
    const [myStories, setMyStories] = useState([]);
    const [showCreateStory, setShowCreateStory] = useState(false);
    const [viewerData, setViewerData] = useState(null);

    const savedUsername = localStorage.getItem("username");
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token")?.replace(/^"|"$/g, '');

    const fetchPosts = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/posts");
            setPosts(res.data);
        } catch (err) {
            console.error("Error fetching posts:", err);
        }
    };

    const fetchSavedPosts = async () => {
        if (!token) return;
        try {
            const res = await axios.get("http://localhost:5000/api/users/saved-posts", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const ids = new Set(res.data.map(p => p._id));
            setSavedPostIds(ids);
        } catch (err) {
            console.error("Error fetching saved posts:", err);
        }
    };

    const fetchStoriesFeed = async () => {
        if (!token) return;
        try {
            const res = await axios.get("http://localhost:5000/api/stories/feed", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const others = res.data.filter(g => g.username !== savedUsername);
            const withSeenStatus = others.map(g => ({
                ...g,
                allSeen: g.stories.every(s => s.seenBy?.includes(savedUsername))
            }));
            setStoryGroups(withSeenStatus);
        } catch (err) {
            console.error("Error fetching stories feed:", err);
        }
    };

    const fetchMyStories = async () => {
        if (!token) return;
        try {
            const res = await axios.get("http://localhost:5000/api/stories/my-stories", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMyStories(res.data);
        } catch (err) {
            console.error("Error fetching my stories:", err);
        }
    };

    useEffect(() => {
        fetchPosts();
        fetchSavedPosts();
        fetchStoriesFeed();
        fetchMyStories();

        if (userId) socket.emit('register-user', userId);

        socket.on('receive-post', (newPost) => {
            setPosts((prev) => [newPost, ...prev]);
        });

        socket.on('post-deleted', (postId) => {
            setPosts((prev) => prev.filter(p => p._id !== postId));
        });

        socket.on('like-updated', (updatedPost) => {
            if (updatedPost?._id) {
                setPosts((prev) => prev.map(p => p._id === updatedPost._id ? updatedPost : p));
            }
        });

        socket.on('post-edited', (updatedPost) => {
            if (updatedPost?._id) {
                setPosts((prev) => prev.map(p => p._id === updatedPost._id ? updatedPost : p));
            }
        });

        return () => {
            socket.off('receive-post');
            socket.off('post-deleted');
            socket.off('like-updated');
            socket.off('post-edited');
        };
    }, [userId]);

    // NEW: close the "⋯" menu when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenuPostId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFileSelect = (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        if (selectedFiles.length + files.length > 10) {
            alert("You can attach a maximum of 10 files per post.");
            return;
        }

        const oversized = files.find(f => f.size > 50 * 1024 * 1024);
        if (oversized) {
            alert(`${oversized.name} is too large. Max size is 50MB.`);
            return;
        }

        const newPreviews = files.map(file => ({
            url: URL.createObjectURL(file),
            type: file.type.startsWith('video/') ? 'video' : 'image'
        }));

        setSelectedFiles((prev) => [...prev, ...files]);
        setPreviews((prev) => [...prev, ...newPreviews]);
    };

    const removePreview = (index) => {
        URL.revokeObjectURL(previews[index].url);
        setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
        setPreviews((prev) => prev.filter((_, i) => i !== index));
    };

    const handlePost = async () => {
        if (!content.trim() && selectedFiles.length === 0) {
            return alert("Post must have text or media!");
        }
        if (!savedUsername) return navigate("/login");

        setPosting(true);
        try {
            const formData = new FormData();
            formData.append('username', savedUsername);
            formData.append('content', content);
            selectedFiles.forEach(file => formData.append('media', file));

            const res = await axios.post("http://localhost:5000/api/posts/create", formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            socket.emit('new-post', res.data);
            setContent("");
            previews.forEach(p => URL.revokeObjectURL(p.url));
            setSelectedFiles([]);
            setPreviews([]);
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || "Failed to create post");
        } finally {
            setPosting(false);
        }
    };

    const handleDelete = async (postId) => {
        setOpenMenuPostId(null);
        if (window.confirm("Are you sure you want to delete this post?")) {
            try {
                await axios.delete(`http://localhost:5000/api/posts/delete/${postId}`, {
                    data: { username: savedUsername }
                });
                socket.emit('delete-post', postId);
                setPosts((prev) => prev.filter(p => p._id !== postId));
            } catch (err) { alert("Failed to delete!"); }
        }
    };

    const handleLike = async (postId) => {
        try {
            const res = await axios.put(`http://localhost:5000/api/posts/like/${postId}`, { username: savedUsername });
            if (res.data?._id) {
                setPosts((prev) => prev.map(p => p._id === res.data._id ? res.data : p));
                socket.emit('update-like', res.data);
            } else {
                fetchPosts();
            }
        } catch (err) {
            alert("Error updating like!");
        }
    };

    const handleSaveToggle = async (postId) => {
        if (!token) return navigate("/login");

        try {
            const res = await axios.put(`http://localhost:5000/api/users/save/${postId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });

            setSavedPostIds((prev) => {
                const updated = new Set(prev);
                if (res.data.saved) {
                    updated.add(postId);
                } else {
                    updated.delete(postId);
                }
                return updated;
            });
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || "Failed to save post");
        }
    };

    const startEdit = (post) => {
        setOpenMenuPostId(null);
        setEditingPostId(post._id);
        setEditContent(post.content);
    };

    const cancelEdit = () => {
        setEditingPostId(null);
        setEditContent("");
    };

    const handleEditSave = async (postId) => {
        if (!editContent.trim()) return alert("Content cannot be empty");

        try {
            const res = await axios.put(`http://localhost:5000/api/posts/edit/${postId}`, {
                username: savedUsername,
                content: editContent
            });

            setPosts((prev) => prev.map(p => p._id === postId ? res.data : p));
            socket.emit('edit-post', res.data);

            setEditingPostId(null);
            setEditContent("");
        } catch (err) {
            alert(err.response?.data?.error || "Failed to edit");
        }
    };

    const handleAvatarClick = (username) => {
        if (username === savedUsername) {
            if (myStories.length === 0) return;
            const myGroup = { username: savedUsername, userId, stories: myStories };
            setViewerData({ groups: [myGroup], startIndex: 0 });
        } else {
            const idx = storyGroups.findIndex(g => g.username === username);
            if (idx === -1) return;
            setViewerData({ groups: storyGroups, startIndex: idx });
        }
    };

    const handleStoryCreated = () => {
        fetchMyStories();
        fetchStoriesFeed();
    };

    const handleStoryDeleted = (storyId) => {
        setMyStories((prev) => prev.filter(s => s._id !== storyId));
        fetchStoriesFeed();
    };

    return (
        <div className="home-page">
            <header className="home-header">
                <h1 className="home-logo">SocialSphere</h1>
                <SearchBar />
            </header>

            <StoryAvatarsStrip
                storyGroups={storyGroups}
                myUsername={savedUsername}
                hasMyStory={myStories.length > 0}
                onAddClick={() => setShowCreateStory(true)}
                onAvatarClick={handleAvatarClick}
            />

            {/* NEW: Trending strip removed from here — will only appear on SearchPage */}

            <div className="post-composer">
                <textarea
                    className="post-composer-textarea"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="What's on your mind? Use #hashtags to categorize your post"
                    rows="3"
                />

                {previews.length > 0 && (
                    <div className="post-composer-previews">
                        {previews.map((p, i) => (
                            <div key={i} className="preview-thumb">
                                {p.type === 'video' ? (
                                    <video src={p.url} />
                                ) : (
                                    <img src={p.url} alt="preview" />
                                )}
                                <button className="preview-remove" onClick={() => removePreview(i)}>✕</button>
                            </div>
                        ))}
                    </div>
                )}

                <input ref={fileInputRef} type="file" accept="image/*,video/*" multiple onChange={handleFileSelect} style={{ display: 'none' }} />

                <div className="post-composer-actions">
                    <button className="btn btn-outline" onClick={() => fileInputRef.current?.click()} type="button">
                        <Image size={16} /> Add Media
                    </button>
                    <button className="btn btn-primary" onClick={handlePost} disabled={posting}>
                        {posting ? "Posting..." : "Post"}
                    </button>
                </div>
            </div>

            <div className="feed">
                {posts.map(post => (
                    <article key={post._id} className="post-card">

                        <div className="post-card-header">
                            <Link to={`/profile/${post.username}`} className="post-card-author">
                                <div className="post-card-avatar">{post.username?.[0]?.toUpperCase()}</div>
                                <span className="post-card-username">{post.username}</span>
                            </Link>

                            {/* NEW: "⋯" menu — only shown on own posts */}
                            {savedUsername === post.username && (
                                <div className="post-menu-wrapper" ref={openMenuPostId === post._id ? menuRef : null}>
                                    <button
                                        className="icon-btn"
                                        onClick={() => setOpenMenuPostId(openMenuPostId === post._id ? null : post._id)}
                                    >
                                        <MoreHorizontal size={20} />
                                    </button>

                                    {openMenuPostId === post._id && (
                                        <div className="post-menu-dropdown">
                                            <button className="post-menu-item" onClick={() => startEdit(post)}>
                                                <Pencil size={15} /> Edit
                                            </button>
                                            <button className="post-menu-item post-menu-item-danger" onClick={() => handleDelete(post._id)}>
                                                <Trash2 size={15} /> Delete
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {post.media?.length > 0 && (
                            <div className="post-card-media">
                                <MediaCarousel media={post.media} />
                            </div>
                        )}

                        <div className="post-card-body">
                            {editingPostId === post._id ? (
                                <div className="post-edit-box">
                                    <textarea
                                        className="post-edit-textarea"
                                        value={editContent}
                                        onChange={(e) => setEditContent(e.target.value)}
                                        rows="3"
                                        autoFocus
                                    />
                                    <div className="post-edit-actions">
                                        <button className="btn btn-primary btn-sm" onClick={() => handleEditSave(post._id)}>Save</button>
                                        <button className="btn btn-outline btn-sm" onClick={cancelEdit}>Cancel</button>
                                    </div>
                                </div>
                            ) : (
                                post.content && (
                                    <p className="post-card-caption">
                                        <span className="post-card-caption-username">{post.username}</span>{' '}
                                        <HashtagText text={post.content} />
                                        {post.edited && <span className="post-edited-tag">(edited)</span>}
                                    </p>
                                )
                            )}

                            {/* NEW: Action row — like, comment, save all in one line, save (bookmark) pushed to the right using margin-left auto class */}
                            <div className="post-card-actions">
                                <button
                                    className={`icon-btn ${post.likes?.includes(savedUsername) ? 'icon-btn-liked' : ''}`}
                                    onClick={() => handleLike(post._id)}
                                >
                                    <Heart size={22} fill={post.likes?.includes(savedUsername) ? 'currentColor' : 'none'} />
                                </button>

                                <CommentSection postId={post._id} socket={socket} />

                                <button
                                    className={`icon-btn post-action-save ${savedPostIds.has(post._id) ? 'icon-btn-active' : ''}`}
                                    onClick={() => handleSaveToggle(post._id)}
                                    title={savedPostIds.has(post._id) ? "Unsave post" : "Save post"}
                                >
                                    <Bookmark size={20} fill={savedPostIds.has(post._id) ? 'currentColor' : 'none'} />
                                </button>
                            </div>

                            <p className="post-card-likes">{post.likes?.length || 0} likes</p>
                            {post.likes?.length > 0 && (
                                <p className="post-card-liked-by">
                                    Liked by <strong>{post.likes[0]}</strong>
                                    {post.likes.length > 1 ? ` and ${post.likes.length - 1} others` : ""}
                                </p>
                            )}

                            <span className="post-card-time">
                                {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : "Just now"}
                            </span>
                        </div>
                    </article>
                ))}
            </div>

            {showCreateStory && (
                <CreateStoryModal
                    onClose={() => setShowCreateStory(false)}
                    onStoryCreated={handleStoryCreated}
                />
            )}

            {viewerData && (
                <StoryViewer
                    allGroups={viewerData.groups}
                    startGroupIndex={viewerData.startIndex}
                    myUsername={savedUsername}
                    onClose={() => setViewerData(null)}
                    onStoryDeleted={handleStoryDeleted}
                />
            )}
        </div>
    );
};

export default HomePage;