const socket = io();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let players = {};
let bullets = [];
let myId = null;

const speed = 4;

const tankImg = new Image();
tankImg.src = "/Asset/Tank.png";

const bulletImg = new Image();
bulletImg.src = "bullet.png";

const shootSound = new Audio("shoot.wav");
const explosionSound = new Audio("explosion.wav");

document.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  if (e.key === " ") {
    socket.emit("shoot");
    shootSound.currentTime = 0;
    shootSound.play();
  }
});

// cuando recibimos que un jugador perdió vida → explota
socket.on("updatePlayers", (serverPlayers) => {
  // detectar si alguien perdió vida
  for (let id in players) {
    if (serverPlayers[id] && serverPlayers[id].lives < players[id].lives) {
      explosionSound.currentTime = 0;
      explosionSound.play();
    }
  }
  players = serverPlayers;
});

// actualizar lista de jugadores
socket.on("updatePlayers", (serverPlayers) => {
  players = serverPlayers;
});

function drawHUD() {
  if (!myId || !players[myId]) return;
  const me = players[myId];
  ctx.fillStyle = "white";
  ctx.font = "20px Arial";
  ctx.fillText(`Vidas: ${me.lives}  |  Puntos: ${me.score}`, 20, 30);
}

// nuevo jugador
socket.on("newPlayer", (player) => {
  players[player.id] = { x: player.x, y: player.y, color: player.color, dir: "down" };
});

// jugador movido
socket.on("playerMoved", (player) => {
  players[player.id] = { x: player.x, y: player.y, color: player.color, dir: player.dir };
});

// balas
socket.on("bulletsUpdate", (serverBullets) => {
  bullets = serverBullets;
});

// jugador desconectado
socket.on("playerDisconnected", (id) => {
  delete players[id];
});

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // dibujar jugadores con sprite
  for (let id in players) {
    const p = players[id];
    ctx.save();
    ctx.translate(p.x + 20, p.y + 20); // centro
    if (p.dir === "up") ctx.rotate(0);
    if (p.dir === "right") ctx.rotate(Math.PI / 2);
    if (p.dir === "down") ctx.rotate(Math.PI);
    if (p.dir === "left") ctx.rotate(-Math.PI / 2);
    ctx.drawImage(tankImg, -20, -20, 40, 40);
    ctx.restore();
  }

  // dibujar balas con sprite
  bullets.forEach((b) => {
    ctx.drawImage(bulletImg, b.x, b.y, 8, 8);
  });
}

function handleInput() {
  if (!myId) return;
  const p = players[myId];
  if (!p) return;

  if (keys["ArrowUp"]) {
    p.y -= speed;
    p.dir = "up";
  }
  if (keys["ArrowDown"]) {
    p.y += speed;
    p.dir = "down";
  }
  if (keys["ArrowLeft"]) {
    p.x -= speed;
    p.dir = "left";
  }
  if (keys["ArrowRight"]) {
    p.x += speed;
    p.dir = "right";
  }

  socket.emit("move", { x: p.x, y: p.y, dir: p.dir });
}

const keys = {};
document.addEventListener("keydown", (e) => {
  keys[e.key] = true;

  // disparo con espacio
  if (e.key === " ") {
    socket.emit("shoot");
  }
});
document.addEventListener("keyup", (e) => (keys[e.key] = false));

function gameLoop() {
  handleInput();
  draw();
  requestAnimationFrame(gameLoop);
}

gameLoop();
drawHUD();