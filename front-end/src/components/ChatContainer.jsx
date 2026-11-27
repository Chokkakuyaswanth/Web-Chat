import { useEffect, useState } from "react";
import PropTypes from "prop-types";
import ChatLists from "./ChatLists";
import InputText from "./InputText";
import socketIOClient from "socket.io-client";
import { backendUrl } from "../config";

const socketio = socketIOClient(backendUrl, { autoConnect: false });

const ChatContainer = ({ user, room, token, avatar, onLeave }) => {
  const [chats, setChats] = useState([]);
  const [members, setMembers] = useState([]); // track members in the room
  const [joinError, setJoinError] = useState("");
  const [joined, setJoined] = useState(false);

  useEffect(() => {
    const joinRoom = () => {
      setJoinError("");
      socketio.emit("joinRoom", { room, token });
    };
    const receiveHistory = (history) => {
      setChats(history);
      setJoined(true);
    };
    const receiveMessage = (msg) => {
      setChats((prevChats) => [...prevChats, msg]);
    };
    const handleDisconnect = () => {
      setJoined(false);
      setMembers([]);
    };
    const handleJoinError = (error) => {
      setJoined(false);
      setJoinError(error);
    };

    socketio.on("connect", joinRoom);
    socketio.on("disconnect", handleDisconnect);
    socketio.on("chat", receiveHistory);
    socketio.on("message", receiveMessage);
    socketio.on("roomUsers", setMembers);
    socketio.on("joinError", handleJoinError);
    socketio.connect();

    return () => {
      socketio.off("connect", joinRoom);
      socketio.off("disconnect", handleDisconnect);
      socketio.off("chat", receiveHistory);
      socketio.off("message", receiveMessage);
      socketio.off("roomUsers", setMembers);
      socketio.off("joinError", handleJoinError);
      socketio.disconnect();
    };
  }, [room, token]);

  const addMessage = (chat) => {
    if (joined && socketio.connected) {
      socketio.emit("newMessage", { message: chat, avatar });
    }
  };

  if (joinError) {
    return (
      <div className="login_container">
        <div className="login_title">
          <h1>Chat App</h1>
        </div>
        <div className="login_form">
          <p style={{ color: "red" }}>{joinError}</p>
          <button onClick={onLeave}>Back to Login</button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="home">
        <div className="chats_header">
          <div>
            <h4>Username: {user}</h4>
            <h4>Room: {room}</h4>
          </div>
          <p className="chats_logout" onClick={onLeave}>
            <strong>Logout</strong>
          </p>
        </div>

        <div className="members_list">
          <h4>Members in Room:</h4>
          <ul>
            {members.map((m, idx) => (
              <li key={idx}>{m}</li>
            ))}
          </ul>
        </div>

        <ChatLists chats={chats} user={user} />
        {!joined && <p role="status">Connecting to room…</p>}
        <InputText addMessage={addMessage} disabled={!joined} />
      </div>
    </div>
  );
};

ChatContainer.propTypes = {
  user: PropTypes.string.isRequired,
  room: PropTypes.string.isRequired,
  token: PropTypes.string.isRequired,
  avatar: PropTypes.string,
  onLeave: PropTypes.func.isRequired,
};

export default ChatContainer;
