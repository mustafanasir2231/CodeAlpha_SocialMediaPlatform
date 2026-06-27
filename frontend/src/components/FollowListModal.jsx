import React from 'react';
import { useNavigate } from 'react-router-dom';

const FollowListModal = ({ title, users, onClose }) => {
    const navigate = useNavigate();
    const goToProfile = (username) => { onClose(); navigate(`/profile/${username}`); };

    return (
        <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
            <div onClick={(e) => e.stopPropagation()} style={{ background: '#fff', borderRadius: '10px', width: '90%', maxWidth: '380px', maxHeight: '500px', overflow: 'hidden' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', borderBottom: '1px solid #eee' }}>
                    <h3 style={{ margin: 0 }}>{title}</h3>
                    <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                </div>
                <div style={{ maxHeight: '420px', overflowY: 'auto' }}>
                    {users.length === 0 ? (
                        <p style={{ textAlign: 'center', color: '#888', padding: '20px' }}>No users yet</p>
                    ) : (
                        users.map((u) => (
                            <div key={u._id} onClick={() => goToProfile(u.username)} style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 15px', cursor: 'pointer', borderBottom: '1px solid #f5f5f5' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: '#0095f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                                    {u.username[0]?.toUpperCase()}
                                </div>
                                <span>{u.username}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

export default FollowListModal;