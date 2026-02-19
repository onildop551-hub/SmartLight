// 1. Importações Modulares (Essencial para Vercel e Firebase v10)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    GoogleAuthProvider, 
    signInWithPopup, 
    sendPasswordResetEmail 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 2. Configuração
const firebaseConfig = {
  apiKey: "AIzaSyADBRS5V1sFXzHh3KOrNivsEJJkwpuGJWk",
  authDomain: "smartlight-pap-2026.firebaseapp.com",
  projectId: "smartlight-pap-2026",
  databaseURL: "https://smartlight-pap-2026-default-rtdb.firebaseio.com",
  storageBucket: "smartlight-pap-2026.firebasestorage.app",
  messagingSenderId: "953509556806",
  appId: "1:953509556806:web:96ed896142e7b5433f5047"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

/** 
 * TORNAR A FUNÇÃO LOGIN GLOBAL
 * Isto resolve o erro "login is not a function"
 */
window.login = async function() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const loader = document.getElementById("loader-overlay");

    if (loader) loader.classList.remove("d-none");

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // Buscar o TIPO de conta (técnico ou user) salvo no registro
        const snapshot = await get(ref(db, `usuarios/${user.uid}`));
        
        if (snapshot.exists()) {
            const tipo = snapshot.val().tipo;
            // Redirecionamento Inteligente
            window.location.href = (tipo === "tecnico") ? "dashboard.html" : "report.html";
        } else {
            alert("Perfil não encontrado no banco de dados.");
            if (loader) loader.classList.add("d-none");
        }
    } catch (error) {
        if (loader) loader.classList.add("d-none");
        alert("Erro no login: " + error.message);
    }
};

/** 
 * TORNAR A VALIDAÇÃO GLOBAL
 */
window.ValidarCampos = function() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const btn = document.getElementById("login");

    const isValid = email.includes("@") && password.length >= 8;
    if (btn) btn.disabled = !isValid;
};
