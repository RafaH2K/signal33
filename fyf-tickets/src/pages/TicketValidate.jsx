import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { reservationsApi } from '../api/resources.js';
import { getUser, isAuthenticated } from '../auth/auth.js';
import { formatDateTime, formatMoney } from '../lib/format.js';
import QrScanner from '../components/QrScanner.jsx';
import GoogleWalletButton from '../components/GoogleWalletButton.jsx';
import './organizer.css';

export default function TicketValidate() {
  const { code } = useParams();
  const user = getUser();
  const isStaff = isAuthenticated() && (user?.role === 'ADMIN' || user?.role === 'STAFF');

  const [ticket, setTicket] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);

  useEffect(() => {
    if (!code) return;
    setLoading(true);
    setError('');
    setNotice('');

    reservationsApi
      .getTicket(code)
      .then(data => {
        setTicket(data);
      })
      .catch(err => {
        setError(err.message || 'Código de boleto no válido o no encontrado.');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [code]);

  async function handleMarkPaid() {
    if (!ticket) return;
    if (!window.confirm(`¿Confirmas el cobro de ${formatMoney(ticket.amount_due)} a ${ticket.full_name}?`)) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await reservationsApi.setPaid(ticket.reservation_id, true);
      setTicket(current => ({ ...current, is_paid: true }));
      setNotice(`Pago registrado correctamente para ${ticket.full_name}.`);
    } catch (err) {
      setError(err.message || 'No se pudo actualizar el estado de pago.');
    } finally {
      setBusy(false);
    }
  }

  async function handleCheckIn() {
    if (!ticket) return;
    setBusy(true);
    setError('');
    setNotice('');
    try {
      const updated = await reservationsApi.checkIn(ticket.code);
      setTicket(updated);
      setNotice(`¡Acceso concedido a ${updated.full_name}!`);
    } catch (err) {
      setError(err.message || 'No se pudo registrar el acceso.');
    } finally {
      setBusy(false);
    }
  }

  function handleScannedCode(nextCode) {
    setScannerOpen(false);
    if (nextCode) {
      window.location.href = `/boletos/validar/${nextCode}`;
    }
  }

  if (loading) {
    return (
      <main className="lookup-page">
        <p className="lookup-loading">Buscando información del acceso {code}…</p>
      </main>
    );
  }

  return (
    <main className="lookup-page">
      <header className="site-header" style={{ marginBottom: '24px' }}>
        <Link to="/" className="brand">
          <span className="brand__mark">FYF</span>
          <span className="brand__name">TICKETS</span>
        </Link>
        <div className="site-header-actions">
          {isStaff ? (
            <Link to="/organizador" className="header-action">
              Panel organizador
            </Link>
          ) : (
            <Link to="/" className="header-action">
              Inicio
            </Link>
          )}
        </div>
      </header>

      <section className="lookup-card">
        {error ? (
          <>
            <span className="section-eyebrow" style={{ color: '#9a3524' }}>
              ERROR DE VALIDACIÓN
            </span>
            <h1>Boleto no válido</h1>
            <p>{error}</p>
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
              {isStaff && (
                <button
                  type="button"
                  className="dashboard-button"
                  onClick={() => setScannerOpen(true)}
                >
                  Escanear otro código
                </button>
              )}
              <Link to="/" className="lookup-back" style={{ marginTop: 0 }}>
                Volver a eventos
              </Link>
            </div>
          </>
        ) : ticket ? (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span className="section-eyebrow">
                {isStaff ? 'CONTROL DE ACCESO' : 'BOLETO DIGITAL'}
              </span>
              <span className={`payment-pill ${ticket.is_paid ? 'payment-pill--paid' : ''}`}>
                {ticket.is_paid ? 'Pagado' : 'Pendiente de pago'}
              </span>
            </div>

            <h1>{ticket.event_title}</h1>
            <p>{formatDateTime(ticket.event_date)} · {ticket.venue}</p>

            {notice && (
              <div className="dashboard-alert" role="status" style={{ margin: '14px 0' }}>
                {notice}
              </div>
            )}

            <div className="lookup-code">
              <span>CÓDIGO DE BOLETO</span>
              <strong>{ticket.code}</strong>
            </div>

            <div className="lookup-details">
              <span>Titular: <strong>{ticket.full_name}</strong></span>
              <span>{ticket.email}</span>
              <span>Entrada: <strong>{ticket.quantity} × {ticket.ticket_type_name || (ticket.access_type === 'OPEN_BAR' ? 'Barra libre' : 'General')}</strong></span>
              <strong>{formatMoney(ticket.amount_due)}</strong>
            </div>

            {ticket.checked_in_at && (
              <div className="dashboard-alert" style={{ background: '#f5f0e8', color: '#936329', margin: '16px 0' }}>
                ⚠️ <strong>Ya ingresó:</strong> Registrado el {formatDateTime(ticket.checked_in_at)}
                {ticket.checked_in_by_name ? ` por ${ticket.checked_in_by_name}` : ''}.
              </div>
            )}

            {isStaff ? (
              <div style={{ margin: '24px 0', display: 'grid', gap: '12px' }}>
                {!ticket.is_paid && (
                  <button
                    type="button"
                    className="dashboard-button"
                    style={{ background: '#d3903a' }}
                    onClick={handleMarkPaid}
                    disabled={busy}
                  >
                    {busy ? 'Procesando...' : `Cobrar ${formatMoney(ticket.amount_due)} en taquilla`}
                  </button>
                )}

                <button
                  type="button"
                  className="dashboard-button"
                  onClick={handleCheckIn}
                  disabled={busy || !ticket.is_paid || Boolean(ticket.checked_in_at)}
                >
                  {ticket.checked_in_at
                    ? 'Boleto ya utilizado'
                    : !ticket.is_paid
                      ? 'Requiere pago antes de entrar'
                      : 'Validar y dar acceso'}
                </button>

                <button
                  type="button"
                  className="payment-action"
                  onClick={() => setScannerOpen(true)}
                  style={{ minHeight: '44px' }}
                >
                  📷 Escanear siguiente código QR
                </button>
              </div>
            ) : (
              <div style={{ margin: '20px 0', display: 'grid', gap: '14px' }}>
                <div style={{ textAlign: 'center' }}>
                  <img
                    src={reservationsApi.qrUrl(ticket.code)}
                    alt={`QR de acceso ${ticket.code}`}
                    style={{ width: '200px', height: '200px', margin: '0 auto', display: 'block' }}
                  />
                  <p className="account-footnote">Muestra este código en la entrada del evento.</p>
                </div>

                <GoogleWalletButton ticket={ticket} eventInfo={ticket} />
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
              <Link to={`/reserva/${ticket.tracking_code}`} className="lookup-back">
                Ver reserva completa
              </Link>
              <Link to="/" className="lookup-back">
                Todos los eventos
              </Link>
            </div>
          </>
        ) : null}
      </section>

      {scannerOpen && (
        <QrScanner
          onScan={handleScannedCode}
          onClose={() => setScannerOpen(false)}
          title="Escanear boleto para validar acceso"
        />
      )}
    </main>
  );
}
