import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Minus, Plus, ShoppingBag, X } from '@phosphor-icons/react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../../context/CartContext.jsx';
import { ordersApi } from '../../api/resources.js';
import { useState } from 'react';

export default function CartDrawer() {
  const { cart, isOpen, close, updateItem, removeItem, refresh } = useCart();
  const reduce = useReducedMotion();
  const navigate = useNavigate();
  const [checkingOut, setCheckingOut] = useState(false);
  const [error, setError] = useState('');

  async function checkout() {
    setError('');
    setCheckingOut(true);
    try {
      await ordersApi.checkout();
      await refresh();
      close();
      navigate('/pedidos');
    } catch (err) {
      setError(err.message);
    } finally {
      setCheckingOut(false);
    }
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-40 bg-ink/70"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            onClick={close}
          />
          <motion.aside
            className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-line bg-ink"
            initial={reduce ? { opacity: 0 } : { x: '100%' }}
            animate={reduce ? { opacity: 1 } : { x: 0 }}
            exit={reduce ? { opacity: 0 } : { x: '100%' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
          >
            <div className="flex items-center justify-between border-b border-line px-6 py-5">
              <h2 className="font-display text-sm uppercase tracking-wide-caps">Carrito</h2>
              <button type="button" onClick={close} aria-label="Cerrar carrito" className="text-mist hover:text-paper transition">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-6">
              {!cart || cart.items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
                  <ShoppingBag size={28} className="text-mist-dim" />
                  <p className="text-sm text-mist">Tu carrito está vacío.</p>
                </div>
              ) : (
                <ul className="flex flex-col gap-6">
                  <AnimatePresence initial={false} mode="popLayout">
                    {cart.items.map((item) => (
                      <motion.li
                        key={item.productId}
                        layout={!reduce}
                        initial={reduce ? { opacity: 0 } : { opacity: 0, height: 0, marginBottom: -24 }}
                        animate={{ opacity: 1, height: 'auto', marginBottom: 0 }}
                        exit={reduce ? { opacity: 0 } : { opacity: 0, height: 0, marginBottom: -24 }}
                        transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                        className="flex gap-4 overflow-hidden"
                      >
                      <div className="h-24 w-20 shrink-0 overflow-hidden bg-white/5">
                        {item.imageUrl ? (
                          <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center text-[10px] uppercase text-mist-dim">
                            Sin imagen
                          </div>
                        )}
                      </div>
                      <div className="flex flex-1 flex-col justify-between">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm">{item.name}</p>
                          <button
                            type="button"
                            onClick={() => removeItem(item.productId)}
                            className="text-mist-dim hover:text-paper transition"
                            aria-label={`Quitar ${item.name}`}
                          >
                            <X size={14} />
                          </button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 border border-line-strong px-2 py-1">
                            <button
                              type="button"
                              onClick={() => updateItem(item.productId, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                              className="text-mist hover:text-paper transition disabled:opacity-30"
                              aria-label="Restar cantidad"
                            >
                              <Minus size={12} />
                            </button>
                            <span className="w-4 text-center font-mono text-xs">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => updateItem(item.productId, item.quantity + 1)}
                              disabled={item.quantity >= item.stock}
                              className="text-mist hover:text-paper transition disabled:opacity-30"
                              aria-label="Sumar cantidad"
                            >
                              <Plus size={12} />
                            </button>
                          </div>
                          <span className="font-mono text-sm">${item.subtotal.toFixed(2)}</span>
                        </div>
                      </div>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>

            {cart && cart.items.length > 0 && (
              <div className="border-t border-line px-6 py-6">
                <div className="mb-4 flex items-center justify-between text-sm">
                  <span className="text-mist">Total</span>
                  <span className="font-mono text-base">${cart.total.toFixed(2)}</span>
                </div>
                {error && <p className="mb-3 text-xs text-signal-glow">{error}</p>}
                <button
                  type="button"
                  onClick={checkout}
                  disabled={checkingOut}
                  className="w-full bg-paper py-3.5 font-display text-sm uppercase tracking-wide-caps text-ink transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
                >
                  {checkingOut ? 'Procesando...' : 'Finalizar compra'}
                </button>
              </div>
            )}
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
