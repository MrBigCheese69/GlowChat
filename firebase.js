// firebase.js
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "apikey",
  authDomain: "authDomain",
  projectId: "projectId"",
  storageBucket: "storageBucket",
  messagingSenderId: "messagingSenderId",
  appId: "appId",
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

export { db };
