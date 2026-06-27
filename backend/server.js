const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const followRoutes = require('./routes/followRoutes');
const messageRoutes = require('./routes/messageRoutes');
const { initSocket } = require('./utils/socket');
const userRoutes = require('./routes/userRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const storyRoutes = require('./routes/storyRoutes'); // NAYA IMPORT
const path = require('path');
const dns = require('dns');
require('dotenv').config();

// Routes Imports
const authRoutes = require('./routes/authRoutes');
const postRoutes = require('./routes/postRoutes');
const commentRoutes = require('./routes/commentRoutes');

// DNS Settings
dns.setServers(['8.8.8.8', '1.1.1.1']); 

const app = express(); 

// Middleware
app.use(express.json());
app.use(cors());

// Routes Setup
app.use('/api/auth', authRoutes);
app.use('/api/posts', postRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/follow', followRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/stories', storyRoutes); // NAYI LINE
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Socket.io Setup
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] }
});

initSocket(io);

// Database Connection
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB Database Connected Successfully"))
  .catch((err) => console.log("Database Connection Error:", err));

app.get('/', (req, res) => {
    res.send("SocialSphere Backend is running!");
});

// Port Configuration
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server is running on port ${PORT}`));