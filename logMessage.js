// logMessage.js (or inside your chat component)
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase"; // adjust the path if needed

export async function logMessage(username, message) {
  try {
    await addDoc(collection(db, "messages"), {
      username: username,
      message: message,
      timestamp: serverTimestamp(),
    });
    console.log("Message logged!");
  } catch (error) {
    console.error("Error logging message:", error);
  }
}
