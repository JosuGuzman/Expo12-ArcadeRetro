const express = require("express");
const app = express();
const http = require("http").createServer(app);
const io = require("socket.io")(http);

app.use(express.static("public"));

let jugadores = {};

io.on("connection", (socket) => {
  console.log("Nuevo usuario conectado:", socket.id);

  // Registrar jugador
  socket.on("joinGame", (username) => {
    jugadores[socket.id] = username;
    console.log(`${username} se unió al juego.`);
    
    // Avisar a todos los jugadores
    io.emit("updatePlayers", Object.values(jugadores));
  });

  // Desconexión
  socket.on("disconnect", () => {
    console.log("Usuario desconectado:", socket.id);
    delete jugadores[socket.id];
    io.emit("updatePlayers", Object.values(jugadores));
  });
});

const PORT = 3000;
http.listen(PORT, () => {
  console.log(`Servidor corriendo en http://localhost:${PORT}`);
});