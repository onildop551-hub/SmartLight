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

    // ================= FUNÇÕES VALIDAÇÃO =================

    function validarNome(nome) {
        const apenasNumeros = /^\d+$/;
        return nome.length >= 3 && !apenasNumeros.test(nome);
    }

    function validarEmail(email) {
        const regexEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const apenasNumeros = /^\d+$/;
        return regexEmail.test(email) && !apenasNumeros.test(email);
    }

    function validarTelefone(tel) {
        const regex = /^[0-9]{9,}$/;
        return regex.test(tel);
    }

    function validarPassword(password) {
        return /^(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{8,}$/.test(password);
    }

    function validarConfirmacao() {
        return passwordInput.value === confirmPwInput.value && confirmPwInput.value !== "";
    }

    // ================= VALIDAÇÃO GERAL =================
    function validarRegistro() {

        const nome = nameInput.value.trim();
        const email = emailInput.value.trim();
        const telefone = telefoneInput.value.trim();
        const senha = passwordInput.value.trim();
        const confirmar = confirmPwInput.value.trim();

        const isNameOk = validarNome(nome);
        const isEmailOk = validarEmail(email);
        const isTelOk = validarTelefone(telefone);
        const isPwOk = validarPassword(senha);
        const isConfirmOk = validarConfirmacao();
        const isTermsOk = termsCheck.checked;
        const isProvinciaOk = provinciaInput.value !== "";
        const isIdOk = idInput.value.trim() !== "";

        // erros visuais
        document.getElementById("name-error").style.display =
            (nome && !isNameOk) ? "block" : "none";

        document.getElementById("email-invalid-error").style.display =
            (email && !isEmailOk) ? "block" : "none";

        document.getElementById("pw-error").style.display =
            (senha && !isPwOk) ? "block" : "none";

        document.getElementById("pw-confirm-error").style.display =
            (confirmar && !isConfirmOk) ? "block" : "none";

        btnRegister.disabled = !(
            isNameOk &&
            isEmailOk &&
            isTelOk &&
            isPwOk &&
            isConfirmOk &&
            isTermsOk &&
            isProvinciaOk &&
            isIdOk
        );
    }

    // ================= REGISTRAR =================
    async function register() {

        loader.classList.remove("d-none");
        errorRegisterDiv.classList.add("d-none");

        try {

            const userCredential = await auth.createUserWithEmailAndPassword(
                emailInput.value,
                passwordInput.value
            );

            const user = userCredential.user;

            // salvar dados no database
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

            window.location.href = "login.html";

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
                    errorRegisterDiv.innerHTML =
                        "Senha fraca. Deve ter 8+ caracteres, maiúscula, número e símbolo.";
                    break;

                default:
                    errorRegisterDiv.innerHTML = "Erro: " + error.message;
            }
        }
    }

    // ================= EVENT LISTENERS =================
    [
        nameInput,
        emailInput,
        passwordInput,
        confirmPwInput,
        telefoneInput,
        provinciaInput,
        idInput
    ].forEach(el => {
        el.addEventListener("input", validarRegistro);
    });

    termsCheck.addEventListener("change", validarRegistro);

    formRegister.addEventListener("submit", (e) => {
        e.preventDefault();
        register();
    });

});