import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { reservationsApi } from '../api/resources.js';
import { formatDateTime, formatMoney } from '../lib/format.js';
import GoogleWalletButton from '../components/GoogleWalletButton.jsx';
import './organizer.css';

export default function ReservationLookup() {
  const { trackingCode } = useParams();
  const [reservation, setReservation] = useState(null);
  const [error, setError] = useState('');
  const [emailStatus, setEmailStatus] = useState({ sending: false, message: '', error: '' });

  useEffect(() => {
    reservationsApi
      .track(trackingCode)
      .then(setReservation)
      .catch(err => setError(err.message || 'No encontramos esta reserva.'));
  }, [trackingCode]);

  async function handleResendEmail() {
    setEmailStatus({ sending: true, message: '', error: '' });
    try {
      const res = await reservationsApi.resendEmail(trackingCode);
      setEmailStatus({
        sending: false,
        message: `Correo reenviado con éxito a ${res.email || reservation.email} desde tickets@findyourfrequency.com.mx`,
        error: '',
      });
    } catch (err) {
      setEmailStatus({
        sending: false,
        message: '',
        error: err.message || 'No se pudo reenviar el correo en este momento.',
      });
    }
  }

  if (error) {
    return (
      <main className="lookup-page">
        <header className="site-header" style={{ marginBottom: '24px' }}>
          <Link to="/" className="brand">
            <span className="brand__mark">FYF</span>
            <span className="brand__name">TICKETS</span>
          </Link>
          <Link to="/" className="header-action">
            Todos los eventos
          </Link>
        </header>
        <section className="lookup-card">
          <span className="section-eyebrow" style={{ color: '#9a3524' }}>RESERVA</span>
          <h1>No encontramos la reserva</h1>
          <p>{error}</p>
          <Link to="/" className="dashboard-button" style={{ marginTop: '18px', display: 'inline-block', textAlign: 'center' }}>
            Volver a eventos
          </Link>
        </section>
      </main>
    );
  }

  if (!reservation) {
    return (
      <main className="lookup-page">
        <p className="lookup-loading">Cargando tu reserva…</p>
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
          <Link to="/mis-boletos" className="header-action">
            Mis boletos
          </Link>
          <Link to="/#eventos" className="header-action">
            Eventos
          </Link>
        </div>
      </header>

      <section className="lookup-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span className="section-eyebrow">RESERVA CONFIRMADA</span>
          <span className={`payment-pill ${reservation.is_paid ? 'payment-pill--paid' : ''}`}>
            {reservation.is_paid ? 'Pagado' : 'Pendiente en taquilla'}
          </span>
        </div>

        <h1>{reservation.event_title}</h1>
        <p>{formatDateTime(reservation.event_date)} · {reservation.venue}</p>

        <div className="lookup-code">
          <span>Código de seguimiento</span>
          <strong>{reservation.tracking_code}</strong>
        </div>

        <div className="lookup-details">
          <span>Titular: <strong>{reservation.full_name}</strong></span>
          <span>{reservation.quantity} × {reservation.ticket_type_name || (reservation.access_type === 'OPEN_BAR' ? 'Barra libre' : 'General')}</span>
          <strong>{formatMoney(reservation.amount_due)}</strong>
        </div>

        <div className="lookup-payment">
          <span className={`status-dot ${reservation.is_paid ? 'status-dot--paid' : ''}`} />
          {reservation.is_paid ? 'Pago recibido en taquilla' : 'El pago se realiza directamente en taquilla'}
        </div>

        {emailStatus.message && (
          <div className="dashboard-alert" role="status" style={{ margin: '14px 0' }}>
            ✓ {emailStatus.message}
          </div>
        )}

        {emailStatus.error && (
          <div className="dashboard-alert dashboard-alert--error" role="alert" style={{ margin: '14px 0' }}>
            ✕ {emailStatus.error}
          </div>
        )}

        <div style={{ margin: '16px 0' }}>
          <button
            type="button"
            className="payment-action"
            onClick={handleResendEmail}
            disabled={emailStatus.sending}
            style={{ width: '100%', minHeight: '40px' }}
          >
            {emailStatus.sending
              ? 'Reenviando correo...'
              : `✉️ Reenviar boletos a mi correo (${reservation.email})`}
          </button>
        </div>

        <div className="lookup-tickets">
          {reservation.tickets?.map((ticket, index) => (
            <article key={ticket.id} className="lookup-ticket-card">
              <div className="lookup-ticket-header">
                <div>
                  <small>ACCESO {String(index + 1).padStart(2, '0')}</small>
                  <strong>{ticket.code}</strong>
                </div>
                {ticket.checked_in_at ? (
                  <span className="payment-pill payment-pill--paid">Ingresó</span>
                ) : (
                  <span className="payment-pill">Válido</span>
                )}
              </div>

              <div className="lookup-ticket-body">
                <img
                  src={reservationsApi.qrUrl(ticket.code)}
                  alt={`QR de acceso ${ticket.code}`}
                  className="lookup-qr-img"
                  loading="lazy"
                />
              </div>

              <div className="lookup-ticket-actions">
                <GoogleWalletButton ticket={ticket} eventInfo={reservation} />
              </div>
            </article>
          ))}
        </div>

        <p className="account-footnote" style={{ marginTop: '24px' }}>
          Presenta los códigos QR en la entrada del evento. Si aún no has pagado, se cobra en taquilla antes de ingresar.
        </p>

        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <Link to="/" className="lookup-back">
            ← Explorar más eventos
          </Link>
        </div>
      </section>
    </main>
  );
}
