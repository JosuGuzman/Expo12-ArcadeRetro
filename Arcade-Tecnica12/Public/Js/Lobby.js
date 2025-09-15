// lobby.js - interacciones del lobby, selección de juego, control coins y navegación.
// También conecta al servidor socket.io para modo multijugador.
(function(){
  const player = JSON.parse(sessionStorage.getItem('AT12_player') || 'null');
  if(!player){
    // no hay player -> regresar a login
    location.href = 'index.html';
    return;
  }

  const soloBtn = document.getElementById('soloBtn');
  const multiBtn = document.getElementById('multiBtn');
  const gamesGrid = document.getElementById('gamesGrid');
  const gameCards = document.querySelectorAll('.game-card');
  const multiStatus = document.getElementById('multiStatus');
  const multiInfo = document.getElementById('multiInfo');
  const leaveMulti = document.getElementById('leaveMulti');

  // coins UI
  const coinsCounter = document.getElementById('coinsCounter');
  function updateCoins(){
    coinsCounter.textContent = 'COINS: ' + (localStorage.getItem('AT12_coins')||'0');
  }
  updateCoins();

  // select mode toggles
  soloBtn.addEventListener('click', ()=> {
    showGames('single');
  });
  multiBtn.addEventListener('click', ()=> {
    showGames('multi');
  });

  function showGames(mode){
    document.querySelectorAll('.game-card').forEach(c=>{
      c.style.display = (c.dataset.mode === mode) ? 'flex' : 'none';
    });
    gamesGrid.classList.remove('hidden');
  }

  // click on a game
  document.querySelectorAll('.game-card').forEach(card => {
    card.addEventListener('click', ()=> {
      const g = card.dataset.game;
      const mode = card.dataset.mode;
      // check coins
      const coins = parseInt(localStorage.getItem('AT12_coins')||'0',10);
      if(coins <= 0){
        alert('No tienes coins. Vuelve al login y presiona 9 + 0 para obtener coins.');
        location.href = 'index.html';
        return;
      }

      if(mode === 'single'){
        // open singleplayer game in same tab (consume coin on end)
        // mapping to path
        window.location.href = `../Game/SinglePlayer/${g}/index.html`;
      }else{
        // multiplayer: open game and connect to socket
        // open the multiplayer page
        window.location.href = `../Game/MultiPlayer/${g}/index.html`;
      }
    });
  });

  // leave multi
  if(leaveMulti) leaveMulti.addEventListener('click', ()=> {
    document.getElementById('multiStatus').classList.add('hidden');
    location.reload();
  });

  // update coin counter periodically
  setInterval(updateCoins, 600);
})();
