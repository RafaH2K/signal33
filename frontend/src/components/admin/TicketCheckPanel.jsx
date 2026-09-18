import { useEffect, useState } from 'react';
import { reservationsApi } from '../../api/resources.js';
import { ACCESS_LABEL, PaidBadge } from '../../pages/TicketStatus.jsx';

// Ficha de un acceso escaneado: muestra quién reservó, si pagó y si ya entró.
// El orden de acciones replica la taquilla: cobrar → dar acceso.
export default function TicketCheckPanel({ code, onDone }) {
  const [ticket, setTicket] = useState(null);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);

  // los padres montan el panel con key={code}, así que cada código arranca con estado limpio
  useEffect(() => {
    reservationsApi
      .getTicket(code)
      .then(setTicket)
      .catch((err) => setError(err.message));
  }, [code]);

  async function markPaid() {
    setBusy(true);
    try {
      await reservationsApi.setPaid(ticket.reservation_id, true);
      setTicket({ ...ticket, is_paid: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function checkIn() {
    setBusy(true);
    try {
      const updated = await reservationsApi.checkIn(code);
      setTicket(updated);
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
    return <Verdict tone="good" title="Acceso concedido" detail={`${ticket.full_name} · ${ACCESS_LABEL[ticket.access_type]}`} onDone={onDone} />;
  }

  const alreadyUsed = Boolean(ticket.checked_in_at);

  return (
    <div className="flex flex-col gap-5">
      {alreadyUsed && (
        <Verdict
          tone="bad"
          title="Ya fue usado"
          detail={`Entró a las ${new Date(ticket.checked_in_at).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}`}
        />
      )}
      {result && result !== 'ok' && <Verdict tone="bad" title="No se pudo dar acceso" detail={result} />}

      <dl className="grid grid-cols-2 gap-y-3 text-sm">
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Evento</dt>
        <dd className="text-right">{ticket.event_title}</dd>
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Nombre</dt>
        <dd className="text-right">{ticket.full_name}</dd>
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Correo</dt>
        <dd className="truncate text-right">{ticket.email}</dd>
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Acceso</dt>
        <dd className="text-right">{ACCESS_LABEL[ticket.access_type]}</dd>
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Seguimiento</dt>
        <dd className="text-right font-mono">{ticket.tracking_code}</dd>
        <dt className="text-xs uppercase tracking-wide-caps text-mist">Pago</dt>
        <dd className="text-right">
          <PaidBadge isPaid={ticket.is_paid} />
        </dd>
      </dl>

      {!alreadyUsed && (
        <div className="flex flex-col gap-3">
          {!ticket.is_paid && (
            <button
              type="button"
              onClick={markPaid}
              disabled={busy}
              className="border border-amber-500 py-3.5 font-display text-sm uppercase tracking-wide-caps text-amber-400 transition hover:bg-amber-500/10 disabled:opacity-50"
            >
              Cobrado en taquilla → marcar pagado
            </button>
          )}
          <button
            type="button"
            onClick={checkIn}
            disabled={busy || !ticket.is_paid}
            className="bg-paper py-3.5 font-display text-sm uppercase tracking-wide-caps text-ink transition hover:opacity-90 disabled:opacity-30"
          >
            Dar acceso
          </button>
        </div>
      )}

      {onDone && (
        <button type="button" onClick={onDone} className="text-xs uppercase tracking-wide-caps text-mist transition hover:text-paper">
          Escanear otro
        </button>
      )}
    </div>
  );
}

function Verdict({ tone, title, detail, onDone }) {
  const styles = tone === 'good' ? 'border-emerald-500 bg-emerald-500/10 text-emerald-300' : 'border-red-500 bg-red-500/10 text-red-300';
  return (
    <div className={`border-2 px-5 py-6 text-center ${styles}`}>
      <p className="font-display text-xl uppercase tracking-wide-caps">{title}</p>
      {detail && <p className="mt-2 text-sm">{detail}</p>}
      {onDone && (
        <button type="button" onClick={onDone} className="mt-5 text-xs uppercase tracking-wide-caps underline">
          Escanear otro
        </button>
      )}
    </div>
  );
}
