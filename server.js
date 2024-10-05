const express = require("express");
const http = require("http");
const socketIo = require("socket.io");
const path = require("path");

const app = express();
const server = http.createServer(app);
const webDomain = process.env.WEB_DOMAIN || "http://localhost";
const webPort = process.env.WEB_PORT || 3000;
const io = socketIo(server, {
  cors: {
    origin: webDomain + ":" + webPort,
    methods: ["GET", "POST"],
  },
});

let players = [];
let bank = null;
let statement = [];
let statementId = 0;

io.on("connection", (socket) => {
  console.log("New client connected");

  socket.on("rejoin", ({ id }) => {
    const existingPlayer =
      players.find((p) => p.id === id) ||
      (bank && bank.id === id ? bank : null);
    if (existingPlayer) {
      existingPlayer.socketId = socket.id;
      socket.emit("rejoinSuccess", existingPlayer);
      io.emit("updatePlayers", [...players, bank]);
      io.emit("updateStatement", statement);
    } else {
      socket.emit("rejoinFailed");
    }
  });

  socket.on("join", (playerName) => {
    if (isNameTaken(playerName)) {
      socket.emit("joinFailed", "Name already taken");
      return;
    }

    const newPlayer = {
      id: socket.id,
      name: playerName,
      balance: 15000000,
      isBank: false,
      socketId: socket.id,
    };
    if (!bank) {
      bank = { ...newPlayer, balance: 100000000, isBank: true };
      socket.emit("joinSuccess", bank);
    } else {
      players.push(newPlayer);
      socket.emit("joinSuccess", newPlayer);
    }
    io.emit("updatePlayers", [...players, bank]);
  });

  socket.on("transfer", ({ from, to, amount }) => {
    amount = parseInt(amount);
    let fromAccount =
      from === bank.id ? bank : players.find((p) => p.id === from);
    let toAccount = to === bank.id ? bank : players.find((p) => p.id === to);

    if (fromAccount && toAccount && fromAccount.balance >= amount) {
      fromAccount.balance -= amount;
      toAccount.balance += amount;

      addStatement({
        id: statementId++,
        from: fromAccount.name,
        to: toAccount.name,
        amount,
      });

      io.emit("updatePlayers", [...players, bank]);
      io.emit("updateStatement", statement);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected");
  });
});

function isNameTaken(name) {
  return (
    players.some(
      (player) => player.name.toLowerCase() === name.toLowerCase()
    ) ||
    (bank && bank.name.toLowerCase() === name.toLowerCase())
  );
}

function addStatement(newStatement) {
  if (statement.length >= 10) {
    statement.shift();
  }
  statement.push(newStatement);
}

if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "build")));
  app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "build", "index.html"));
  });
}

const port = process.env.REACT_APP_SERVER_PORT || 3001;
server.listen(port, () => {
  console.log(
    `⚡️server is running on ${process.env.REACT_APP_SERVER_DOMAIN}:${port} with ${process.env.NODE_ENV} mode`
  );
});
