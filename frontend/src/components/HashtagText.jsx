import React from 'react';
import { Link } from 'react-router-dom';


const HashtagText = ({ text }) => {
    if (!text) return null;

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