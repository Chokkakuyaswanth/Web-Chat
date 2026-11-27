import { useEffect, useRef } from "react";
import PropTypes from "prop-types";

const ChatLists = ({ chats, user }) => {
  const endOfMessages = useRef();

  // System message (like "User joined")
  const SystemChat = ({ message }) => (
    <div className="chat_system">
      <p>
        <em>{message}</em>
      </p>
    </div>
  );

  // Current user’s messages
  const SenderChat = ({ message, username, avatar }) => (
    <div className="chat_sender">
      {avatar && <img src={avatar} alt="avatar" />}
      <p>
        <strong>{username}</strong> <br />
        {message}
      </p>
    </div>
  );

  // Other users’ messages
  const ReceiverChat = ({ message, username, avatar }) => (
    <div className="chat_receiver">
      {avatar && <img src={avatar} alt="avatar" />}
      <p>
        <strong>{username}</strong> <br />
        {message}
      </p>
    </div>
  );

  SystemChat.propTypes = { message: PropTypes.string.isRequired };
  SenderChat.propTypes = {
    message: PropTypes.string.isRequired,
    username: PropTypes.string.isRequired,
    avatar: PropTypes.string,
  };
  ReceiverChat.propTypes = SenderChat.propTypes;

  // Auto-scroll when chats update
  useEffect(() => {
    scrollToBottom();
  }, [chats]);

  const scrollToBottom = () => {
    endOfMessages.current?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="chats_list">
      {chats.map((chat, index) => {
        if (chat.username === "System") {
          return <SystemChat key={index} message={chat.message} />;
        } else if (chat.username === user) {
          return (
            <SenderChat
              key={index}
              message={chat.message}
              username={chat.username}
              avatar={chat.avatar}
            />
          );
        } else {
          return (
            <ReceiverChat
              key={index}
              message={chat.message}
              username={chat.username}
              avatar={chat.avatar}
            />
          );
        }
      })}
      <div ref={endOfMessages}></div>
    </div>
  );
};

ChatLists.propTypes = {
  chats: PropTypes.arrayOf(PropTypes.shape({
    username: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    avatar: PropTypes.string,
  })).isRequired,
  user: PropTypes.string.isRequired,
};

export default ChatLists;
