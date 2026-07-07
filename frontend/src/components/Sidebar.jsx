import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, useLocation } from 'react-router-dom';
import io from 'socket.io-client';
import { Home, Search, MessageCircle, Heart, PlusSquare, User, LogOut } from 'lucide-react';
import '../styles/Sidebar.css';

// Sidebar has its own socket connection — so this component can listen to real-time events
// from anywhere (independent of the page) and update the badge accordingly.
const socket = io.connect("http://localhost:5000");

const Sidebar = ({ onCreateClick }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const myUsername = localStorage.getItem("username");
    const myId = localStorage.getItem("userId");
    const token = localStorage.getItem("token")?.replace(/^"|"$/g, '');

    const [unreadMessages, setUnreadMessages] = useState(0);
    const [unreadNotifications, setUnreadNotifications] = useState(0);

    const isActive = (path) => location.pathname === path;

    const fetchUnreadMessages = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/messages/unread-count", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadMessages(res.data.count);
        } catch (err) {
            console.error("Error fetching unread messages:", err);
        }
    };

    const fetchUnreadNotifications = async () => {
        try {
            const res = await axios.get("http://localhost:5000/api/notifications/unread-count", {
                headers: { Authorization: `Bearer ${token}` }
            });
            setUnreadNotifications(res.data.count);
        } catch (err) {
            console.error("Error fetching unread notifications:", err);
        }
    };

    useEffect(() => {
        if (!token) return;
        fetchUnreadMessages();
        fetchUnreadNotifications();

        if (myId) socket.emit('register-user', myId);

        const handleReceiveMessage = () => {
            if (!location.pathname.startsWith('/messages/')) {
                setUnreadMessages((prev) => prev + 1);
            }
        };

        const handleNewNotification = () => {
            if (location.pathname !== '/notifications') {
                setUnreadNotifications((prev) => prev + 1);
            }
        };

        const handleReconnect = () => {
            if (myId) socket.emit('register-user', myId);
            fetchUnreadMessages();
            fetchUnreadNotifications();
        };

        socket.on('receive-message', handleReceiveMessage);
        socket.on('new-notification', handleNewNotification);
        socket.on('connect', handleReconnect);

        return () => {
            socket.off('receive-message', handleReceiveMessage);
            socket.off('new-notification', handleNewNotification);
            socket.off('connect', handleReconnect);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token, myId]);

    useEffect(() => {
        if (location.pathname.startsWith('/messages')) {
            setUnreadMessages(0);
        }
        if (location.pathname === '/notifications') {
            setUnreadNotifications(0);
        }
    }, [location.pathname]);

    const navItems = [
        { icon: Home, label: 'Home', path: '/', badge: 0 },
        { icon: Search, label: 'Search', path: '/search', badge: 0 },
        { icon: MessageCircle, label: 'Messages', path: '/messages', badge: unreadMessages },
        { icon: Heart, label: 'Notifications', path: '/notifications', badge: unreadNotifications },
    ];

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("userId");
        navigate("/login");
    };

    return (
        <aside className="sidebar">
            <div className="sidebar-logo" onClick={() => navigate('/')}>
                <span className="sidebar-logo-icon">S</span>
                <span className="sidebar-logo-text">SocialSphere</span>
            </div>

            <nav className="sidebar-nav">
                {navItems.map((item) => (
                    <button
                        key={item.path}
                        className={`sidebar-item ${isActive(item.path) ? 'sidebar-item-active' : ''}`}
                        onClick={() => navigate(item.path)}
                    >
                        <span className="sidebar-icon-wrapper">
                            <item.icon size={24} strokeWidth={isActive(item.path) ? 2.5 : 2} className="sidebar-icon" />
                            {item.badge > 0 && (
                                <span className="sidebar-badge">{item.badge > 9 ? '9+' : item.badge}</span>
                            )}
                        </span>
                        <span className="sidebar-label">{item.label}</span>
                    </button>
                ))}

                <button className="sidebar-item" onClick={onCreateClick}>
                    <PlusSquare size={24} className="sidebar-icon" />
                    <span className="sidebar-label">Create</span>
                </button>

                <button
                    className={`sidebar-item ${isActive(`/profile/${myUsername}`) ? 'sidebar-item-active' : ''}`}
                    onClick={() => navigate(`/profile/${myUsername}`)}
                >
                    <User size={24} className="sidebar-icon" />
                    <span className="sidebar-label">Profile</span>
                </button>
            </nav>

            <div className="sidebar-bottom">
                <button className="sidebar-item sidebar-item-logout" onClick={handleLogout}>
                    <LogOut size={24} className="sidebar-icon" />
                    <span className="sidebar-label">Logout</span>
                </button>
            </div>
        </aside>
    );
};

export default Sidebar;