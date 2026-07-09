
# 📸 SocialSphere

### A Full-Stack Social Media Application 

*Built with the MERN stack and real-time Socket.io communication, featuring Stories, live messaging, notifications, and a modern Instagram-style UI.*



---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#️-tech-stack)
- [Project Structure](#-project-structure)
- [Setup Instructions](#️-setup-instructions)
- [API Endpoints](#-api-endpoints)
- [Real-Time Events (Socket.io)](#-real-time-events-socketio)
- [Screenshots](#-screenshots)
- [Key Learning Outcomes](#-key-learning-outcomes)
- [Developer](#-developer)
- [Conclusion](#-conclusion)

---

## 📖 Overview

**SocialSphere** is a full-stack social media web application inspired by Instagram, built using the **MERN stack** (MongoDB, Express.js, React.js, Node.js) with **Socket.io** for real-time communication.

The platform allows users to create posts, follow other users, engage through likes and comments, exchange direct messages in real time, and share temporary **Stories** — replicating the core experience of a modern social networking app.

This project demonstrates practical skills in full-stack development, real-time systems, RESTful API design, and scalable database modeling.

---

## ✨ Features

### 👥 User & Profile Management
- Secure user registration and login (JWT-based authentication)
- Editable profile with profile picture and bio upload (via Multer)
- Follow / Unfollow system
- Follow request handling with duplicate-request protection (MongoDB unique compound index)
- Public user search with debounced search-as-you-type

### 📝 Posts & Feed
- Create image and video posts with carousel support
- Like and comment on posts
- Like individual comments
- Instagram-style post card UI
- Bookmark / save posts for later
- Hashtag support with trending hashtags

### 📖 Stories
- 24-hour auto-expiring Stories (TTL)
- Privacy controls for story visibility
- Full-screen story viewer with progress bar animations
- Reply to a story directly via DM, with a snapshot of the story attached

### 💬 Real-Time Messaging
- One-on-one direct messaging powered by Socket.io
- Live typing indicators
- Message "seen" receipts with read tracking
- Real-time online/offline status indicators

### 🔔 Notifications
- Real-time notification system (likes, comments, follows, follow requests)
- Live unread notification badge via Socket.io

### 🎨 UI/UX
- Complete UI overhaul using `lucide-react` icons
- Centralized theming with CSS custom properties (`theme.css`)
- Hover-expand sidebar navigation with real-time unread badges
- Dedicated pages: Profile, Search, Messages List, Notifications

---

## 🏗️ Tech Stack

| Category | Technologies |
|---|---|
| **Frontend** | React.js, React Hooks, lucide-react, CSS3 (custom properties) |
| **Backend** | Node.js, Express.js |
| **Real-Time Engine** | Socket.io |
| **Database** | MongoDB, Mongoose |
| **Authentication** | JWT (JSON Web Token), bcrypt.js |
| **File Uploads** | Multer (disk storage) |
| **Testing / API Debugging** | Thunder Client |

---

## 📁 Project Structure

```
SocialSphere/
│
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── models/
│   ├── routes/
│   ├── middleware/
│   ├── sockets/
│   └── server.js
│
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── components/
│   │   ├── styles/          # centralized CSS per component
│   │   └── theme.css
│   └── index.html
│
└── README.md
```

---

## ⚙️ Setup Instructions

### 1️⃣ Clone the Repository
```bash
git clone https://github.com/mustafanasir2231/SocialSphere.git
cd SocialSphere
```

### 2️⃣ Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file inside the `backend/` folder:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:3000
```

Run the backend server:
```bash
npm start
```

### 3️⃣ Frontend Setup
```bash
cd frontend
npm install
npm start
```

---

## 🔌 API Endpoints

### 👤 Auth & Users
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/users/register` | Register a new user |
| `POST` | `/api/users/login` | Login an existing user |
| `GET` | `/api/users/:username` | Get user profile |
| `PUT` | `/api/users/profile` | Update profile picture / bio |
| `GET` | `/api/users/search?q=` | Search users (debounced) |

### 🤝 Follow System
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/follow/:id` | Send / accept follow request |
| `DELETE` | `/api/follow/:id` | Unfollow a user |
| `GET` | `/api/follow/requests` | Get pending follow requests |

### 📝 Posts
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/posts` | Get feed posts |
| `POST` | `/api/posts` | Create a new post |
| `POST` | `/api/posts/:id/like` | Like / unlike a post |
| `POST` | `/api/posts/:id/comment` | Add a comment |
| `POST` | `/api/posts/:id/bookmark` | Bookmark / unsave a post |

### 📖 Stories
| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/stories` | Create a new story |
| `GET` | `/api/stories` | Get active stories (non-expired) |
| `POST` | `/api/stories/:id/view` | Mark story as viewed |
| `POST` | `/api/stories/:id/reply` | Reply to a story via DM |

### 💬 Messages
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/messages/:userId` | Get conversation with a user |
| `POST` | `/api/messages/:userId` | Send a message |

### 🔔 Notifications
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/notifications` | Get all notifications |
| `PUT` | `/api/notifications/:id/read` | Mark notification as read |

---

## 📡 Real-Time Events (Socket.io)

| Event | Description |
|---|---|
| `user_online` / `user_offline` | Broadcasts live online/offline status |
| `typing` / `stop_typing` | Real-time typing indicators in chat |
| `message_seen` | Updates message read/seen receipts |
| `new_notification` | Pushes live notifications to the client |
| `new_message` | Delivers real-time direct messages |

---

| Page | 
|---|---|
| Home Feed | 
| Profile Page |
| Stories Viewer | 
| Messages / Chat |
| Notifications |

---

## 🧠 Key Learning Outcomes

- Building real-time features using Socket.io (typing indicators, live status, seen receipts)
- Designing and implementing a Stories feature with TTL-based expiry
- Solving race conditions using MongoDB unique compound indexes
- Structuring scalable REST APIs with Express.js
- Managing file uploads with Multer
- Building a themeable, component-based UI with React Hooks and CSS custom properties
- Full MVC architecture across a multi-feature full-stack application

---

## 👨‍💻 Developer

**Mustafa Nasir**

[![GitHub](https://img.shields.io/badge/GitHub-mustafanasir2231-181717?logo=github&logoColor=white)](https://github.com/mustafanasir2231)

---

## ⭐ Conclusion

**SocialSphere** demonstrates a complete, production-style social media application — combining REST APIs, real-time communication, and a polished user interface into a single full-stack MERN project.

---
