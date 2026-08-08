import { useEffect, useState } from 'react';
import { dashboardApi } from '../../api/resources.js';

const METRICS = [
  ['totalUsers', 'Usuarios'],
  ['totalActiveProducts', 'Productos activos'],
  ['totalOrders', 'Pedidos totales'],
  ['totalRevenuePaid', 'Ingresos (pagados)', '$'],
  ['upcomingActiveEvents', 'Eventos próximos'],
  ['activeGalleryItems', 'Galería activa'],
];

export default function Dashboard() {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    dashboardApi.summary().then(setSummary).catch(() => setSummary(null));
  }, []);

  return (
    <div>
      <h1 className="mb-10 font-display text-xl uppercase tracking-wide-caps">Resumen</h1>

      {!summary ? (
        <p className="text-sm text-mist">Cargando...</p>
      ) : (
        <div className="grid grid-cols-2 gap-px bg-line md:grid-cols-3">
          {METRICS.map(([key, label, prefix = '']) => (
            <div key={key} className="bg-ink p-8 text-center">
              <p className="mb-2 font-mono text-2xl">
                {prefix}
                {summary[key]}
              </p>
              <p className="text-xs uppercase tracking-wide-caps text-mist">{label}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
