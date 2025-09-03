const socket = io();

const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

let players = {};
let bullets = [];
let myId = null;
let keys = {};

const speed = 4;

// Cargar recursos
const tankImg = new Image();
tankImg.src = "Tank.png";

const bulletImg = new Image();
bulletImg.src = "bullet.png";

const shootSound = new Audio("shoot.wav");
const explosionSound = new Audio("explosion.wav");

// Inicializar el juego cuando se carguen los recursos
window.addEventListener('load', () => {
    // Precargar sonidos
    shootSound.load();
    explosionSound.load();
    
    // Iniciar bucle del juego
    gameLoop();
});

// Eventos de teclado
document.addEventListener("keydown", (e) => {
    keys[e.key] = true;

    if (e.key === " ") {
        socket.emit("shoot");
        shootSound.currentTime = 0;
        shootSound.play();
        e.preventDefault(); // Evitar que el espacio haga scroll
    }
});

document.addEventListener("keyup", (e) => {
    keys[e.key] = false;
});

// Eventos de socket
socket.on("connect", () => {
    console.log("Conectado al servidor");
});

socket.on("currentPlayers", (serverPlayers) => {
    players = serverPlayers;
    myId = socket.id;
    updateHUD();
});

socket.on("newPlayer", (playerInfo) => {
    players[playerInfo.id] = playerInfo;
});

socket.on("playerMoved", (playerInfo) => {
    if (players[playerInfo.id]) {
        players[playerInfo.id].x = playerInfo.x;
        players[playerInfo.id].y = playerInfo.y;
        players[playerInfo.id].dir = playerInfo.dir;
    }
});

socket.on("updatePlayers", (serverPlayers) => {
    // Detectar si alguien perdió vida
    for (let id in players) {
        if (serverPlayers[id] && serverPlayers[id].lives < players[id].lives) {
            explosionSound.currentTime = 0;
            explosionSound.play();
        }
    }
    
    players = serverPlayers;
    updateHUD();
    
    // Comprobar si el jugador actual ha perdido todas las vidas
    if (players[myId] && players[myId].lives <= 0) {
        document.getElementById("gameOver").style.display = "block";
        document.getElementById("finalScore").textContent = players[myId].score;
    }
});

socket.on("bulletsUpdate", (serverBullets) => {
    bullets = serverBullets;
});

socket.on("playerDisconnected", (playerId) => {
    delete players[playerId];
});

socket.on("playShootSound", () => {
    shootSound.currentTime = 0;
    shootSound.play();
});

socket.on("playExplosionSound", () => {
    explosionSound.currentTime = 0;
    explosionSound.play();
});

// Actualizar HUD con información del jugador
function updateHUD() {
    if (myId && players[myId]) {
        document.getElementById("livesCount").textContent = players[myId].lives;
        document.getElementById("scoreCount").textContent = players[myId].score;
    }
}

// Dibujar jugadores en el canvas
function drawPlayers() {
    for (const id in players) {
        if (players.hasOwnProperty(id)) {
            const player = players[id];
            
            ctx.save();
            ctx.translate(player.x, player.y);
            ctx.rotate(player.dir);
            
            // Dibujar tanque
            ctx.drawImage(tankImg, -tankImg.width/2, -tankImg.height/2);
            
            // Dibujar indicador de color del jugador
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
            
            // Dibujar nombre/jugador (solo para otros jugadores)
            if (id !== myId) {
                ctx.fillStyle = player.color;
                ctx.font = '12px Arial';
                ctx.textAlign = 'center';
                ctx.fillText(`Jugador ${id.substring(0, 5)}`, player.x, player.y - 30);
            }
        }
    }
}

// Dibujar balas en el canvas
function drawBullets() {
    for (const bullet of bullets) {
        ctx.save();
        ctx.translate(bullet.x, bullet.y);
        
        // Dibujar bala
        ctx.drawImage(bulletImg, -bulletImg.width/2, -bulletImg.height/2);
        
        ctx.restore();
    }
}

// Manejo de entrada del teclado
function handleInput() {
    if (!myId || !players[myId]) return;
    
    const player = players[myId];
    let moved = false;
    let direction = player.dir;
    
    if (keys["ArrowUp"]) {
        player.y -= speed;
        moved = true;
    }
    if (keys["ArrowDown"]) {
        player.y += speed;
        moved = true;
    }
    if (keys["ArrowLeft"]) {
        player.x -= speed;
        direction -= 0.05;
        moved = true;
    }
    if (keys["ArrowRight"]) {
        player.x += speed;
        direction += 0.05;
        moved = true;
    }
    
    // Mantener al jugador dentro de los límites del canvas
    player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
    player.y = Math.max(20, Math.min(canvas.height - 20, player.y));
    
    if (moved) {
        socket.emit("move", { 
            x: player.x, 
            y: player.y, 
            dir: direction 
        });
    }
}

// Bucle principal del juego
function gameLoop() {
    // Limpiar canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Manejar entrada
    handleInput();
    
    // Dibujar elementos del juego
    drawPlayers();
    drawBullets();
    
    // Continuar el bucle
    requestAnimationFrame(gameLoop);
}

// Configurar botón de respawn
document.getElementById("respawnButton").addEventListener("click", () => {
    // Solicitar respawn al servidor
    socket.emit("respawn");
    document.getElementById("gameOver").style.display = "none";
});