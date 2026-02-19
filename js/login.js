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

// 3. Inicialização
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);
const provider = new GoogleAuthProvider();

// Elementos do DOM (Funções para evitar erro de 'null' se o elemento ainda não carregou)
const getEl = (id) => document.getElementById(id);

/**
 * VALIDAÇÃO DE CAMPOS
 */
window.ValidarCampos = function() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const btn = document.getElementById("login");

    const emailValido = email.includes("@") && email.length > 5;
    const senhaValida = password.length >= 8;

    if (btn) btn.disabled = !(emailValido && senhaValida);
};

function toggleErrors(email, pw, emailValido) {
    const eReq = getEl("email-required-error");
    const eInv = getEl("email-invalid-error");
    const pMin = getEl("pw-min-error");
    const pUpp = getEl("pw-upper-error");
    const pSpe = getEl("pw-special-error");

    if (eReq) eReq.style.display = (email.trim() === "") ? "block" : "none";
    if (eInv) eInv.style.display = (email !== "" && !emailValido) ? "block" : "none";
    if (pMin) pMin.style.display = (pw !== "" && pw.length < 8) ? "block" : "none";
    if (pUpp) pUpp.style.display = (pw !== "" && !/[A-Z]/.test(pw)) ? "block" : "none";
    if (pSpe) pSpe.style.display = (pw !== "" && !/[@$!%*?&]/.test(pw)) ? "block" : "none";
}

/**
 * LOGIN COM EMAIL/SENHA E REDIRECIONAMENTO POR TIPO
 */
window.login = async function() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const loader = document.getElementById("loader-overlay");
    const errorLogin = document.getElementById("error-login");

    if (loader) loader.classList.remove("d-none");
    if (errorLogin) errorLogin.style.display = "none";

    try {
        // 1. Autenticação
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 2. Busca o Tipo de Conta (Técnico ou Cidadão)
        const userRef = ref(db, 'usuarios/' + user.uid);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const tipo = snapshot.val().tipo;
            // 3. Redirecionamento baseado no tipo salvo no registro
            window.location.href = (tipo === "tecnico") ? "dashboard.html" : "report.html";
        } else {
            alert("Perfil de utilizador não encontrado.");
            if (loader) loader.classList.add("d-none");
        }
    } catch (error) {
        if (loader) loader.classList.add("d-none");
        if (errorLogin) {
            errorLogin.style.display = "block";
            errorLogin.innerHTML = '<i class="fas fa-exclamation-circle me-2"></i> Dados Incorretos!';
        }
        console.error("Erro no login:", error.code);
    }
};

/**
 * LOGIN COM GOOGLE
 */
const googleBtn = getEl('googleLogin');
if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        const loader = getEl("loader-overlay");
        if (loader) loader.classList.remove("d-none");
        
        try {
            const result = await signInWithPopup(auth, provider);
            // Nota: Para login social, pode ser necessário criar o registro no DB se for a primeira vez
            window.location.href = "report.html"; 
        } catch (error) {
            if (loader) loader.classList.add("d-none");
            console.error("Erro Google:", error);
        }
    });
}

/**
 * RECUPERAR SENHA
 */
window.recoverPassword = async function() {
    const email = getEl("email").value;
    const loader = getEl("loader-overlay");

    if (!email || !email.includes("@")) {
        alert("Por favor, introduza um e-mail válido primeiro.");
        return;
    }

    if (loader) loader.classList.remove("d-none");
    try {
        await sendPasswordResetEmail(auth, email);
        if (loader) loader.classList.add("d-none");
        alert("E-mail de recuperação enviado! Verifique a sua caixa de entrada.");
    } catch (error) {
        if (loader) loader.classList.add("d-none");
        alert("Erro: " + error.message);
    }
};
