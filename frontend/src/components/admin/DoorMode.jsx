import { useCallback, useEffect, useRef, useState } from 'react';
import { reservationsApi } from '../../api/resources.js';
import QrScanner from './QrScanner.jsx';
import { AccessBadge } from '../tickets/Badges.jsx';
import { ACCESS_LABEL, extractTicketCode, formatMoney, formatTime } from '../../lib/tickets.js';
import { prepararSonido, sonidoAviso, sonidoError, sonidoOk } from '../../lib/sonidos.js';

// cuánto se queda el resultado en pantalla antes de volver solo a la cámara
const VERDE_MS = 1800;
const ROJO_MS = 4000;
// no volver a procesar el mismo código si sigue frente a la cámara
const REPETIDO_MS = 6000;

// Pantalla de puerta: la cámara queda encendida y el personal sólo apunta.
// Cuando algo se resuelve (entró, o no pasa) vuelve sola a escanear, para que
// la fila avance sin tocar botones de más.
export default function DoorMode({ eventId, onChanged }) {
  const [ticket, setTicket] = useState(null);
  const [verdicto, setVerdicto] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [manual, setManual] = useState('');
  const [mostrarManual, setMostrarManual] = useState(false);
  const ultimoCodigo = useRef({ code: null, at: 0 });
  const temporizador = useRef(null);

  const limpiar = useCallback(() => {
    clearTimeout(temporizador.current);
    setTicket(null);
    setVerdicto(null);
  }, []);

  const programarVuelta = useCallback(
    (ms) => {
      clearTimeout(temporizador.current);
      temporizador.current = setTimeout(() => {
        setTicket(null);
        setVerdicto(null);
      }, ms);
    },
    []
  );

  useEffect(() => () => clearTimeout(temporizador.current), []);

  const mostrarRojo = useCallback(
    (titulo, detalle) => {
      sonidoError();
      setVerdicto({ tono: 'rojo', titulo, detalle });
      programarVuelta(ROJO_MS);
    },
    [programarVuelta]
  );

  const buscar = useCallback(
    async (code) => {
      const ahora = Date.now();
      // el mismo QR sigue frente a la cámara: no reprocesar
      if (ultimoCodigo.current.code === code && ahora - ultimoCodigo.current.at < REPETIDO_MS) return;
      ultimoCodigo.current = { code, at: ahora };

      setCargando(true);
      try {
        const encontrado = await reservationsApi.getTicket(code);
        if (eventId && encontrado.event_id !== eventId) {
          mostrarRojo('Otro evento', `Este boleto es para ${encontrado.event_title}`);
          return;
        }
        if (encontrado.checked_in_at) {
          mostrarRojo(
            'Ya fue usado',
            `Entró ${formatTime(encontrado.checked_in_at)}${encontrado.checked_in_by_name ? ` · ${encontrado.checked_in_by_name}` : ''}`
          );
          return;
        }
        if (!encontrado.is_paid) sonidoAviso();
        setTicket(encontrado);
        setVerdicto(null);
      } catch (error) {
        mostrarRojo('Código inválido', error.message);
      } finally {
        setCargando(false);
      }
    },
    [eventId, mostrarRojo]
  );

  async function cobrar() {
    setCargando(true);
    try {
      await reservationsApi.setPaid(ticket.reservation_id, true);
      setTicket({ ...ticket, is_paid: true });
      sonidoAviso();
      onChanged?.();
    } catch (error) {
      mostrarRojo('No se pudo cobrar', error.message);
    } finally {
      setCargando(false);
    }
  }

  async function darAcceso() {
    setCargando(true);
    try {
      const actualizado = await reservationsApi.checkIn(ticket.code);
      sonidoOk();
      setTicket(null);
      setVerdicto({
        tono: 'verde',
        titulo: 'Puede pasar',
        detalle: actualizado.full_name,
        acceso: actualizado.access_type,
      });
      programarVuelta(VERDE_MS);
      onChanged?.();
    } catch (error) {
      mostrarRojo('No se pudo dar acceso', error.message);
    } finally {
      setCargando(false);
    }
  }

  function enviarManual(e) {
    e.preventDefault();
    const code = extractTicketCode(manual);
    if (!code) return;
    setManual('');
    setMostrarManual(false);
    buscar(code);
  }

  const escaneando = !ticket && !verdicto;

  return (
    <section className="border border-line">
      <header className="flex items-center justify-between border-b border-line px-4 py-3">
        <h2 className="text-xs uppercase tracking-wide-caps text-mist">Puerta</h2>
        <button
          type="button"
          onClick={() => {
            prepararSonido();
            setMostrarManual((v) => !v);
          }}
          className="text-xs uppercase tracking-wide-caps text-mist transition hover:text-paper"
        >
          {mostrarManual ? 'Usar cámara' : 'Escribir código'}
        </button>
      </header>

      <div className="p-4">
        {mostrarManual ? (
          <form onSubmit={enviarManual} className="flex flex-col gap-3">
            <input
              value={manual}
              onChange={(e) => setManual(e.target.value)}
              placeholder="Código de 16 caracteres"
              autoFocus
              autoCapitalize="characters"
              className="w-full border border-line-strong bg-transparent px-4 py-4 text-center font-mono text-lg uppercase tracking-widest text-paper outline-none placeholder:text-sm placeholder:normal-case placeholder:tracking-normal placeholder:text-mist-dim focus:border-signal"
            />
            <button type="submit" className="bg-paper py-4 font-display text-sm uppercase tracking-wide-caps text-ink">
              Buscar
            </button>
          </form>
        ) : (
          <div onPointerDown={prepararSonido}>
            <QrScanner onScan={buscar} active={escaneando && !cargando} />
          </div>
        )}

        {escaneando && !mostrarManual && (
          <p className="mt-3 text-center text-xs text-mist-dim">
            {cargando ? 'Buscando...' : 'Apuntá al código. La cámara queda lista para el siguiente.'}
          </p>
        )}

        {verdicto && <Verdicto {...verdicto} onListo={limpiar} />}

        {ticket && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="text-center">
              <AccessBadge type={ticket.access_type} large />
              <p className="mt-3 text-xl">{ticket.full_name}</p>
              <p className="text-xs text-mist">
                {ticket.quantity} × {ACCESS_LABEL[ticket.access_type]} · {ticket.tracking_code}
              </p>
            </div>

            {ticket.is_paid ? (
              <p className="text-center text-xs uppercase tracking-wide-caps text-emerald-400">Pagado</p>
            ) : (
              <button
                type="button"
                onClick={cobrar}
                disabled={cargando}
                className="border-2 border-amber-500 py-5 font-display text-base uppercase tracking-wide-caps text-amber-400 transition active:bg-amber-500/20 disabled:opacity-50"
              >
                Cobrar {formatMoney(ticket.amount_due)}
              </button>
            )}

            <button
              type="button"
              onClick={darAcceso}
              disabled={cargando || !ticket.is_paid}
              className="bg-paper py-6 font-display text-lg uppercase tracking-wide-caps text-ink transition active:opacity-80 disabled:opacity-25"
            >
              Dar acceso
            </button>

            <button
              type="button"
              onClick={limpiar}
              className="py-2 text-xs uppercase tracking-wide-caps text-mist transition hover:text-paper"
            >
              Cancelar y seguir escaneando
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

function Verdicto({ tono, titulo, detalle, acceso, onListo }) {
  const estilo =
    tono === 'verde' ? 'border-emerald-500 bg-emerald-500/20 text-emerald-300' : 'border-red-500 bg-red-500/20 text-red-300';
  return (
    <button type="button" onClick={onListo} className={`mt-4 block w-full border-2 px-4 py-8 text-center ${estilo}`}>
      <p className="font-display text-3xl uppercase tracking-wide-caps">{titulo}</p>
      {detalle && <p className="mt-2 text-sm">{detalle}</p>}
      {acceso && (
        <span className="mt-4 inline-block">
          <AccessBadge type={acceso} large />
        </span>
      )}
      <p className="mt-4 text-[10px] uppercase tracking-wide-caps opacity-70">Tocá para continuar</p>
    </button>
  );
}
