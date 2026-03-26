// firebase-messaging-sw.js
// Coloca este ficheiro na RAIZ do projecto (mesma pasta que index.html)

importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

firebase.initializeApp({
    apiKey:            "AIzaSyADBRS5V1sFXzHh3KOrNivsEJJkwpuGJWk",
    authDomain:        "smartlight-pap-2026.firebaseapp.com",
    projectId:         "smartlight-pap-2026",
    storageBucket:     "smartlight-pap-2026.appspot.com",
    messagingSenderId: "953509556806",
    appId:             "1:953509556806:web:96ed896142e7b5433f5047"
});

const messaging = firebase.messaging();

// Notificação recebida com o site FECHADO ou em segundo plano
messaging.onBackgroundMessage(payload => {
    const { title, body, icon } = payload.notification ?? {};

    self.registration.showNotification(title ?? "SmartLight", {
        body:  body  ?? "Nova mensagem recebida.",
        icon:  icon  ?? "/img/icone.PNG",
        badge: "/img/icone.PNG",
        vibrate: [200, 100, 200],
        data: payload.data ?? {}
    });
});

// Clique na notificação → abre o site
self.addEventListener("notificationclick", event => {
    event.notification.close();
    event.waitUntil(
        clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
            for (const client of list) {
                if (client.url.includes(self.location.origin) && "focus" in client)
                    return client.focus();
            }
            return clients.openWindow("/");
        })
    );
});