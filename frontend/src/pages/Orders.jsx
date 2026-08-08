import { useEffect, useState } from 'react';
import { ordersApi } from '../api/resources.js';

const STATUS_LABEL = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

export default function Orders() {
  const [orders, setOrders] = useState(null);

  useEffect(() => {
    ordersApi
      .mine()
      .then((data) => setOrders(data.orders))
      .catch(() => setOrders([]));
  }, []);

  return (
    <main className="mx-auto max-w-3xl px-6 pb-24 pt-32">
      <h1 className="mb-16 text-center font-display text-2xl uppercase tracking-wide-caps">Mis pedidos</h1>

      {orders === null ? (
        <p className="text-center text-sm text-mist">Cargando...</p>
      ) : orders.length === 0 ? (
        <p className="text-center text-sm text-mist">Todavía no hiciste ningún pedido.</p>
      ) : (
        <div className="divide-y divide-line">
          {orders.map((order) => (
            <article key={order.id} className="py-8">
              <div className="mb-4 flex items-center justify-between">
                <span className="font-mono text-xs text-mist">
                  {new Date(order.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
                <span className="text-xs uppercase tracking-wide-caps text-signal-glow">
                  {STATUS_LABEL[order.status] ?? order.status}
                </span>
              </div>
              <ul className="mb-4 flex flex-col gap-1">
                {order.items.map((item) => (
                  <li key={item.id} className="flex justify-between text-sm text-paper/90">
                    <span>
                      {item.product_name} × {item.quantity}
                    </span>
                    <span className="font-mono text-mist">${(item.unit_price * item.quantity).toFixed(2)}</span>
                  </li>
                ))}
              </ul>
              <div className="flex justify-end">
                <span className="font-mono text-sm">${order.total}</span>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
