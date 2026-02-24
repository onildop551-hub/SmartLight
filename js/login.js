// ================= ELEMENTOS =================
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const recuperarSenhaLink = document.querySelector("#recuperar-senha");
const entrarBtn = document.getElementById("login");
const errorLogin = document.getElementById("error-login");
const loader = document.getElementById("loader-overlay");

// ================= FIREBASE CONFIG =================
const firebaseConfig = {
    apiKey: "AIzaSyADBRS5V1sFXzHh3KOrNivsEJJkwpuGJWk",
    authDomain: "smartlight-pap-2026.firebaseapp.com",
    projectId: "smartlight-pap-2026",
    storageBucket: "smartlight-pap-2026.appspot.com",
    messagingSenderId: "953509556806",
    appId: "1:953509556806:web:96ed896142e7b5433f5047"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database(); // Realtime Database

// Provedor Google
const provider = new firebase.auth.GoogleAuthProvider();

// ================= FUNÇÃO LOGIN =================
async function login() {
    const username = emailInput.value.trim();
    const password = passwordInput.value.trim();

    errorLogin.style.display = "none";
    loader.classList.remove("d-none");

    // 🔐 LOGIN ADMIN
    if (username === "adminsmartlight@gmail.com" && password === "AI1cc71feba37f6b6716ef6ab73f8753c8@") {
        console.log("Admin logado");
        loader.classList.add("d-none");
        window.location.href = "admin.html";
        return;
    }

    // 🔵 LOGIN USUÁRIO NORMAL
    try {
        const userCredential = await auth.signInWithEmailAndPassword(username, password);
        const user = userCredential.user;

        // Exemplo: pegar tipo de conta do Realtime Database
        const snapshot = await db.ref(`usuarios/${user.uid}`).once("value");
        const userData = snapshot.val();

        loader.classList.add("d-none");

        if (userData?.tipoConta === "tecnico") {
            alert(`Bem-vindo ${userData.nome}!`);
            window.location.href = "tecnico.html";
        } else {
            alert("Tipo de conta não reconhecido!");
            auth.signOut();
        }
    } catch (error) {
        console.error("Erro no login:", error);
        loader.classList.add("d-none");
        errorLogin.style.display = "block";

        switch (error.code) {
            case 'auth/user-not-found':
            case 'auth/wrong-password':
            case 'auth/invalid-login-credentials':
                errorLogin.innerHTML = '<i class="fas fa-exclamation-circle me-2"></i> Credenciais incorretas!';
                break;
            case 'auth/too-many-requests':
                errorLogin.innerHTML = '<i class="fas fa-clock me-2"></i> Muitas tentativas falhadas.';
                break;
            case 'auth/user-disabled':
                errorLogin.innerHTML = '<i class="fas fa-ban me-2"></i> Conta desativada.';
                break;
            default:
                errorLogin.innerHTML = '<i class="fas fa-bug me-2"></i> Erro inesperado.';
        }
    }
}

// ================= LOGIN GOOGLE =================
document.getElementById('googleLogin').addEventListener('click', async () => {
    loader.classList.remove("d-none");
    try {
        const result = await auth.signInWithPopup(provider);
        const user = result.user;
        console.log("Login Google realizado:", user.displayName);
        alert("Logado como: " + user.displayName);
        loader.classList.add("d-none");
        window.location.href = "tecnico.html";
    } catch (error) {
        loader.classList.add("d-none");
        console.error("Erro no login Google:", error);
        alert("Erro ao logar com Google: " + error.message);
    }
});

// ================= RECUPERAR SENHA =================
function recoverPassword() {
    const email = emailInput.value.trim();
    if (!email) {
        alert("Por favor, introduza o seu e-mail primeiro.");
        return;
    }
    loader.classList.remove("d-none");
    auth.sendPasswordResetEmail(email)
        .then(() => {
            loader.classList.add("d-none");
            alert("E-mail de recuperação enviado! Verifique a sua caixa de entrada.");
        })
        .catch(error => {
            loader.classList.add("d-none");
            console.error("Erro na recuperação:", error.code);
            if (error.code === 'auth/user-not-found') {
                alert("Este e-mail não está registado no sistema.");
            } else {
                alert("Erro ao enviar e-mail: " + error.message);
            }
        });
}

// ================= VALIDAÇÃO =================
function ValidarCampos() {
    const emailValue = emailInput.value.trim();
    const passwordValue = passwordInput.value.trim();

    // Ativar link de recuperação apenas se o e-mail for válido
    if (validarEmail(emailValue)) {
        recuperarSenhaLink.style.pointerEvents = "auto";
        recuperarSenhaLink.style.opacity = "1";
    } else {
        recuperarSenhaLink.style.pointerEvents = "none";
        recuperarSenhaLink.style.opacity = "0.5";
        recuperarSenhaLink.removeAttribute("href");
    }

    entrarBtn.disabled = !(validarEmail(emailValue) && validarPassword(passwordValue));
}

function validarEmail(email) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

function validarPassword(password) {
    return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(password);
}

// ================= EVENT LISTENERS =================
emailInput.addEventListener("input", ValidarCampos);
passwordInput.addEventListener("input", ValidarCampos);

const form = document.getElementById('formLogin');
form.addEventListener('submit', e => {
    e.preventDefault();
    login();
});