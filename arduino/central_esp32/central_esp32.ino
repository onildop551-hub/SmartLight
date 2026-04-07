#include <SPI.h>
#include <LoRa.h>
#include <WiFi.h>
#include "FirebaseESP32.h"

// =================== PINOS LoRa ===================
#define SCK   18
#define MISO  19
#define MOSI  23
#define SS     4
#define RST   14
#define DIO0  26

// =================== CREDENCIAIS ==================
#define WIFI_SSID       "Onildo"
#define WIFI_PASSWORD   "onildo123"
#define DATABASE_URL    "https://smartlight-pap-2026-default-rtdb.firebaseio.com"
#define DATABASE_SECRET "8HunitBQP2opqe6CUdnm005g39MMTlk0FPjCe3Az"

// =================== FIREBASE =====================
FirebaseData fbdoLeitura;
FirebaseData fbdoEscrita;
FirebaseConfig config;
FirebaseAuth auth;

#define CMD_VAZIO "NONE"

// =================== VARIÁVEIS ====================
unsigned long ultimaLeituraComandos = 0;
const unsigned long INTERVALO_COMANDOS = 2000;

// 🔥 CONTROLO DE HORA
// Removida comparação de igualdade — ESP32 reenvia sempre
// Reenvio forçado a cada INTERVALO_REENVIO_HORA mesmo sem mudança
unsigned long ultimoEnvioHora    = 0;
const unsigned long INTERVALO_HORA         = 4000;   // ciclo normal
const unsigned long INTERVALO_REENVIO_HORA = 120000; // reenvio forçado (2 min)
unsigned long ultimoReenvioForcado = 0;
String ultimaHoraPoste[4] = {"", "", "", ""};

// 🔥 ANTI-COLISÃO — tempo mínimo entre transmissões
const unsigned long BACKOFF_MIN_MS = 20;
const unsigned long BACKOFF_MAX_MS = 80;

// ===================================================
void setup() {
  Serial.begin(115200);
  delay(500);

  conectarWiFi();

  config.database_url               = DATABASE_URL;
  config.signer.tokens.legacy_token = DATABASE_SECRET;
  Firebase.begin(&config, &auth);
  Firebase.reconnectWiFi(true);

  Serial.println("Firebase OK");

  iniciarLoRa();

  Serial.println("Inicializando comandos...");
  for (int i = 1; i <= 3; i++) {
    String path = "/comandos/poste0" + String(i);
    Firebase.setString(fbdoEscrita, path, CMD_VAZIO);
  }

  randomSeed(analogRead(0)); // semente para backoff aleatório

  Serial.println("=== CENTRAL ONLINE ===");
}

// ===================================================
void loop() {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("WiFi caiu...");
    conectarWiFi();
  }

  receberEProcessarLoRa();

  enviarHoraPostes();
}

// ===================================================
// RECEBER DADOS DOS POSTES
// ===================================================
void receberEProcessarLoRa() {
  int packetSize = LoRa.parsePacket();
  if (!packetSize) return;

  String rawData = "";
  while (LoRa.available()) rawData += (char)LoRa.read();
  rawData.trim();

  Serial.println("LoRa recebido: " + rawData);
  processarPacote(rawData);
}

// ===================================================
// PARSE COMPLETO — guarda campos individuais no Firebase
// ===================================================
void processarPacote(String rawData) {

  int posIdPoste = rawData.indexOf("|ID_POSTE:");
  int posHora    = rawData.indexOf("|HORA:");
  int posLum     = rawData.indexOf("|LUM:");
  int posCorr    = rawData.indexOf("|CORR:");
  int posLamp    = rawData.indexOf("|LAMP:");
  int posMotor   = rawData.indexOf("|MOTOR:");
  int posAlerta  = rawData.indexOf("|ALERTA:");

  if (posIdPoste == -1 || posHora == -1) {
    Serial.println("Pacote inválido");
    return;
  }

  // Extrair ID do poste
  String idPoste = rawData.substring(posIdPoste + 10, posHora);
  idPoste.trim();

  String path = "/postes/poste" + idPoste;

  // Guardar raw completo (para debug)
  Firebase.setString(fbdoEscrita, path + "/raw", rawData);

  // --- HORA ---
  if (posHora != -1) {
    int fimHora = (posLum != -1) ? posLum : rawData.length();
    String hora = rawData.substring(posHora + 6, fimHora);
    hora.trim();
    Firebase.setString(fbdoEscrita, path + "/hora", hora);
  }

  // --- LUMINOSIDADE ---
  if (posLum != -1) {
    int fim = (posCorr != -1) ? posCorr : rawData.length();
    String lum = rawData.substring(posLum + 5, fim);
    lum.trim();
    Firebase.setString(fbdoEscrita, path + "/luminosidade", lum);
  }

  // --- CORRENTE ---
  if (posCorr != -1) {
    int fim = (posLamp != -1) ? posLamp : rawData.length();
    String corr = rawData.substring(posCorr + 6, fim);
    corr.trim();
    Firebase.setString(fbdoEscrita, path + "/corrente", corr);
  }

  // --- LÂMPADA ---
  if (posLamp != -1) {
    int fim = (posMotor != -1) ? posMotor : rawData.length();
    String lamp = rawData.substring(posLamp + 6, fim);
    lamp.trim();
    Firebase.setString(fbdoEscrita, path + "/lampada", lamp);
  }

  // --- MOTOR ---
  if (posMotor != -1) {
    int fim = (posAlerta != -1) ? posAlerta : rawData.length();
    String motor = rawData.substring(posMotor + 7, fim);
    motor.trim();
    Firebase.setString(fbdoEscrita, path + "/motor", motor);
  }

  // --- ALERTA ---
  if (posAlerta != -1) {
    String alerta = rawData.substring(posAlerta + 8);
    alerta.trim();
    Firebase.setString(fbdoEscrita, path + "/alerta", alerta);
  }

  Serial.println("Campos guardados em: " + path);

  // ACK com anti-colisão
  String ack = "ACK:" + idPoste;
  enviarLoRa(ack);
  LoRa.receive();
}

// ===================================================
// ENVIAR COM ANTI-COLISÃO (backoff aleatório)
// ===================================================
void enviarLoRa(String msg) {

  // Verifica se canal está ocupado — backoff aleatório se sim
  unsigned long tentativas = 0;
  while (LoRa.parsePacket() > 0 && tentativas < 5) {
    // Drena o pacote em curso sem processar
    while (LoRa.available()) LoRa.read();
    unsigned long espera = random(BACKOFF_MIN_MS, BACKOFF_MAX_MS);
    unsigned long inicio = millis();
    while (millis() - inicio < espera) {}  // espera sem delay()
    tentativas++;
  }

  Serial.println("A enviar LoRa: " + msg);

  LoRa.idle();

  if (LoRa.beginPacket()) {
    LoRa.print(msg);
    LoRa.endPacket();
    LoRa.receive();
    Serial.println("Enviado com sucesso");
  } else {
    Serial.println("Erro ao iniciar pacote LoRa");
  }

  // Pausa curta sem delay() — usa millis para não bloquear o loop
  unsigned long pausaInicio = millis();
  while (millis() - pausaInicio < 20) {}
}

// ===================================================
// ENVIAR HORA PARA POSTES (com reenvio forçado periódico)
// ===================================================
void enviarHoraPostes() {

  if (millis() - ultimoEnvioHora < INTERVALO_HORA) return;
  ultimoEnvioHora = millis();

  bool forcaReenvio = (millis() - ultimoReenvioForcado >= INTERVALO_REENVIO_HORA);
  if (forcaReenvio) {
    ultimoReenvioForcado = millis();
    Serial.println("Reenvio forçado de hora para todos os postes");
  }

  for (int i = 1; i <= 3; i++) {

    String path = "/horarios/poste0" + String(i);

    if (!Firebase.getString(fbdoLeitura, path)) {
      Serial.println("Erro ao ler " + path);
      continue;
    }

    String hora = fbdoLeitura.stringData();
    hora.trim();

    if (hora == "" || hora == CMD_VAZIO) continue;

    // Só salta se a hora NÃO mudou E não é reenvio forçado
    if (hora == ultimaHoraPoste[i] && !forcaReenvio) continue;

    ultimaHoraPoste[i] = hora;

    String pacote = "ID:" + String(i) + "|HORA:" + hora;
    enviarLoRa(pacote);
    LoRa.receive();

    Serial.println("Hora enviada → poste0" + String(i) + ": " + hora);

    // Pequena pausa entre postes sem delay()
    unsigned long p = millis();
    while (millis() - p < 50) {}
  }
}


// ===================================================
void conectarWiFi() {
  Serial.print("Conectando WiFi...");
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  while (WiFi.status() != WL_CONNECTED) {
    unsigned long t = millis();
    while (millis() - t < 500) {}
    Serial.print(".");
  }

  Serial.println("\nWiFi OK");
}

// ===================================================
void iniciarLoRa() {

  pinMode(RST, OUTPUT);
  digitalWrite(RST, LOW);
  unsigned long t = millis(); while (millis() - t < 100) {}
  digitalWrite(RST, HIGH);
  t = millis(); while (millis() - t < 100) {}

  SPI.begin(SCK, MISO, MOSI, SS);
  LoRa.setPins(SS, RST, DIO0);

  if (!LoRa.begin(433E6)) {
    Serial.println("Erro LoRa");
    while (1);
  }

  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);

  Serial.println("LoRa OK");
}
