import React from 'react';
import { Link } from 'react-router-dom';

// NAYA: Post ka text leta hai, #hashtags ko clickable blue links mein convert karta hai,
// baaki normal text waise hi rehta hai. Reusable hai — HomePage, HashtagPage, ProfilePage
// jahan bhi post content dikhana ho, wahan use ho sakta hai.
const HashtagText = ({ text }) => {
    if (!text) return null;

    // Text ko hashtags aur normal words mein split karo, hashtags ko capture karte hue
    const parts = text.split(/(#\w+)/g);

    return (
        <>
            {parts.map((part, i) => {
                if (part.startsWith('#')) {
                    const tag = part.slice(1).toLowerCase();
                    return (
                        <Link
                            key={i}
                            to={`/hashtag/${tag}`}
                            style={{ color: '#0095f6', fontWeight: '500', textDecoration: 'none' }}
                        >
                            {part}
                        </Link>
                    );
                }
                return <React.Fragment key={i}>{part}</React.Fragment>;
            })}
        </>
    );
};

export default HashtagText;