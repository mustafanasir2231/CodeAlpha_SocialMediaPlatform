import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';

const NotificationBell = ({ socket }) => {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef(null);
    const navigate = useNavigate();

    const token = localStorage.getItem("token")?.replace(/^"|"$/g, '');

    const fetchUnreadCount = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/notifications/unread-count", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadCount(res.data.count);
        } catch (err) {
            console.error("Error fetching unread count:", err);
        }
    };

    const fetchNotifications = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/notifications", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setNotifications(res.data);
        } catch (err) {
            console.error("Error fetching notifications:", err);
        }
    };

    // Initially load only the count (for the badge)
    useEffect(() => {
        if (token) fetchUnreadCount();
    }, [token]);

    // Real-time: on new notification, update badge and list immediately
    useEffect(() => {
        if (!socket) return;

        const handleNewNotification = (notif) => {
            setUnreadCount((prev) => prev + 1);
            setNotifications((prev) => [
                {
                    _id: notif._id,
                    type: notif.type,
                    sender: { username: notif.senderUsername },
                    post: notif.post,
                    story: notif.story, // NEW
                    isRead: false,
                    createdAt: notif.createdAt
                },
                ...prev
            ]);
        };

       
        const handleReconnect = () => {
            const userId = localStorage.getItem("userId");
            if (userId) socket.emit('register-user', userId);
            fetchUnreadCount(); // also sync the latest count on reconnect
        };

        socket.on('new-notification', handleNewNotification);
        socket.on('connect', handleReconnect);

        return () => {
            socket.off('new-notification', handleNewNotification);
            socket.off('connect', handleReconnect);
        };
    }, [socket]);

    // On bell click — toggle dropdown; when opened, load list and mark as read
    const handleBellClick = async () => {
        const opening = !isOpen;
        setIsOpen(opening);

        if (opening) {
            await fetchNotifications();
            if (unreadCount > 0) {
                setUnreadCount(0); // clear badge immediately
                try {
                    await axios.put("http://localhost:5000/api/notifications/mark-read", {}, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                } catch (err) {
                    console.error("Error marking read:", err);
                }
            }
        }
    };

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const getMessage = (notif) => {
        switch (notif.type) {
            case 'like': return 'liked your post';
            case 'comment': return 'commented on your post';
            case 'reply': return 'replied to your comment';
            case 'comment-like': return 'liked your comment';
            case 'follow_request': return 'sent you a follow request';
            case 'follow_accept': return 'accepted your follow request';
            // NEW: story-related notifications — these cases were missing before,
            // so getMessage returned an empty string and only the name was displayed
            case 'story_like': return 'liked your story';
            case 'story_comment': return 'commented on your story';
            case 'story_reply': return 'replied to your story';
            default: return '';
        }
    };

    const handleNotificationClick = (notif) => {
        setIsOpen(false);
        if (notif.type === 'follow_request' || notif.type === 'follow_accept') {
            navigate(`/profile/${notif.sender.username}`);
        } else if ((notif.type === 'like' || notif.type === 'comment' || notif.type === 'reply' || notif.type === 'comment-like') && notif.post) {
            const postId = typeof notif.post === 'object' ? notif.post._id : notif.post;
            navigate(`/post/${postId}`);
        }
        else if ((notif.type === 'story_like' || notif.type === 'story_comment' || notif.type === 'story_reply')) {
            navigate(`/profile/${notif.sender.username}`);
        }
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative' }}>
            <button
                onClick={handleBellClick}
                style={{
                    position: 'relative',
                    background: 'none',
                    border: 'none',
                    fontSize: '22px',
                    cursor: 'pointer',
                    padding: '4px 8px'
                }}
            >
                🔔
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute',
                        top: '-2px',
                        right: '0px',
                        background: '#ed4956',
                        color: '#fff',
                        borderRadius: '50%',
                        fontSize: '11px',
                        minWidth: '16px',
                        height: '16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '0 3px',
                        fontWeight: 'bold'
                    }}>
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '120%',
                    right: 0,
                    width: '320px',
                    background: '#fff',
                    border: '1px solid #eee',
                    borderRadius: '10px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                    maxHeight: '400px',
                    overflowY: 'auto',
                    zIndex: 100
                }}>
                    <div style={{ padding: '12px 14px', borderBottom: '1px solid #eee', fontWeight: 'bold' }}>
                        Notifications
                    </div>

                    {notifications.length === 0 ? (
                        <p style={{ padding: '20px', textAlign: 'center', color: '#888', margin: 0 }}>
                            No notifications yet
                        </p>
                    ) : (
                        notifications.map((notif) => (
                            <div
                                key={notif._id}
                                onClick={() => handleNotificationClick(notif)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #f5f5f5',
                                    background: notif.isRead ? '#fff' : '#f0f8ff'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
                                onMouseLeave={(e) => e.currentTarget.style.background = notif.isRead ? '#fff' : '#f0f8ff'}
                            >
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    background: '#0095f6', color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 'bold', fontSize: '14px', flexShrink: 0
                                }}>
                                    {notif.sender?.username?.[0]?.toUpperCase() || '?'}
                                </div>
                                <div style={{ flex: 1, fontSize: '13px' }}>
                                    <span style={{ fontWeight: '600' }}>{notif.sender?.username}</span>
                                    {' '}{getMessage(notif)}
                                    <div style={{ fontSize: '11px', color: '#888', marginTop: '2px' }}>
                                        {notif.createdAt ? formatDistanceToNow(new Date(notif.createdAt), { addSuffix: true }) : ''}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default NotificationBell;