import { NavLink, Outlet } from 'react-router-dom';

const SECTIONS = [
  { to: '/admin', label: 'Resumen', end: true },
  { to: '/admin/productos', label: 'Productos' },
  { to: '/admin/galeria', label: 'Galería' },
  { to: '/admin/eventos', label: 'Eventos' },
  { to: '/admin/trayectoria', label: 'Trayectoria' },
  { to: '/admin/signal', label: 'Signal' },
  { to: '/admin/pedidos', label: 'Pedidos' },
  { to: '/admin/usuarios', label: 'Usuarios' },
];

export default function AdminLayout() {
  return (
    <div className="flex min-h-[100dvh] flex-col pt-[72px] lg:flex-row">
      <aside className="shrink-0 border-b border-line px-6 py-6 lg:w-56 lg:border-b-0 lg:border-r lg:px-4 lg:py-10">
        <nav className="flex gap-4 overflow-x-auto lg:flex-col lg:gap-1 lg:overflow-visible">
          {SECTIONS.map((section) => (
            <NavLink
              key={section.to}
              to={section.to}
              end={section.end}
              className={({ isActive }) =>
                `whitespace-nowrap px-3 py-2 text-xs uppercase tracking-wide-caps transition ${
                  isActive ? 'bg-white/5 text-paper' : 'text-mist hover:text-paper'
                }`
              }
            >
              {section.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="min-w-0 flex-1 px-6 py-10 lg:px-10">
        <Outlet />
      </div>
    </div>
  );
}
