import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { reservationsApi } from '../api/resources.js';
import { isAuthenticated } from '../auth/auth.js';
import { formatDateTime, formatMoney } from '../lib/format.js';
import './organizer.css';

export default function MyReservations() {
  const [reservations, setReservations] = useState([]);
  const [error, setError] = useState('');
  useEffect(() => { if (!isAuthenticated()) return; reservationsApi.mine().then(setReservations).catch(err => setError(err.message || 'No pudimos cargar tus reservas.')); }, []);

  return <main className="lookup-page">
    <Link to="/" className="brand"><span className="brand__mark">FYF</span><span className="brand__name">TICKETS</span></Link>
    <section className="lookup-card">
      <span className="section-eyebrow">TU CUENTA</span><h1>Mis boletos</h1>
      {!isAuthenticated() ? <p>Inicia sesión para ver las reservas asociadas a tu cuenta. <Link to="/login">Iniciar sesión</Link></p> : error ? <p role="alert">{error}</p> : !reservations.length ? <p>Aún no tienes reservas. <Link to="/">Explora los próximos eventos.</Link></p> : <div className="dashboard-events">{reservations.map(item => <article key={item.id}><div><strong>{item.event_title}</strong><span>{formatDateTime(item.event_date)} · {item.venue}</span><span>{item.quantity} × {item.ticket_type_name || (item.access_type === 'OPEN_BAR' ? 'Barra libre' : 'General')} · {formatMoney(item.amount_due)}</span><span>{item.is_paid ? 'Pagado' : 'Pago pendiente en taquilla'}{item.cancelled_at ? ' · Cancelada' : ''}</span></div>{!item.cancelled_at && <Link className="payment-action" to={`/reserva/${item.tracking_code}`}>Ver boleto</Link>}</article>)}</div>}
      <Link to="/" className="lookup-back">Volver a eventos</Link>
    </section>
  </main>;
}
