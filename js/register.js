// register.js
// Fluxo:
//  1. Técnico preenche o formulário
//  2. Cria conta no Firebase Auth
//  3. Guarda em /pedidosAdesao/{uid} com status "pendente"
//  4. Guarda em /usuarios/{uid} com aprovado:false
//  5. Esconde formulário e mostra div de "pendente"
//  Admin recebe notificação no painel e decide: aprovado / recusado

import { initializeApp }   from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getDatabase, ref, set }
    from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const cfg = {
    apiKey:"AIzaSyADBRS5V1sFXzHh3KOrNivsEJJkwpuGJWk",
    authDomain:"smartlight-pap-2026.firebaseapp.com",
    projectId:"smartlight-pap-2026",
    storageBucket:"smartlight-pap-2026.appspot.com",
    messagingSenderId:"953509556806",
    appId:"1:953509556806:web:96ed896142e7b5433f5047",
    databaseURL:"https://smartlight-pap-2026-default-rtdb.firebaseio.com"
};
const app  = initializeApp(cfg);
const auth = getAuth(app);
const db   = getDatabase(app);

function validarEmail(e){ return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e); }
function validarSenha(s){ return /^(?=.*[A-Z])(?=.*[!@#$%^&*()\-_=+[\]{};:'",.<>/?\\|`~]).{8,}$/.test(s); }
function erro(id, show){ const el=document.getElementById(id); if(el) el.style.display=show?"block":"none"; }

document.getElementById("formRegister").addEventListener("submit", async e => {
    e.preventDefault();

    const nome     = document.getElementById("name").value.trim();
    const email    = document.getElementById("email").value.trim();
    const telefone = document.getElementById("telefone").value.trim();
    const provincia= document.getElementById("provincia").value;
    const idTec    = document.getElementById("id_tecnico").value.trim();
    const senha    = document.getElementById("password").value;
    const conf     = document.getElementById("confirmPassword").value;
    const termos   = document.getElementById("terms").checked;

    let ok = true;
    if(nome.length < 3)     { erro("name-error",true); ok=false; }     else erro("name-error",false);
    if(!validarEmail(email)){ erro("email-error",true); ok=false; }    else erro("email-error",false);
    if(!validarSenha(senha)){ erro("pw-error",true); ok=false; }       else erro("pw-error",false);
    if(senha !== conf)       { erro("pw-conf-error",true); ok=false; } else erro("pw-conf-error",false);
    if(!termos || !provincia || !idTec) ok=false;
    if(!ok) return;

    document.getElementById("loader-overlay").classList.remove("d-none");
    document.getElementById("btnRegister").disabled = true;

    try {
        // 1. Cria conta Auth
        const cred = await createUserWithEmailAndPassword(auth, email, senha);
        const uid  = cred.user.uid;
        await updateProfile(cred.user, { displayName: nome });

        const agora = Date.now();

        // 2. Guarda pedido de adesão
        await set(ref(db, `pedidosAdesao/${uid}`), {
            uid, nome, email, telefone, provincia, idTecnico: idTec,
            tipoConta: "tecnico", status: "pendente", criadoEm: agora
        });

        // 3. Guarda em /usuarios (conta inactiva até aprovação)
        await set(ref(db, `usuarios/${uid}`), {
            uid, nome, email, telefone, provincia, idTecnico: idTec,
            tipoConta: "tecnico", aprovado: false, status: "pendente", criadoEm: agora
        });

        // 4. Mostra div pendente
        document.getElementById("formContainer").style.display = "none";
        document.getElementById("divPendente").classList.remove("d-none");

    } catch(err) {
        console.error(err);
        const el = document.getElementById("error-register");
        el.classList.remove("d-none");
        el.textContent = err.code === "auth/email-already-in-use"
            ? "Este email já está registado. Tente fazer login."
            : "Erro ao criar conta. Tente novamente.";
        document.getElementById("btnRegister").disabled = false;
    } finally {
        document.getElementById("loader-overlay").classList.add("d-none");
    }
});