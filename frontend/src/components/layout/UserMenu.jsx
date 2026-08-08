import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { useAuth } from '../../context/AuthContext.jsx';

export default function UserMenu() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const reduce = useReducedMotion();

  if (!user) return null;

  const initial = user.name?.charAt(0).toUpperCase() ?? '?';

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex h-8 w-8 items-center justify-center rounded-full border border-line-strong font-display text-xs uppercase text-paper transition hover:border-paper"
        aria-label="Menú de usuario"
      >
        {initial}
      </button>
      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              className="absolute right-0 top-full z-50 mt-3 w-48 border border-line bg-ink py-2"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8 }}
              transition={{ duration: 0.2 }}
            >
              <MenuLink to="/perfil" onClick={() => setOpen(false)}>
                Perfil
              </MenuLink>
              <MenuLink to="/pedidos" onClick={() => setOpen(false)}>
                Mis pedidos
              </MenuLink>
              <MenuLink to="/perfil" onClick={() => setOpen(false)}>
                Configuración
              </MenuLink>
              <button
                type="button"
                onClick={() => {
                  logout();
                  setOpen(false);
                }}
                className="block w-full px-4 py-2 text-left text-xs uppercase tracking-wide-caps text-mist transition hover:text-paper"
              >
                Cerrar sesión
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuLink({ to, onClick, children }) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="block px-4 py-2 text-xs uppercase tracking-wide-caps text-mist transition hover:text-paper"
    >
      {children}
    </Link>
  );
}
