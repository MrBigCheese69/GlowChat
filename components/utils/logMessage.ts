import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../firebase";

export async function logMessage(username: string, message: string) {
  try {
    await addDoc(collection(db, "messages"), {
      username,
      message,
      timestamp: serverTimestamp(),
    });
    console.log("Message logged successfully");
  } catch (error) {
    console.error("Error logging message: ", error);
  }
}
