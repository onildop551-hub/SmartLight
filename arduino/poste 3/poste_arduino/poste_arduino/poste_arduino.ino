#include <SPI.h>
#include <LoRa.h>
#include "RTClib.h"
#include <Wire.h>
#include "EmonLib.h"

// =================== OBJETOS ===================
EnergyMonitor emon1;
RTC_DS3231 rtc;

// =================== PINOS ===================
#define LDR_PIN        A1
#define LAMP_PIN        7
#define MOTOR_UP_PIN    3
#define MOTOR_DOWN_PIN  4
#define CURRENT_PIN    A0
#define BOTAO_PIN       5   // botão físico: GND — botão — D5

// =================== CONFIG ===================
#define POSTE_ID 3  // <<< alterar para 2 ou 3 nos outros postes

const float CORRENTE_MAX = 2.0;
const float LUM_MIN      = 20.0;

const unsigned long INTERVALO_ENVIO_MS = 11000UL;
const unsigned long DESFASAGEM_MS      = (POSTE_ID - 1) * 2000UL;

// =================== ANTI-COLISÃO ===================
const unsigned long BACKOFF_MIN_MS = 20;
const unsigned long BACKOFF_MAX_MS = 80;

// =================== ESTADOS ===================
bool   lampState  = false;
String motorState = "parado";
String alerta     = "normal";

const unsigned long TEMPO_MOTOR_MS = 13000UL;
unsigned long inicioMotor  = 0;
bool motorLigado = false;

// Debounce do botão
const unsigned long DEBOUNCE_MS = 50;

float luminosidade = 0.0;
float corrente     = 0.0;
int   contadorPacotes = 0;

unsigned long ultimoEnvio = 0;

// =================== HORA VIA LORA ===================
int horaLoRa    = -1;
int minutoLoRa  = -1;
bool horaValida = false;

// 🔥 TIMEOUT DE VALIDADE DA HORA LORA (10 minutos)
unsigned long ultimaHoraRecebida    = 0;
const unsigned long TIMEOUT_HORA_MS = 600000UL; // 10 min

// =================== BOTÃO ===================
// Estado do motor no contexto do botão:
//   false = poste está em cima (próxima pressão = BAIXAR)
//   true  = poste está em baixo (próxima pressão = SUBIR)
bool posteBaixado = false;
unsigned long ultimoPressionar = 0;
bool botaoAnterior = HIGH; // INPUT_PULLUP → HIGH quando solto
// ===================================================
void setup() {
  Serial.begin(115200);

  pinMode(LDR_PIN, INPUT);
  pinMode(LAMP_PIN, OUTPUT);
  pinMode(MOTOR_UP_PIN, OUTPUT);
  pinMode(MOTOR_DOWN_PIN, OUTPUT);
  pinMode(BOTAO_PIN,      INPUT_PULLUP); // botão liga D5 ao GND

  digitalWrite(LAMP_PIN, HIGH);
  digitalWrite(MOTOR_UP_PIN, HIGH);
  digitalWrite(MOTOR_DOWN_PIN, HIGH);

  emon1.current(CURRENT_PIN, 60.6);

  // RTC
  if (!rtc.begin()) {
    Serial.println("ERRO RTC");
    while (1);
  }

  if (rtc.lostPower()) {
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }

  // LoRa
  LoRa.setPins(10, 9, 2);
  if (!LoRa.begin(433E6)) {
    Serial.println("ERRO LoRa");
    while (1);
  }

  LoRa.setSpreadingFactor(7);
  LoRa.setSignalBandwidth(125E3);
  LoRa.setCodingRate4(5);

  randomSeed(analogRead(2)); // semente diferente do ESP32

  ultimoEnvio = millis() - INTERVALO_ENVIO_MS + DESFASAGEM_MS;

  Serial.println("POSTE ONLINE — ID: " + String(POSTE_ID));
  LoRa.receive();
}

// ===================================================
void loop() {
  DateTime agora = rtc.now();

  // 🔥 Verificar timeout da hora LoRa
  verificarTimeoutHora();

  lerSensores();
  lerBotao();          // botão físico
  receberComandos();
  controlarLampada(agora);
  verificarAlertas();
  controlarMotorTempo();
  enviarDadosLoRa(agora);

  delay(50);
}

// ===================================================
void subirPoste() {
  if (motorLigado) pararMotor(); // para qualquer movimento anterior
  digitalWrite(MOTOR_UP_PIN,   LOW);
  digitalWrite(MOTOR_DOWN_PIN, HIGH);
  motorState  = "subindo";
  inicioMotor = millis();
  motorLigado = true;
  Serial.println("Botão: SUBIR");
}

void baixarPoste() {
  if (motorLigado) pararMotor();
  digitalWrite(MOTOR_UP_PIN,   HIGH);
  digitalWrite(MOTOR_DOWN_PIN, LOW);
  motorState  = "descendo";
  inicioMotor = millis();
  motorLigado = true;
  Serial.println("Botão: BAIXAR");
}

// ===================================================
// BOTÃO FÍSICO — alterna BAIXAR / SUBIR
// Ligação: D5 — botão — GND (usa INPUT_PULLUP)
// ===================================================
void lerBotao() {
  bool leitura = digitalRead(BOTAO_PIN);

  // Detecta flanco de descida (solto→premido) com debounce
  if (leitura == LOW && botaoAnterior == HIGH) {
    if (millis() - ultimoPressionar > DEBOUNCE_MS) {
      ultimoPressionar = millis();

      if (!posteBaixado) {
        // Poste em cima → BAIXAR
        baixarPoste();
        posteBaixado = true;
      } else {
        // Poste em baixo → SUBIR
        subirPoste();
        posteBaixado = false;
      }
    }
  }
}
// ===================================================
// 🔥 TIMEOUT — invalida hora LoRa após 10 minutos sem receber
// ===================================================
void verificarTimeoutHora() {
  if (horaValida && millis() - ultimaHoraRecebida >= TIMEOUT_HORA_MS) {
    horaValida = false;
    Serial.println("Hora LoRa expirada — a usar RTC como fallback");
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
// CONTROLO DA LÂMPADA — usa hora LoRa se válida, RTC se não
// ===================================================
void controlarLampada(DateTime agora) {

  int horaAtual;

  if (horaValida) {
    horaAtual = horaLoRa;
  } else {
    horaAtual = agora.hour(); // fallback RTC
    Serial.println("[fallback RTC] hora: " + String(horaAtual));
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
// RECEBER COMANDOS + HORA (com anti-colisão no envio do ACK)
// ===================================================
void receberComandos() {
  int packetSize = LoRa.parsePacket();
  if (!packetSize) return;

  String comando = "";
  while (LoRa.available()) comando += (char)LoRa.read();
  comando.trim();

  Serial.println("Recebido: " + comando);

  // ================= RECEBER HORA =================
  int posHora = comando.indexOf("HORA:");
  if (posHora != -1) {
    // Aceita formato "ID:X|HORA:HH:MM" e "HORA:HH:MM" isolado
    String horaStr = comando.substring(posHora + 5, posHora + 10);

    int sep = horaStr.indexOf(":");
    if (sep != -1) {
      int h = horaStr.substring(0, sep).toInt();
      int m = horaStr.substring(sep + 1).toInt();

      // Valida intervalo antes de aceitar
      if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
        horaLoRa           = h;
        minutoLoRa         = m;
        horaValida         = true;
        ultimaHoraRecebida = millis(); // 🔥 reinicia o timeout

        Serial.print("Hora LoRa actualizada: ");
        Serial.print(horaLoRa);
        Serial.print(":");
        if (minutoLoRa < 10) Serial.print("0");
        Serial.println(minutoLoRa);
      } else {
        Serial.println("Hora LoRa inválida — ignorada");
      }
    }
  }
}

void iniciarMotor() {
  inicioMotor = millis();
  motorLigado = true;
}

void pararMotor() {
  digitalWrite(MOTOR_UP_PIN, HIGH);
  digitalWrite(MOTOR_DOWN_PIN, HIGH);
  motorState = "parado";
  Serial.println("motor " + motorState);
  motorLigado = false;
}

void controlarMotorTempo() {
  if (motorLigado && millis() - inicioMotor >= TEMPO_MOTOR_MS) {
    pararMotor();
  }
}

// ===================================================
// ENVIAR DADOS LORA com anti-colisão
// ===================================================
void enviarDadosLoRa(DateTime agora) {

  if (millis() - ultimoEnvio < INTERVALO_ENVIO_MS) return;
  ultimoEnvio = millis();

  // 🔥 Anti-colisão: verifica canal antes de transmitir
  int tentativas = 0;
  while (LoRa.parsePacket() > 0 && tentativas < 5) {
    while (LoRa.available()) LoRa.read(); // drena pacote em curso
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
String montarPacote(DateTime agora) {

  String hora = "";
  if (agora.hour() < 10) hora += "0";
  hora += String(agora.hour()) + ":";
  if (agora.minute() < 10) hora += "0";
  hora += String(agora.minute());

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
// ESPERAR ACK (sem bloquear para sempre)
// ===================================================
void esperarACK() {
  unsigned long inicio = millis();

  while (millis() - inicio < 400) { // ligeiramente mais folgado (300→400ms)
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

  Serial.println("Sem ACK — próxima tentativa no próximo ciclo");
  LoRa.receive(); // garante modo escuta
}
