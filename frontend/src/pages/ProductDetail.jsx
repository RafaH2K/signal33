import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { productsApi } from '../api/resources.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useCart } from '../context/CartContext.jsx';

export default function ProductDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const { addItem } = useCart();
  const [product, setProduct] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const reduce = useReducedMotion();

  useEffect(() => {
    productsApi
      .get(id)
      .then(setProduct)
      .catch(() => setNotFound(true));
  }, [id]);

  async function handleAdd() {
    setError('');
    setAdding(true);
    try {
      await addItem(id, 1);
    } catch (err) {
      setError(err.message);
    } finally {
      setAdding(false);
    }
  }

  if (notFound) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center px-6 pt-24">
        <p className="text-sm text-mist">Producto no encontrado.</p>
      </main>
    );
  }

  if (!product) {
    return <main className="min-h-[60vh] px-6 pt-24" />;
  }

  return (
    <motion.main
      initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto grid max-w-6xl grid-cols-1 gap-12 px-6 pb-24 pt-32 lg:grid-cols-2"
    >
      <div className="aspect-[4/5] overflow-hidden bg-white/5">
        {product.image_url ? (
          <img src={product.image_url} alt={product.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-wide-caps text-mist-dim">
            Sin imagen
          </div>
        )}
      </div>

      <div className="flex flex-col justify-center gap-6">
        <h1 className="font-display text-2xl uppercase tracking-wide-caps">{product.name}</h1>
        <p className="font-mono text-lg text-mist">${product.price}</p>
        {product.description && <p className="max-w-md text-sm leading-relaxed text-mist">{product.description}</p>}

        {product.stock <= 0 ? (
          <p className="text-xs uppercase tracking-wide-caps text-mist-dim">Sin stock</p>
        ) : user ? (
          <button
            type="button"
            onClick={handleAdd}
            disabled={adding}
            className="w-fit bg-paper px-8 py-3.5 font-display text-sm uppercase tracking-wide-caps text-ink transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
          >
            {adding ? 'Agregando...' : 'Agregar al carrito'}
          </button>
        ) : (
          <p className="text-sm text-mist">Iniciá sesión para comprar.</p>
        )}
        {error && <p className="text-xs text-signal-glow">{error}</p>}
      </div>
    </motion.main>
  );
}
