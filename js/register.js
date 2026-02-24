document.addEventListener("DOMContentLoaded", () => {
    // ================= ELEMENTOS =================
    const formRegister = document.getElementById("formRegister");
    const nameInput = document.getElementById("name");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const confirmPwInput = document.getElementById("confirmPassword");
    const termsCheck = document.getElementById("terms");
    const btnRegister = document.getElementById("btnRegister");
    const loader = document.getElementById("loader-overlay");
    const errorRegisterDiv = document.getElementById("error-register");
    const provinciaInput = document.getElementById("provincia");
    const telefoneInput = document.getElementById("telefone");
    const idInput = document.getElementById("id_tecnico");

    // ================= FIREBASE =================
    const firebaseConfig = {
        apiKey: "AIzaSyADBRS5V1sFXzHh3KOrNivsEJJkwpuGJWk",
        authDomain: "smartlight-pap-2026.firebaseapp.com",
        projectId: "smartlight-pap-2026",
        storageBucket: "smartlight-pap-2026.appspot.com",
        messagingSenderId: "953509556806",
        appId: "1:953509556806:web:96ed896142e7b5433f5047"
    };
    firebase.initializeApp(firebaseConfig);
    const auth = firebase.auth();
    const db = firebase.database();
    const storage = firebase.storage();

    // ================= VALIDAÇÃO =================
    function validarRegistro() {
        const isNameOk = nameInput.value.trim().length >= 3;
        const isEmailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailInput.value);
        const isPwOk = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(passwordInput.value);
        const isConfirmOk = passwordInput.value === confirmPwInput.value && confirmPwInput.value !== "";
        const isTermsOk = termsCheck.checked;
        const isProvinciaOk = provinciaInput.value !== "";
        const isTelefoneOk = telefoneInput.value.trim().length >= 3;
        const isIdOk = idInput.value.trim().length > 0;

        document.getElementById("name-error").style.display = (nameInput.value && !isNameOk) ? "block" : "none";
        document.getElementById("email-invalid-error").style.display = (emailInput.value && !isEmailOk) ? "block" : "none";
        document.getElementById("pw-error").style.display = (passwordInput.value && !isPwOk) ? "block" : "none";
        document.getElementById("pw-confirm-error").style.display = (confirmPwInput.value && !isConfirmOk) ? "block" : "none";

        btnRegister.disabled = !(isNameOk && isEmailOk && isPwOk && isConfirmOk && isTermsOk && isProvinciaOk && isTelefoneOk && isIdOk);
    }

    // ================= REGISTRAR =================
    async function register() {
        loader.classList.remove("d-none");
        errorRegisterDiv.classList.add("d-none");

        try {
            const userCredential = await auth.createUserWithEmailAndPassword(emailInput.value, passwordInput.value);
            const user = userCredential.user;

        

            // Salvar dados no Realtime Database
            await db.ref(`usuarios/${user.uid}`).set({
                nome: nameInput.value,
                email: emailInput.value,
                telefone: telefoneInput.value,
                provincia: provinciaInput.value,
                idTecnico: idInput.value,
                tipoConta: "tecnico",
                createdAt: new Date().toISOString()
            });

            loader.classList.add("d-none");
            alert("Conta Técnico criada com sucesso!");
            window.location.href = "tecnico.html";

        } catch (error) {
            loader.classList.add("d-none");
            errorRegisterDiv.classList.remove("d-none");

            switch (error.code) {
                case "auth/email-already-in-use":
                    errorRegisterDiv.innerHTML = "Este e-mail já está a ser utilizado.";
                    break;
                case "auth/invalid-email":
                    errorRegisterDiv.innerHTML = "E-mail inválido.";
                    break;
                case "auth/weak-password":
                    errorRegisterDiv.innerHTML = "Senha fraca. Deve ter 8+ caracteres, maiúscula, número e símbolo.";
                    break;
                default:
                    errorRegisterDiv.innerHTML = "Erro: " + error.message;
            }
        }
    }

    // ================= EVENT LISTENERS =================
    [nameInput, emailInput, passwordInput, confirmPwInput, telefoneInput, provinciaInput, idInput].forEach(el => {
        el.addEventListener("input", validarRegistro);
    });
    termsCheck.addEventListener("change", validarRegistro);

    formRegister.addEventListener("submit", (e) => {
        e.preventDefault();
        register();
    });

});