import { useEffect, useRef, useState } from 'react';
import jsQR from 'jsqr';
import { extractTicketCode } from '../../lib/tickets.js';

// Lee cuadros de la cámara trasera y los decodifica con jsQR. Se usa jsQR y no
// la API nativa BarcodeDetector porque ésta no existe en Safari ni en Chrome de
// escritorio en Windows.
export default function QrScanner({ onScan }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraError, setCameraError] = useState('');

  useEffect(() => {
    let stream;
    let frame;
    let stopped = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      } catch {
        setCameraError('No se pudo abrir la cámara. Revisa los permisos o ingresa el código a mano.');
        return;
      }
      if (stopped) return stream.getTracks().forEach((t) => t.stop());

      const video = videoRef.current;
      video.srcObject = stream;
      await video.play().catch(() => {});
      tick();
    }

    function tick() {
      if (stopped) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const qr = jsQR(image.data, image.width, image.height, { inversionAttempts: 'dontInvert' });
        const code = qr && extractTicketCode(qr.data);
        if (code) {
          navigator.vibrate?.(80);
          onScan(code);
          return;
        }
      }
      frame = requestAnimationFrame(tick);
    }

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, [onScan]);

  if (cameraError) return <p className="border border-line px-4 py-6 text-center text-sm text-mist">{cameraError}</p>;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden bg-black">
      <video ref={videoRef} muted playsInline className="h-full w-full object-cover" />
      <div className="pointer-events-none absolute inset-[15%] border-2 border-signal/80" />
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}
