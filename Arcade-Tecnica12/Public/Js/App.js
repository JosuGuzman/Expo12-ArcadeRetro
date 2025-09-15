// app.js - funcionalidad común: manejo de sesión, coins en localStorage, chequeos
(function(){
  // key: store player data in sessionStorage
  const PLR_KEY = 'AT12_player';
  const COIN_KEY = 'AT12_coins';

  function savePlayer(player){
    sessionStorage.setItem(PLR_KEY, JSON.stringify(player));
  }
  function loadPlayer(){
    try{
      return JSON.parse(sessionStorage.getItem(PLR_KEY) || 'null');
    }catch(e){ return null; }
  }
  function setCoins(n){
    localStorage.setItem(COIN_KEY, String(n));
    updateCoinsUI();
  }
  function getCoins(){
    return parseInt(localStorage.getItem(COIN_KEY) || '0', 10);
  }
  function changeCoins(delta){
    const c = Math.max(0, getCoins()+delta);
    setCoins(c);
    return c;
  }
  function updateCoinsUI(){
    const el = document.getElementById('coinsCounter');
    if(el) el.textContent = 'COINS: ' + getCoins();
  }

  // Expose globally
  window.AT12 = {
    savePlayer, loadPlayer, setCoins, getCoins, changeCoins, updateCoinsUI, PLR_KEY, COIN_KEY
  };

  // On page load update UI
  document.addEventListener('DOMContentLoaded', ()=> {
    updateCoinsUI();
    const pl = loadPlayer();
    if(pl){
      const lbl = document.getElementById('playerLabel');
      if(lbl) lbl.textContent = `Jugador: ${pl.name}`;
    }
  });
})();