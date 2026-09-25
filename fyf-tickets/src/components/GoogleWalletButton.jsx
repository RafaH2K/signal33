import { useState } from 'react';
import { reservationsApi } from '../api/resources.js';

export default function GoogleWalletButton({ ticket, eventInfo }) {
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [passData, setPassData] = useState(null);
  const [infoMessage, setInfoMessage] = useState('');

  async function handleClick() {
    setLoading(true);
    setInfoMessage('');
    try {
      const data = await reservationsApi.getGoogleWallet(ticket.code);
      if (data?.configured && data?.saveUrl) {
        // Redirigir directamente al guardado oficial de Google Wallet
        window.open(data.saveUrl, '_blank', 'noopener,noreferrer');
      } else {
        // Mostrar vista previa del pase y opciones de descarga/configuración
        setPassData(data?.pass || null);
        setInfoMessage(data?.message || 'Google Wallet no está configurado en el servidor.');
        setModalOpen(true);
      }
    } catch (err) {
      console.error('Error al obtener pase de Google Wallet:', err);
      setInfoMessage('No se pudo generar el pase en este momento. Muestra tu código QR en taquilla.');
      setModalOpen(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="google-wallet-btn"
        onClick={handleClick}
        disabled={loading}
        title="Agregar este boleto a Google Wallet"
        aria-label="Agregar a Google Wallet"
      >
        <span className="google-wallet-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="20" height="20" fill="none">
            <path
              d="M20.5 5H3.5C2.67 5 2 5.67 2 6.5v11c0 .83.67 1.5 1.5 1.5h17c.83 0 1.5-.67 1.5-1.5v-11c0-.83-.67-1.5-1.5-1.5z"
              fill="#1F1F1F"
            />
            <path
              d="M17.5 10c-1.38 0-2.5 1.12-2.5 2.5s1.12 2.5 2.5 2.5 2.5-1.12 2.5-2.5-1.12-2.5-2.5-2.5zm0 3.5c-.55 0-1-.45-1-1s.45-1 1-1 1 .45 1 1-.45 1-1 1z"
              fill="#4285F4"
            />
            <path
              d="M5 8.5h7v1.5H5zM5 11.5h5v1.5H5z"
              fill="#E0E0E0"
            />
          </svg>
        </span>
        <span className="google-wallet-text">
          {loading ? 'Generando pase...' : 'Agregar a Google Wallet'}
        </span>
      </button>

      {modalOpen && (
        <div className="wallet-modal-overlay" onClick={() => setModalOpen(false)}>
          <div className="wallet-modal" onClick={e => e.stopPropagation()}>
            <header className="wallet-modal-header">
              <div className="wallet-badge-pill">
                <span className="wallet-dot" />
                Google Wallet
              </div>
              <button
                type="button"
                className="wallet-modal-close"
                onClick={() => setModalOpen(false)}
              >
                ✕
              </button>
            </header>

            <div className="wallet-pass-card">
              <div className="wallet-pass-top">
                <span className="wallet-pass-brand">FYF TICKETS</span>
                <span className="wallet-pass-type">PASE DIGITAL</span>
              </div>

              <h3>{passData?.eventTitle || eventInfo?.event_title || 'Evento FYF'}</h3>

              <div className="wallet-pass-details">
                <div>
                  <small>ASISTENTE</small>
                  <strong>{passData?.fullName || eventInfo?.full_name || 'Asistente'}</strong>
                </div>
                <div>
                  <small>CÓDIGO</small>
                  <strong className="wallet-code-font">{ticket.code}</strong>
                </div>
              </div>

              <div className="wallet-pass-qr">
                <img
                  src={reservationsApi.qrUrl(ticket.code)}
                  alt={`QR de acceso ${ticket.code}`}
                />
                <p>Presenta este código en la entrada o taquilla</p>
              </div>
            </div>

            <div className="wallet-modal-footer">
              <p className="wallet-help-text">
                {infoMessage}
              </p>
              <div className="wallet-modal-actions">
                <a
                  href={reservationsApi.qrUrl(ticket.code)}
                  download={`boleto-${ticket.code}.png`}
                  className="dashboard-button"
                  target="_blank"
                  rel="noreferrer"
                >
                  Descargar código QR
                </a>
                <button
                  type="button"
                  className="payment-action"
                  onClick={() => setModalOpen(false)}
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
