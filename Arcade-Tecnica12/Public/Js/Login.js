// login.js - maneja login y secuencia 9 + 0 (normales / numpad / mezcla)
(function(){
  const form = document.getElementById('loginForm');
  const playerNameInput = document.getElementById('playerName');
  const enterBtn = document.getElementById('enterArcade');

  // combo detection
  // consider keys: "9"/"0" and "Numpad9"/"Numpad0"
  let keysDown = new Set();
  let lastComboTime = 0;

  function keyIsNine(code){
    return code === 'Digit9' || code === 'Numpad9' || code === '9';
  }
  function keyIsZero(code){
    return code === 'Digit0' || code === 'Numpad0' || code === '0';
  }

  window.addEventListener('keydown', (e) => {
    keysDown.add(e.code || e.key);
    // detect simultaneous 9 + 0 within 300ms by checking set
    const codes = Array.from(keysDown);
    let has9 = codes.some(c => /9|Digit9|Numpad9/.test(c));
    let has0 = codes.some(c => /0|Digit0|Numpad0/.test(c));
    if(has9 && has0){
      // award one coin
      awardCoin();
      // clear set to avoid multi firing
      keysDown.clear();
    }
    // also allow combos if user quickly presses them: check timestamp
  });

  window.addEventListener('keyup', (e)=> {
    keysDown.delete(e.code || e.key);
  });

  function awardCoin(){
    // increase coin in localStorage and notify
    const coinsBefore = parseInt(localStorage.getItem('AT12_coins')||'0',10);
    localStorage.setItem('AT12_coins', String(coinsBefore+1));
    // simple UI feedback
    alert('Coin obtenido! Total: ' + (coinsBefore+1));
  }

  form.addEventListener('submit', (ev)=>{
    ev.preventDefault();
    const name = (playerNameInput.value || '').trim();
    if(!name){
      alert('Ingrese un nombre de jugador');
      return;
    }
    // save player in sessionStorage
    const player = { name, loggedAt: Date.now() };
    sessionStorage.setItem('AT12_player', JSON.stringify(player));
    // ensure coin key exists
    if(!localStorage.getItem('AT12_coins')) localStorage.setItem('AT12_coins','0');
    // go to lobby
    location.href = 'lobby.html';
  });

})();