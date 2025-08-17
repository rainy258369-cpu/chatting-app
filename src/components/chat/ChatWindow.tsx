import React, { useState } from "react";
import MessageBubble from "./MessageBubble";
import MessageInput from "./MessageInput";

interface Message {
  id: number;
  text: string;
  sender: "me" | "other";
}

const ChatWindow: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, text: "Hi! Welcome to the chat 👋", sender: "other" },
  ]);

  const handleSend = (messageText: string) => {
    const newMessage: Message = {
      id: messages.length + 1,
      text: messageText,
      sender: "me",
    };
    setMessages([...messages, newMessage]);
  };

  return (
    <div
      style={{
        width: "400px",
        height: "600px",
        border: "1px solid #ddd",
        borderRadius: "12px",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        margin: "0 auto",
        marginTop: "40px",
      }}
    >
      {/* 消息区域 */}
      <div
        style={{
          flex: 1,
          padding: "12px",
          overflowY: "auto",
          backgroundColor: "#f9fafb",
        }}
      >
        {messages.map((msg) => (
          <MessageBubble key={msg.id} text={msg.text} sender={msg.sender} />
        ))}
      </div>

      {/* 输入区域 */}
      <MessageInput onSend={handleSend} />
    </div>
  );
};

export default ChatWindow;
