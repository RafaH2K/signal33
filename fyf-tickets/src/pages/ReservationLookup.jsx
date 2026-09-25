import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { reservationsApi } from '../api/resources.js';
import { formatDateTime, formatMoney } from '../lib/format.js';

export default function ReservationLookup() {
  const { trackingCode } = useParams();
  const [reservation, setReservation] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    reservationsApi.track(trackingCode).then(setReservation).catch(err => setError(err.message || 'No encontramos esta reserva.'));
  }, [trackingCode]);

  if (error) return <main className="lookup-page"><Link to="/" className="brand">FYF TICKETS</Link><section className="lookup-card"><h1>No encontramos la reserva</h1><p>{error}</p><Link to="/">Volver a eventos</Link></section></main>;
  if (!reservation) return <main className="lookup-page"><p className="lookup-loading">Cargando tu reserva…</p></main>;

  return <main className="lookup-page">
    <Link to="/" className="brand">FYF TICKETS</Link>
    <section className="lookup-card">
      <span className="section-eyebrow">RESERVA CONFIRMADA</span>
      <h1>{reservation.event_title}</h1>
      <p>{formatDateTime(reservation.event_date)} · {reservation.venue}</p>
      <div className="lookup-code"><span>Código de seguimiento</span><strong>{reservation.tracking_code}</strong></div>
      <div className="lookup-details"><span>{reservation.full_name}</span><span>{reservation.quantity} × {reservation.ticket_type_name || (reservation.access_type === 'OPEN_BAR' ? 'Barra libre' : 'General')}</span><strong>{formatMoney(reservation.amount_due)}</strong></div>
      <div className="lookup-payment"><span className={`status-dot ${reservation.is_paid ? 'status-dot--paid' : ''}`} />{reservation.is_paid ? 'Pagado' : 'Pendiente de pago en taquilla'}</div>
      <div className="lookup-tickets">{reservation.tickets?.map((ticket, index) => <article key={ticket.id} className="lookup-ticket"><div><small>ACCESO {String(index + 1).padStart(2, '0')}</small><strong>{ticket.code}</strong></div><img src={reservationsApi.qrUrl(ticket.code)} alt={`QR de acceso ${index + 1}`} /></article>)}</div>
      <p className="account-footnote">Presenta tus códigos en la entrada. El pago se realiza en taquilla.</p>
      <Link to="/" className="lookup-back">Explorar más eventos</Link>
    </section>
  </main>;
}
