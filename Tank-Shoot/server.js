const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Servir archivos estáticos desde la carpeta public
app.use(express.static("public"));

// También servir el cliente.js como estático
app.get("/client.js", (req, res) => {
  res.sendFile(path.join(__dirname, "client.js"));
});

// jugadores y balas
let players = {};
let bullets = [];

// Función para generar colores aleatorios
function getRandomColor() {
  return `hsl(${Math.floor(Math.random() * 360)}, 70%, 50%)`;
}

// Función para crear una bala en la dirección correcta
function createBullet(player, ownerId) {
  const speed = 8;
  const vx = Math.cos(player.dir) * speed;
  const vy = Math.sin(player.dir) * speed;
  
  return {
    x: player.x,
    y: player.y,
    vx: vx,
    vy: vy,
    owner: ownerId
  };
}

// Bucle de juego para actualizar balas y verificar colisiones
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
      // Detectar colisión (simplificado para forma circular)
      const dx = b.x - p.x;
      const dy = b.y - p.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (b.owner !== id && distance < 30) { // 30 es el radio aproximado del tanque + bala
        console.log(`Jugador ${id} fue golpeado por ${b.owner}`);
        bullets.splice(i, 1);
        
        // restar vida
        p.lives -= 1;
        
        // sumar punto al atacante
        if (players[b.owner]) {
          players[b.owner].score += 1;
        }
        
        // Reproducir sonido de explosión
        io.emit("playExplosionSound");
      
        // si pierde todas las vidas → respawn
        if (p.lives <= 0) {
          p.lives = 3;
          p.x = Math.random() * 700 + 50;
          p.y = Math.random() * 500 + 50;
          p.score = 0; // Reiniciar puntuación al respawnear
        }
      
        io.emit("updatePlayers", players);
        break;
      }
    }
  }

  io.emit("bulletsUpdate", bullets);
}, 1000 / 30); // 30 FPS

// Evento de conexión de jugadores
io.on("connection", (socket) => {
  console.log("Jugador conectado:", socket.id);

  // nuevo jugador
  players[socket.id] = { 
    x: Math.random() * 700 + 50, 
    y: Math.random() * 500 + 50, 
    color: getRandomColor(), 
    dir: 0, // dirección en radianes
    lives: 3, 
    score: 0 
  };

  // enviar jugadores actuales al nuevo jugador
  socket.emit("currentPlayers", players);
  
  // notificar a los demás sobre el nuevo jugador (con toda la información)
  socket.broadcast.emit("newPlayer", players[socket.id]);

  // movimiento
  socket.on("move", (data) => {
    if (players[socket.id]) {
      players[socket.id].x = data.x;
      players[socket.id].y = data.y;
      players[socket.id].dir = data.dir;
      
      // Notificar a todos los demás jugadores
      socket.broadcast.emit("playerMoved", {
        id: socket.id,
        x: data.x,
        y: data.y,
        dir: data.dir
      });
    }
  });

  // nuevo disparo
  socket.on("shoot", () => {
    if (!players[socket.id]) return;

    const p = players[socket.id];
    const newBullet = createBullet(p, socket.id);
    bullets.push(newBullet);
    
    // Reproducir sonido de disparo para todos
    io.emit("playShootSound");
  });

  // solicitud de respawn
  socket.on("respawn", () => {
    if (players[socket.id]) {
      players[socket.id].lives = 3;
      players[socket.id].x = Math.random() * 700 + 50;
      players[socket.id].y = Math.random() * 500 + 50;
      players[socket.id].score = 0;
      io.emit("updatePlayers", players);
    }
  });

  // desconexión
  socket.on("disconnect", () => {
    console.log("Jugador desconectado:", socket.id);
    delete players[socket.id];
    io.emit("playerDisconnected", socket.id);
  });
});

server.listen(3000, () => {
  console.log("Servidor corriendo en http://localhost:3000");
});