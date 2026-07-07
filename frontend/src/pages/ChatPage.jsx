import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import io from 'socket.io-client';

const socket = io.connect("http://localhost:5000");

// timestamp formatting
const formatMessageTime = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();

    const isToday = date.toDateString() === now.toDateString();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.toDateString() === yesterday.toDateString();

    const time = date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

    if (isToday) return `Today, ${time}`;
    if (isYesterday) return `Yesterday, ${time}`;

    const dateLabel = date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
    return `${dateLabel} · ${time}`;
};

// NEW: Small preview card for story replies — displayed above the message bubble
const StoryReplyPreview = ({ storyReply, isMine }) => {
    if (!storyReply || !storyReply.storyId) return null;

    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px',
            padding: '6px', borderRadius: '10px', background: isMine ? 'rgba(255,255,255,0.15)' : '#e8e8e8',
            maxWidth: '200px'
        }}>
            <div style={{
                width: '36px', height: '50px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0,
                background: storyReply.storyType === 'text' ? (storyReply.storyBackgroundColor || '#0095f6') : '#000',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {storyReply.storyType === 'text' ? (
                    <span style={{ color: '#fff', fontSize: '8px', textAlign: 'center', padding: '2px', wordBreak: 'break-word' }}>
                        {storyReply.storyText?.slice(0, 20)}
                    </span>
                ) : storyReply.storyMediaUrl ? (
                    storyReply.storyType === 'video' ? (
                        <video src={storyReply.storyMediaUrl} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                        <img src={storyReply.storyMediaUrl} alt="story" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    )
                ) : (
                    <span style={{ color: '#aaa', fontSize: '9px' }}>Expired</span>
                )}
            </div>
            <span style={{ fontSize: '11px', color: isMine ? '#eee' : '#666' }}>
                Replied to story
            </span>
        </div>
    );
};

const ChatPage = () => {
    const { username } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [text, setText] = useState("");
    const bottomRef = useRef(null);

    // typing indicator state
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const typingTimeoutRef = useRef(null);
    const otherTypingTimeoutRef = useRef(null);

    const token = localStorage.getItem("token")?.replace(/^"|"$/g, '');
    const myUsername = localStorage.getItem("username");
    const myId = localStorage.getItem("userId");

    const [otherUserId, setOtherUserId] = useState(null);

    useEffect(() => {
        const fetchMessages = async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/messages/${username}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setMessages(res.data);

                const otherMsg = res.data.find(m => m.sender?.username !== myUsername);
                if (otherMsg) setOtherUserId(otherMsg.sender._id);
            } catch (err) { console.error(err); }
        };
        fetchMessages();

        if (myId) socket.emit('register-user', myId);

        socket.on('receive-message', (newMsg) => {
            if (newMsg.sender.username === username) {
                setMessages((prev) => [...prev, newMsg]);
                setOtherUserId(newMsg.sender._id);
                setOtherUserTyping(false);
            }
        });

        socket.on('user-typing', ({ senderUsername }) => {
            if (senderUsername === username) {
                setOtherUserTyping(true);
                clearTimeout(otherTypingTimeoutRef.current);
                otherTypingTimeoutRef.current = setTimeout(() => setOtherUserTyping(false), 3000);
            }
        });

        socket.on('user-stop-typing', ({ senderUsername }) => {
            if (senderUsername === username) {
                setOtherUserTyping(false);
                clearTimeout(otherTypingTimeoutRef.current);
            }
        });

        socket.on('messages-seen', ({ seenBy }) => {
            if (seenBy === username) {
                setMessages((prev) => prev.map(m =>
                    m.sender.username === myUsername ? { ...m, seen: true } : m
                ));
            }
        });

        return () => {
            socket.off('receive-message');
            socket.off('user-typing');
            socket.off('user-stop-typing');
            socket.off('messages-seen');
            clearTimeout(typingTimeoutRef.current);
            clearTimeout(otherTypingTimeoutRef.current);
        };
    }, [username]);

    useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages, otherUserTyping]);

    const handleSend = async () => {
        if (!text.trim()) return;
        try {
            const res = await axios.post(`http://localhost:5000/api/messages/${username}`, { text }, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setMessages((prev) => [...prev, res.data]);
            setText("");

            if (otherUserId) {
                socket.emit('stop-typing', { recipientId: otherUserId, senderUsername: myUsername });
            }
            clearTimeout(typingTimeoutRef.current);
        } catch (err) { console.error(err); alert("Failed to send message"); }
    };

    const handleTextChange = (e) => {
        setText(e.target.value);

        if (!otherUserId) return;

        socket.emit('typing', { recipientId: otherUserId, senderUsername: myUsername });

        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
            socket.emit('stop-typing', { recipientId: otherUserId, senderUsername: myUsername });
        }, 1500);
    };

    // Only show "Seen" below the most recent (latest) message of mine that has been seen
    const myMessages = messages.filter(m => m.sender.username === myUsername);
    const lastSeenMyMessageId = [...myMessages].reverse().find(m => m.seen)?._id;

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: '20px', display: 'flex', flexDirection: 'column', height: '90vh' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderBottom: '1px solid #eee', paddingBottom: '10px' }}>
                <button onClick={() => navigate(-1)}>←</button>
                <h3 style={{ margin: 0 }}>{username}</h3>
            </div>

            <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
                {messages.map((msg) => {
                    const isMine = msg.sender.username === myUsername;
                    return (
                        <div key={msg._id} style={{ display: 'flex', flexDirection: 'column', alignItems: isMine ? 'flex-end' : 'flex-start', margin: '6px 0' }}>

                            {/* NEW: If this message is a reply to a story, show the preview card */}
                            <StoryReplyPreview storyReply={msg.storyReply} isMine={isMine} />

                            <div style={{ background: isMine ? '#0095f6' : '#f1f1f1', color: isMine ? '#fff' : '#000', padding: '8px 14px', borderRadius: '16px', maxWidth: '70%' }}>
                                {msg.text}
                            </div>
                            <span style={{ fontSize: '11px', color: '#999', marginTop: '3px', padding: '0 4px' }}>
                                {formatMessageTime(msg.createdAt)}
                            </span>

                            {isMine && msg._id === lastSeenMyMessageId && (
                                <span style={{ fontSize: '11px', color: '#0095f6', marginTop: '1px', padding: '0 4px' }}>
                                    Seen
                                </span>
                            )}
                        </div>
                    );
                })}

                {otherUserTyping && (
                    <div style={{ display: 'flex', justifyContent: 'flex-start', margin: '6px 0' }}>
                        <div style={{ background: '#f1f1f1', color: '#888', padding: '8px 14px', borderRadius: '16px', fontSize: '13px', fontStyle: 'italic' }}>
                            {username} is typing...
                        </div>
                    </div>
                )}

                <div ref={bottomRef} />
            </div>

            <div style={{ display: 'flex', gap: '10px', borderTop: '1px solid #eee', paddingTop: '10px' }}>
                <input
                    value={text}
                    onChange={handleTextChange}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Message..."
                    style={{ flex: 1, padding: '10px', borderRadius: '20px', border: '1px solid #ccc' }}
                />
                <button onClick={handleSend} style={{ padding: '10px 18px', borderRadius: '20px', background: '#0095f6', color: '#fff', border: 'none', cursor: 'pointer' }}>Send</button>
            </div>
        </div>
    );
};

export default ChatPage;