import { useState } from "react";
import PropTypes from "prop-types";

const InputText = ({ addMessage, disabled }) => {
  const [message, setMessage] = useState("");

  const sendMessage = () => {
    if (disabled || !message.trim()) return;
    addMessage(message);
    setMessage("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="inputtext_container">
      <textarea
        name="message"
        id="message"
        rows="6"
        placeholder="Input Message ..."
        onChange={(e) => setMessage(e.target.value)}
        value={message}
        onKeyDown={handleKeyDown}
      ></textarea>
      <button onClick={sendMessage} disabled={disabled}>Send</button>
    </div>
  );
};

InputText.propTypes = {
  addMessage: PropTypes.func.isRequired,
  disabled: PropTypes.bool.isRequired,
};

export default InputText;
