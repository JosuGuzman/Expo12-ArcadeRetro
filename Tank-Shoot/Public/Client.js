// Variables globales
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const connectionStatus = document.getElementById('connectionStatus');
const livesCount = document.getElementById('livesCount');
const scoreCount = document.getElementById('scoreCount');
const gameOverDiv = document.getElementById('gameOver');
const finalScore = document.getElementById('finalScore');
const respawnButton = document.getElementById('respawnButton');

let socket;
let players = {};
let bullets = [];
let currentPlayerId;
let keys = {};
const speed = 4;

// Cargar recursos
const tankImage = new Image();
tankImage.src = 'Tank.png';

const bulletImage = new Image();
bulletImage.src = 'bullet.png';

const shootSound = new Audio('shoot.wav');
const explosionSound = new Audio('explosion.wav');

// Inicializar el juego cuando se carguen los recursos
window.addEventListener('load', initGame);

// Inicializar el juego
function initGame() {
    // Precargar sonidos
    shootSound.load();
    explosionSound.load();
    
    // Inicializar Socket.io
    initSocket();
    
    // Configurar controles
    initInput();
    
    // Configurar botón de respawn
    respawnButton.addEventListener('click', () => {
        socket.emit('respawn');
        hideGameOver();
    });
    
    // Iniciar bucle del juego
    gameLoop();
}

// Inicializar conexión Socket.io
function initSocket() {
    socket = io();
    
    socket.on('connect', () => {
        connectionStatus.textContent = 'Conectado';
        connectionStatus.classList.remove('disconnected');
        connectionStatus.classList.add('connected');
    });
    
    socket.on('disconnect', () => {
        connectionStatus.textContent = 'Desconectado';
        connectionStatus.classList.remove('connected');
        connectionStatus.classList.add('disconnected');
    });
    
    // Eventos del juego
    socket.on('currentPlayers', (serverPlayers) => {
        players = serverPlayers;
        currentPlayerId = socket.id;
        updateHUD();
    });
    
    socket.on('newPlayer', (playerInfo) => {
        players[playerInfo.id] = playerInfo;
    });
    
    socket.on('playerMoved', (playerInfo) => {
        if (players[playerInfo.id]) {
            players[playerInfo.id].x = playerInfo.x;
            players[playerInfo.id].y = playerInfo.y;
            players[playerInfo.id].dir = playerInfo.dir;
        }
    });
    
    socket.on('updatePlayers', (serverPlayers) => {
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
        if (players[currentPlayerId] && players[currentPlayerId].lives <= 0) {
            showGameOver();
        }
    });
    
    socket.on('bulletsUpdate', (serverBullets) => {
        bullets = serverBullets;
    });
    
    socket.on('playerDisconnected', (playerId) => {
        delete players[playerId];
    });
    
    // Sonidos
    socket.on('playShootSound', () => {
        shootSound.currentTime = 0;
        shootSound.play();
    });
    
    socket.on('playExplosionSound', () => {
        explosionSound.currentTime = 0;
        explosionSound.play();
    });
}

// Configurar controles de entrada
function initInput() {
    window.addEventListener('keydown', (e) => {
        keys[e.key] = true;
        
        // Disparar con espacio
        if (e.key === ' ' && players[currentPlayerId] && players[currentPlayerId].lives > 0) {
            socket.emit('shoot');
            e.preventDefault();
        }
    });
    
    window.addEventListener('keyup', (e) => {
        keys[e.key] = false;
    });
}

// Actualizar HUD con información del jugador
function updateHUD() {
    if (currentPlayerId && players[currentPlayerId]) {
        livesCount.textContent = players[currentPlayerId].lives;
        scoreCount.textContent = players[currentPlayerId].score;
    }
}

// Mostrar pantalla de Game Over
function showGameOver() {
    finalScore.textContent = players[currentPlayerId].score;
    gameOverDiv.style.display = 'block';
}

// Ocultar pantalla de Game Over
function hideGameOver() {
    gameOverDiv.style.display = 'none';
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
            if (tankImage.complete) {
                ctx.drawImage(tankImage, -tankImage.width/2, -tankImage.height/2);
            } else {
                // Dibujar placeholder si la imagen no está cargada
                ctx.fillStyle = player.color;
                ctx.fillRect(-20, -20, 40, 40);
            }
            
            // Dibujar indicador de color del jugador
            ctx.fillStyle = player.color;
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
            
            // Dibujar nombre/jugador (solo para otros jugadores)
            if (id !== currentPlayerId) {
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
        if (bulletImage.complete) {
            ctx.drawImage(bulletImage, -bulletImage.width/2, -bulletImage.height/2);
        } else {
            // Dibujar placeholder si la imagen no está cargada
            ctx.fillStyle = '#ffff00';
            ctx.beginPath();
            ctx.arc(0, 0, 4, 0, Math.PI * 2);
            ctx.fill();
        }
        
        ctx.restore();
    }
}

// Manejo de entrada del teclado
function handleInput() {
    if (!currentPlayerId || !players[currentPlayerId]) return;
    
    const player = players[currentPlayerId];
    let moved = false;
    let direction = player.dir;
    
    if (keys['ArrowUp']) {
        player.y -= speed;
        moved = true;
    }
    if (keys['ArrowDown']) {
        player.y += speed;
        moved = true;
    }
    if (keys['ArrowLeft']) {
        player.x -= speed;
        direction -= 0.05;
        moved = true;
    }
    if (keys['ArrowRight']) {
        player.x += speed;
        direction += 0.05;
        moved = true;
    }
    
    // Mantener al jugador dentro de los límites del canvas
    player.x = Math.max(20, Math.min(canvas.width - 20, player.x));
    player.y = Math.max(20, Math.min(canvas.height - 20, player.y));
    
    if (moved) {
        socket.emit('move', { 
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