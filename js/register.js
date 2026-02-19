// 1. Importações Modulares do Firebase (Necessárias para type="module")
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// 2. Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyADBRS5V1sFXzHh3KOrNivsEJJkwpuGJWk",
  authDomain: "smartlight-pap-2026.firebaseapp.com",
  databaseURL: "https://smartlight-pap-2026-default-rtdb.firebaseio.com",
  projectId: "smartlight-pap-2026",
  storageBucket: "smartlight-pap-2026.firebasestorage.app",
  messagingSenderId: "953509556806",
  appId: "1:953509556806:web:96ed896142e7b5433f5047"
};

// 3. Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

// Seleção de Elementos (Dentro do módulo para garantir que o DOM existe)
const nameInput = () => document.getElementById("name");
const emailInput = () => document.getElementById("email");
const passwordInput = () => document.getElementById("password");
const confirmPwInput = () => document.getElementById("confirmPassword");
const termsCheck = () => document.getElementById("terms");
const btnRegister = () => document.getElementById("btnRegister");
const loader = () => document.getElementById("loader-overlay");

/**
 * FUNÇÃO DE VALIDAÇÃO
 * Exposta globalmente para funcionar com oninput no HTML
 */
window.validarRegistro = function() {
    const isNameOk = nameInput().value.trim().length > 3;
    const isEmailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput().value);
    const isPwOk = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(passwordInput().value);
    const isConfirmOk = passwordInput().value === confirmPwInput().value && confirmPwInput().value !== "";
    const isTermsOk = termsCheck().checked;

    // Mostrar/Esconder Erros
    document.getElementById("name-error").style.display = (nameInput().value !== "" && !isNameOk) ? "block" : "none";
    document.getElementById("email-invalid-error").style.display = (emailInput().value !== "" && !isEmailOk) ? "block" : "none";
    document.getElementById("pw-error").style.display = (passwordInput().value !== "" && !isPwOk) ? "block" : "none";
    document.getElementById("pw-confirm-error").style.display = (confirmPwInput().value !== "" && !isConfirmOk) ? "block" : "none";

    // Habilitar botão apenas se tudo estiver OK
    btnRegister().disabled = !(isNameOk && isEmailOk && isPwOk && isConfirmOk && isTermsOk);
};

/**
 * FUNÇÃO DE REGISTRO
 * Exposta globalmente para funcionar com onsubmit no HTML
 */
window.register = async function() {
    loader().classList.remove("d-none");
    const tipoConta = document.getElementById('conta').value;

    try {
        // Criar utilizador no Auth
        const userCredential = await createUserWithEmailAndPassword(auth, emailInput().value, passwordInput().value);
        const user = userCredential.user;

        if (user) {
            // SALVAR NO REALTIME DATABASE (Sintaxe v10)
            await set(ref(db, 'usuarios/' + user.uid), {
                nome: nameInput().value,
                email: emailInput().value,
                tipo: tipoConta,
                criadoEm: new Date().toISOString()
            });

            loader().classList.add("d-none");
            alert("Conta criada com sucesso!");
            window.location.href = "login.html";
        }
    } catch (error) {
        loader().classList.add("d-none");
        console.error("Erro no registro:", error);
        
        // Tratamento de erros amigável
        let mensagem = "Erro ao criar conta.";
        if (error.code === 'auth/email-already-in-use') mensagem = "Este e-mail já está em uso.";
        else if (error.code === 'auth/invalid-email') mensagem = "E-mail inválido.";
        
        alert(mensagem);
    }
};
