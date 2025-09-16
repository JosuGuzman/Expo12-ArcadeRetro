// server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Sirve la carpeta 'public' (mueve tus archivos ahí o ajusta la ruta)
app.use(express.static(path.join(__dirname, 'public')));

// Estado simple en memoria
const players = {}; // socketId -> {id, name, score, x}

io.on('connection', (socket) => {
  console.log('nuevo cliente:', socket.id);

  socket.on('newPlayer', (payload) => {
    // payload: {name}
    const player = {
      id: socket.id,
      name: payload?.name || `Player-${socket.id.substring(0,4)}`,
      score: 0,
      x: 50 // posición por defecto (porcentaje)
    };
    players[socket.id] = player;
    // informar al nuevo jugador el listado actual
    socket.emit('currentPlayers', Object.values(players));
    // anunciar al resto
    socket.broadcast.emit('playerJoined', player);
    console.log('playerJoined:', player.name);
  });

  socket.on('playerMove', (payload) => {
    // payload: { x }  (porcentaje 0-100)
    if (players[socket.id]) {
      players[socket.id].x = payload.x;
      // re-broadcast para todos (podés optimizar)
      socket.broadcast.emit('playerMoved', { id: socket.id, x: payload.x });
    }
  });

  socket.on('scoreUpdate', (payload) => {
    // payload: { score }
    if (players[socket.id]) {
      players[socket.id].score = payload.score;
      io.emit('scoreUpdate', { id: socket.id, score: payload.score, name: players[socket.id].name });
    }
  });

  socket.on('disconnect', () => {
    console.log('disconnect', socket.id);
    if (players[socket.id]) {
      const leaving = players[socket.id];
      delete players[socket.id];
      io.emit('playerLeft', { id: socket.id, name: leaving.name });
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Servidor escuchando en http://localhost:${PORT}`);
});