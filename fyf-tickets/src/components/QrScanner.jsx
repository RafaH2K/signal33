import { useEffect, useRef, useState, useCallback } from 'react';
import jsQR from 'jsqr';
import { extractTicketCode } from '../lib/format.js';

export default function QrScanner({ onScan, onClose, title = 'Escanear código QR' }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [cameraError, setCameraError] = useState('');
  const [facingMode, setFacingMode] = useState('environment');
  const [hasMultipleCameras, setHasMultipleCameras] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [scanning, setScanning] = useState(true);

  // Detectar si hay más de una cámara
  useEffect(() => {
    if (navigator.mediaDevices?.enumerateDevices) {
      navigator.mediaDevices.enumerateDevices().then(devices => {
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        if (videoDevices.length > 1) {
          setHasMultipleCameras(true);
        }
      }).catch(() => {});
    }
  }, []);

  const handleDetected = useCallback((code) => {
    if (!code) return;
    try {
      navigator.vibrate?.(100);
    } catch {
      // Ignorar si no está soportado
    }
    setScanning(false);
    onScan(code);
  }, [onScan]);

  useEffect(() => {
    if (!scanning) return undefined;

    let stream = null;
    let frameId = null;
    let isStopped = false;
    const currentVideoEl = videoRef.current;

    async function startCamera() {
      setCameraError('');
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error('Tu navegador no tiene soporte para acceder a la cámara.');
        }

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });

        if (isStopped) {
          stream.getTracks().forEach(t => t.stop());
          return;
        }

        const video = videoRef.current;
        if (!video) return;
        video.srcObject = stream;
        await video.play().catch(() => {});

        // Loop de escaneo
        const tick = () => {
          if (isStopped) return;
          const currentVideo = videoRef.current;
          const currentCanvas = canvasRef.current;

          if (currentVideo && currentCanvas && currentVideo.readyState >= currentVideo.HAVE_CURRENT_DATA) {
            const width = currentVideo.videoWidth;
            const height = currentVideo.videoHeight;

            if (width > 0 && height > 0) {
              currentCanvas.width = width;
              currentCanvas.height = height;
              const ctx = currentCanvas.getContext('2d', { willReadFrequently: true });
              if (ctx) {
                ctx.drawImage(currentVideo, 0, 0, width, height);
                const imageData = ctx.getImageData(0, 0, width, height);
                const qrResult = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: 'dontInvert',
                });

                if (qrResult && qrResult.data) {
                  const detectedCode = extractTicketCode(qrResult.data);
                  if (detectedCode) {
                    handleDetected(detectedCode);
                    return;
                  }
                }
              }
            }
          }

          frameId = requestAnimationFrame(tick);
        };

        frameId = requestAnimationFrame(tick);
      } catch (err) {
        console.error('Error abriendo cámara:', err);
        if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
          setCameraError('Permiso de cámara denegado. Permite el acceso a la cámara en los ajustes de tu navegador.');
        } else if (err.name === 'NotFoundError') {
          setCameraError('No se encontró ninguna cámara en este dispositivo.');
        } else {
          setCameraError(err.message || 'No se pudo iniciar la cámara.');
        }
      }
    }

    startCamera();

    return () => {
      isStopped = true;
      if (frameId) cancelAnimationFrame(frameId);
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (currentVideoEl) {
        currentVideoEl.srcObject = null;
      }
    };
  }, [facingMode, scanning, handleDetected]);

  function handleManualSubmit(e) {
    e.preventDefault();
    const code = extractTicketCode(manualCode) || manualCode.trim().toUpperCase();
    if (code) {
      handleDetected(code);
    }
  }

  function toggleCamera() {
    setFacingMode(current => (current === 'environment' ? 'user' : 'environment'));
  }

  return (
    <div className="qr-scanner-overlay" role="dialog" aria-modal="true" aria-label={title}>
      <div className="qr-scanner-modal">
        <header className="qr-scanner-header">
          <div className="qr-scanner-title">
            <span className="qr-scanner-dot" />
            <h3>{title}</h3>
          </div>
          <button
            type="button"
            className="qr-scanner-close"
            onClick={onClose}
            aria-label="Cerrar escáner"
          >
            ✕
          </button>
        </header>

        <div className="qr-scanner-viewport">
          {cameraError ? (
            <div className="qr-scanner-error">
              <span className="qr-error-icon">⚠️</span>
              <p>{cameraError}</p>
              <button
                type="button"
                className="payment-action"
                onClick={() => {
                  setCameraError('');
                  setScanning(true);
                }}
              >
                Reintentar cámara
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                muted
                playsInline
                autoPlay
                className="qr-scanner-video"
              />
              <div className="qr-scanner-frame">
                <div className="qr-scanner-guide">
                  <div className="qr-corner qr-corner--tl" />
                  <div className="qr-corner qr-corner--tr" />
                  <div className="qr-corner qr-corner--bl" />
                  <div className="qr-corner qr-corner--br" />
                  <div className="qr-scan-line" />
                </div>
              </div>
              <canvas ref={canvasRef} className="qr-scanner-canvas" />
            </>
          )}

          {hasMultipleCameras && !cameraError && (
            <button
              type="button"
              className="qr-switch-camera"
              onClick={toggleCamera}
              title="Cambiar de cámara"
            >
              🔄 Voltear cámara
            </button>
          )}
        </div>

        <p className="qr-scanner-hint">
          Apunta la cámara al código QR del boleto.
        </p>

        <form className="qr-scanner-manual" onSubmit={handleManualSubmit}>
          <input
            type="text"
            placeholder="O escribe el código de 16 dígitos"
            value={manualCode}
            onChange={e => setManualCode(e.target.value)}
            maxLength={32}
            autoCapitalize="characters"
          />
          <button type="submit" className="dashboard-button" disabled={!manualCode.trim()}>
            Validar
          </button>
        </form>
      </div>
    </div>
  );
}
