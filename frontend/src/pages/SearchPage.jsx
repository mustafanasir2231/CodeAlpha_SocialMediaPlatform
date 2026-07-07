import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate, Link } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import '../styles/SearchPage.css';

// Explore/Search page — search bar (for users), trending hashtags,
// and a grid of posts below. All APIs already exist; this is just a new page.
const SearchPage = () => {
    const navigate = useNavigate();
    const [query, setQuery] = useState("");
    const [userResults, setUserResults] = useState([]);
    const [searching, setSearching] = useState(false);

    const [trendingTags, setTrendingTags] = useState([]);
    const [explorePosts, setExplorePosts] = useState([]);
    const [loadingPosts, setLoadingPosts] = useState(true);

    const token = localStorage.getItem("token")?.replace(/^"|"$/g, '');

    // User search — debounced, similar to the logic in SearchBar.jsx
    useEffect(() => {
        if (!query.trim()) {
            setUserResults([]);
            return;
        }

        setSearching(true);
        const timer = setTimeout(async () => {
            try {
                const res = await axios.get(`http://localhost:5000/api/users/search?q=${query.trim()}`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setUserResults(res.data);
            } catch (err) {
                console.error("Search error:", err);
            } finally {
                setSearching(false);
            }
        }, 300);

        return () => clearTimeout(timer);
    }, [query, token]);

    // Fetch trending hashtags
    useEffect(() => {
        const fetchTrending = async () => {
            try {
                const res = await axios.get("http://localhost:5000/api/posts/trending-hashtags");
                setTrendingTags(res.data);
            } catch (err) {
                console.error("Error fetching trending hashtags:", err);
            }
        };
        fetchTrending();
    }, []);

    // Explore grid — all posts that have media (text‑only posts are not shown in the grid,
    // because the grid is for visual content only, like on Instagram)
    useEffect(() => {
        const fetchExplorePosts = async () => {
            setLoadingPosts(true);
            try {
                const res = await axios.get("http://localhost:5000/api/posts");
                const withMedia = res.data.filter(p => p.media?.length > 0);
                setExplorePosts(withMedia);
            } catch (err) {
                console.error("Error fetching explore posts:", err);
            } finally {
                setLoadingPosts(false);
            }
        };
        fetchExplorePosts();
    }, []);

    const goToProfile = (username) => navigate(`/profile/${username}`);

    return (
        <div className="search-page">
            <div className="search-page-bar-wrapper">
                <SearchIcon size={18} className="search-page-bar-icon" />
                <input
                    className="search-page-bar"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search users..."
                />
            </div>

            {/* User search results — only shown while typing */}
            {query.trim() && (
                <div className="search-user-results">
                    {searching ? (
                        <p className="search-empty-text">Searching...</p>
                    ) : userResults.length === 0 ? (
                        <p className="search-empty-text">No users found</p>
                    ) : (
                        userResults.map((u) => (
                            <div key={u._id} className="search-user-row" onClick={() => goToProfile(u.username)}>
                                <div className="search-user-avatar">
                                    {u.profilePic ? (
                                        <img src={u.profilePic} alt={u.username} />
                                    ) : (
                                        u.username[0]?.toUpperCase()
                                    )}
                                </div>
                                <div>
                                    <div className="search-user-username">{u.username}</div>
                                    {u.bio && <div className="search-user-bio">{u.bio}</div>}
                                </div>
                            </div>
                        ))
                    )}
                </div>
            )}

            {/* Trending + Explore grid — only shown when the search box is empty */}
            {!query.trim() && (
                <>
                    {trendingTags.length > 0 && (
                        <div className="search-trending-section">
                            <h3 className="search-section-title">🔥 Trending Hashtags</h3>
                            <div className="search-trending-chips">
                                {trendingTags.map(({ tag, count }) => (
                                    <Link key={tag} to={`/hashtag/${tag}`} className="trending-chip">
                                        #{tag} <span className="trending-count">({count})</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    )}

                    <h3 className="search-section-title">Explore</h3>
                    {loadingPosts ? (
                        <p className="search-empty-text">Loading...</p>
                    ) : explorePosts.length === 0 ? (
                        <p className="search-empty-text">No posts to explore yet</p>
                    ) : (
                        <div className="explore-grid">
                            {explorePosts.map((post) => (
                                <Link key={post._id} to={`/post/${post._id}`} className="explore-grid-item">
                                    {post.media[0].type === 'video' ? (
                                        <video src={post.media[0].url} muted />
                                    ) : (
                                        <img src={post.media[0].url} alt="" />
                                    )}
                                    {post.media.length > 1 && <span className="explore-grid-multi">⧉</span>}
                                </Link>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SearchPage;