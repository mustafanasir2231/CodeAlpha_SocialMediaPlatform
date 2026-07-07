import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import ChatPage from './pages/ChatPage';
import PostPage from './pages/PostPage';
import HashtagPage from './pages/HashtagPage';
import MessagesListPage from './pages/MessagesListPage'; 
import NotificationsPage from './pages/NotificationsPage'; 
import SearchPage from './pages/SearchPage';
import Layout from './components/Layout'; 

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem("token"));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  
  const withLayout = (element) => {
    if (!token) return <Navigate to="/login" />;
    return <Layout>{element}</Layout>;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Login/Register don't need the sidebar, so they stay outside Layout. */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/" element={withLayout(<HomePage />)} />

        {/* DYNAMIC ROUTE: Here :username will open anyone's profile. */}
        <Route path="/profile/:username" element={withLayout(<ProfilePage />)} />

        {/* If someone goes directly to /profile, redirect them to their own profile. */}
        <Route
          path="/profile"
          element={token ? <Navigate to={`/profile/${localStorage.getItem("username")}`} /> : <Navigate to="/login" />}
        />

        <Route path="/messages/:username" element={withLayout(<ChatPage />)} />

        {/* NEW: List of all conversations. */}
        <Route path="/messages" element={withLayout(<MessagesListPage />)} />

        <Route path="/post/:postId" element={withLayout(<PostPage />)} />

        {/* Hashtag page — when someone clicks on #coding, they land here. */}
        <Route path="/hashtag/:tag" element={withLayout(<HashtagPage />)} />

        {/* NEW: Full notifications list. */}
        <Route path="/notifications" element={withLayout(<NotificationsPage />)} />

        {/* NEW: Explore/Search page. */}
        <Route path="/search" element={withLayout(<SearchPage />)} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;