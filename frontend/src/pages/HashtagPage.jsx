import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import MediaCarousel from '../components/MediaCarousel';
import HashtagText from '../components/HashtagText';

// Is hashtag ki sab posts dikhata hai — jab koi #coding jaisa hashtag click kare to yahan aata hai
const HashtagPage = () => {
    const { tag } = useParams();
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHashtagPosts = async () => {
            setLoading(true);
            try {
                const res = await axios.get(`http://localhost:5000/api/posts/hashtag/${tag}`);
                setPosts(res.data);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchHashtagPosts();
    }, [tag]);

    return (
        <div style={{ width: '80%', maxWidth: '600px', margin: '0 auto', padding: '20px' }}>
            <button onClick={() => navigate(-1)} style={{ marginBottom: '15px' }}>← Back</button>

            <h2 style={{ marginBottom: '5px' }}>#{tag}</h2>
            <p style={{ color: '#888', fontSize: '13px', marginBottom: '20px' }}>
                {posts.length} {posts.length === 1 ? 'post' : 'posts'}
            </p>

            {loading ? (
                <p style={{ textAlign: 'center', color: '#888' }}>Loading...</p>
            ) : posts.length === 0 ? (
                <p style={{ textAlign: 'center', color: '#888' }}>No posts found for #{tag}</p>
            ) : (
                posts.map(post => (
                    <div key={post._id} style={{ border: '1px solid #ccc', padding: '15px', margin: '10px 0', borderRadius: '8px' }}>
                        <Link to={`/profile/${post.username}`} style={{ textDecoration: 'none', color: '#333' }}>
                            <h3 style={{ margin: '0 0 8px' }}>{post.username}</h3>
                        </Link>

                        {post.content && (
                            <p style={{ margin: '0 0 8px' }}>
                                <HashtagText text={post.content} />
                                {post.edited && (
                                    <span style={{ fontSize: '11px', color: '#aaa', marginLeft: '6px' }}>(edited)</span>
                                )}
                            </p>
                        )}

                        {post.media?.length > 0 && <MediaCarousel media={post.media} />}

                        <p style={{ marginTop: '10px', color: '#666', fontSize: '13px' }}>❤️ {post.likes?.length || 0} likes</p>

                        <small style={{ color: '#888', display: 'block', marginTop: '5px' }}>
                            {post.createdAt ? formatDistanceToNow(new Date(post.createdAt), { addSuffix: true }) : "Just now"}
                        </small>
                    </div>
                ))
            )}
        </div>
    );
};

export default HashtagPage;