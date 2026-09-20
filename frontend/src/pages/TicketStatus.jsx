import { useEffect, useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { reservationsApi } from '../api/resources.js';
import { PaidBadge } from '../components/tickets/Badges.jsx';
import { ACCESS_LABEL, formatMoney } from '../lib/tickets.js';

export default function TicketStatus() {
  const { trackingCode } = useParams();
  const { state } = useLocation();
  const [reservation, setReservation] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    reservationsApi
      .track(trackingCode)
      .then(setReservation)
      .catch((err) => setError(err.message));
  }, [trackingCode]);

  if (error) {
    return (
      <main className="mx-auto max-w-xl px-6 pb-24 pt-32 text-center">
        <p className="mb-6 text-sm text-mist">{error}</p>
        <Link to="/boletos" className="text-xs uppercase tracking-wide-caps text-signal-glow">
          Volver a boletos
        </Link>
      </main>
    );
  }

  if (!reservation) return <main className="px-6 pb-24 pt-32 text-center text-sm text-mist">Cargando...</main>;

  return (
    <main className="mx-auto max-w-xl px-6 pb-24 pt-32">
      {state?.justCreated && (
        <p className="mb-8 border border-emerald-600/60 px-5 py-4 text-center text-sm">
          ¡Listo! Te mandamos tus accesos a <strong>{reservation.email}</strong>. Guarda también esta página.
        </p>
      )}

      <header className="mb-10 text-center">
        <h1 className="break-words font-brand text-xl md:text-2xl">{reservation.event_title}</h1>
        <p className="mt-2 text-xs text-mist-dim">
          {new Date(reservation.event_date).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })} ·{' '}
          {reservation.venue}
        </p>
      </header>

      <dl className="mb-10 grid grid-cols-2 gap-y-4 border-y border-line py-6 text-sm">
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Reservó</dt>
        <dd className="text-right">{reservation.full_name}</dd>
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Seguimiento</dt>
        <dd className="text-right font-mono">{reservation.tracking_code}</dd>
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Acceso</dt>
        <dd className="text-right">
          {reservation.quantity} × {ACCESS_LABEL[reservation.access_type]}
        </dd>
        {Number(reservation.amount_due) > 0 && (
          <>
            <dt className="text-xs uppercase tracking-wide-caps text-mist">Total</dt>
            <dd className="text-right font-mono">{formatMoney(reservation.amount_due)}</dd>
          </>
        )}
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Pago</dt>
        <dd className="text-right">
          <PaidBadge isPaid={reservation.is_paid} />
        </dd>
      </dl>

      {!reservation.is_paid && (
        <p className="mb-10 text-center text-sm text-mist">
          El pago se hace en taquilla. Muestra estos códigos al llegar (una captura de pantalla sirve).
        </p>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        {reservation.tickets.map((ticket, i) => (
          <article key={ticket.id} className="border border-line p-4 text-center">
            <p className="mb-3 text-xs uppercase tracking-wide-caps text-mist">
              Acceso {i + 1} de {reservation.tickets.length}
            </p>
            <img
              src={reservationsApi.qrUrl(ticket.code)}
              alt={`QR del acceso ${i + 1}`}
              className={`mx-auto aspect-square w-full max-w-[220px] bg-white ${ticket.checked_in_at ? 'opacity-30' : ''}`}
            />
            <p className="mt-3 font-mono text-xs tracking-widest">{ticket.code}</p>
            {ticket.checked_in_at && (
              <p className="mt-2 text-xs uppercase tracking-wide-caps text-mist-dim">
                Usado {new Date(ticket.checked_in_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
              </p>
            )}
          </article>
        ))}
      </div>
    </main>
  );
}
