import { initializeApp } from "https://www.gstatic.com";
import { getFirestore, collection, addDoc, doc, updateDoc, onSnapshot, query, where, serverTimestamp } from "https://www.gstatic.com";
import { getStorage, ref, uploadBytes, getDownloadURL } from "https://www.gstatic.com";

const firebaseConfig = {
    apiKey: "AIzaSyADBRS5V1sFXzHh3KOrNivsEJJkwpuGJWk",
    authDomain: "smartlight-pap-2026.firebaseapp.com",
    projectId: "smartlight-pap-2026",
    storageBucket: "smartlight-pap-2026.firebasestorage.app",
    appId: "1:953509556806:web:96ed896142e7b5433f5047"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
export { db, storage, collection, addDoc, doc, updateDoc, onSnapshot, query, where, serverTimestamp, ref, uploadBytes, getDownloadURL };
