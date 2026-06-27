import React, { useState, useRef } from 'react';
import axios from 'axios';

// Background color options jaise Instagram text-story mein hote hain
const BG_COLORS = ['#0095f6', '#ed4956', '#fa7e1e', '#962fbf', '#27ae60', '#1a1a1a'];

const CreateStoryModal = ({ onClose, onStoryCreated }) => {
    const [mode, setMode] = useState('choose'); // 'choose' | 'text' | 'media'
    const [text, setText] = useState('');
    const [backgroundColor, setBackgroundColor] = useState(BG_COLORS[0]);
    const [mediaFile, setMediaFile] = useState(null);
    const [mediaPreview, setMediaPreview] = useState(null);
    const [mediaType, setMediaType] = useState(null); // 'image' | 'video'
    const [visibility, setVisibility] = useState('everyone'); // 'everyone' | 'followers'
    const [posting, setPosting] = useState(false);
    const fileInputRef = useRef(null);

    const token = localStorage.getItem("token")?.replace(/^"|"$/g, '');

    const handleFileSelect = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        if (file.size > 50 * 1024 * 1024) {
            alert("File must be under 50MB");
            return;
        }

        const isVideo = file.type.startsWith('video/');
        setMediaFile(file);
        setMediaPreview(URL.createObjectURL(file));
        setMediaType(isVideo ? 'video' : 'image');
        setMode('media');
    };

    const resetAndClose = () => {
        if (mediaPreview) URL.revokeObjectURL(mediaPreview);
        onClose();
    };

    const handleSubmit = async () => {
        if (mode === 'text' && !text.trim()) {
            return alert("Please write something for your story");
        }
        if (mode === 'media' && !mediaFile) {
            return alert("Please select a photo or video");
        }

        setPosting(true);
        try {
            const formData = new FormData();
            formData.append('visibility', visibility);

            if (mode === 'text') {
                formData.append('type', 'text');
                formData.append('text', text.trim());
                formData.append('backgroundColor', backgroundColor);
            } else {
                formData.append('type', mediaType);
                formData.append('media', mediaFile);
                if (text.trim()) formData.append('text', text.trim()); // optional caption
            }

            const res = await axios.post('http://localhost:5000/api/stories/create', formData, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'multipart/form-data'
                }
            });

            onStoryCreated(res.data);
            resetAndClose();
        } catch (err) {
            console.error(err);
            alert(err.response?.data?.error || "Failed to create story");
        } finally {
            setPosting(false);
        }
    };

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
        }}>
            <div style={{
                background: '#fff', borderRadius: '12px', width: '90%', maxWidth: '420px',
                maxHeight: '85vh', overflowY: 'auto', padding: '20px', position: 'relative'
            }}>
                <button
                    onClick={resetAndClose}
                    style={{ position: 'absolute', top: '12px', right: '12px', border: 'none', background: 'none', fontSize: '20px', cursor: 'pointer' }}
                >✕</button>

                <h2 style={{ marginTop: 0, marginBottom: '15px' }}>Create Story</h2>

                {/* Step 1: Choose type */}
                {mode === 'choose' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                        <button
                            onClick={() => setMode('text')}
                            style={{ padding: '14px', borderRadius: '8px', border: '1px solid #ddd', background: '#fafafa', cursor: 'pointer', fontSize: '15px', textAlign: 'left' }}
                        >
                            📝 Create a text story
                        </button>
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            style={{ padding: '14px', borderRadius: '8px', border: '1px solid #ddd', background: '#fafafa', cursor: 'pointer', fontSize: '15px', textAlign: 'left' }}
                        >
                            📷 Upload a photo or video
                        </button>
                        <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*,video/*"
                            onChange={handleFileSelect}
                            style={{ display: 'none' }}
                        />
                    </div>
                )}

                {/* Step 2a: Text story composer */}
                {mode === 'text' && (
                    <div>
                        <div style={{
                            background: backgroundColor, borderRadius: '10px', height: '280px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            padding: '20px', marginBottom: '12px'
                        }}>
                            <textarea
                                value={text}
                                onChange={(e) => setText(e.target.value)}
                                placeholder="Type your story..."
                                autoFocus
                                maxLength={200}
                                rows={4}
                                style={{
                                    width: '100%', background: 'transparent', border: 'none', outline: 'none',
                                    color: '#fff', fontSize: '22px', fontWeight: 'bold', textAlign: 'center',
                                    resize: 'none'
                                }}
                            />
                        </div>

                        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginBottom: '15px' }}>
                            {BG_COLORS.map(color => (
                                <div
                                    key={color}
                                    onClick={() => setBackgroundColor(color)}
                                    style={{
                                        width: '28px', height: '28px', borderRadius: '50%', background: color,
                                        cursor: 'pointer', border: backgroundColor === color ? '3px solid #333' : '2px solid #fff',
                                        boxShadow: '0 0 0 1px #ddd'
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                )}

                {/* Step 2b: Media preview */}
                {mode === 'media' && mediaPreview && (
                    <div>
                        <div style={{ borderRadius: '10px', overflow: 'hidden', marginBottom: '12px', maxHeight: '320px', background: '#000' }}>
                            {mediaType === 'video' ? (
                                <video src={mediaPreview} controls style={{ width: '100%', maxHeight: '320px', objectFit: 'contain' }} />
                            ) : (
                                <img src={mediaPreview} alt="preview" style={{ width: '100%', maxHeight: '320px', objectFit: 'contain' }} />
                            )}
                        </div>
                        <input
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder="Add a caption (optional)"
                            style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ccc', marginBottom: '15px' }}
                        />
                    </div>
                )}

                {/* Privacy + Submit — sirf jab koi mode chosen ho */}
                {mode !== 'choose' && (
                    <>
                        <div style={{ marginBottom: '15px' }}>
                            <label style={{ fontSize: '13px', color: '#555', display: 'block', marginBottom: '6px' }}>Who can see this?</label>
                            <div style={{ display: 'flex', gap: '8px' }}>
                                <button
                                    onClick={() => setVisibility('everyone')}
                                    style={{
                                        flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer',
                                        border: visibility === 'everyone' ? '2px solid #0095f6' : '1px solid #ccc',
                                        background: visibility === 'everyone' ? '#e7f3ff' : '#fff',
                                        fontWeight: visibility === 'everyone' ? 'bold' : 'normal', fontSize: '13px'
                                    }}
                                >
                                    🌍 Everyone
                                </button>
                                <button
                                    onClick={() => setVisibility('followers')}
                                    style={{
                                        flex: 1, padding: '8px', borderRadius: '6px', cursor: 'pointer',
                                        border: visibility === 'followers' ? '2px solid #0095f6' : '1px solid #ccc',
                                        background: visibility === 'followers' ? '#e7f3ff' : '#fff',
                                        fontWeight: visibility === 'followers' ? 'bold' : 'normal', fontSize: '13px'
                                    }}
                                >
                                    👥 Followers only
                                </button>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '10px' }}>
                            <button
                                onClick={() => { setMode('choose'); setText(''); setMediaFile(null); setMediaPreview(null); }}
                                style={{ flex: 1, padding: '10px', borderRadius: '6px', border: '1px solid #ccc', background: '#fff', cursor: 'pointer' }}
                            >
                                Back
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={posting}
                                style={{ flex: 2, padding: '10px', borderRadius: '6px', border: 'none', background: '#0095f6', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                {posting ? "Posting..." : "Share to Story"}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default CreateStoryModal;