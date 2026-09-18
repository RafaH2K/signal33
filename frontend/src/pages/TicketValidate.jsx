import { Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import TicketCheckPanel from '../components/admin/TicketCheckPanel.jsx';

// Destino del QR. Si lo escanea el personal (sesión de admin) con la cámara del
// teléfono, cae directo en la ficha para cobrar y dar acceso. Si lo abre el
// asistente, sólo le recordamos que lo presente en taquilla.
export default function TicketValidate() {
  const { code } = useParams();
  const { user, loading, isAdmin } = useAuth();

  if (loading) return <main className="px-6 pb-24 pt-32 text-center text-sm text-mist">Cargando...</main>;

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-md px-6 pb-24 pt-32 text-center">
        <h1 className="mb-4 font-display text-xl uppercase tracking-wide-caps">Acceso</h1>
        <p className="mb-2 font-mono text-sm tracking-widest">{code}</p>
        <p className="mb-8 text-sm text-mist">
          Presentá este código QR en taquilla. Ahí se realiza el pago y se valida tu entrada.
        </p>
        {!user && <p className="text-xs text-mist-dim">¿Sos del staff? Iniciá sesión con tu cuenta de admin y volvé a escanear.</p>}
        <Link to="/boletos" className="mt-6 inline-block text-xs uppercase tracking-wide-caps text-signal-glow">
          Ir a boletos
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-md px-6 pb-24 pt-32">
      <h1 className="mb-8 text-center font-display text-xl uppercase tracking-wide-caps">Validar acceso</h1>
      <TicketCheckPanel key={code} code={code.toUpperCase()} />
      <Link to="/admin/taquilla" className="mt-10 block text-center text-xs uppercase tracking-wide-caps text-mist hover:text-paper">
        Abrir escáner de taquilla
      </Link>
    </main>
  );
}
