const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

const rooms = {};

io.on("connection", (socket) => {
  socket.on("join", (roomId) => {
    socket.join(roomId);

    if (!rooms[roomId]) rooms[roomId] = [];
    if (!rooms[roomId].includes(socket.id)) rooms[roomId].push(socket.id);

    io.to(roomId).emit("user-list", rooms[roomId]);
    socket.to(roomId).emit("new-peer", socket.id);
  });

  socket.on("signal", (data) => {
    io.to(data.to).emit("signal", {
      from: socket.id,
      signal: data.signal
    });
  });

  socket.on("disconnect", () => {
    for (let roomId in rooms) {
      rooms[roomId] = rooms[roomId].filter(id => id !== socket.id);
      io.to(roomId).emit("user-list", rooms[roomId]);
    }
  });
});

server.listen(3000, () =>
  console.log("🚀 Server läuft auf http://localhost:3000")
);
