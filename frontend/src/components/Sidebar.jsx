import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Home, Search, MessageCircle, Heart, PlusSquare, User, LogOut } from 'lucide-react';
import '../styles/Sidebar.css';

// Reels icon waala item yahan jaan-bujh kar shamil nahi kiya — request mein skip karne
// ko kaha gaya tha. Agar baad mein chahiye to <Clapperboard /> import karke yahan add karna.
const Sidebar = ({ onCreateClick }) => {
    const navigate = useNavigate();
    const location = useLocation();
    const myUsername = localStorage.getItem("username");

    const isActive = (path) => location.pathname === path;

    const navItems = [
        { icon: Home, label: 'Home', path: '/' },
        { icon: Search, label: 'Search', path: '/search' },
        { icon: MessageCircle, label: 'Messages', path: '/messages' },
        { icon: Heart, label: 'Notifications', path: '/notifications' },
    ];

    // NAYA: Logout — sidebar ke sabse neeche, alag item ke roop mein
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
                        <item.icon size={24} strokeWidth={isActive(item.path) ? 2.5 : 2} className="sidebar-icon" />
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

            {/* NAYA: Logout — sidebar ke neeche, baaki nav se chhoti gap ke sath alag dikhne ke liye */}
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