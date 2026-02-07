/*function togglePoste(posteId) {
    const container = document.getElementById('postes-row');
    const todosPostes = document.querySelectorAll('.poste-item');
    const posteSelecionado = document.getElementById(posteId);
    const detalhes = posteSelecionado.querySelector('.detalhes-extras');
    const botao = posteSelecionado.querySelector('button');

    if (!posteSelecionado.classList.contains('is-expanded')) {
        // EXPANDIR
        todosPostes.forEach(p => {
            if (p.id !== posteId) p.classList.add('is-hidden');
        });
        posteSelecionado.classList.add('is-expanded');
        detalhes.classList.remove('d-none');
        botao.innerText = "Voltar ao Dashboard";
        botao.classList.replace('btn-outline-primary', 'btn-secondary');
    } else {
        // MINIMIZAR (Voltar ao normal)
        todosPostes.forEach(p => p.classList.remove('is-hidden'));
        posteSelecionado.classList.remove('is-expanded');
        detalhes.classList.add('d-none');
        botao.innerText = "Ver Detalhes";
        botao.classList.replace('btn-secondary', 'btn-outline-primary');
    }
}*/
// Inicializa o mapa (coordenadas de exemplo)
const map = L.map('map').setView([-8.838, 13.234], 16); // Ex: Luanda

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap'
}).addTo(map);

// Dados dos Postes
const postes = [
    { id: 1, nome: "Poste Avenida A", lat: -8.838, lng: 13.234, lux: 450, curr: 1.5, pow: 330 },
    { id: 2, nome: "Poste Rua B", lat: -8.839, lng: 13.235, lux: 440, curr: 1.4, pow: 310 },
    { id: 3, nome: "Poste Praça C", lat: -8.837, lng: 13.233, lux: 0, curr: 0.0, pow: 0 }
];

// Ícone personalizado
const lightIcon = L.divIcon({
    className: 'custom-div-icon',
    html: "<i class='fas fa-lightbulb' style='color: #ffc107; font-size: 24px; text-shadow: 0 0 5px #000;'></i>",
    iconSize: [30, 42],
    iconAnchor: [15, 42]
});

// Adiciona marcadores ao mapa
postes.forEach(p => {
    const marker = L.marker([p.lat, p.lng], { icon: lightIcon }).addTo(map);
    
    // Popup simples ao passar o rato
    marker.bindTooltip(`<b>${p.nome}</b><br>Clique para detalhes`);

    // Evento de clique para abrir o Modal
    marker.on('click', () => {
        abrirDetalhes(p);
    });
});

function abrirDetalhes(p) {
    document.getElementById('modalPosteNome').innerText = p.nome;
    document.getElementById('m-lux').innerText = p.lux + " lux";
    document.getElementById('m-curr').innerText = p.curr + " A";
    document.getElementById('m-pow').innerText = p.pow + " W";
    
    const status = document.getElementById('m-status');
    status.innerText = p.curr > 0 ? "Operacional" : "Falha";
    status.className = p.curr > 0 ? "badge bg-success" : "badge bg-danger";

    const myModal = new bootstrap.Modal(document.getElementById('posteModal'));
    myModal.show();
}
