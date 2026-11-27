import { useEffect, useState } from "react";
import ChatContainer from "./components/ChatContainer";
import UserLogin from "./components/UserLogin";

const sessionKey = "web-chat-room-session";

function App() {
  const [session, setSession] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem(sessionKey));
    } catch {
      return null;
    }
  });

  useEffect(() => {
    localStorage.removeItem("roomPassword");
  }, []);

  const enterRoom = (roomSession) => {
    sessionStorage.setItem(sessionKey, JSON.stringify(roomSession));
    setSession(roomSession);
  };

  const leaveRoom = () => {
    sessionStorage.removeItem(sessionKey);
    setSession(null);
  };

  return (
    <div className="App">
      {!session ? (
        <UserLogin onEnter={enterRoom} />
      ) : (
        <ChatContainer {...session} onLeave={leaveRoom} />
      )}
    </div>
  );
}

export default App;
