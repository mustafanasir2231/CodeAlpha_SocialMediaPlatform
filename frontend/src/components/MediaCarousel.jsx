import React, { useState } from 'react';

const MediaCarousel = ({ media }) => {
    const [current, setCurrent] = useState(0);

    if (!media || media.length === 0) return null;

    const prev = () => setCurrent((c) => (c - 1 + media.length) % media.length);
    const next = () => setCurrent((c) => (c + 1) % media.length);

    const item = media[current];
    const url = item.url;

    return (
        <div style={{ position: 'relative', width: '100%', maxWidth: '500px', margin: '10px auto', userSelect: 'none' }}>

            {/* Media display */}
            <div style={{ width: '100%', aspectRatio: '1 / 1', background: '#000', borderRadius: '8px', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {item.type === 'video' ? (
                    <video
                        src={url}
                        controls
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                ) : (
                    <img
                        src={url}
                        alt={`media-${current}`}
                        style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                    />
                )}
            </div>

            {/* Prev / Next buttons — sirf multiple media pe dikhao */}
            {media.length > 1 && (
                <>
                    <button
                        onClick={prev}
                        style={{
                            position: 'absolute', top: '50%', left: '8px', transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none',
                            borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer',
                            fontSize: '16px', lineHeight: '32px', textAlign: 'center'
                        }}
                    >‹</button>

                    <button
                        onClick={next}
                        style={{
                            position: 'absolute', top: '50%', right: '8px', transform: 'translateY(-50%)',
                            background: 'rgba(0,0,0,0.5)', color: '#fff', border: 'none',
                            borderRadius: '50%', width: '32px', height: '32px', cursor: 'pointer',
                            fontSize: '16px', lineHeight: '32px', textAlign: 'center'
                        }}
                    >›</button>

                    {/* Dots */}
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '6px', marginTop: '8px' }}>
                        {media.map((_, i) => (
                            <span
                                key={i}
                                onClick={() => setCurrent(i)}
                                style={{
                                    width: '8px', height: '8px', borderRadius: '50%', cursor: 'pointer',
                                    background: i === current ? '#333' : '#ccc', display: 'inline-block'
                                }}
                            />
                        ))}
                    </div>
                </>
            )}

            {/* Counter — top right */}
            {media.length > 1 && (
                <div style={{
                    position: 'absolute', top: '8px', right: '8px',
                    background: 'rgba(0,0,0,0.55)', color: '#fff',
                    borderRadius: '12px', padding: '2px 8px', fontSize: '12px'
                }}>
                    {current + 1} / {media.length}
                </div>
            )}
        </div>
    );
};

export default MediaCarousel;