import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HomePage from './pages/HomePage';
import ProfilePage from './pages/ProfilePage';
import ChatPage from './pages/ChatPage';
import PostPage from './pages/PostPage';
import HashtagPage from './pages/HashtagPage';
import MessagesListPage from './pages/MessagesListPage'; // NAYA
import NotificationsPage from './pages/NotificationsPage'; // NAYA
import SearchPage from './pages/SearchPage'; // NAYA
import Layout from './components/Layout'; // NAYA

function App() {
  const [token, setToken] = useState(localStorage.getItem("token"));

  useEffect(() => {
    const handleStorageChange = () => {
      setToken(localStorage.getItem("token"));
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  // NAYA: Helper — sidebar wale (Layout ke andar) protected pages ke liye.
  // Login na ho to seedha /login bhej do, login ho to Layout ke andar page render karo.
  const withLayout = (element) => {
    if (!token) return <Navigate to="/login" />;
    return <Layout>{element}</Layout>;
  };

  return (
    <BrowserRouter>
      <Routes>
        {/* Login/Register pe sidebar nahi chahiye, isliye Layout ke bahar hain */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/" element={withLayout(<HomePage />)} />

        {/* DYNAMIC ROUTE: Yahan :username se kisi ki bhi profile khulegi */}
        <Route path="/profile/:username" element={withLayout(<ProfilePage />)} />

        {/* Agar koi seedha /profile pe jaye toh usay uski apni profile pe redirect karein */}
        <Route
          path="/profile"
          element={token ? <Navigate to={`/profile/${localStorage.getItem("username")}`} /> : <Navigate to="/login" />}
        />

        <Route path="/messages/:username" element={withLayout(<ChatPage />)} />

        {/* NAYA: Saari conversations ki list */}
        <Route path="/messages" element={withLayout(<MessagesListPage />)} />

        <Route path="/post/:postId" element={withLayout(<PostPage />)} />

        {/* Hashtag page — #coding click karne pe yahan aayega */}
        <Route path="/hashtag/:tag" element={withLayout(<HashtagPage />)} />

        {/* NAYA: Poori notifications list */}
        <Route path="/notifications" element={withLayout(<NotificationsPage />)} />

        {/* NAYA: Explore/Search page */}
        <Route path="/search" element={withLayout(<SearchPage />)} />

      </Routes>
    </BrowserRouter>
  );
}

export default App;