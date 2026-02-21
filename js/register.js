// ================= ELEMENTOS =================
const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const passwordInput = document.getElementById("password");
const confirmPwInput = document.getElementById("confirmPassword");
const termsCheck = document.getElementById("terms");
const btnRegister = document.getElementById("btnRegister");
const loader = document.getElementById("loader-overlay");
const errorRegisterDiv = document.getElementById("error-register");
const provinciaInput = document.getElementById("provincia");
const cvInput = document.getElementById("cvFile");
const telefoneInput = document.getElementById("telefone"); // Novo campo ID Técnico

// ================= FIREBASE CONFIG =================
const firebaseConfig = {
  apiKey: "AIzaSyADBRS5V1sFXzHh3KOrNivsEJJkwpuGJWk",
  authDomain: "smartlight-pap-2026.firebaseapp.com",
  projectId: "smartlight-pap-2026",
  storageBucket: "smartlight-pap-2026.firebasestorage.app",
  messagingSenderId: "953509556806",
  appId: "1:953509556806:web:96ed896142e7b5433f5047"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
const storage = firebase.storage();
const provider = new firebase.auth.GoogleAuthProvider();

// ================= FUNÇÃO VALIDAR REGISTRO =================
function validarRegistro() {
    const isNameOk = nameInput.value.trim().length > 3;
    const isEmailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value);
    const isPwOk = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(passwordInput.value);
    const isConfirmOk = passwordInput.value === confirmPwInput.value && confirmPwInput.value !== "";
    const isTermsOk = termsCheck.checked;
    const isProvinciaOk = provinciaInput.value !== "";
    const isCVOk = cvInput.files.length > 0;
    const isTelefoneOk = telefoneInput.value.trim() !== "";

    // Mostrar/Esconder Erros
    document.getElementById("name-error").style.display = (nameInput.value !== "" && !isNameOk) ? "block" : "none";
    document.getElementById("email-invalid-error").style.display = (emailInput.value !== "" && !isEmailOk) ? "block" : "none";
    document.getElementById("pw-error").style.display = (passwordInput.value !== "" && !isPwOk) ? "block" : "none";
    document.getElementById("pw-confirm-error").style.display = (confirmPwInput.value !== "" && !isConfirmOk) ? "block" : "none";

    btnRegister.disabled = !(isNameOk && isEmailOk && isPwOk && isConfirmOk && isTermsOk && isProvinciaOk && isCVOk && isTelefoneOk);
}

// ================= FUNÇÃO REGISTRAR =================
async function register() {
    loader.classList.remove("d-none");
    errorRegisterDiv.classList.add("d-none");

    try {
        // Criar usuário no Auth
        const userCredential = await auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value);
        const user = userCredential.user;

        // Upload do CV para Storage
        const cvFile = cvInput.files[0];
        let cvURL = "";
        if (cvFile) {
            const storageRef = storage.ref().child(`curriculos/${user.uid}_${cvFile.name}`);
            await storageRef.put(cvFile);
            cvURL = await storageRef.getDownloadURL();
        }

        // Salvar dados adicionais no Realtime Database
        const tecnicoData = {
            nome: nameInput.value,
            email: emailInput.value,
            provincia: provinciaInput.value,
            cv: cvURL,
            idTecnico: telefoneInput.value, // Novo campo ID Técnico
            tipoConta: "tecnico",
            createdAt: new Date().toISOString()
        };

        await db.ref(`usuarios/${user.uid}`).set(tecnicoData);

        loader.classList.add("d-none");
        alert("Usuário Técnico criado com sucesso!");
        window.location.href = "login.html";

    } catch (error) {
        loader.classList.add("d-none");
        errorRegisterDiv.classList.remove("d-none");

        switch (error.code) {
            case 'auth/email-already-in-use':
                errorRegisterDiv.innerHTML = "Este e-mail já está a ser utilizado por outra conta.";
                break;
            case 'auth/invalid-email':
                errorRegisterDiv.innerHTML = "O endereço de e-mail não é válido.";
                break;
            case 'auth/weak-password':
                errorRegisterDiv.innerHTML = "A senha deve ter pelo menos 8 caracteres, incluindo maiúscula e símbolo.";
                break;
            default:
                errorRegisterDiv.innerHTML = "Erro ao criar conta: " + error.message;
        }
    }
}

/*/ ================= LOGIN COM GOOGLE =================
document.getElementById('googleLogin').addEventListener('click', () => {
    loader.classList.remove("d-none");
    auth.signInWithPopup(provider)
        .then((result) => {
            loader.classList.add("d-none");
            alert("Conta criada como: " + result.user.displayName);
            window.location.href = "login.html";
        })
        .catch((error) => {
            loader.classList.add("d-none");
            console.error("Erro no login:", error);
        });
});*/