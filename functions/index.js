// functions/index.js
// Cloud Function que envia a notificação FCM.
// Deploy: firebase deploy --only functions
//
// SETUP:
//   npm install -g firebase-tools
//   firebase login
//   firebase init functions   (escolhe JavaScript, não ESLint)
//   Substitui o conteúdo de functions/index.js por este ficheiro
//   firebase deploy --only functions

const { onRequest } = require("firebase-functions/v2/https");
const { initializeApp } = require("firebase-admin/app");
const { getMessaging } = require("firebase-admin/messaging");

initializeApp();

exports.sendPush = onRequest({ cors: true }, async (req, res) => {

    // Apenas POST
    if (req.method !== "POST") {
        return res.status(405).send("Method Not Allowed");
    }

    const { token, titulo, corpo } = req.body;

    if (!token || !titulo) {
        return res.status(400).json({ error: "token e titulo são obrigatórios" });
    }

    try {
        const result = await getMessaging().send({
            token,
            notification: {
                title: titulo,
                body:  corpo ?? ""
            },
            webpush: {
                notification: {
                    icon:  "/img/icone.PNG",
                    badge: "/img/icone.PNG",
                    vibrate: [200, 100, 200]
                },
                fcmOptions: {
                    link: "/"
                }
            }
        });

        return res.status(200).json({ success: true, messageId: result });

    } catch (err) {
        console.error("Erro FCM:", err);
        return res.status(500).json({ error: err.message });
    }
});