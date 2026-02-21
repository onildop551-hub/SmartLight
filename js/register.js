const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPwInput = document.getElementById("confirmPassword");
const termsCheck = document.getElementById("terms");
const btnRegister = document.getElementById("btnRegister");
const loader = document.getElementById("loader-overlay");
const errorRegisterDiv =document.getElementById("error-register");

// 1. Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyADBRS5V1sFXzHh3KOrNivsEJJkwpuGJWk",
  authDomain: "smartlight-pap-2026.firebaseapp.com",
  projectId: "smartlight-pap-2026",
  storageBucket: "smartlight-pap-2026.firebasestorage.app",
  messagingSenderId: "953509556806",
  appId: "1:953509556806:web:96ed896142e7b5433f5047"
};

const provider = new firebase.auth.GoogleAuthProvider();

// 4. Ação do Botão
document.getElementById('googleLogin').addEventListener('click', () => {
    loader.classList.remove("d-none");
    auth.signInWithPopup(provider)
    .then((result) => {
        // Usuário logado com sucesso
        const user = result.user;
        console.log("Login realizado:", user.displayName);
        alert("Logado como: " + user.displayName);
    }).catch((error) => {
        loader.classList.add("d-none");
        // Erro no login
        console.error("Erro no login:", error);
    });
});

// 2. Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

function validarRegistro() {
    const isNameOk = nameInput.value.trim().length > 3;
    const isEmailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value);
    const isPwOk = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(passwordInput.value);
    const isConfirmOk = passwordInput.value === confirmPwInput.value && confirmPwInput.value !== "";
    const isTermsOk = termsCheck.checked;

    // Mostrar/Esconder Erros
    document.getElementById("name-error").style.display = (nameInput.value !== "" && !isNameOk) ? "block" : "none";
    document.getElementById("email-invalid-error").style.display = (emailInput.value !== "" && !isEmailOk) ? "block" : "none";
    document.getElementById("pw-error").style.display = (passwordInput.value !== "" && !isPwOk) ? "block" : "none";
    document.getElementById("pw-confirm-error").style.display = (confirmPwInput.value !== "" && !isConfirmOk) ? "block" : "none";

    // Habilitar botão apenas se tudo estiver OK
    btnRegister.disabled = !(isNameOk && isEmailOk && isPwOk && isConfirmOk && isTermsOk);
}

function register(){
    loader.classList.remove("d-none");
    firebase.auth().createUserWithEmailAndPassword(emailInput.value,passwordInput.value).then(()=>{
        loader.classList.add("d-none");
        alert("usuário Criado com Sucesso!");
        window.location.href="report.html";
    }).catch(error =>{
        loader.classList.add("d-none");
       switch (error.code) {
                case 'auth/email-already-in-use':
                    errorRegisterDiv.innerHTML = "Este e-mail já está a ser utilizado por outra conta.";
                    break;
                case 'auth/invalid-email':
                    errorRegisterDiv.innerHTML = "O endereço de e-mail não é válido.";
                    break;
                case 'auth/weak-password':
                    errorRegisterDiv.innerHTML = "A senha deve ter pelo menos 6 caracteres.";
                    break;
                case 'auth/operation-not-allowed':
                    errorRegisterDiv.innerHTML = "O registo por e-mail não está ativo. Contacte o suporte.";
                    break;
                default:
                    errorRegisterDiv.innerHTML = "Erro ao criar conta: " + error.message;
            }
    });
}

