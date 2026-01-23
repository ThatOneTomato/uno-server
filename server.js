const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve the single HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Store connected users: { username: socketId }
const users = {}; 

io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);
  let currentUser = null;

  // Handle user login
  socket.on('login', (username) => {
    if (users[username]) {
      socket.emit('login_error', 'Username already taken');
      return;
    }
    
    // Save user
    currentUser = username;
    users[username] = socket.id;
    socket.emit('login_success', username);
    
    // Broadcast to everyone that this user is online
    socket.broadcast.emit('user_status', { username: username, status: 'online' });
    console.log(`User logged in: ${username}`);
  });

  // Check if a user exists to add them as a contact
  socket.on('check_user', (targetUsername) => {
    const exists = users.hasOwnProperty(targetUsername);
    socket.emit('user_check_result', { username: targetUsername, exists });
  });

  // Handle Private Messages
  socket.on('private_message', ({ to, message }) => {
    const recipientSocketId = users[to];
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    if (recipientSocketId) {
      // Send to recipient
      io.to(recipientSocketId).emit('receive_message', {
        from: currentUser,
        message: message,
        timestamp: timestamp
      });
      // Send confirmation back to sender (so it shows in their UI)
      socket.emit('message_sent', {
        to: to,
        message: message,
        timestamp: timestamp
      });
    } else {
      socket.emit('system_notification', { 
        message: `User ${to} is offline or does not exist.` 
      });
    }
  });

  // Typing indicators
  socket.on('typing', (targetUser) => {
    const recipientSocketId = users[targetUser];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('display_typing', { from: currentUser });
    }
  });

  socket.on('stop_typing', (targetUser) => {
    const recipientSocketId = users[targetUser];
    if (recipientSocketId) {
      io.to(recipientSocketId).emit('hide_typing', { from: currentUser });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    if (currentUser) {
      delete users[currentUser];
      // Notify others
      socket.broadcast.emit('user_status', { username: currentUser, status: 'offline' });
      console.log(`User disconnected: ${currentUser}`);
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
