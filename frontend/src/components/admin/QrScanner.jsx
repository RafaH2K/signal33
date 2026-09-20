import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { extractTicketCode } from '../../lib/tickets.js';

// Lado máximo del cuadro que se analiza. Un teléfono entrega 1280×720 o más, y
// decodificar eso entero tarda cientos de milisegundos: no alcanza a procesar
// ni un cuadro y parece que "no lee". A 640 px el QR sigue siendo de sobra
// legible y cada intento baja a pocos milisegundos.
const MAX_SIDE = 640;
// se analiza sólo el centro, que es donde está el marco guía
const CROP = 0.72;
// cada cuántos cuadros se prueba leer en negativo (boletos impresos en
// negativo, pantallas con filtro de color). Va salteado porque cuesta el doble.
const INVERT_EVERY = 6;

export default function QrScanner({ onScan, active = true }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const onScanRef = useRef(onScan);
  const activeRef = useRef(active);
  const [cameraError, setCameraError] = useState('');
  const [listo, setListo] = useState(false);

  // se guardan en refs para no reiniciar la cámara cada vez que el padre
  // cambia de estado: volver a pedirla tarda y parpadea
  useEffect(() => {
    onScanRef.current = onScan;
    activeRef.current = active;
  });

  useEffect(() => {
    let stream;
    let frame;
    let stopped = false;
    let cuadro = 0;
    let wakeLock = null;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: 'environment' }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (error) {
        setCameraError(
          error?.name === 'NotAllowedError'
            ? 'No diste permiso de cámara. Activalo en el navegador, o escribí el código a mano.'
            : 'No se pudo abrir la cámara. Escribí el código a mano.'
        );
        return;
      }
      if (stopped) return stream.getTracks().forEach((t) => t.stop());

      const video = videoRef.current;
      video.srcObject = stream;
      await video.play().catch(() => {});
      setListo(true);

      // en la puerta nadie va a estar tocando la pantalla para que no se apague
      try {
        wakeLock = await navigator.wakeLock?.request('screen');
      } catch {
        // el navegador no lo soporta o lo negó: no es grave
      }

      tick();
    }

    function tick() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Todo el análisis va protegido: jsQR puede lanzar con ciertos cuadros
      // (por ejemplo "matrix.height" al leer en negativo) y sin esto el ciclo
      // moría en silencio, dejando la cámara encendida sin leer nada.
      try {
        // Basta con que haya un cuadro disponible: comparar contra
        // HAVE_ENOUGH_DATA no sirve porque una cámara en vivo no siempre
        // llega a ese estado.
        if (activeRef.current && video.readyState >= video.HAVE_CURRENT_DATA && video.videoWidth > 0) {
          const lado = Math.min(video.videoWidth, video.videoHeight) * CROP;
          const destino = Math.round(lado * Math.min(1, MAX_SIDE / lado));
          canvas.width = destino;
          canvas.height = destino;

          const ctx = canvas.getContext('2d', { willReadFrequently: true });
          ctx.drawImage(
            video,
            (video.videoWidth - lado) / 2,
            (video.videoHeight - lado) / 2,
            lado,
            lado,
            0,
            0,
            destino,
            destino
          );
          const image = ctx.getImageData(0, 0, destino, destino);

          cuadro += 1;
          const qr = jsQR(image.data, image.width, image.height, {
            inversionAttempts: cuadro % INVERT_EVERY === 0 ? 'onlyInvert' : 'dontInvert',
          });
          const code = qr && extractTicketCode(qr.data);
          if (code) {
            navigator.vibrate?.(60);
            onScanRef.current(code);
          }
        }
      } catch {
        // cuadro problemático: se ignora y se sigue con el siguiente
      }
      frame = requestAnimationFrame(tick);
    }

    // React monta los efectos dos veces en desarrollo: sin esta espera se abre
    // la cámara dos veces seguidas y en iOS la segunda apertura puede dejar
    // muerta a la primera.
    const arranque = setTimeout(start, 60);

    return () => {
      stopped = true;
      clearTimeout(arranque);
      cancelAnimationFrame(frame);
      wakeLock?.release?.().catch(() => {});
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  if (cameraError) {
    return <p className="border border-line px-4 py-6 text-center text-sm text-mist">{cameraError}</p>;
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden bg-black">
      <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
      {/* el marco marca la zona que realmente se analiza */}
      <div
        className={`pointer-events-none absolute inset-[14%] border-2 transition-colors ${
          active ? 'border-signal' : 'border-white/20'
        }`}
      />
      {!listo && <p className="absolute inset-0 grid place-items-center text-xs text-mist">Abriendo la cámara...</p>}
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
