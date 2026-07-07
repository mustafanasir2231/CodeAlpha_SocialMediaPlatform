import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import '../styles/NotificationsPage.css';


const NotificationsPage = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [pendingRequests, setPendingRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token")?.replace(/^"|"$/g, '');

    const getMessage = (notif) => {
        switch (notif.type) {
            case 'like': return 'liked your post';
            case 'comment': return 'commented on your post';
            case 'reply': return 'replied to your comment';
            case 'comment-like': return 'liked your comment';
            case 'follow_accept': return 'accepted your follow request';
            case 'story_like': return 'liked your story';
            case 'story_comment': return 'commented on your story';
            case 'story_reply': return 'replied to your story';
            default: return '';
        }
    };

    const fetchPendingRequests = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/follow/pending", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingRequests(res.data);
        } catch (err) {
            console.error("Error fetching pending requests:", err);
        }
    };

    useEffect(() => {
        const fetchAndMarkRead = async () => {
            try {
                const res = await axios.get("http://localhost:5000/api/notifications", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                // NEW: filter out follow_request type notifications here —
                // they have their own separate UI (Confirm/Delete) below, so avoid duplicates
                setNotifications(res.data.filter(n => n.type !== 'follow_request'));

                await axios.put("http://localhost:5000/api/notifications/mark-read", {}, {
                    headers: { Authorization: `Bearer ${token}` }
                });
            } catch (err) {
                console.error("Error fetching notifications:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchAndMarkRead();
        fetchPendingRequests();
    }, [token]);

    const handleClick = (notif) => {
        if (notif.type === 'follow_accept') {
            navigate(`/profile/${notif.sender?.username}`);
        } else if ((notif.type === 'like' || notif.type === 'comment' || notif.type === 'reply' || notif.type === 'comment-like') && notif.post) {
            const postId = typeof notif.post === 'object' ? notif.post._id : notif.post;
            navigate(`/post/${postId}`);
        } else if (notif.type === 'story_like' || notif.type === 'story_comment' || notif.type === 'story_reply') {
            navigate(`/profile/${notif.sender?.username}`);
        }
    };

    // NEW: Confirm follow request
    const handleConfirm = async (requestId, requesterUsername) => {
        try {
            await axios.put(`http://localhost:5000/api/follow/accept/${requestId}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingRequests((prev) => prev.filter(r => r._id !== requestId));
        } catch (err) {
            alert(err.response?.data?.error || "Failed to confirm request");
        }
    };

    // NEW: Delete follow request
    const handleDeleteRequest = async (requestId) => {
        try {
            await axios.delete(`http://localhost:5000/api/follow/decline/${requestId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setPendingRequests((prev) => prev.filter(r => r._id !== requestId));
        } catch (err) {
            alert(err.response?.data?.error || "Failed to delete request");
        }
    };

    return (
        <div className="notifications-page">
            <h1 className="notifications-title">Notifications</h1>

            {/* NEW: Follow Requests section — at the top, with Confirm/Delete buttons */}
            {pendingRequests.length > 0 && (
                <div className="follow-requests-section">
                    <h3 className="follow-requests-heading">Follow Requests</h3>
                    {pendingRequests.map((req) => (
                        <div key={req._id} className="follow-request-row">
                            <div
                                className="follow-request-user"
                                onClick={() => navigate(`/profile/${req.requester?.username}`)}
                            >
                                <div className="follow-request-avatar">
                                    {req.requester?.profilePic ? (
                                        <img src={req.requester.profilePic} alt={req.requester.username} />
                                    ) : (
                                        req.requester?.username?.[0]?.toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <span className="follow-request-username">{req.requester?.username}</span>
                                    <span className="follow-request-text"> requested to follow you</span>
                                </div>
                            </div>
                            <div className="follow-request-actions">
                                <button
                                    className="btn btn-primary btn-sm"
                                    onClick={() => handleConfirm(req._id, req.requester?.username)}
                                >
                                    Confirm
                                </button>
                                <button
                                    className="btn btn-outline btn-sm"
                                    onClick={() => handleDeleteRequest(req._id)}
                                >
                                    Delete
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {loading ? (
                <p className="notifications-empty">Loading...</p>
            ) : notifications.length === 0 && pendingRequests.length === 0 ? (
                <p className="notifications-empty">No notifications yet</p>
            ) : (
                <div className="notifications-list">
                    {notifications.map((notif) => (
                        <div
                            key={notif._id}
                            className={`notification-row ${!notif.isRead ? 'notification-unread' : ''}`}
                            onClick={() => handleClick(notif)}
                        >
                            <div className="notification-avatar">
                                {notif.sender?.profilePic ? (
                                    <img src={notif.sender.profilePic} alt={notif.sender.username} />
                                ) : (
                                    notif.sender?.username?.[0]?.toUpperCase() || '?'
                                )}
                            </div>
                            <div className="notification-text">
                                <span className="notification-username">{notif.sender?.username}</span>
                                {' '}{getMessage(notif)}
                                <div className="notification-time">
                                    {notif.createdAt ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true }) : ''}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default NotificationsPage;