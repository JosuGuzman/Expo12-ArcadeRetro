// server.js - Node.js + Express + Socket.io
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// serve Public and Game folders as static
app.use(express.static(path.join(__dirname, '..', 'Public')));
app.use('/Game', express.static(path.join(__dirname, '..', 'Game')));

// basic in-memory rooms
// rooms: { roomId: { game, players: [{id, name, ip, side?, symbol?}], state, paused } }
const rooms = {};

function getClientIP(socket){
  // socket.handshake.address may be '::1' etc. For LAN local dev it's usually fine.
  let addr = socket.handshake.address || socket.request.connection.remoteAddress || 'unknown';
  if(addr.startsWith('::ffff:')) addr = addr.replace('::ffff:','');
  return addr;
}

io.on('connection', (socket) => {
  console.log('socket connected', socket.id, getClientIP(socket));

  socket.on('join_game', ({ game, name }) => {
    const ip = getClientIP(socket);
    // find or create a room for this game with one slot open
    let room = Object.values(rooms).find(r => r.game === game && r.players.length < 2);
    if(!room){
      const id = `${game}-${Date.now()}-${Math.floor(Math.random()*1000)}`;
      room = { id, game, players: [], state: null, paused:true };
      rooms[id] = room;
    }

    // check IP uniqueness
    if(room.players.some(p=>p.ip === ip)){
      // same IP as existing player -> reject join for this room
      socket.emit('error', { message:'Debes usar una IP distinta al otro jugador para jugar en LAN' });
      return;
    }

    // assign side or symbol
    let side = room.players.length === 0 ? 'left' : 'right';
    let symbol = room.players.length === 0 ? 'X' : 'O';

    room.players.push({ id: socket.id, name, ip, side, symbol });
    socket.join(room.id);
    socket.roomId = room.id;

    // send room info to all in room
    io.to(room.id).emit('room_info', { players: room.players.map(p=>({ name: p.name, side: p.side, symbol: p.symbol })) });

    // if now two players, start game (create initial state depending on game)
    if(room.players.length === 2){
      // check IP again (should already be different)
      if(room.players[0].ip === room.players[1].ip){
        // force pause
        room.paused = true;
        io.to(room.id).emit('paused');
      } else {
        // create game state
        if(game === 'PingPong'){
          room.state = {
            ball: { x:320, y:180, vx:3, vy:2 },
            leftY:160, rightY:160, scoreL:0, scoreR:0
          };
        } else if(game === 'TicTacToe'){
          room.state = { board: Array(9).fill(null), turn: 'X' };
          // assign symbols already set
        } else {
          room.state = { info: 'estado inicial para '+game };
        }
        room.paused = false;
        io.to(room.id).emit('game_start', { state: room.state });
        // start a loop for the room if needed
        if(game === 'PingPong'){
          startPingLoop(room);
        }
      }
    } else {
      // only one player -> paused
      io.to(room.id).emit('paused');
    }
  });

  socket.on('input', (data) => {
    const rid = socket.roomId;
    if(!rid) return;
    const room = rooms[rid];
    if(!room || room.paused) return;
    // identify which side sent input
    const me = room.players.find(p=>p.id === socket.id);
    if(!me) return;
    if(room.game === 'PingPong'){
      // update paddle positions based on input
      const s = data.side === 'left' ? 'leftY' : 'rightY';
      if(data.up) room.state[s] -= 4;
      if(data.down) room.state[s] += 4;
      room.state.leftY = Math.max(0, Math.min(300, room.state.leftY));
      room.state.rightY = Math.max(0, Math.min(300, room.state.rightY));
      // broadcast updated state occasionally
      // (state is also updated in loop)
    }
  });

  // TicTacToe move
  socket.on('ttt_move', ({ idx })=>{
    const rid = socket.roomId; if(!rid) return;
    const room = rooms[rid]; if(!room || room.paused) return;
    if(room.game !== 'TicTacToe') return;
    const me = room.players.find(p=>p.id === socket.id);
    if(!me) return;
    // check turn and valid
    if(room.state.board[idx]) return;
    if(room.state.turn !== me.symbol) return;
    room.state.board[idx] = me.symbol;
    // switch turn
    room.state.turn = (room.state.turn === 'X') ? 'O' : 'X';
    io.to(rid).emit('state_update', room.state);
  });

  socket.on('leave_game', ({ game })=>{
    const rid = socket.roomId;
    if(rid){
      socket.leave(rid);
      const room = rooms[rid];
      if(room){
        room.players = room.players.filter(p=>p.id !== socket.id);
        room.paused = true;
        io.to(rid).emit('paused');
        // if room empty, delete
        if(room.players.length === 0) delete rooms[rid];
      }
    }
  });

  socket.on('disconnect', ()=>{
    console.log('disconnect', socket.id);
    const rid = socket.roomId;
    if(rid && rooms[rid]){
      const room = rooms[rid];
      room.players = room.players.filter(p=>p.id !== socket.id);
      // if other player still in room -> pause until reconnect
      if(room.players.length === 1){
        room.paused = true;
        io.to(rid).emit('paused');
      } else if(room.players.length === 0){
        delete rooms[rid];
      } else {
        // more players? restart
        room.paused = true;
        io.to(rid).emit('restart');
      }
    }
  });

  // internal ping loop for PingPong physics
  function startPingLoop(room){
    if(room._pingLoop) return;
    room._pingLoop = setInterval(()=>{
      if(room.paused) return;
      // advance physics
      const st = room.state;
      st.ball.x += st.ball.vx; st.ball.y += st.ball.vy;
      // bounce top/bottom
      if(st.ball.y < 10 || st.ball.y > 350) st.ball.vy *= -1;
      // paddle collisions
      // left paddle
      if(st.ball.x < 30 && st.ball.x > 10){
        if(st.ball.y > st.leftY && st.ball.y < st.leftY + 60){ st.ball.vx *= -1; st.ball.x = 30; }
      }
      // right paddle
      if(st.ball.x > 610 && st.ball.x < 630){
        if(st.ball.y > st.rightY && st.ball.y < st.rightY + 60){ st.ball.vx *= -1; st.ball.x = 610; }
      }
      // score
      if(st.ball.x < 0){ st.scoreR += 1; resetBall(st); }
      if(st.ball.x > 640){ st.scoreL += 1; resetBall(st); }

      io.to(room.id).emit('state_update', st);
    }, 30);
  }

  function resetBall(st){
    st.ball.x = 320; st.ball.y = 180; st.ball.vx = (Math.random()>0.5 ? 3 : -3); st.ball.vy = 2;
  }
});

server.listen(3000, () => console.log('Servidor escuchando en http://localhost:3000'));