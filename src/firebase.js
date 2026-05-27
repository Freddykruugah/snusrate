import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDxeh5onhVO_g9XdB0u2MCsnt5h8orufDQ",
  authDomain: "snusrating-b541f.firebaseapp.com",
  projectId: "snusrating-b541f",
  storageBucket: "snusrating-b541f.firebasestorage.app",
  messagingSenderId: "965256942031",
  appId: "1:965256942031:web:f50963d4de229d71ab42ba",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);