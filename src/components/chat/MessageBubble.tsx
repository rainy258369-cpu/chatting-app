import React from "react";

interface MessageBubbleProps {
  text: string;
  sender: "me" | "other";
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ text, sender }) => {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: sender === "me" ? "flex-end" : "flex-start",
        marginBottom: "8px",
      }}
    >
      <div
        style={{
          padding: "10px 14px",
          borderRadius: "16px",
          maxWidth: "60%",
          backgroundColor: sender === "me" ? "#4f46e5" : "#e5e7eb",
          color: sender === "me" ? "#fff" : "#111",
        }}
      >
        {text}
      </div>
    </div>
  );
};

export default MessageBubble;
