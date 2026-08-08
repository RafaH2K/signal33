import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { AnimatePresence, motion, useMotionValueEvent, useReducedMotion, useScroll } from 'motion/react';
import { List, MagnifyingGlass, ShoppingBag, User, X } from '@phosphor-icons/react';
import Logo from '../Logo.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { useCart } from '../../context/CartContext.jsx';
import LoginModal from './LoginModal.jsx';
import UserMenu from './UserMenu.jsx';

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/tienda', label: 'Shop' },
  { to: '/trayectoria', label: 'Trayectoria' },
  { to: '/signal', label: 'Signal' },
];

export default function Navbar() {
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  useMotionValueEvent(scrollY, 'change', (latest) => setScrolled(latest > 40));

  const { user } = useAuth();
  const { itemCount, open: openCart } = useCart();
  const [loginOpen, setLoginOpen] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const reduce = useReducedMotion();

  return (
    <>
      <header
        className={`fixed inset-x-0 top-0 z-30 h-[72px] transition-all duration-500 ${
          scrolled ? 'border-b border-line bg-ink/80 backdrop-blur-md' : 'border-b border-transparent bg-transparent'
        }`}
      >
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-6">
          <Link to="/" className="text-paper">
            <Logo />
          </Link>

          <nav className="hidden items-center gap-10 lg:flex">
            {LINKS.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                end={link.to === '/'}
                className={({ isActive }) =>
                  `font-display text-xs uppercase tracking-wide-caps transition ${
                    isActive ? 'text-paper' : 'text-mist hover:text-paper'
                  }`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </nav>

          <div className="flex items-center gap-5">
            <button
              type="button"
              aria-label="Buscar"
              className="hidden text-paper transition hover:text-mist active:scale-[0.94] sm:block"
            >
              <MagnifyingGlass size={18} />
            </button>

            {user ? (
              <UserMenu />
            ) : (
              <button
                type="button"
                onClick={() => setLoginOpen(true)}
                aria-label="Ingresar"
                className="text-paper transition hover:text-mist active:scale-[0.94]"
              >
                <User size={20} />
              </button>
            )}

            <button
              type="button"
              onClick={openCart}
              aria-label="Carrito"
              className="relative text-paper transition hover:text-mist active:scale-[0.94]"
            >
              <ShoppingBag size={20} />
              {itemCount > 0 && (
                <span className="absolute -right-2 -top-2 flex h-4 w-4 items-center justify-center rounded-full bg-signal text-[10px] font-mono text-paper">
                  {itemCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menú"
              className="text-paper transition active:scale-[0.94] lg:hidden"
            >
              <List size={22} />
            </button>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            className="fixed inset-0 z-40 flex flex-col bg-ink px-6 py-6 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: reduce ? 0.01 : 0.3 }}
          >
            <div className="flex items-center justify-between">
              <Logo />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                aria-label="Cerrar menú"
                className="text-paper transition active:scale-[0.94]"
              >
                <X size={22} />
              </button>
            </div>
            <nav className="mt-16 flex flex-1 flex-col items-start gap-8">
              {LINKS.map((link, i) => (
                <motion.div
                  key={link.to}
                  initial={reduce ? { opacity: 0 } : { opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: reduce ? 0 : i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                >
                  <NavLink
                    to={link.to}
                    end={link.to === '/'}
                    onClick={() => setMobileOpen(false)}
                    className="font-display text-3xl uppercase tracking-wide-caps text-paper"
                  >
                    {link.label}
                  </NavLink>
                </motion.div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>

      <LoginModal open={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
