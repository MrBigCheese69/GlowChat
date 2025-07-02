"use client";

import { useState } from "react";
import { logMessage } from "../utils/logMessage";

export default function ChatInput() {
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;
    await logMessage("Alice", input);
    setInput("");
  };

  return (
    <div>
      <input
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type message..."
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
