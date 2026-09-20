import { useEffect, useState } from 'react';
import { reservationsApi } from '../../api/resources.js';
import { AccessBadge, PaidBadge } from '../tickets/Badges.jsx';
import { formatMoney, formatTime } from '../../lib/tickets.js';

// Ficha de un acceso escaneado: quién reservó, cuánto debe, si pagó y si ya
// entró. El orden de acciones replica la taquilla: cobrar → dar acceso.
// Los padres lo montan con key={code}, así cada código arranca con estado limpio.
export default function TicketCheckPanel({ code, expectedEventId, onDone }) {
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    reservationsApi
      .getTicket(code)
      .then(setTicket)
      .catch((err) => setError(err.message));
  }, [code]);

  async function markPaid() {
    if (!confirm(`¿Confirmas que cobraste ${formatMoney(ticket.amount_due)} a ${ticket.full_name}?`)) return;
    setBusy(true);
    try {
      await reservationsApi.setPaid(ticket.reservation_id, true);
      setTicket({ ...ticket, is_paid: true });
    } catch (err) {
      setResult(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function checkIn() {
    setBusy(true);
    try {
      setTicket(await reservationsApi.checkIn(code));
      setResult('ok');
    } catch (err) {
      setResult(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (error) return <Verdict tone="bad" title="Código inválido" detail={error} onDone={onDone} />;
  if (!ticket) return <p className="text-sm text-mist">Buscando {code}...</p>;

  if (result === 'ok') {
    return (
      <Verdict tone="good" title="Acceso concedido" detail={ticket.full_name} onDone={onDone}>
        <AccessBadge type={ticket.access_type} large />
      </Verdict>
    );
  }

  const wrongEvent = expectedEventId && ticket.event_id !== expectedEventId;
  const alreadyUsed = Boolean(ticket.checked_in_at);
  const blocked = wrongEvent || alreadyUsed;

  return (
    <div className="flex flex-col gap-5">
      {wrongEvent && <Verdict tone="bad" title="Otro evento" detail={`Este boleto es para ${ticket.event_title}`} />}
      {alreadyUsed && (
        <Verdict
          tone="bad"
          title="Ya fue usado"
          detail={`Entró a las ${formatTime(ticket.checked_in_at)}${ticket.checked_in_by_name ? ` · lo validó ${ticket.checked_in_by_name}` : ''}`}
        />
      )}
      {result && result !== 'ok' && <Verdict tone="bad" title="No se pudo" detail={result} />}

      <div className="text-center">
        <AccessBadge type={ticket.access_type} large />
        <p className="mt-3 text-lg">{ticket.full_name}</p>
      </div>

      <dl className="grid grid-cols-2 gap-y-3 text-sm">
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Evento</dt>
        <dd className="text-right">{ticket.event_title}</dd>
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Correo</dt>
        <dd className="truncate text-right">{ticket.email}</dd>
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Reserva</dt>
        <dd className="text-right">
          <span className="font-mono">{ticket.tracking_code}</span> · {ticket.quantity} acceso(s)
        </dd>
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Total reserva</dt>
        <dd className="text-right font-mono">{formatMoney(ticket.amount_due)}</dd>
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Pago</dt>
        <dd className="text-right">
          <PaidBadge isPaid={ticket.is_paid} />
        </dd>
      </dl>

      {!blocked && (
        <div className="flex flex-col gap-3">
          {!ticket.is_paid && (
            <button
              type="button"
              onClick={markPaid}
              disabled={busy}
              className="border-2 border-amber-500 py-4 font-display text-sm uppercase tracking-wide-caps text-amber-400 transition hover:bg-amber-500/10 disabled:opacity-50"
            >
              Cobrar {formatMoney(ticket.amount_due)} → marcar pagado
            </button>
          )}
          <button
            type="button"
            onClick={checkIn}
            disabled={busy || !ticket.is_paid}
            className="bg-paper py-4 font-display text-sm uppercase tracking-wide-caps text-ink transition hover:opacity-90 disabled:opacity-30"
          >
            Dar acceso
          </button>
          {ticket.quantity > 1 && (
            <p className="text-center text-xs text-mist-dim">
              El pago cubre los {ticket.quantity} accesos. Cada QR se escanea por separado al entrar.
            </p>
          )}
        </div>
      )}

      {onDone && (
        <button type="button" onClick={onDone} className="py-2 text-xs uppercase tracking-wide-caps text-mist transition hover:text-paper">
          Escanear siguiente
        </button>
      )}
    </div>
  );
}

function Verdict({ tone, title, detail, onDone, children }) {
  const styles = tone === 'good' ? 'border-emerald-500 bg-emerald-500/15 text-emerald-300' : 'border-red-500 bg-red-500/15 text-red-300';
  return (
    <div className={`border-2 px-5 py-6 text-center ${styles}`}>
      <p className="font-display text-2xl uppercase tracking-wide-caps">{title}</p>
      {detail && <p className="mt-2 text-sm">{detail}</p>}
      {children && <div className="mt-4">{children}</div>}
      {onDone && (
        <button type="button" onClick={onDone} className="mt-5 w-full bg-paper py-3 font-display text-xs uppercase tracking-wide-caps text-ink">
          Escanear siguiente
        </button>
      )}
    </div>
  );
}
