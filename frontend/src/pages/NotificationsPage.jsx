import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import '../styles/NotificationsPage.css';

// Poori notifications list — Instagram "Notifications" tab jaisi.
// NotificationBell.jsx ke dropdown ki jagah ab yeh full page use hoga.
// Backend route already maujood hai: GET /api/notifications, PUT /api/notifications/mark-read
const NotificationsPage = () => {
    const navigate = useNavigate();
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token")?.replace(/^"|"$/g, '');

    const getMessage = (notif) => {
        switch (notif.type) {
            case 'like': return 'liked your post';
            case 'comment': return 'commented on your post';
            case 'reply': return 'replied to your comment';
            case 'comment-like': return 'liked your comment';
            case 'follow_request': return 'sent you a follow request';
            case 'follow_accept': return 'accepted your follow request';
            case 'story_like': return 'liked your story';
            case 'story_comment': return 'commented on your story';
            case 'story_reply': return 'replied to your story';
            default: return '';
        }
    };

    useEffect(() => {
        const fetchAndMarkRead = async () => {
            try {
                const res = await axios.get("http://localhost:5000/api/notifications", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setNotifications(res.data);

                // Page khulte hi sab read mark kar do (jaisa dropdown mein hota tha)
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
    }, [token]);

    const handleClick = (notif) => {
        if (notif.type === 'follow_request' || notif.type === 'follow_accept') {
            navigate(`/profile/${notif.sender?.username}`);
        } else if ((notif.type === 'like' || notif.type === 'comment' || notif.type === 'reply' || notif.type === 'comment-like') && notif.post) {
            const postId = typeof notif.post === 'object' ? notif.post._id : notif.post;
            navigate(`/post/${postId}`);
        } else if (notif.type === 'story_like' || notif.type === 'story_comment' || notif.type === 'story_reply') {
            navigate(`/profile/${notif.sender?.username}`);
        }
    };

    return (
        <div className="notifications-page">
            <h1 className="notifications-title">Notifications</h1>

            {loading ? (
                <p className="notifications-empty">Loading...</p>
            ) : notifications.length === 0 ? (
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
                                {notif.sender?.username?.[0]?.toUpperCase() || '?'}
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