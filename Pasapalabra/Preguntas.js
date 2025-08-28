const $ = s => document.querySelector(s);
const $$ = s => document.querySelectorAll(s);
const strip = s => s
  .toLowerCase()
  .normalize("NFD").replace(/[\u0300-\u036f]/g,"")
  .trim();

const capitalizeName = (name) =>
  name ? name.charAt(0).toUpperCase() + name.slice(1).toLowerCase() : "";

const QUESTIONS = [
  {letra: "A", respuesta: "algoritmo", pista: "Conjunto de pasos para resolver un problema."},
  {letra: "B", respuesta: "bug", pista: "Error en un programa."},
  {letra: "C", respuesta: "codigo", pista: "Instrucciones para que la computadora entienda."},
  {letra: "D", respuesta: "dato", pista: "Información que usamos en la computadora."},
  {letra: "E", respuesta: "error", pista: "Lo que aparece cuando algo está mal en el programa."},
  {letra: "F", respuesta: "funcion", pista: "Bloque de código que realiza una tarea."},
  {letra: "G", respuesta: "gigabyte", pista: "Unidad para medir memoria, más grande que MB."},
  {letra: "H", respuesta: "hardware", pista: "Partes físicas de la computadora."},
  {letra: "I", respuesta: "internet", pista: "Red gigante que conecta computadoras."},
  {letra: "J", respuesta: "javascript", pista: "Lenguaje muy usado en páginas web."},
  {letra: "K", respuesta: "kilobyte", pista: "Unidad pequeña de memoria."},
  {letra: "L", respuesta: "lenguaje", pista: "Forma especial de escribir instrucciones."},
  {letra: "M", respuesta: "monitor", pista: "Pantalla de la computadora."},
  {letra: "N", respuesta: "nube", pista: "Lugar en internet donde guardamos archivos."},
  {letra: "O", respuesta: "ordenador", pista: "Otra forma de decir computadora."},
  {letra: "P", respuesta: "programa", pista: "Conjunto de instrucciones de la computadora."},
  {letra: "Q", respuesta: "query", pista: "Palabra usada en bases de datos para pedir info."},
  {letra: "R", respuesta: "robot", pista: "Máquina que puede seguir instrucciones."},
  {letra: "S", respuesta: "software", pista: "Programas que hacen funcionar la computadora."},
  {letra: "T", respuesta: "teclado", pista: "Dispositivo para escribir en la computadora."},
  {letra: "U", respuesta: "usuario", pista: "Persona que usa un programa."},
  {letra: "V", respuesta: "variable", pista: "Caja imaginaria para guardar un valor."},
  {letra: "W", respuesta: "web", pista: "Conjunto de páginas en internet."},
  {letra: "X", respuesta: "xml", pista: "Lenguaje para organizar/guardar datos."},
  {letra: "Y", respuesta: "youtube", pista: "Plataforma de videos en internet."},
  {letra: "Z", respuesta: "zip", pista: "Archivo comprimido."}
].map(q => ({ ...q, estado: 0, passedRound: -1 }));

let idx = 0;
let score = 0;
let seconds = 120;
let timerId = null;
let playerName = "";
let ranking = JSON.parse(localStorage.getItem("ranking") || "[]");

let roundsCompleted = 0;
let gameOver = false;

const startScreen = $("#start-screen");
const gameScreen  = $("#game-screen");
const rankingList = $("#ranking-list");
const playerInput = $("#player-name");
const playBtn     = $("#play-btn");

const rosco       = $("#rosco");
const clueBox     = $("#clue");
const answerInput = $("#answer");
const timerBox    = $("#timer");
const scoreBox    = $("#score");
const playerLabel = $("#player-label");
const backBtn     = $("#back-to-start");
const endActions  = $("#end-actions");

const soundCorrect = new Audio("Asset\correcto.mp3");
const soundWrong   = new Audio("Asset\incorrecto.mp3");

function renderRanking() {
  ranking.sort((a, b) => b.score - a.score);
  const top5 = ranking.slice(0, 5);
  rankingList.innerHTML = "";
  top5.forEach((r, i) => {
    const li = document.createElement("li");
    if (i === 0) li.classList.add("gold");
    else if (i === 1) li.classList.add("silver");
    else if (i === 2) li.classList.add("bronze");
    const medal = i === 0 ? "🥇 - Senior" : i === 1 ? "🥈 - Middle" : i === 2 ? "🥉 - Junior" : "Trainee";
    li.innerHTML = `
      <span class="rank-name">${medal} ${r.name}</span>
      <span class="rank-score">${r.score} pts</span>`;
    rankingList.appendChild(li);
  });
}

function saveRanking(name, points) {
  name = capitalizeName(name);
  let i = ranking.findIndex(x => x.name === name);
  if (i >= 0) {
    if (points > ranking[i].score) ranking[i].score = points;
  } else {
    ranking.push({ name: name, score: points });
  }
  ranking.sort((a, b) => b.score - a.score);
  ranking = ranking.slice(0, 5);
  localStorage.setItem("ranking", JSON.stringify(ranking));
  renderRanking();
}

function drawRosco(){
  rosco.querySelectorAll(".letter").forEach(n=>n.remove());
  const total = QUESTIONS.length;
  const r = Math.min(rosco.clientWidth, rosco.clientHeight)/2 - 36;
  const cx = rosco.clientWidth/2;
  const cy = rosco.clientHeight/2;

  QUESTIONS.forEach((q,i)=>{
    const ang = (2*Math.PI*i)/total;
    const x = cx + r*Math.cos(ang) - 22;
    const y = cy + r*Math.sin(ang) - 22;
    const d = document.createElement("div");
    d.className = "letter";
    d.style.left = `${x}px`;
    d.style.top  = `${y}px`;
    d.textContent = q.letra;
    d.id = `letter-${i}`;
    rosco.appendChild(d);
  });
}

function setCurrentLetter(i){
  $$(".letter.current").forEach(el=>el.classList.remove("current"));
  const el = $(`#letter-${i}`);
  if(el) el.classList.add("current");
}

function startGame(){
  const name = playerInput.value.trim();
  if(!name) { alert("Por favor, ingresa tu nombre."); return; }
  playerName = capitalizeName(name);

  QUESTIONS.forEach(q=>{ q.estado=0; q.passedRound = -1; });
  idx = 0; score = 0; seconds = 120;
  roundsCompleted = 0;
  gameOver = false;
  answerInput.disabled = false;
  scoreBox.textContent = `Puntaje: ${score}`;
  timerBox.textContent = `⏱ ${seconds}`;
  playerLabel.textContent = `Jugador: ${playerName}`;
  endActions.classList.add("hidden");
  answerInput.value = "";

  startScreen.classList.remove("active");
  gameScreen.classList.add("active");
  drawRosco();
  setCurrentLetter(idx);
  showClue();
  answerInput.focus();
  startTimer();
}

function startTimer(){
  clearInterval(timerId);
  timerId = setInterval(()=>{
    seconds--;
    timerBox.textContent = `⏱ ${seconds}`;
    if(seconds<=0){
      clearInterval(timerId);
      endGame("Fin del Juego");
    }
  },1000);
}

function showClue(){
  const q = QUESTIONS[idx];
  clueBox.textContent = `Con la ${q.letra}: ${q.pista}`;
}

function feedback(type){ // "ok" | "ko" | "pass"
  const span = document.createElement("span");
  span.className = `feedback ${type}`;
  span.textContent = type==="ok" ? "✅" : type==="ko" ? "❌" : "PASA";
  clueBox.innerHTML = "";
  clueBox.appendChild(span);

  if(type === "ok"){
    soundCorrect.currentTime = 0;
    soundCorrect.play();
  }else if(type === "ko"){
    soundWrong.currentTime = 0;
    soundWrong.play();
  }
}

function nextPendingIndex(from){
  const n = QUESTIONS.length;
  for(let step=1; step<=n; step++){
    const j = (from + step) % n;
    const q = QUESTIONS[j];
    if(q.estado===0) return j;
    if(q.estado===2 && typeof q.passedRound === "number" && q.passedRound < roundsCompleted) return j;
  }
  return -1;
}

function handleAnswer(){
  if (gameOver) return;
  const q = QUESTIONS[idx];
  const user = strip(answerInput.value);
  const ok = user.length>0 && user === strip(q.respuesta);
  const letterEl = $(`#letter-${idx}`);

  if(ok){
    q.estado = 1;
    letterEl.classList.add("correct");
    score++;
    scoreBox.textContent = `Puntaje: ${score}`;
    feedback("ok");
  }else if(user==="" ){
    q.estado = 2;
    q.passedRound = roundsCompleted;
    letterEl.classList.add("passed");
    feedback("pass");
  }else{
    q.estado = -1;
    letterEl.classList.add("incorrect");
    feedback("ko");
  }

  answerInput.value = "";
  setTimeout(()=>{
    const next = nextPendingIndex(idx);
    if(next === -1){
      endGame("¡Juego terminado!");
    }else{
      if(next <= idx) roundsCompleted++;
      idx = next;
      setCurrentLetter(idx);
      showClue();
      answerInput.focus();
    }
  },300);
}

function handlePass(){
  if (gameOver) return;
  const q = QUESTIONS[idx];
  if(q.estado===0 || q.estado===2){
    q.estado = 2;
    q.passedRound = roundsCompleted;
    $(`#letter-${idx}`).classList.add("passed");
    feedback("pass");
    setTimeout(()=>{
      const next = nextPendingIndex(idx);
      if(next === -1){
        endGame("¡Juego terminado!");
      }else{
        if(next <= idx) roundsCompleted++;
        idx = next;
        setCurrentLetter(idx);
        showClue();
        answerInput.focus();
      }
    },300);
  }
}

function endGame(message){
  clearInterval(timerId);
  gameOver = true;
  answerInput.disabled = true;
  clueBox.textContent = `${message}  |  Aciertos: ${score}/${QUESTIONS.length}`;
  answerInput.blur();
  answerInput.value = "";
  endActions.classList.remove("hidden");
  saveRanking(playerName, score);
}

playBtn.addEventListener("click", startGame);

answerInput.addEventListener("keydown", (e)=>{
  if(gameOver) { e.preventDefault(); return; } 
  if(e.key === "Enter"){
    e.preventDefault();
    handleAnswer();
  }else if(e.key === "Tab"){
    e.preventDefault();
    handlePass();
  }
});

backBtn.addEventListener("click", ()=>{
  gameScreen.classList.remove("active");
  startScreen.classList.add("active");
  renderRanking();
  playerInput.focus();
  answerInput.disabled = false;
});