import React from 'react';

// Har user ka circle avatar — agar unseen story hai to colorful ring, dekh li hai to grey ring
const StoryAvatarsStrip = ({ storyGroups, myUsername, onAddClick, onAvatarClick, hasMyStory }) => {
    return (
        <div style={{
            display: 'flex', gap: '16px', overflowX: 'auto',
            padding: '15px 20px', alignItems: 'flex-start'
        }}>
            {/* NAYA: "Add Story" — apna avatar, + icon ke sath. Agar meri story already hai,
                isay click karne se "view my story" + neeche se naya add karne ka option milega */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '64px' }}>
                <div
                    onClick={() => hasMyStory ? onAvatarClick(myUsername) : onAddClick()}
                    style={{
                        width: '60px', height: '60px', borderRadius: '50%', position: 'relative',
                        background: hasMyStory
                            ? 'linear-gradient(45deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5)'
                            : '#f0f0f0',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', padding: '2px'
                    }}
                >
                    <div style={{
                        width: '100%', height: '100%', borderRadius: '50%',
                        background: '#0095f6', color: '#fff', display: 'flex',
                        alignItems: 'center', justifyContent: 'center',
                        fontWeight: 'bold', fontSize: '22px', border: '2px solid #fff'
                    }}>
                        {myUsername?.[0]?.toUpperCase()}
                    </div>

                    {/* + icon — sirf jab meri abhi koi active story na ho ya hamesha add ka shortcut */}
                    <div
                        onClick={(e) => { e.stopPropagation(); onAddClick(); }}
                        style={{
                            position: 'absolute', bottom: '-2px', right: '-2px',
                            width: '20px', height: '20px', borderRadius: '50%',
                            background: '#0095f6', color: '#fff', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', fontWeight: 'bold', border: '2px solid #fff',
                            cursor: 'pointer'
                        }}
                    >+</div>
                </div>
                <span style={{ fontSize: '12px', marginTop: '4px', color: '#555' }}>Your Story</span>
            </div>

            {/* Doosre users ki stories */}
            {storyGroups.map(group => (
                <div
                    key={group.username}
                    onClick={() => onAvatarClick(group.username)}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0, width: '64px', cursor: 'pointer' }}
                >
                    <div style={{
                        width: '60px', height: '60px', borderRadius: '50%',
                        background: group.allSeen
                            ? '#ccc' // saari dekh li hain — grey ring
                            : 'linear-gradient(45deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5)', // colorful ring
                        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2px'
                    }}>
                        <div style={{
                            width: '100%', height: '100%', borderRadius: '50%',
                            background: group.profilePic ? 'transparent' : '#0095f6',
                            color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 'bold', fontSize: '22px', border: '2px solid #fff', overflow: 'hidden'
                        }}>
                            {group.profilePic ? (
                                <img src={group.profilePic} alt={group.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                group.username?.[0]?.toUpperCase()
                            )}
                        </div>
                    </div>
                    <span style={{ fontSize: '12px', marginTop: '4px', color: '#555', maxWidth: '64px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {group.username}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default StoryAvatarsStrip;