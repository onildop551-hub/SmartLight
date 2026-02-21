const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const recuperarSenhaLink = document.querySelector("#recuperar-senha");
const entrarBtn = document.getElementById("login");
const errorLogin=document.getElementById("error-login");
const loader = document.getElementById("loader-overlay");

// 1. Configuração do Firebase
const firebaseConfig = {
  apiKey: "AIzaSyADBRS5V1sFXzHh3KOrNivsEJJkwpuGJWk",
  authDomain: "smartlight-pap-2026.firebaseapp.com",
  projectId: "smartlight-pap-2026",
  storageBucket: "smartlight-pap-2026.firebasestorage.app",
  messagingSenderId: "953509556806",
  appId: "1:953509556806:web:96ed896142e7b5433f5047"
};

// 2. Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// 3. Configurar o Provedor Google
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
        loader.classList.add("d-none");
        window.location.href="tecnico.html";
    }).catch((error) => {
        loader.classList.add("d-none");
        // Erro no login
        console.error("Erro no login:", error);
    });
});

function ValidarCampos() {
    const emailValue = emailInput.value;
    const passwordValue = passwordInput.value;
    errorLogin.style.display = "none";

    // Lógica do Link de Recuperar Senha
    if (validarEmail(emailValue)) {
        recuperarSenhaLink.style.pointerEvents = "auto";
        recuperarSenhaLink.style.opacity = "1";
        recuperarSenhaLink.href = "index.html";
    } else {
        recuperarSenhaLink.style.pointerEvents = "none";
        recuperarSenhaLink.style.opacity = "0.5";
        recuperarSenhaLink.removeAttribute("href");
    }
    
    toggleErrors();
    entrarBtn.disabled = !(validarEmail(emailValue) && validarPassword(passwordValue));
}
function login(){
    const email=emailInput.value;
    const password=passwordInput.value;

    loader.classList.remove("d-none");
    errorLogin.style.display = "none";
    //entrarBtn.innerHTML = '<span class="spinner-border spinner-border-sm"></span> Entrando...';
    //entrarBtn.disabled = true;
    //Fazer Login com email e senha
    auth.signInWithEmailAndPassword(email,password).then(Response =>{
        alert("Login Realiado com sucesso!");
        window.location.href = "tecnico.html";
    }).catch(error=>{
        console.error("Erro no login:", error.code);
        loader.classList.add("d-none");
        errorLogin.style.display="block";
         switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                case 'auth/invalid-login-credentials':
                    errorLogin.innerHTML = '<i class="fas fa-exclamation-circle me-2"></i> Email ou Senha Incorretos!';
                    break;
                case 'auth/too-many-requests':
                    errorLogin.innerHTML = '<i class="fas fa-clock me-2"></i> Muitas tentativas falhadas. Tente mais tarde.';
                    break;
                case 'auth/user-disabled':
                    errorLogin.innerHTML = '<i class="fas fa-ban me-2"></i> Esta conta foi desativada.';
                    break;
                default:
                    errorLogin.innerHTML = '<i class="fas fa-bug me-2"></i> Ocorreu um erro inesperado.';
            }
    });
}
function recoverPassword(){
    const email = emailInput.value;

    if (!email) {
        alert("Por favor, introduza o seu e-mail primeiro.");
        return;
    }
    loader.classList.remove("d-none");
    firebase.auth().sendPasswordResetEmail(emailInput.value).then(()=>{
        loader.classList.add("d-none");
        alert("E-mail de recuperação enviado! Verifique a sua caixa de entrada.");
    }).catch(error=>{
        loader.classList.add("d-none");
            console.error("Erro na recuperação:", error.code);
            
            if (error.code === 'auth/user-not-found') {
                alert("Este e-mail não está registado no sistema.");
            } else {
                alert("Erro ao enviar e-mail: " + error.message);
            }
    });
}

function toggleErrors() {
    const email = emailInput.value;
    const pw = passwordInput.value;

    // Erros de Email
    document.getElementById("email-required-error").style.display = (email.trim() === "") ? "block" : "none";
    document.getElementById("email-invalid-error").style.display = (email !== "" && !validarEmail(email)) ? "block" : "none";

    // Erros de Password (individuais)
    document.getElementById("pw-min-error").style.display = (pw !== "" && pw.length < 8) ? "block" : "none";
    document.getElementById("pw-upper-error").style.display = (pw !== "" && !/[A-Z]/.test(pw)) ? "block" : "none";
    document.getElementById("pw-special-error").style.display = (pw !== "" && !/[@$!%*?&]/.test(pw)) ? "block" : "none";
}

function validarEmail(email) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

function validarPassword(password) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/.test(password);
}

const form = document.getElementById('formLogin');
form.addEventListener('submit', (e) => {
    e.preventDefault(); // Mata o refresh da página
    login(); // Chama a sua função de autenticação
});