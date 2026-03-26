#include <SPI.h>
#include <LoRa.h>
#include <ThreeWire.h>      // dependência da RtcDS1302
#include <RtcDS1302.h>      // biblioteca Makuna/RTC — instalar via Library Manager
#include "EmonLib.h"

// =================== OBJETOS ===================
EnergyMonitor emon1;

// =================== PINOS RTC DS1302 ===================
// Ligação física:
//   CLK  → pino 6  (relógio)
//   DAT  → pino 5  (dados bidireccionais)
//   RST  → pino 8  (chip enable — NÃO é o RST do LoRa)
ThreeWire rtcWire(5, 6, 8);   // (DAT, CLK, CE)
RtcDS1302<ThreeWire> rtc(rtcWire);

// =================== PINOS ===================
#define LDR_PIN        A1
#define LAMP_PIN        7
#define MOTOR_UP_PIN    3
#define MOTOR_DOWN_PIN  4
#define CURRENT_PIN    A0

// =================== CONFIG ===================
#define POSTE_ID 2  // <<< alterar para 2 ou 3 nos outros postes

const float CORRENTE_MAX = 2.0;
const float LUM_MIN      = 20.0;

const unsigned long INTERVALO_ENVIO_MS = 6000UL;
const unsigned long DESFASAGEM_MS      = (POSTE_ID - 1) * 2000UL;

// =================== ANTI-COLISÃO ===================
const unsigned long BACKOFF_MIN_MS = 20;
const unsigned long BACKOFF_MAX_MS = 80;

// =================== ESTADOS ===================
bool   lampState  = false;
String motorState = "parado";
String alerta     = "normal";

const unsigned long TEMPO_MOTOR_MS = 13000UL;
unsigned long inicioMotor = 0;
bool motorLigado = false;

float luminosidade = 0.0;
float corrente     = 0.0;
int   contadorPacotes = 0;

unsigned long ultimoEnvio = 0;

// =================== HORA VIA LORA ===================
int  horaLoRa   = -1;
int  minutoLoRa = -1;
bool horaValida = false;

unsigned long ultimaHoraRecebida    = 0;
const unsigned long TIMEOUT_HORA_MS = 600000UL; // 10 min

// ===================================================
void setup() {
  Serial.begin(115200);

  pinMode(LDR_PIN, INPUT);
  pinMode(LAMP_PIN, OUTPUT);
  pinMode(MOTOR_UP_PIN, OUTPUT);
  pinMode(MOTOR_DOWN_PIN, OUTPUT);

  digitalWrite(LAMP_PIN, HIGH);
  digitalWrite(MOTOR_UP_PIN, HIGH);
  digitalWrite(MOTOR_DOWN_PIN, HIGH);

  emon1.current(CURRENT_PIN, 60.6);

  // =================== INIT DS1302 ===================
  rtc.Begin();

  // Verifica se o RTC está a correr; se não, acerta com a hora de compilação
  if (!rtc.IsDateTimeValid()) {
    Serial.println("RTC sem hora válida — a acertar com hora de compilação");
    RtcDateTime compiled = RtcDateTime(__DATE__, __TIME__);
    rtc.SetDateTime(compiled);
  }

  // Garante que o oscilador está activo (pode ter sido desligado por software)
  if (rtc.GetIsWriteProtected()) {
    rtc.SetIsWriteProtected(false);
  }

  if (!rtc.GetIsRunning()) {
    Serial.println("DS1302 estava parado — a iniciar");
    rtc.SetIsRunning(true);
  }

  Serial.println("DS1302 OK");

  // LoRa
  LoRa.setPins(10, 9, 2);
  if (!LoRa.begin(433E6)) {
    Serial.println("ERRO LoRa");
    while (1);
  }

  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);

  randomSeed(analogRead(2));

  ultimoEnvio = millis() - INTERVALO_ENVIO_MS + DESFASAGEM_MS;

  Serial.println("POSTE ONLINE — ID: " + String(POSTE_ID));
  LoRa.receive();
}

// ===================================================
void loop() {

  // Lê hora actual do DS1302
  RtcDateTime agora = rtc.GetDateTime();

  verificarTimeoutHora();
  lerSensores();
  receberComandos();
  controlarLampada(agora);
  verificarAlertas();
  controlarMotorTempo();
  enviarDadosLoRa(agora);

  delay(50);
}

// ===================================================
// TIMEOUT — invalida hora LoRa após 10 min sem receber
// ===================================================
void verificarTimeoutHora() {
  if (horaValida && millis() - ultimaHoraRecebida >= TIMEOUT_HORA_MS) {
    horaValida = false;
    Serial.println("Hora LoRa expirada — a usar DS1302 como fallback");
  }
}

// ===================================================
void lerSensores() {
  long soma = 0;
  for (int i = 0; i < 5; i++) {
    soma += analogRead(LDR_PIN);
    delay(2);
  }
  luminosidade = ((soma / 5) / 1023.0) * 100.0;
  corrente = emon1.calcIrms(400);
}

// ===================================================
// CONTROLO DA LÂMPADA
// RtcDateTime usa .Hour() com H maiúsculo (diferença da RTClib)
// ===================================================
void controlarLampada(RtcDateTime agora) {

  int horaAtual;

  if (horaValida) {
    horaAtual = horaLoRa;
  } else {
    horaAtual = agora.Hour(); // fallback DS1302 — .Hour() com H maiúsculo
    Serial.println("[fallback DS1302] hora: " + String(horaAtual));
  }

  if (horaAtual >= 18 || horaAtual < 6) {
    digitalWrite(LAMP_PIN, LOW);
    lampState = true;
  } else {
    digitalWrite(LAMP_PIN, HIGH);
    lampState = false;
  }
}

// ===================================================
void verificarAlertas() {
  if (corrente > CORRENTE_MAX) {
    alerta = "sobrecarga";
  } else if (corrente < 0.05 && lampState) {
    alerta = "fio_cortado";
  } else if (corrente < 0.05 && luminosidade < 1.0) {
    alerta = "tensao_ausente";
  } else {
    alerta = "normal";
  }
}

// ===================================================
// RECEBER COMANDOS + HORA
// ===================================================
void receberComandos() {
  int packetSize = LoRa.parsePacket();
  if (!packetSize) return;

  String comando = "";
  while (LoRa.available()) comando += (char)LoRa.read();
  comando.trim();

  Serial.println("Recebido: " + comando);

  // ================= HORA =================
  int posHora = comando.indexOf("HORA:");
  if (posHora != -1) {
    String horaStr = comando.substring(posHora + 5, posHora + 10);
    int sep = horaStr.indexOf(":");
    if (sep != -1) {
      int h = horaStr.substring(0, sep).toInt();
      int m = horaStr.substring(sep + 1).toInt();

      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        horaLoRa           = h;
        minutoLoRa         = m;
        horaValida         = true;
        ultimaHoraRecebida = millis();

        // 🔥 Sincroniza também o DS1302 com a hora recebida via LoRa
        // Mantém a data actual do RTC, só actualiza hora e minuto
        RtcDateTime atual = rtc.GetDateTime();
        RtcDateTime sync(
          atual.Year(), atual.Month(), atual.Day(),
          h, m, 0
        );
        if (rtc.GetIsWriteProtected()) rtc.SetIsWriteProtected(false);
        rtc.SetDateTime(sync);

        Serial.print("Hora LoRa aceite e sincronizada no DS1302: ");
        Serial.print(h); Serial.print(":");
        if (m < 10) Serial.print("0");
        Serial.println(m);
      } else {
        Serial.println("Hora LoRa inválida — ignorada");
      }
    }
  }

  // ================= COMANDOS =================
  int posID  = comando.indexOf("ID:");
  int posCMD = comando.indexOf("|CMD:");
  if (posID == -1 || posCMD == -1) return;

  int id = comando.substring(posID + 3, posCMD).toInt();
  if (id != POSTE_ID) return;

  String cmd = comando.substring(posCMD + 5);
  cmd.trim();
  Serial.println("Comando recebido: " + cmd);
  executarComando(cmd);
}

// ===================================================
void executarComando(String cmd) {
  if (cmd == "SUBIR") {
    digitalWrite(MOTOR_UP_PIN, LOW);
    digitalWrite(MOTOR_DOWN_PIN, HIGH);
    motorState = "subindo";
    iniciarMotor();
  }
  else if (cmd == "BAIXAR") {
    digitalWrite(MOTOR_UP_PIN, HIGH);
    digitalWrite(MOTOR_DOWN_PIN, LOW);
    motorState = "descendo";
    iniciarMotor();
  }
  else if (cmd == "PARAR") {
    pararMotor();
  }
  Serial.println("motor " + motorState);
}

void iniciarMotor() {
  inicioMotor = millis();
  motorLigado = true;
}

void pararMotor() {
  digitalWrite(MOTOR_UP_PIN, HIGH);
  digitalWrite(MOTOR_DOWN_PIN, HIGH);
  motorState = "parado";
  motorLigado = false;
}

void controlarMotorTempo() {
  if (motorLigado && millis() - inicioMotor >= TEMPO_MOTOR_MS) {
    pararMotor();
  }
}

// ===================================================
// ENVIAR DADOS com anti-colisão
// ===================================================
void enviarDadosLoRa(RtcDateTime agora) {

  if (millis() - ultimoEnvio < INTERVALO_ENVIO_MS) return;
  ultimoEnvio = millis();

  // Anti-colisão
  int tentativas = 0;
  while (LoRa.parsePacket() > 0 && tentativas < 5) {
    while (LoRa.available()) LoRa.read();
    unsigned long espera = random(BACKOFF_MIN_MS, BACKOFF_MAX_MS);
    unsigned long t = millis();
    while (millis() - t < espera) {}
    tentativas++;
  }

  String pacote = montarPacote(agora);

  LoRa.beginPacket();
  LoRa.print(pacote);
  LoRa.endPacket();
  LoRa.receive();

  Serial.println("Enviado: " + pacote);

  esperarACK();
}

// ===================================================
// RtcDateTime usa .Hour() .Minute() com maiúscula
// ===================================================
String montarPacote(RtcDateTime agora) {

  String hora = "";
  if (agora.Hour() < 10) hora += "0";
  hora += String(agora.Hour()) + ":";
  if (agora.Minute() < 10) hora += "0";
  hora += String(agora.Minute());

  String p = "";
  p += "ID_PACOTE:" + String(contadorPacotes);
  p += "|ID_POSTE:" + String(POSTE_ID);
  p += "|HORA:" + hora;
  p += "|LUM:" + String(luminosidade, 1);
  p += "|CORR:" + String(corrente, 2);
  p += "|LAMP:" + String(lampState ? "ON" : "OFF");
  p += "|MOTOR:" + motorState;
  p += "|ALERTA:" + alerta;

  contadorPacotes++;
  return p;
}

// ===================================================
void esperarACK() {
  unsigned long inicio = millis();

  while (millis() - inicio < 400) {
    if (LoRa.parsePacket()) {
      String r = "";
      while (LoRa.available()) r += (char)LoRa.read();
      r.trim();

      if (r == "ACK:" + String(POSTE_ID)) {
        Serial.println("ACK OK");
        return;
      }
    }
  }

  Serial.println("Sem ACK");
  LoRa.receive();
}
