// firebase.ts
import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; // ✅ Add this

const firebaseConfig = {
  apiKey: "AIzaSyCmPy8Uv_TDH5T3-2sApK0yQ4vchtrNwDU",
  authDomain: "glowchat-a5426.firebaseapp.com",
  databaseURL: "https://glowchat-a5426-default-rtdb.firebaseio.com",
  projectId: "glowchat-a5426",
  storageBucket: "glowchat-a5426.firebasestorage.app",
  messagingSenderId: "399090889166",
  appId: "1:399090889166:web:ed05bfeff8d8a33d447b9f",
  measurementId: "G-68VYC3XVG5"
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];

const db = getFirestore(app);
const auth = getAuth(app); // ✅ Initialize auth

export { db, auth }; // ✅ Export both
