import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const SearchBar = () => {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const wrapperRef = useRef(null);
    const navigate = useNavigate();

    const token = localStorage.getItem("token")?.replace(/^"|"$/g, '');

    // Debounce: user ke type karna band hone ke 300ms baad hi search chale
    // (har keystroke pe API call mat maro — server ko spam mat karo)
    useEffect(() => {
        if (!query.trim()) {
            setResults([]);
            setIsOpen(false);
            return;
        }

        setLoading(true);
        const timer = setTimeout(async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/users/search?q=${query.trim()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setResults(res.data);
                setIsOpen(true);
            } catch (err) {
                console.error("Search error:", err);
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, token]);

    // Bahar click karne pe dropdown band ho jaye
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const goToProfile = (username) => {
        setQuery("");
        setResults([]);
        setIsOpen(false);
        navigate(`/profile/${username}`);
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative', width: '280px' }}>
            <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onFocus={() => query.trim() && setIsOpen(true)}
                placeholder="Search users..."
                style={{
                    width: '100%',
                    padding: '8px 14px',
                    borderRadius: '20px',
                    border: '1px solid #ddd',
                    outline: 'none',
                    fontSize: '14px'
                }}
            />

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '110%',
                    left: 0,
                    right: 0,
                    background: '#fff',
                    border: '1px solid #eee',
                    borderRadius: '10px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    maxHeight: '300px',
                    overflowY: 'auto',
                    zIndex: 100
                }}>
                    {loading ? (
                        <p style={{ padding: '12px', color: '#888', margin: 0 }}>Searching...</p>
                    ) : results.length === 0 ? (
                        <p style={{ padding: '12px', color: '#888', margin: 0 }}>No users found</p>
                    ) : (
                        results.map((u) => (
                            <div
                                key={u._id}
                                onClick={() => goToProfile(u.username)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    padding: '10px 14px',
                                    cursor: 'pointer',
                                    borderBottom: '1px solid #f5f5f5'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.background = '#fafafa'}
                                onMouseLeave={(e) => e.currentTarget.style.background = '#fff'}
                            >
                                <div style={{
                                    width: '32px', height: '32px', borderRadius: '50%',
                                    background: '#0095f6', color: '#fff',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    fontWeight: 'bold', fontSize: '14px', flexShrink: 0,
                                    overflow: 'hidden'
                                }}>
                                    {u.profilePic ? (
                                        <img src={u.profilePic} alt={u.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                    ) : (
                                        u.username[0]?.toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <div style={{ fontSize: '14px', fontWeight: '500' }}>{u.username}</div>
                                    {u.bio && <div style={{ fontSize: '12px', color: '#888' }}>{u.bio}</div>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}
        </div>
    );
};

export default SearchBar;