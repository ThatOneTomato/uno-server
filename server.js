// server.js - Simple Multiplayer Backend
const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, { cors: { origin: "*" } });

app.use(express.static(__dirname)); // Serve index.html

let gameState = {
    players: [],
    deck: [], // (Full logic would move Deck/Game logic here)
    discard: { color: 'red', value: '0' },
    currentPlayerIndex: 0
};

io.on('connection', (socket) => {
    console.log('Player connected:', socket.id);
    
    // Add player (Simplified: Max 4, no persistent state management)
    gameState.players.push({ id: socket.id, name: "Player " + gameState.players.length, hand: [] });
    
    // Broadcast update
    io.emit('gameState', gameState);

    socket.on('playCard', (cardIndex) => {
        // In a real app, validate move on server here!
        // For this example, we trust the client (not secure, but simple)
        io.emit('gameState', gameState); // Echo back new state
    });

    socket.on('disconnect', () => {
        gameState.players = gameState.players.filter(p => p.id !== socket.id);
        io.emit('gameState', gameState);
    });
});

http.listen(3000, () => console.log('UNO Server running on port 3000'));
