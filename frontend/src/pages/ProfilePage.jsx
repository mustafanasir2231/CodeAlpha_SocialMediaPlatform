import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate, useParams, Link } from 'react-router-dom';
import io from 'socket.io-client';
import { Grid3x3, Bookmark, Camera } from 'lucide-react';
import FollowListModal from '../components/FollowListModal';
import '../styles/ProfilePage.css';

const socket = io.connect("http://localhost:5000");

const ProfilePage = () => {
    const { username: urlUsername } = useParams();
    const [myPosts, setMyPosts] = useState([]);
    const [status, setStatus] = useState('none');
    const [pendingRequests, setPendingRequests] = useState([]);
    const [counts, setCounts] = useState({ followersCount: 0, followingCount: 0 });
    const [modalData, setModalData] = useState(null);
    const [followers, setFollowers] = useState([]);
    const navigate = useNavigate();

    const [profilePic, setProfilePic] = useState("");
    const [bio, setBio] = useState("");
    const [isEditingBio, setIsEditingBio] = useState(false);
    const [bioInput, setBioInput] = useState("");
    const [uploading, setUploading] = useState(false);
    const fileInputRef = useRef(null);

    const [activeTab, setActiveTab] = useState('posts');
    const [savedPosts, setSavedPosts] = useState([]);
    const [loadingSaved, setLoadingSaved] = useState(false);

    const [onlineUserIds, setOnlineUserIds] = useState(new Set());
    const [profileUserId, setProfileUserId] = useState(null);

    const loggedInUser = localStorage.getItem("username");
    const userId = localStorage.getItem("userId");
    const token = localStorage.getItem("token")?.replace(/^"|"$/g, '');
    const isMyProfile = loggedInUser === urlUsername;

    useEffect(() => {
        if (userId) socket.emit('register-user', userId);

        socket.on('new-follow-request', () => {
            fetchPendingRequests();
        });

        socket.on('follow-was-accepted', () => {
            setStatus('accepted');
            setCounts(prev => ({ ...prev, followingCount: prev.followingCount + 1 }));
        });

        socket.on('unfollowed', () => {
            setCounts(prev => ({ ...prev, followersCount: Math.max(0, prev.followersCount - 1) }));
            fetchFollowers();
        });

        socket.on('online-users', (ids) => {
            setOnlineUserIds(new Set(ids));
        });

        return () => {
            socket.off('new-follow-request');
            socket.off('follow-was-accepted');
            socket.off('unfollowed');
            socket.off('online-users');
        };
    }, [userId]);

    const fetchPendingRequests = async () => {
        try {
            const res = await axios.get('http://localhost:5000/api/follow/pending', {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingRequests(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchCounts = async () => {
        if (!token) return;
        try {
            const res = await axios.get(`http://localhost:5000/api/follow/counts/${urlUsername}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setCounts(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchFollowers = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/follow/followers/${urlUsername}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setFollowers(res.data);
        } catch (err) { console.error(err); }
    };

    const fetchProfileInfo = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/users/${urlUsername}`);
            setProfilePic(res.data.profilePic || "");
            setBio(res.data.bio || "");
            if (res.data._id) setProfileUserId(res.data._id);
        } catch (err) { console.error(err); }
    };

    const fetchSavedPosts = async () => {
        if (!token) return;
        setLoadingSaved(true);
        try {
            const res = await axios.get("http://localhost:5000/api/users/saved-posts", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSavedPosts(res.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoadingSaved(false);
        }
    };

    useEffect(() => {
        const fetchAll = async () => {
            if (!urlUsername) return;
            try {
                const res = await axios.get(`http://localhost:5000/api/posts/my-posts?username=${urlUsername}`);
                setMyPosts(res.data);

                if (!isMyProfile && token) {
                    const statusRes = await axios.get(`http://localhost:5000/api/follow/status/${urlUsername}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setStatus(statusRes.data.status);
                }

                if (isMyProfile && token) {
                    fetchPendingRequests();
                    fetchFollowers();
                }

                await fetchCounts();
                await fetchProfileInfo();
            } catch (err) { console.error(err); }
        };
        fetchAll();
    }, [urlUsername, isMyProfile, token]);

    useEffect(() => {
        if (activeTab === 'saved' && isMyProfile) {
            fetchSavedPosts();
        }
    }, [activeTab, isMyProfile]);

    const handleFollow = async () => {
        try {
            await axios.post('http://localhost:5000/api/follow/request',
                { recipientId: urlUsername },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setStatus('pending');
        } catch (err) {
            alert("Failed to send request");
        }
    };

    const handleUnfollow = async () => {
        const confirm = window.confirm(`Unfollow ${urlUsername}?`);
        if (!confirm) return;

        try {
            await axios.delete(`http://localhost:5000/api/follow/unfollow/${urlUsername}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatus('none');
            setCounts(prev => ({ ...prev, followingCount: Math.max(0, prev.followingCount - 1) }));
        } catch (err) {
            alert("Failed to unfollow");
        }
    };

    const handleCancelRequest = async () => {
        const confirm = window.confirm("Cancel follow request?");
        if (!confirm) return;

        try {
            await axios.delete(`http://localhost:5000/api/follow/unfollow/${urlUsername}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setStatus('none');
        } catch (err) {
            alert("Failed to cancel request");
        }
    };

    const handleAccept = async (requestId, requesterUsername) => {
        try {
            await axios.put(`http://localhost:5000/api/follow/accept/${requestId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingRequests(prev => prev.filter(r => r._id !== requestId));
            setCounts(prev => ({ ...prev, followersCount: prev.followersCount + 1 }));
            setFollowers(prev => [...prev, { username: requesterUsername }]);
        } catch (err) {
            alert("Failed to accept request");
        }
    };

    const openFollowers = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/follow/followers/${urlUsername}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setModalData({ title: 'Followers', users: res.data });
        } catch (err) { console.error(err); }
    };

    const openFollowing = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/follow/following/${urlUsername}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setModalData({ title: 'Following', users: res.data });
        } catch (err) { console.error(err); }
    };

    const handlePicChange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (!file.type.startsWith('image/')) {
            alert("Please select an image file");
            return;
        }
        if (file.size > 5 * 1024 * 1024) {
            alert("Image must be under 5MB");
            return;
        }

        const formData = new FormData();
        formData.append('profilePic', file);

        setUploading(true);
        try {
            const res = await axios.post('http://localhost:5000/api/users/profile-pic', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });
            setProfilePic(res.data.profilePic);
        } catch (err) {
            console.error(err);
            alert("Failed to upload profile picture");
        } finally {
            setUploading(false);
        }
    };

    const handleSaveBio = async () => {
        try {
            const res = await axios.put('http://localhost:5000/api/users/bio',
                { bio: bioInput },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setBio(res.data.bio);
            setIsEditingBio(false);
        } catch (err) {
            alert(err.response?.data?.error || "Failed to update bio");
        }
    };

    const startEditingBio = () => {
        setBioInput(bio);
        setIsEditingBio(true);
    };

    const handleUnsaveFromTab = async (postId) => {
        try {
            await axios.put(`http://localhost:5000/api/users/save/${postId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSavedPosts((prev) => prev.filter(p => p._id !== postId));
        } catch (err) {
            alert("Failed to unsave post");
        }
    };

    const isProfileOnline = profileUserId && onlineUserIds.has(profileUserId.toString());

    return (
        <div className="profile-page">
            {/* ===== Header — Instagram jaisa horizontal layout: avatar left, info right ===== */}
            <div className="profile-header">
                <div className="profile-avatar-wrapper">
                    <div
                        className="profile-avatar"
                        onClick={() => isMyProfile && fileInputRef.current?.click()}
                        title={isMyProfile ? "Click to change profile picture" : ""}
                    >
                        {profilePic ? (
                            <img src={profilePic} alt={urlUsername} />
                        ) : (
                            <span>{urlUsername?.[0]?.toUpperCase()}</span>
                        )}

                        {isMyProfile && (
                            <div className="profile-avatar-overlay">
                                <Camera size={20} color="#fff" />
                            </div>
                        )}
                    </div>

                    {!isMyProfile && isProfileOnline && <span className="profile-online-dot" />}

                    {isMyProfile && (
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handlePicChange}
                            style={{ display: 'none' }}
                        />
                    )}
                </div>

                <div className="profile-info">
                    <div className="profile-info-top">
                        <h1 className="profile-username">{urlUsername}</h1>
                    </div>

                    {/* NAYA: Follow/Message buttons apni alag row mein — Instagram jaisa */}
                    {!isMyProfile && (
                        <div className="profile-actions">
                            {status === 'none' && (
                                <button className="btn btn-primary btn-profile-action" onClick={handleFollow}>Follow</button>
                            )}
                            {status === 'pending' && (
                                <button className="btn btn-outline btn-profile-action" onClick={handleCancelRequest}>Requested</button>
                            )}
                            {status === 'accepted' && (
                                <>
                                    <button className="btn btn-outline btn-profile-action" onClick={handleUnfollow}>Following</button>
                                    <button
                                        className="btn btn-outline btn-profile-action"
                                        onClick={() => navigate(`/messages/${urlUsername}`)}
                                    >
                                        Message
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {!isMyProfile && isProfileOnline && (
                        <p className="profile-online-text">● Online</p>
                    )}

                    <div className="profile-stats">
                        <span>
                            <strong>{myPosts.length}</strong> posts
                        </span>
                        <span onClick={openFollowers} className="profile-stat-clickable">
                            <strong>{counts.followersCount}</strong> followers
                        </span>
                        <span onClick={openFollowing} className="profile-stat-clickable">
                            <strong>{counts.followingCount}</strong> following
                        </span>
                    </div>

                    <div className="profile-bio">
                        {isEditingBio ? (
                            <div className="profile-bio-edit">
                                <textarea
                                    value={bioInput}
                                    onChange={(e) => setBioInput(e.target.value)}
                                    maxLength={150}
                                    placeholder="Write something about yourself..."
                                    rows={2}
                                />
                                <div className="profile-bio-char-count">{bioInput.length}/150</div>
                                <div className="profile-bio-edit-actions">
                                    <button className="btn btn-primary btn-sm" onClick={handleSaveBio}>Save</button>
                                    <button className="btn btn-outline btn-sm" onClick={() => setIsEditingBio(false)}>Cancel</button>
                                </div>
                            </div>
                        ) : (
                            <>
                                {bio ? (
                                    <p className="profile-bio-text">{bio}</p>
                                ) : isMyProfile ? (
                                    <p className="profile-bio-empty">No bio yet</p>
                                ) : null}

                                {isMyProfile && (
                                    <button className="profile-bio-edit-link" onClick={startEditingBio}>
                                        {bio ? "Edit bio" : "Add bio"}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Pending Follow Requests — sirf apni profile pe */}
            {isMyProfile && pendingRequests.length > 0 && (
                <div className="profile-requests-box">
                    <h3 className="profile-requests-title">🔔 Follow Requests ({pendingRequests.length})</h3>
                    {pendingRequests.map(req => (
                        <div key={req._id} className="profile-request-row">
                            <span>{req.requester?.username}</span>
                            <button className="btn btn-primary btn-sm" onClick={() => handleAccept(req._id, req.requester?.username)}>
                                Accept
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* ===== Tabs — icon-based, Instagram jaisa ===== */}
            {isMyProfile && (
                <div className="profile-tabs">
                    <button
                        className={`profile-tab ${activeTab === 'posts' ? 'profile-tab-active' : ''}`}
                        onClick={() => setActiveTab('posts')}
                    >
                        <Grid3x3 size={16} /> POSTS
                    </button>
                    <button
                        className={`profile-tab ${activeTab === 'saved' ? 'profile-tab-active' : ''}`}
                        onClick={() => setActiveTab('saved')}
                    >
                        <Bookmark size={16} /> SAVED
                    </button>
                </div>
            )}

            {/* ===== Posts grid — square thumbnails, 3 columns ===== */}
            {(activeTab === 'posts' || !isMyProfile) && (
                <div className="profile-grid">
                    {myPosts.length > 0 ? (
                        myPosts.map(post => (
                            <Link key={post._id} to={`/post/${post._id}`} className="profile-grid-item">
                                {post.media?.length > 0 ? (
                                    post.media[0].type === 'video' ? (
                                        <video src={post.media[0].url} muted />
                                    ) : (
                                        <img src={post.media[0].url} alt="" />
                                    )
                                ) : (
                                    <div className="profile-grid-text-post">{post.content}</div>
                                )}
                            </Link>
                        ))
                    ) : (
                        <p className="profile-empty-text">No posts yet!</p>
                    )}
                </div>
            )}

            {/* Saved grid — sirf apni profile pe */}
            {activeTab === 'saved' && isMyProfile && (
                <div className="profile-grid">
                    {loadingSaved ? (
                        <p className="profile-empty-text">Loading...</p>
                    ) : savedPosts.length > 0 ? (
                        savedPosts.map(post => (
                            <Link key={post._id} to={`/post/${post._id}`} className="profile-grid-item">
                                {post.media?.length > 0 ? (
                                    post.media[0].type === 'video' ? (
                                        <video src={post.media[0].url} muted />
                                    ) : (
                                        <img src={post.media[0].url} alt="" />
                                    )
                                ) : (
                                    <div className="profile-grid-text-post">{post.content}</div>
                                )}
                                <button
                                    className="profile-grid-unsave"
                                    onClick={(e) => { e.preventDefault(); handleUnsaveFromTab(post._id); }}
                                    title="Remove from saved"
                                >
                                    <Bookmark size={16} fill="currentColor" />
                                </button>
                            </Link>
                        ))
                    ) : (
                        <p className="profile-empty-text">No saved posts yet!</p>
                    )}
                </div>
            )}

            {modalData && (
                <FollowListModal title={modalData.title} users={modalData.users} onClose={() => setModalData(null)} />
            )}
        </div>
    );
};

export default ProfilePage;