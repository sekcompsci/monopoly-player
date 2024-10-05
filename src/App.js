import React, { useState, useEffect } from "react";
import { Flex, Layout, Button, Input, Table, Modal, Radio } from "antd";
import { UserOutlined, CreditCardOutlined } from "@ant-design/icons";
import CountUp from "react-countup";
import io from "socket.io-client";
import "./App.css";

const { Header, Content } = Layout;

const headerStyle = {
  textAlign: "center",
  color: "#fff",
  height: 50,
  lineHeight: "50px",
  fontWeight: "bold",
};
const contentStyle = {
  margin: "10px 20px",
  lineHeight: "50px",
};
const homeStyle = {
  lineHeight: "50px",
};
const playStyle = {
  lineHeight: "30px",
};
const layoutStyle = {
  borderRadius: 8,
  overflow: "hidden",
};

const serverDomain = process.env.REACT_APP_SERVER_DOMAIN || "http://localhost";
const serverPort = process.env.REACT_APP_SERVER_PORT || "3001";
const socket = io(serverDomain + ":" + serverPort);

function App() {
  const [players, setPlayers] = useState([]);
  const [playerName, setPlayerName] = useState("");
  const [transferTo, setTransferTo] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [transferUnit, setTransferUnit] = useState("K");
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [statement, setStatement] = useState([]);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const savedPlayer = localStorage.getItem("monopolyPlayer");
    if (savedPlayer) {
      const player = JSON.parse(savedPlayer);
      socket.emit("rejoin", player);
    }

    socket.on("joinSuccess", (player) => {
      setCurrentPlayer(player);
      localStorage.setItem("monopolyPlayer", JSON.stringify(player));
      setError("");
    });

    socket.on("joinFailed", (message) => {
      setError(message);
    });

    socket.on("rejoinSuccess", (player) => {
      setCurrentPlayer(player);
      localStorage.setItem("monopolyPlayer", JSON.stringify(player));
    });

    socket.on("rejoinFailed", () => {
      localStorage.removeItem("monopolyPlayer");
    });

    socket.on("updatePlayers", (updatedPlayers) => {
      const otherPlayers = [];
      for (let i = 0; i < updatedPlayers.length; i++) {
        if (updatedPlayers[i].socketId === socket.id) {
          setCurrentPlayer(updatedPlayers[i]);
          continue;
        }
        otherPlayers.push(updatedPlayers[i]);
      }
      setPlayers(otherPlayers);
    });
    socket.on("updateStatement", (updatedStatement) =>
      setStatement(updatedStatement)
    );

    return () => {
      socket.off("rejoinSuccess");
      socket.off("rejoinFailed");
      socket.off("joinSuccess");
      socket.off("joinFailed");
      socket.off("updatePlayers");
    };
  }, []);

  const joinGame = () => {
    if (playerName.trim()) {
      socket.emit("join", playerName.trim());
    } else {
      setError("Please enter a valid name");
    }
  };

  const handleTransfer = () => {
    if (currentPlayer && transferTo && transferAmount) {
      const amount = transferAmount * (transferUnit === "M" ? 1000000 : 1000);
      socket.emit("transfer", {
        from: currentPlayer.id,
        to: transferTo,
        amount,
      });
      setTransferTo("");
      setTransferAmount("");
      setTransferUnit("K");
    }
  };

  const showModal = (playerId) => {
    setTransferTo(playerId);
    setIsModalOpen(true);
  };
  const handleOk = () => {
    handleTransfer();
    setIsModalOpen(false);
  };
  const handleCancel = () => {
    setIsModalOpen(false);
  };

  const columns = [
    {
      title: "Players",
      dataIndex: "name",
      render: (text) => <span>{text}</span>,
    },
    {
      title: "Balance",
      dataIndex: "balance",
      render: (text) => (
        <CountUp start={0} end={text} duration={0.5} separator="," />
      ),
    },
    {
      title: "Action",
      render: (_, { key: playerId }) => (
        <Button type="primary" onClick={() => showModal(playerId)}>
          Transfer
        </Button>
      ),
    },
  ];

  return (
    <Flex style={{ height: "100vh" }} wrap>
      <Layout style={layoutStyle}>
        <Header style={headerStyle}>Monopoly Player</Header>
        <Content style={contentStyle}>
          <Modal
            title={
              "Transfer to " + players.find((p) => p.id === transferTo)?.name ||
              ""
            }
            open={isModalOpen}
            onOk={handleOk}
            onCancel={handleCancel}
            okText="Confirm"
          >
            <div style={{ margin: "20px 0" }}>
              <Input
                style={{ padding: "3px 15px", maxWidth: "230px" }}
                size="large"
                placeholder="Enter amount"
                prefix={<CreditCardOutlined />}
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
              />
              <Radio.Group
                style={{ marginLeft: "10px" }}
                value={transferUnit}
                onChange={(e) => setTransferUnit(e.target.value)}
              >
                <Radio.Button value="K">K</Radio.Button>
                <Radio.Button value="M">M</Radio.Button>
              </Radio.Group>
            </div>
          </Modal>
          {!currentPlayer ? (
            <div style={homeStyle}>
              <Input
                style={{ marginTop: "20px" }}
                size="large"
                placeholder="Enter your name"
                prefix={<UserOutlined />}
                value={playerName}
                onChange={(e) => setPlayerName(e.target.value)}
              />
              <Button
                type="primary"
                style={{ width: "100%" }}
                onClick={joinGame}
              >
                Join Game
              </Button>
              {error && <p style={{ color: "red" }}>{error}</p>}
            </div>
          ) : (
            <div style={playStyle}>
              <div style={{ marginBottom: "10px" }}>
                <b>
                  <UserOutlined /> {currentPlayer.name} (
                  {currentPlayer.isBank ? "Bank" : "Player"})
                </b>
                <b style={{ float: "right" }}>
                  <CreditCardOutlined /> $
                  <CountUp
                    start={0}
                    end={currentPlayer.balance}
                    duration={0.5}
                    separator=","
                  />
                </b>
              </div>
              <Table
                columns={columns}
                dataSource={players.map((player) => ({
                  key: player.id,
                  name: player.name + (player.isBank ? " (Bank)" : ""),
                  balance: player.balance,
                }))}
                pagination={false}
              />
              <h3>Last transactions</h3>
              <ul>
                {statement.map((statement) => (
                  <li key={statement.id}>
                    #{statement.id} <b>from:</b> {statement.from} <b>to:</b>{" "}
                    {statement.to} ${statement.amount.toLocaleString("en-US")}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Content>
      </Layout>
    </Flex>
  );
}

export default App;
