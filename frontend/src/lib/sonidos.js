// Señales sonoras para la puerta: con ruido y sin mirar la pantalla, el
// personal necesita oír si pasó o no. Se generan con el propio navegador para
// no cargar archivos de audio.
let contexto = null;

function ctx() {
  if (!contexto) {
    const AudioContextClass = window.AudioContext ?? window.webkitAudioContext;
    if (!AudioContextClass) return null;
    contexto = new AudioContextClass();
  }
  // en iOS el audio arranca suspendido hasta que hay un toque del usuario
  if (contexto.state === 'suspended') contexto.resume().catch(() => {});
  return contexto;
}

function tono(frecuencia, inicio, duracion, volumen = 0.14) {
  const audio = ctx();
  if (!audio) return;
  const osc = audio.createOscillator();
  const gain = audio.createGain();
  osc.type = 'sine';
  osc.frequency.value = frecuencia;
  gain.gain.setValueAtTime(volumen, audio.currentTime + inicio);
  gain.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + inicio + duracion);
  osc.connect(gain).connect(audio.destination);
  osc.start(audio.currentTime + inicio);
  osc.stop(audio.currentTime + inicio + duracion);
}

// dos notas que suben: pasó
export function sonidoOk() {
  tono(880, 0, 0.12);
  tono(1320, 0.1, 0.16);
  navigator.vibrate?.(60);
}

// nota grave y larga: no pasa
export function sonidoError() {
  tono(220, 0, 0.35, 0.18);
  navigator.vibrate?.([80, 60, 80]);
}

// nota corta: falta cobrar
export function sonidoAviso() {
  tono(520, 0, 0.18, 0.14);
  navigator.vibrate?.(40);
}

// despierta el audio con el primer toque del usuario (requisito de iOS)
export function prepararSonido() {
  ctx();
}
