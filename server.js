const express = require("express");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static("public"));

io.on("connection", (socket) => {
  console.log("User joined:", socket.id);

  socket.on("join", (roomId) => {
    socket.join(roomId);
    socket.to(roomId).emit("new-peer", socket.id);
  });

  socket.on("signal", (data) => {
    io.to(data.to).emit("signal", {
      from: socket.id,
      signal: data.signal
    });
  });
});

server.listen(3000, () => console.log("🚀 Server auf http://localhost:3000"));
