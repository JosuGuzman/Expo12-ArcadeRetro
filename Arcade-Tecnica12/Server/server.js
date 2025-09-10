const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));
app.use('/games', express.static('games'));

let players = {}; // { socketId: {game, ip, playerName} }
let games = {};   // { gameName: {players: [socketId], ball: {...}} }

io.on('connection', (socket) => {
  console.log(`Jugador conectado: ${socket.id}`);

  socket.on('joinGame', ({ game, ip, player }) => {
    // Validar IP duplicada
    let sameIP = Object.values(players).some(p => p.ip === ip && p.game === game);
    if(sameIP) {
      socket.emit('errorMsg', 'Otro jugador con la misma IP ya está en el juego.');
      return;
    }

    players[socket.id] = { game, ip, player };
    if(!games[game]) games[game] = { players: [], ball: { x:300, y:200, dx:5, dy:3, size:10 } };
    games[game].players.push(socket.id);

    if(games[game].players.length===2) {
      io.to(games[game].players[0]).emit('ready', 'Comienza el juego!');
      io.to(games[game].players[1]).emit('ready', 'Comienza el juego!');
    }
  });

  // Movimiento de la paleta
  socket.on('movePaddle', y => {
    let game = players[socket.id].game;
    let opponentId = games[game].players.find(id => id !== socket.id);
    if(opponentId) io.to(opponentId).emit('opponentMove', y);
  });

  // Posición de la pelota
  socket.on('ballPosition', ball => {
    let game = players[socket.id].game;
    games[game].ball = ball;
    games[game].players.forEach(id => {
      if(id!==socket.id) io.to(id).emit('ballUpdate', ball);
    });
  });

  socket.on('disconnect', () => {
    console.log(`Jugador desconectado: ${socket.id}`);
    let game = players[socket.id]?.game;
    if(game) {
      games[game].players = games[game].players.filter(id => id!==socket.id);
      games[game].players.forEach(id => io.to(id).emit('errorMsg', 'Tu oponente se desconectó. Juego pausado.'));
    }
    delete players[socket.id];
  });
});

server.listen(3000, () => console.log('Servidor escuchando en http://localhost:3000'));