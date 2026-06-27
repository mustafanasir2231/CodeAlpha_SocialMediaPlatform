import React, { useState, useEffect, useRef, useCallback } from 'react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

const STORY_DURATION = 5000; // 5 seconds per story, image/text ke liye

// Fullscreen story viewer — group ke andar stories ke through navigate karta hai.
const StoryViewer = ({ allGroups, startGroupIndex, onClose, myUsername, onStoryDeleted }) => {
    const [groupIndex, setGroupIndex] = useState(startGroupIndex);
    const [storyIndex, setStoryIndex] = useState(0);

    // NAYA: Saari stories ko local mutable state mein rakhte hain, taake like/comment-count
    // update hone par React ko pata chale aur re-render ho (pehle hum currentStory object ko
    // directly mutate kar rahe the jo React ko dikhta hi nahi tha — isi wajah se UI update
    // nahi hota tha jab tak refresh na karo)
    const [groups, setGroups] = useState(allGroups);

    const [progress, setProgress] = useState(0);
    const [paused, setPaused] = useState(false);
    const [showComments, setShowComments] = useState(false);
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [replyText, setReplyText] = useState('');
    const [seenByList, setSeenByList] = useState([]);
    const [showSeenBy, setShowSeenBy] = useState(false);
    const [editing, setEditing] = useState(false);
    const [editText, setEditText] = useState('');

    const intervalRef = useRef(null);
    const videoRef = useRef(null);

    const token = localStorage.getItem("token")?.replace(/^"|"$/g, '');

    const currentGroup = groups[groupIndex];
    const currentStory = currentGroup?.stories?.[storyIndex];
    const isMine = currentStory?.username === myUsername;

    // NAYA: ek chhota helper — current story ko naye data ke sath immutably update karta hai,
    // taake React state badle aur UI foran re-render ho
    const updateCurrentStory = (patch) => {
        setGroups((prevGroups) => {
            const newGroups = [...prevGroups];
            const group = { ...newGroups[groupIndex] };
            const stories = [...group.stories];
            stories[storyIndex] = { ...stories[storyIndex], ...patch };
            group.stories = stories;
            newGroups[groupIndex] = group;
            return newGroups;
        });
    };

    // Story view karte hi backend ko bata do (seen mark + privacy check yahi se hota hai).
    // FIX: agar yeh APNI story hai, to seen mark karne ki zaroorat nahi (backend bhi owner ko
    // seen list mein nahi jodta), lekin humein FRESH seenBy/likes/commentCount chahiye —
    // HomePage se pass hua data tab fetch hua tha jab viewer khula nahi tha, isliye doosron
    // ki dekhi hui counts purani (stale) reh jaati thi jab tak HomePage poora refresh na ho.
    const refreshCurrentStory = useCallback(async (storyId) => {
        try {
            const res = await axios.get(`http://localhost:5000/api/stories/${storyId}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            updateCurrentStory({
                likes: res.data.likes,
                seenBy: res.data.seenBy,
                commentCount: res.data.commentCount
            });
        } catch (err) {
            console.error("Error refreshing story:", err);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [token]);

    useEffect(() => {
        if (currentStory) refreshCurrentStory(currentStory._id);
        setShowComments(false);
        setShowSeenBy(false);
        setEditing(false);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [groupIndex, storyIndex]);

    // Progress bar + auto-advance timer
    useEffect(() => {
        if (!currentStory || paused || showComments || showSeenBy || editing) {
            clearInterval(intervalRef.current);
            return;
        }

        setProgress(0);
        const duration = currentStory.type === 'video' ? null : STORY_DURATION;
        if (!duration) return; // video ke liye onEnded se advance hoga

        const stepMs = 50;
        let elapsed = 0;
        intervalRef.current = setInterval(() => {
            elapsed += stepMs;
            setProgress(Math.min((elapsed / duration) * 100, 100));
            if (elapsed >= duration) {
                goToNext();
            }
        }, stepMs);

        return () => clearInterval(intervalRef.current);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [currentStory, paused, showComments, showSeenBy, editing]);

    const goToNext = () => {
        if (!currentGroup) return;
        if (storyIndex < currentGroup.stories.length - 1) {
            setStoryIndex(storyIndex + 1);
        } else if (groupIndex < groups.length - 1) {
            setGroupIndex(groupIndex + 1);
            setStoryIndex(0);
        } else {
            onClose();
        }
    };

    const goToPrev = () => {
        if (storyIndex > 0) {
            setStoryIndex(storyIndex - 1);
        } else if (groupIndex > 0) {
            const prevGroup = groups[groupIndex - 1];
            setGroupIndex(groupIndex - 1);
            setStoryIndex(prevGroup.stories.length - 1);
        }
    };

    // FIX: Like toggle — ab proper immutable state update karte hain, isliye heart icon
    // aur like list foran (refresh ke bina) update hoti hai
    const handleLike = async () => {
        try {
            const res = await axios.put(`http://localhost:5000/api/stories/like/${currentStory._id}`, {}, {
                headers: { Authorization: `Bearer ${token}` }
            });
            updateCurrentStory({ likes: res.data.likes });
        } catch (err) {
            console.error(err);
        }
    };

    const isLiked = currentStory?.likes?.includes(myUsername);

    // Comments fetch karna
    const fetchComments = async () => {
        try {
            const res = await axios.get(`http://localhost:5000/api/stories/${currentStory._id}/comments`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setComments(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    const openComments = () => {
        setShowComments(true);
        setPaused(true);
        fetchComments();
    };

    const closeComments = () => {
        setShowComments(false);
        setPaused(false);
    };

    // FIX: Comment post karne ke baad commentCount ko bhi state mein update karte hain,
    // taake 💬 icon ke pass count foran badh jaye (pehle yeh kahin track hi nahi hota tha)
    const handlePostComment = async () => {
        if (!commentText.trim()) return;
        try {
            const res = await axios.post(`http://localhost:5000/api/stories/${currentStory._id}/comment`,
                { text: commentText },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setCommentText('');
            updateCurrentStory({ commentCount: res.data.commentCount });
            fetchComments();
        } catch (err) {
            alert(err.response?.data?.error || "Failed to comment");
        }
    };

    // DM reply bhejna
    const handleSendReply = async () => {
        if (!replyText.trim()) return;
        try {
            await axios.post(`http://localhost:5000/api/messages/${currentStory.username}`,
                { text: replyText, storyId: currentStory._id },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            setReplyText('');
            alert("Reply sent!");
            setPaused(false);
        } catch (err) {
            alert(err.response?.data?.error || "Failed to send reply");
        }
    };

    // Seen-by list (sirf apni story pe) — ab seenAt time ke sath aata hai
    const openSeenBy = async () => {
        setShowSeenBy(true);
        setPaused(true);
        try {
            const res = await axios.get(`http://localhost:5000/api/stories/${currentStory._id}/seen-by`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setSeenByList(res.data);
        } catch (err) {
            console.error(err);
        }
    };

    // Delete
    const handleDelete = async () => {
        if (!window.confirm("Delete this story?")) return;
        try {
            await axios.delete(`http://localhost:5000/api/stories/${currentStory._id}`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            onStoryDeleted(currentStory._id);

            if (currentGroup.stories.length <= 1) {
                onClose();
            } else {
                setGroups((prevGroups) => {
                    const newGroups = [...prevGroups];
                    const group = { ...newGroups[groupIndex] };
                    group.stories = group.stories.filter(s => s._id !== currentStory._id);
                    newGroups[groupIndex] = group;
                    return newGroups;
                });
                setStoryIndex((prev) => Math.max(0, Math.min(prev, currentGroup.stories.length - 2)));
            }
        } catch (err) {
            alert(err.response?.data?.error || "Failed to delete story");
        }
    };

    // Edit (sirf text stories)
    const startEdit = () => {
        setEditText(currentStory.text);
        setEditing(true);
        setPaused(true);
    };

    const handleSaveEdit = async () => {
        if (!editText.trim()) return alert("Text can't be empty");
        try {
            const res = await axios.put(`http://localhost:5000/api/stories/edit/${currentStory._id}`,
                { text: editText.trim() },
                { headers: { Authorization: `Bearer ${token}` } }
            );
            updateCurrentStory({ text: res.data.text });
            setEditing(false);
            setPaused(false);
        } catch (err) {
            alert(err.response?.data?.error || "Failed to edit story");
        }
    };

    if (!currentStory) return null;

    return (
        <div style={{
            position: 'fixed', inset: 0, background: '#000', zIndex: 2000,
            display: 'flex', alignItems: 'center', justifyContent: 'center'
        }}>
            <div style={{ width: '100%', maxWidth: '420px', height: '100%', maxHeight: '100vh', position: 'relative', background: '#000' }}>

                {/* Progress bars */}
                <div style={{ position: 'absolute', top: '8px', left: '8px', right: '8px', display: 'flex', gap: '4px', zIndex: 10 }}>
                    {currentGroup.stories.map((s, i) => (
                        <div key={s._id || i} style={{ flex: 1, height: '3px', background: 'rgba(255,255,255,0.4)', borderRadius: '2px', overflow: 'hidden' }}>
                            <div style={{
                                height: '100%', background: '#fff',
                                width: i < storyIndex ? '100%' : i === storyIndex ? `${progress}%` : '0%',
                                transition: i === storyIndex ? 'none' : 'width 0.2s'
                            }} />
                        </div>
                    ))}
                </div>

                {/* Header */}
                <div style={{ position: 'absolute', top: '20px', left: '12px', right: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: '#0095f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '14px' }}>
                            {currentStory.username?.[0]?.toUpperCase()}
                        </div>
                        <span style={{ color: '#fff', fontWeight: 'bold', fontSize: '14px' }}>{currentStory.username}</span>
                        <span style={{ color: '#ddd', fontSize: '12px' }}>
                            {formatDistanceToNow(new Date(currentStory.createdAt), { addSuffix: true })}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {isMine && currentStory.type === 'text' && (
                            <button onClick={startEdit} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer' }}>✏️</button>
                        )}
                        {isMine && (
                            <button onClick={handleDelete} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '16px', cursor: 'pointer' }}>🗑️</button>
                        )}
                        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer' }}>✕</button>
                    </div>
                </div>

                {/* Tap zones */}
                <div onClick={goToPrev} style={{ position: 'absolute', left: 0, top: 0, width: '30%', height: '100%', zIndex: 5, cursor: 'pointer' }} />
                <div onClick={goToNext} style={{ position: 'absolute', right: 0, top: 0, width: '30%', height: '100%', zIndex: 5, cursor: 'pointer' }} />

                {/* Hold-to-pause zone */}
                <div
                    onMouseDown={() => setPaused(true)}
                    onMouseUp={() => setPaused(false)}
                    onTouchStart={() => setPaused(true)}
                    onTouchEnd={() => setPaused(false)}
                    style={{ position: 'absolute', left: '30%', right: '30%', top: 0, height: '100%', zIndex: 5 }}
                />

                {/* Story Content */}
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    {currentStory.type === 'text' ? (
                        <div style={{
                            width: '100%', height: '100%', background: currentStory.backgroundColor,
                            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px'
                        }}>
                            <p style={{ color: '#fff', fontSize: '28px', fontWeight: 'bold', textAlign: 'center', wordBreak: 'break-word' }}>
                                {currentStory.text}
                            </p>
                        </div>
                    ) : currentStory.type === 'video' ? (
                        <video
                            ref={videoRef}
                            src={currentStory.mediaUrl}
                            autoPlay
                            muted={false}
                            onEnded={goToNext}
                            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        />
                    ) : (
                        <img src={currentStory.mediaUrl} alt="story" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
                    )}

                    {currentStory.type !== 'text' && currentStory.text && (
                        <div style={{ position: 'absolute', bottom: '90px', left: '12px', right: '12px', color: '#fff', fontSize: '14px', background: 'rgba(0,0,0,0.4)', padding: '8px 12px', borderRadius: '8px', zIndex: 6 }}>
                            {currentStory.text}
                        </div>
                    )}
                </div>

                {/* Bottom bar — like, comment, reply */}
                <div style={{ position: 'absolute', bottom: '15px', left: '12px', right: '12px', zIndex: 10, display: 'flex', alignItems: 'center', gap: '10px' }}>
                    {!isMine && (
                        <input
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            onFocus={() => setPaused(true)}
                            onBlur={() => !replyText && setPaused(false)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSendReply()}
                            placeholder={`Reply to ${currentStory.username}...`}
                            style={{ flex: 1, padding: '10px 14px', borderRadius: '20px', border: '1px solid #fff', background: 'transparent', color: '#fff', outline: 'none' }}
                        />
                    )}
                    {!isMine && replyText.trim() && (
                        <button onClick={handleSendReply} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}>➤</button>
                    )}

                    {/* FIX: ab likes.length bhi dikhate hain, aur state sahi se update hone ki wajah
                        se icon foran red/white badalta hai */}
                    <button onClick={handleLike} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {isLiked ? '❤️' : '🤍'}
                        {currentStory.likes?.length > 0 && (
                            <span style={{ color: '#fff', fontSize: '13px' }}>{currentStory.likes.length}</span>
                        )}
                    </button>

                    {/* FIX: comment count ab story.commentCount se dikhta hai */}
                    <button onClick={openComments} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '22px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        💬
                        {currentStory.commentCount > 0 && (
                            <span style={{ fontSize: '13px' }}>{currentStory.commentCount}</span>
                        )}
                    </button>

                    {isMine && (
                        <button onClick={openSeenBy} style={{ background: 'none', border: 'none', color: '#fff', fontSize: '13px', cursor: 'pointer' }}>
                            👁️ {currentStory.seenBy?.length || 0}
                        </button>
                    )}
                </div>

                {/* Comments panel */}
                {showComments && (
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff',
                        borderRadius: '16px 16px 0 0', maxHeight: '60%', display: 'flex', flexDirection: 'column', zIndex: 20
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', borderBottom: '1px solid #eee' }}>
                            <strong>Comments</strong>
                            <button onClick={closeComments} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 15px' }}>
                            {comments.length === 0 ? (
                                <p style={{ color: '#888', textAlign: 'center', fontSize: '13px' }}>No comments yet</p>
                            ) : (
                                comments.map(c => (
                                    <div key={c._id} style={{ marginBottom: '8px', fontSize: '13px' }}>
                                        <strong>{c.username}</strong> {c.text}
                                        {/* FIX: comment ka time bhi dikhana */}
                                        <div style={{ fontSize: '11px', color: '#999' }}>
                                            {c.createdAt ? formatDistanceToNow(new Date(c.createdAt), { addSuffix: true }) : ''}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                        <div style={{ display: 'flex', gap: '8px', padding: '10px 15px', borderTop: '1px solid #eee' }}>
                            <input
                                value={commentText}
                                onChange={(e) => setCommentText(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handlePostComment()}
                                placeholder="Add a comment..."
                                style={{ flex: 1, padding: '8px', borderRadius: '20px', border: '1px solid #ccc' }}
                            />
                            <button onClick={handlePostComment} style={{ padding: '8px 16px', borderRadius: '20px', background: '#0095f6', color: '#fff', border: 'none', cursor: 'pointer' }}>
                                Post
                            </button>
                        </div>
                    </div>
                )}

                {/* Seen-by panel — FIX: ab seenAt time bhi dikhata hai */}
                {showSeenBy && (
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff',
                        borderRadius: '16px 16px 0 0', maxHeight: '60%', display: 'flex', flexDirection: 'column', zIndex: 20
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 15px', borderBottom: '1px solid #eee' }}>
                            <strong>Viewed by ({seenByList.length})</strong>
                            <button onClick={() => { setShowSeenBy(false); setPaused(false); }} style={{ border: 'none', background: 'none', fontSize: '18px', cursor: 'pointer' }}>✕</button>
                        </div>
                        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 15px' }}>
                            {seenByList.length === 0 ? (
                                <p style={{ color: '#888', textAlign: 'center', fontSize: '13px' }}>No views yet</p>
                            ) : (
                                seenByList.map(u => (
                                    <div key={u._id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 0' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '14px' }}>
                                            <div style={{ width: '30px', height: '30px', borderRadius: '50%', background: '#0095f6', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', overflow: 'hidden' }}>
                                                {u.profilePic ? <img src={u.profilePic} alt={u.username} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : u.username?.[0]?.toUpperCase()}
                                            </div>
                                            {u.username}
                                        </div>
                                        {/* NAYA: kab dekhi */}
                                        <span style={{ fontSize: '11px', color: '#999' }}>
                                            {u.seenAt ? formatDistanceToNow(new Date(u.seenAt), { addSuffix: true }) : ''}
                                        </span>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}

                {/* Edit panel */}
                {editing && (
                    <div style={{
                        position: 'absolute', bottom: 0, left: 0, right: 0, background: '#fff',
                        borderRadius: '16px 16px 0 0', padding: '15px', zIndex: 20
                    }}>
                        <strong style={{ display: 'block', marginBottom: '8px' }}>Edit your story</strong>
                        <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', resize: 'none', marginBottom: '10px' }}
                        />
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => { setEditing(false); setPaused(false); }} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}>Cancel</button>
                            <button onClick={handleSaveEdit} style={{ flex: 1, padding: '8px', borderRadius: '6px', border: 'none', background: '#0095f6', color: '#fff', cursor: 'pointer' }}>Save</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default StoryViewer;