import { useState } from "react";
import { logMessage } from "./logMessage"; // adjust path

export default function ChatInput() {
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;
    await logMessage("Alice", input); // Replace "Alice" with actual username
    setInput("");
  };

  return (
    <div>
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Type your message..."
      />
      <button onClick={handleSend}>Send</button>
    </div>
  );
}
