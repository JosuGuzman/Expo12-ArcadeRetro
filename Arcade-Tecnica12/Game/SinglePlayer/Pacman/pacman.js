// pacman.js - versión muy simple: recoger puntos en una cuadrícula mientras evitas 1 fantasma simple.
// Cuando el juego termina (ganas o pierdes) se resta 1 coin y se redirige al lobby si coins==0.

const player = JSON.parse(sessionStorage.getItem('AT12_player')||'null');
if(!player) location.href = '../../../Public/index.html';

document.getElementById('pn').textContent = player.name;
document.getElementById('coins').textContent = localStorage.getItem('AT12_coins') || '0';

const canvas = document.getElementById('c');
const ctx = canvas.getContext('2d');

const size = 12;
const cols = Math.floor(canvas.width / size);
const rows = Math.floor(canvas.height / size);

let map = [];
let pellets = 0;

// generate simple map: 0 empty, 1 wall, 2 pellet
for(let y=0;y<rows;y++){
  map[y] = [];
  for(let x=0;x<cols;x++){
    if(x===0||y===0||x===cols-1||y===rows-1) map[y][x]=1;
    else{
      if(Math.random()<0.12){ map[y][x]=1; }
      else{ map[y][x]=2; pellets++; }
    }
  }
}

let pac = {x:1,y:1,dir:{x:0,y:0}};
let ghost = {x:cols-2,y:rows-2,dir:{x:0,y:0}};
let score = 0;
let gameOver=false;

function draw(){
  ctx.clearRect(0,0,canvas.width,canvas.height);
  for(let y=0;y<rows;y++){
    for(let x=0;x<cols;x++){
      if(map[y][x]===1){
        ctx.fillStyle = '#222';
        ctx.fillRect(x*size,y*size,size,size);
      }else{
        if(map[y][x]===2){
          ctx.fillStyle = '#ffd700';
          ctx.fillRect(x*size + size/2 -2, y*size + size/2 -2, 4,4);
        }
      }
    }
  }
  // pac
  ctx.fillStyle = '#ffd400';
  ctx.beginPath();
  ctx.arc(pac.x*size + size/2, pac.y*size + size/2, size/2 -1, 0, Math.PI*2);
  ctx.fill();

  // ghost
  ctx.fillStyle = '#ff5bff';
  ctx.beginPath();
  ctx.arc(ghost.x*size + size/2, ghost.y*size + size/2, size/2 -1, 0, Math.PI*2);
  ctx.fill();

  // HUD
  ctx.fillStyle = '#fff';
  ctx.fillText('Score: ' + score, 10, canvas.height - 6);
}

function step(){
  if(gameOver) return;
  // move pac
  const nx = pac.x + pac.dir.x;
  const ny = pac.y + pac.dir.y;
  if(map[ny] && map[ny][nx] !== 1){
    pac.x = nx; pac.y = ny;
  }

  // collect pellet
  if(map[pac.y][pac.x] === 2){
    map[pac.y][pac.x] = 0;
    score += 10;
    pellets--;
    if(pellets <= 0){
      endGame(true);
    }
  }

  // ghost simple chase: move towards pac if possible
  let best = null;
  const dirs = [{x:1,y:0},{x:-1,y:0},{x:0,y:1},{x:0,y:-1}];
  for(const d of dirs){
    const gx = ghost.x + d.x, gy = ghost.y + d.y;
    if(map[gy] && map[gy][gx] !== 1){
      const dist = Math.abs(gx - pac.x) + Math.abs(gy - pac.y);
      if(best===null || dist < best.dist){ best = {d,dist}; }
    }
  }
  if(best) { ghost.x += best.d.x; ghost.y += best.d.y; }

  // collision
  if(pac.x === ghost.x && pac.y === ghost.y){ endGame(false); }
  draw();
}

function endGame(win){
  gameOver = true;
  alert(win ? 'Ganaste!':'Perdiste!');
  // restar 1 coin
  const coins = parseInt(localStorage.getItem('AT12_coins')||'0',10);
  const newCoins = Math.max(0, coins - 1);
  localStorage.setItem('AT12_coins', String(newCoins));
  // redirect según coins
  if(newCoins <= 0){
    alert('Te quedaste sin coins. Volviendo al login para obtener más.');
    location.href = '../../../Public/Index.html';
  }else{
    location.href = '../../../Public/Lobby.html';
  }
}

// controls
window.addEventListener('keydown', (e)=>{
  if(e.key === 'ArrowUp') pac.dir = {x:0,y:-1};
  if(e.key === 'ArrowDown') pac.dir = {x:0,y:1};
  if(e.key === 'ArrowLeft') pac.dir = {x:-1,y:0};
  if(e.key === 'ArrowRight') pac.dir = {x:1,y:0};
});

document.getElementById('exit').addEventListener('click', ()=>{
  endGame(false);
});

// start loop
draw();
const loop = setInterval(step, 220);