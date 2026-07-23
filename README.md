# 📸 SocialSphere

**A full-stack social media platform with real-time messaging, Stories, and live notifications — built on the MERN stack with Socket.io.**

---

## Overview

SocialSphere is a full-stack social networking application built with the **MERN stack** (MongoDB, Express.js, React.js, Node.js) and **Socket.io** for real-time communication.

Users can create posts, follow others, engage through likes and comments, exchange direct messages in real time, and share 24-hour Stories — delivering a modern, Instagram-style experience end to end.

---

## Features

### User & Profile Management
- Secure JWT-based authentication (register/login)
- Editable profile with picture and bio upload (Multer)
- Follow / Unfollow system with duplicate-request protection (MongoDB unique compound index)
- Debounced real-time user search

### Posts & Feed
- Image and video posts with carousel support
- Likes and comments, including likes on individual comments
- Bookmark / save posts
- Hashtag support with trending hashtags

### Stories
- 24-hour auto-expiring Stories (TTL-based)
- Privacy controls for visibility
- Full-screen viewer with progress-bar animation
- Reply to a Story directly via DM with a story snapshot attached

### Real-Time Messaging
- One-on-one direct messaging via Socket.io
- Live typing indicators
- Message "seen" receipts with read tracking
- Real-time online/offline presence

### Notifications
- Real-time notifications for likes, comments, and follows
- Live unread-count badge via Socket.io

### UI/UX
- Instagram-style interface with `lucide-react` icons
- Centralized theming via CSS custom properties (`theme.css`)
- Hover-expand sidebar navigation with live unread badges

---

## Tech Stack

| Category | Technologies |
|---|---|
| Frontend | React.js, React Hooks, lucide-react, CSS3 |
| Backend | Node.js, Express.js |
| Real-Time Engine | Socket.io |
| Database | MongoDB, Mongoose |
| Authentication | JWT, bcrypt.js |
| File Uploads | Multer |

---

---

## Setup

### 1. Clone the repository
```bash
git clone https://github.com/mustafanasir2231/SocialSphere.git
cd SocialSphere
```

### 2. Backend
```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:
```env
PORT=5000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_secret_key
CLIENT_URL=http://localhost:3000
```

```bash
npm start
```

### 3. Frontend
```bash
cd frontend
npm install
npm start
```

---

## API Endpoints

### Auth & Users
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/users/register` | Register a new user |
| POST | `/api/users/login` | Login an existing user |
| GET | `/api/users/:username` | Get user profile |
| PUT | `/api/users/profile` | Update profile picture / bio |
| GET | `/api/users/search?q=` | Search users |

### Follow System
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/follow/:id` | Send / accept follow request |
| DELETE | `/api/follow/:id` | Unfollow a user |
| GET | `/api/follow/requests` | Get pending follow requests |

### Posts
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/posts` | Get feed posts |
| POST | `/api/posts` | Create a new post |
| POST | `/api/posts/:id/like` | Like / unlike a post |
| POST | `/api/posts/:id/comment` | Add a comment |
| POST | `/api/posts/:id/bookmark` | Bookmark / unsave a post |

### Stories
| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/stories` | Create a new story |
| GET | `/api/stories` | Get active stories |
| POST | `/api/stories/:id/view` | Mark story as viewed |
| POST | `/api/stories/:id/reply` | Reply to a story via DM |

### Messages
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/messages/:userId` | Get conversation with a user |
| POST | `/api/messages/:userId` | Send a message |

### Notifications
| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/notifications` | Get all notifications |
| PUT | `/api/notifications/:id/read` | Mark notification as read |

---

## Real-Time Events (Socket.io)

| Event | Description |
|---|---|
| `user_online` / `user_offline` | Broadcasts live online/offline status |
| `typing` / `stop_typing` | Real-time typing indicators |
| `message_seen` | Updates message read/seen receipts |
| `new_notification` | Pushes live notifications to the client |
| `new_message` | Delivers real-time direct messages |

---

## Author

**Mustafa Nasir**
[GitHub](https://github.com/mustafanasir2231)
