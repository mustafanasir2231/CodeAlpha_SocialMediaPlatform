import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import '../styles/MessagesListPage.css';


const MessagesListPage = () => {
    const navigate = useNavigate();
    const [conversations, setConversations] = useState([]);
    const [loading, setLoading] = useState(true);

    const token = localStorage.getItem("token")?.replace(/^"|"$/g, '');

    useEffect(() => {
        const fetchConversations = async () => {
            try {
                const res = await axios.get("http://localhost:5000/api/messages/conversations", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setConversations(res.data);
            } catch (err) {
                console.error("Error fetching conversations:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchConversations();
    }, [token]);

    return (
        <div className="messages-list-page">
            <h1 className="messages-list-title">Messages</h1>

            {loading ? (
                <p className="messages-list-empty">Loading...</p>
            ) : conversations.length === 0 ? (
                <p className="messages-list-empty">No conversations yet. Visit a profile to start chatting!</p>
            ) : (
                <div className="messages-list">
                    {conversations.map((conv) => (
                        <div
                            key={conv.username}
                            className="conversation-row"
                            onClick={() => navigate(`/messages/${conv.username}`)}
                        >
                            <div className="conversation-avatar">
                                {conv.username?.[0]?.toUpperCase()}
                            </div>
                            <div className="conversation-info">
                                <span className="conversation-username">{conv.username}</span>
                                <span className="conversation-preview">{conv.lastMessage || "Say hi 👋"}</span>
                            </div>
                            {conv.lastMessageAt && (
                                <span className="conversation-time">
                                    {formatDistanceToNow(new Date(conv.lastMessageAt), { addSuffix: true })}
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default MessagesListPage;