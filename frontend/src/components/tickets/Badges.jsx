import { ACCESS_LABEL } from '../../lib/tickets.js';

export function PaidBadge({ isPaid }) {
  return (
    <span
      className={`inline-block border px-3 py-1 text-xs uppercase tracking-wide-caps ${
        isPaid ? 'border-emerald-500 text-emerald-400' : 'border-amber-500 text-amber-400'
      }`}
    >
      {isPaid ? 'Pagado' : 'No pagado'}
    </span>
  );
}

// grande y de color distinto por tipo: en la puerta, con poca luz, el personal
// tiene que saber de un vistazo si le pone pulsera de barra libre o no
export function AccessBadge({ type, large = false }) {
  const color = type === 'OPEN_BAR' ? 'bg-fuchsia-600 text-white' : 'bg-sky-600 text-white';
  const size = large ? 'px-4 py-2 text-base' : 'px-2 py-0.5 text-[10px]';
  return <span className={`inline-block font-display uppercase tracking-wide-caps ${color} ${size}`}>{ACCESS_LABEL[type]}</span>;
}
