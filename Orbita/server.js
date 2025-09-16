// server.js
const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, "Public")));

const players = {}; // socketId -> {id, name, score, x}
let gameInterval = null;

// Palabras base (podés expandir)
const baseWords = [
  "function", "variable", "const", "let", "class", "object",
  "string", "boolean", "array", "if", "else", "for", "while",
  "socket", "server", "client", "event", "node", "express"
];

// Emite nueva palabra a todos
function spawnWord() {
  const word = baseWords[Math.floor(Math.random() * baseWords.length)];
  const x = Math.floor(Math.random() * 80) + 10; // entre 10% y 90%
  const speed = Math.random() * 1 + 0.5; // velocidad relativa
  io.emit("newWord", { word, x, speed });
}

// Inicia el juego
function startGame() {
  io.emit("startGame");
  if (gameInterval) clearInterval(gameInterval);
  gameInterval = setInterval(spawnWord, 3000); // cada 3s
}

io.on("connection", (socket) => {
  console.log("nuevo cliente:", socket.id);

  socket.on("newPlayer", (payload) => {
    const player = {
      id: socket.id,
      name: payload?.name || `Player-${socket.id.substring(0, 4)}`,
      score: 0,
      x: 50
    };
    players[socket.id] = player;

    socket.emit("currentPlayers", Object.values(players));
    socket.broadcast.emit("playerJoined", player);

    // Arranca juego si hay al menos 2 jugadores
    if (Object.keys(players).length >= 1) {
      startGame();
    }
  });

  socket.on("playerMove", ({ x }) => {
    if (players[socket.id]) {
      players[socket.id].x = x;
      socket.broadcast.emit("playerMoved", { id: socket.id, x });
    }
  });

  socket.on("wordCompleted", () => {
    if (players[socket.id]) {
      players[socket.id].score += 10;
      io.emit("scoreUpdate", {
        id: socket.id,
        score: players[socket.id].score,
        name: players[socket.id].name
      });
    }
  });

  socket.on("playerLost", () => {
    if (players[socket.id]) {
      console.log(players[socket.id].name, "ha perdido");
      io.emit("playerLost", { id: socket.id, name: players[socket.id].name });
    }
  });

  socket.on("disconnect", () => {
    if (players[socket.id]) {
      const leaving = players[socket.id];
      delete players[socket.id];
      io.emit("playerLeft", { id: socket.id, name: leaving.name });
    }

    if (Object.keys(players).length === 0) {
      clearInterval(gameInterval);
      gameInterval = null;
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Servidor en http://localhost:${PORT}`);
});