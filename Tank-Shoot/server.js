const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

// jugadores y balas
let players = {};
let bullets = [];

setInterval(() => {
    // mover balas
    bullets.forEach((b) => {
        b.x += b.vx;
        b.y += b.vy;
    });
    
    // eliminar balas fuera de la pantalla
    bullets = bullets.filter((b) => b.x >= 0 && b.x <= 800 && b.y >= 0 && b.y <= 600);
    
    // chequear colisiones con jugadores
    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i];
        for (let id in players) {
            const p = players[id];
            if (
                b.owner !== id &&
                b.x < p.x + 40 &&
                b.x + 8 > p.x &&
                b.y < p.y + 40 &&
                b.y + 8 > p.y
    ) {
        console.log(`Jugador ${id} fue golpeado por ${b.owner}`);
        bullets.splice(i, 1);
        
        // restar vida
        p.lives -= 1;
        
        // sumar punto al atacante
        if (players[b.owner]) {
          players[b.owner].score += 1;
        }
      
        // si pierde todas las vidas → respawn
        if (p.lives <= 0) {
          p.lives = 3;
          p.x = Math.random() * 700;
          p.y = Math.random() * 500;
        }
      
        io.emit("updatePlayers", players);
        break;
        }
    }
  }

  io.emit("bulletsUpdate", bullets);
}, 1000 / 30);

// Evento de conexión de jugadores
io.on("connection", (socket) => {
  console.log("Jugador conectado:", socket.id);

  // nuevo jugador
  players[socket.id] = { 
    x: 100, 
    y: 100, 
    color: getRandomColor(), 
    dir: "down", 
    lives: 3, 
    score: 0 
  };

  // enviar jugadores actuales
  socket.emit("currentPlayers", players);
  // notificar a los demás
  socket.broadcast.emit("newPlayer", { id: socket.id, ...players[socket.id] });
  io.emit("updatePlayers", players);

  socket.on("move", (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].dir = data.dir; // dirección del tanque
      io.emit("playerMoved", { id: socket.id, ...players[socket.id] });
    }
  });

  // nuevo disparo
  socket.on("shoot", () => {
    if (!players[socket.id]) return;

    const p = players[socket.id];
    let vx = 0, vy = 0;

    if (p.dir === "up") vy = -8;
    if (p.dir === "down") vy = 8;
    if (p.dir === "left") vx = -8;
    if (p.dir === "right") vx = 8;

    bullets.push({ x: p.x + 16, y: p.y + 16, vx, vy, owner: socket.id });
  });
});

io.on("connection", (socket) => {
  console.log("Jugador conectado:", socket.id);

  // asigna posición inicial
  players[socket.id] = { x: 100, y: 100, color: getRandomColor() };

  // envía todos los jugadores al recién conectado
  socket.emit("currentPlayers", players);

  // notifica a los demás
  socket.broadcast.emit("newPlayer", { id: socket.id, ...players[socket.id] });

  // movimiento
  socket.on("move", (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      io.emit("playerMoved", { id: socket.id, ...players[socket.id] });
    }
  });

  // desconexión
  socket.on("disconnect", () => {
    console.log("Jugador desconectado:", socket.id);
    delete players[socket.id];
    io.emit("playerDisconnected", socket.id);
  });
});

function getRandomColor() {
  return `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;
}

server.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});