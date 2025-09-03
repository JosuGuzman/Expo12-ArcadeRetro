```mermaid
flowchart TD
subgraph Server

S[server.js / GameServer] --> PDB[(players{})]
S --> BUL[(bullets[])]
S --> PUP[(powerups[])]
S --> OBS[(obstacles[])]
end


subgraph Client(s)
C1[game.html + game.js] --> GC[GameClient]
GC --> TANKS[local Tank instances]
GC --> TBL[local Bullet instances]
end


C1 -- socket.io --> S
GC -- emit(move) --> S
GC -- emit(shoot) --> S
S -- emit(playerMoved / updatePlayers / bulletsUpdate) --> GC
```