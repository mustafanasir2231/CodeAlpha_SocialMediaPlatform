let ioInstance = null;
const userSocketMap = {}; // userId (string) -> socket.id

// NAYA: Sabko current online users ki list bhejna (jo bhi userSocketMap mein keys hain, woh online hain)
const broadcastOnlineUsers = () => {
  if (ioInstance) {
    ioInstance.emit('online-users', Object.keys(userSocketMap));
  }
};

const initSocket = (io) => {
  ioInstance = io;

  io.on('connection', (socket) => {
    console.log("User connected:", socket.id);

    // NAYA: Naya socket connect hote hi turant usko current online list bhej do
    // (taake page load pe foran sabka status pata chal jaye, kisi ke register-user ka wait na karna pade)
    socket.emit('online-users', Object.keys(userSocketMap));

    // Har user login ke baad apni userId register karwata hai
    socket.on('register-user', (userId) => {
      userSocketMap[userId] = socket.id;
      console.log(`User ${userId} registered with socket ${socket.id}`);

      // NAYA: koi register ho — sabko updated online list bhej do
      broadcastOnlineUsers();
    });

    // Post events
    socket.on('new-post', (post) => {
      io.emit('receive-post', post);
    });

    socket.on('delete-post', (postId) => {
      io.emit('post-deleted', postId);
    });

    // Like event
    socket.on('update-like', (updatedPost) => {
      io.emit('like-updated', updatedPost);
    });

    // Edit event — sabko updated post bhejo
    socket.on('edit-post', (updatedPost) => {
      io.emit('post-edited', updatedPost);
    });

    // Comment event
    socket.on('new-comment', ({ postId, comment }) => {
      io.emit('comment-added', { postId, comment });
    });

    // Follow events
    socket.on('follow-request-sent', ({ recipientId, requesterUsername }) => {
      const recipientSocket = userSocketMap[recipientId];
      if (recipientSocket) {
        io.to(recipientSocket).emit('new-follow-request', { requesterUsername });
      }
    });

    socket.on('follow-accepted', ({ requesterId, accepterUsername }) => {
      const requesterSocket = userSocketMap[requesterId];
      if (requesterSocket) {
        io.to(requesterSocket).emit('follow-was-accepted', { accepterUsername });
      }
    });

    // Typing indicator
    socket.on('typing', ({ recipientId, senderUsername }) => {
      const recipientSocket = userSocketMap[recipientId];
      if (recipientSocket) {
        io.to(recipientSocket).emit('user-typing', { senderUsername });
      }
    });

    socket.on('stop-typing', ({ recipientId, senderUsername }) => {
      const recipientSocket = userSocketMap[recipientId];
      if (recipientSocket) {
        io.to(recipientSocket).emit('user-stop-typing', { senderUsername });
      }
    });

    socket.on('disconnect', () => {
      for (const [userId, id] of Object.entries(userSocketMap)) {
        if (id === socket.id) {
          delete userSocketMap[userId];
          console.log(`User ${userId} disconnected`);
        }
      }

      // NAYA: koi disconnect ho — sabko updated (chhota) online list bhej do
      broadcastOnlineUsers();
    });
  });
};

// Specific user ko event bhejna (controllers mein use hoga)
const emitToUser = (userId, event, data) => {
  const socketId = userSocketMap[userId?.toString()];
  if (socketId && ioInstance) {
    ioInstance.to(socketId).emit(event, data);
  }
};

// Sab ko broadcast karna
const emitToAll = (event, data) => {
  if (ioInstance) {
    ioInstance.emit(event, data);
  }
};

module.exports = { initSocket, emitToUser, emitToAll };