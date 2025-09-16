// multiplayer.js
// Cargado después de script.js en game.html
// conecta al servidor Socket.io servido en /socket.io/socket.io.js

// multiplayer.js
const socket = io();
const playerName =
  localStorage.getItem("orbitaPlayerName") ||
  prompt("Nombre:", `Player_${Math.floor(Math.random() * 1000)}`);
localStorage.setItem("orbitaPlayerName", playerName);

// Score local
let localScore = 0;

// Contenedor de palabras
const wordsContainer = document.getElementById("words-container") || (() => {
  const div = document.createElement("div");
  div.id = "words-container";
  document.body.appendChild(div);
  return div;
})();

// Manejo de palabras activas
const activeWords = [];

// Start
socket.on("connect", () => {
  socket.emit("newPlayer", { name: playerName });
});

// Nueva palabra
socket.on("newWord", ({ word, x, speed }) => {
  const span = document.createElement("span");
  span.className = "falling-word";
  span.innerText = word;
  span.style.left = `${x}%`;
  span.dataset.speed = speed;
  span.dataset.progress = "0";
  wordsContainer.appendChild(span);
  activeWords.push(span);
});

// Animar palabras
function animateWords() {
  activeWords.forEach((el) => {
    let p = parseFloat(el.dataset.progress) || 0;
    p += parseFloat(el.dataset.speed) * 0.5;
    el.dataset.progress = p;
    el.style.top = p + "px";

    if (p > window.innerHeight - 100) {
      // palabra tocó el piso
      el.remove();
      socket.emit("playerLost");
    }
  });
  requestAnimationFrame(animateWords);
}
requestAnimationFrame(animateWords);

// Input listener
let currentInput = "";
window.addEventListener("keydown", (e) => {
  if (e.key.length === 1 && e.key.match(/[a-zA-Z]/)) {
    currentInput += e.key;
  } else if (e.key === "Backspace") {
    currentInput = currentInput.slice(0, -1);
  } else if (e.key === "Enter") {
    checkWord();
    currentInput = "";
  }
});

function checkWord() {
  const found = activeWords.find((el) => el.innerText === currentInput);
  if (found) {
    found.remove();
    activeWords.splice(activeWords.indexOf(found), 1);
    socket.emit("wordCompleted");
  }
}

// Score updates
socket.on("scoreUpdate", ({ id, score, name }) => {
  if (id === socket.id) {
    localScore = score;
    document.getElementById("score").innerText = `Score: ${score}`;
  }
});

// DOM helpers
const otherPlayersContainerId = 'other-players-container';
let otherPlayersContainer = document.getElementById(otherPlayersContainerId);
if (!otherPlayersContainer) {
  otherPlayersContainer = document.createElement('div');
  otherPlayersContainer.id = otherPlayersContainerId;
  otherPlayersContainer.style.position = 'absolute';
  otherPlayersContainer.style.top = '10px';
  otherPlayersContainer.style.left = '10px';
  otherPlayersContainer.style.zIndex = '9999';
  document.body.appendChild(otherPlayersContainer);
}

// Scoreboard
let scoreboard = document.getElementById('multiplayer-scoreboard');
if (!scoreboard) {
  scoreboard = document.createElement('div');
  scoreboard.id = 'multiplayer-scoreboard';
  scoreboard.style.position = 'absolute';
  scoreboard.style.top = '10px';
  scoreboard.style.right = '10px';
  scoreboard.style.zIndex = '9999';
  scoreboard.style.background = 'rgba(0,0,0,0.4)';
  scoreboard.style.padding = '8px';
  scoreboard.style.borderRadius = '6px';
  scoreboard.style.color = '#fff';
  document.body.appendChild(scoreboard);
}

const otherPlayers = {}; // id -> {el, scoreEl, name}

function createOtherPlayerDom(player) {
  // player: {id, name, x, score}
  const row = document.createElement('div');
  row.id = `player-${player.id}`;
  row.style.position = 'absolute';
  row.style.top = 'auto';
  row.style.bottom = '20px';
  row.style.left = `${player.x}%`;
  row.style.transform = 'translateX(-50%)';
  row.style.pointerEvents = 'none';
  row.style.zIndex = '20';

  // simple rocket visual (small)
  const rocket = document.createElement('div');
  rocket.className = 'other-rocket';
  rocket.style.width = '18px';
  rocket.style.height = '40px';
  rocket.style.background = '#ccc';
  rocket.style.borderRadius = '4px';
  rocket.style.boxShadow = '0 0 8px rgba(255,255,255,0.2)';
  rocket.style.opacity = '0.95';
  rocket.style.transformOrigin = 'center bottom';

  const nameTag = document.createElement('div');
  nameTag.innerText = player.name;
  nameTag.style.textAlign = 'center';
  nameTag.style.fontSize = '12px';
  nameTag.style.color = '#fff';
  nameTag.style.marginTop = '4px';
  nameTag.style.textShadow = '0 0 6px #000';

  row.appendChild(rocket);
  row.appendChild(nameTag);

  document.body.appendChild(row);

  // scoreboard entry
  const scoreRow = document.createElement('div');
  scoreRow.id = `score-${player.id}`;
  scoreRow.innerText = `${player.name}: ${player.score || 0}`;
  scoreboard.appendChild(scoreRow);

  otherPlayers[player.id] = { el: row, scoreEl: scoreRow, name: player.name };
}

function removeOtherPlayerDom(id) {
  if (otherPlayers[id]) {
    const { el, scoreEl } = otherPlayers[id];
    el.remove();
    scoreEl.remove();
    delete otherPlayers[id];
  }
}

// conexión
socket.on('connect', () => {
  socket.emit('newPlayer', { name: playerName });
});

// recibir listado actual
socket.on('currentPlayers', (players) => {
  // players = array
  players.forEach(p => {
    if (p.id !== socket.id && !otherPlayers[p.id]) createOtherPlayerDom(p);
  });
});

// nuevo jugador
socket.on('playerJoined', (player) => {
  if (player.id !== socket.id && !otherPlayers[player.id]) createOtherPlayerDom(player);
});

// movimiento de otro
socket.on('playerMoved', ({ id, x }) => {
  if (otherPlayers[id]) {
    otherPlayers[id].el.style.left = `${x}%`;
  }
});

// actualización de score global
socket.on('scoreUpdate', ({ id, score, name }) => {
  if (id === socket.id) {
    // actualizar tu scoreboard si quieres
  } else if (otherPlayers[id]) {
    otherPlayers[id].scoreEl.innerText = `${name}: ${score}`;
  } else {
    // si llega un score de jugador que aún no conocíamos
    createOtherPlayerDom({ id, name, x: 50, score });
  }
});

// jugador left
socket.on('playerLeft', ({ id }) => {
  removeOtherPlayerDom(id);
});

/* --- Emisión periódica: posición y score --- 
   Leemos la posición de tu nave y el puntaje del DOM cada X ms
*/
function readLocalShipPositionPercent() {
  const rocket = document.querySelector('#rocket-ship');
  if (!rocket) return 50;
  const rect = rocket.getBoundingClientRect();
  const viewportW = window.innerWidth;
  // centramos en mitad de la nave
  const centerX = rect.left + rect.width / 2;
  const percent = Math.round((centerX / viewportW) * 100);
  return Math.min(100, Math.max(0, percent));
}

function readLocalScore() {
  const scoreDom = document.querySelector('#score');
  if (!scoreDom) return 0;
  const text = scoreDom.innerText || '';
  const match = text.match(/(\d+)/);
  if (match) return parseInt(match[1], 10);
  return 0;
}

setInterval(() => {
  const x = readLocalShipPositionPercent();
  socket.emit('playerMove', { x });

  const score = readLocalScore();
  socket.emit('scoreUpdate', { score });
}, 250);

