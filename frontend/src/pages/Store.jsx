import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { productsApi } from '../api/resources.js';

export default function Store() {
  const [products, setProducts] = useState(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    productsApi
      .list()
      .then((data) => setProducts(data.products))
      .catch(() => setProducts([]));
  }, []);

  return (
    <main className="mx-auto max-w-7xl px-6 pb-24 pt-32">
      <h1 className="mb-16 text-center font-display text-2xl uppercase tracking-wide-caps">Shop</h1>

      {products === null ? (
        <ProductGridSkeleton />
      ) : products.length === 0 ? (
        <p className="text-center text-sm text-mist">Todavía no hay productos disponibles.</p>
      ) : (
        <div className="grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((product, i) => (
            <motion.div
              key={product.id}
              initial={reduce ? false : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ duration: 0.5, delay: (i % 6) * 0.05, ease: [0.16, 1, 0.3, 1] }}
            >
              <Link to={`/tienda/${product.id}`} className="group block">
                <div className="aspect-[4/5] overflow-hidden bg-white/5">
                  {product.image_url ? (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center text-xs uppercase tracking-wide-caps text-mist-dim">
                      Sin imagen
                    </div>
                  )}
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-sm">{product.name}</p>
                  <p className="font-mono text-sm text-mist">${product.price}</p>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </main>
  );
}

function ProductGridSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-x-8 gap-y-16 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="animate-pulse">
          <div className="aspect-[4/5] bg-white/5" />
          <div className="mt-4 h-3 w-2/3 bg-white/5" />
        </div>
      ))}
    </div>
  );
}
