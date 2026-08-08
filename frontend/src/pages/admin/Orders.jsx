import { useEffect, useState } from 'react';
import { ordersApi } from '../../api/resources.js';

const STATUSES = ['PENDING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const STATUS_LABEL = {
  PENDING: 'Pendiente',
  PAID: 'Pagado',
  SHIPPED: 'Enviado',
  DELIVERED: 'Entregado',
  CANCELLED: 'Cancelado',
};

export default function AdminOrders() {
  const [orders, setOrders] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  function load() {
    const query = statusFilter ? `?status=${statusFilter}&pageSize=100` : '?pageSize=100';
    ordersApi
      .adminList(query)
      .then((data) => setOrders(data.orders))
      .catch(() => setOrders([]));
  }

  useEffect(load, [statusFilter]);

  async function updateStatus(order, status) {
    await ordersApi.updateStatus(order.id, status);
    load();
  }

  return (
    <div>
      <div className="mb-10 flex items-center justify-between">
        <h1 className="font-display text-xl uppercase tracking-wide-caps">Pedidos</h1>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border border-line-strong bg-ink px-3 py-2 text-xs uppercase tracking-wide-caps text-paper outline-none focus:border-signal"
        >
          <option value="">Todos los estados</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>

      {orders === null ? (
        <p className="text-sm text-mist">Cargando...</p>
      ) : orders.length === 0 ? (
        <p className="text-sm text-mist">No hay pedidos con ese filtro.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide-caps text-mist">
                <th className="py-3 pr-4 font-normal">Fecha</th>
                <th className="py-3 pr-4 font-normal">Items</th>
                <th className="py-3 pr-4 font-normal">Total</th>
                <th className="py-3 pr-4 font-normal">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {orders.map((order) => (
                <tr key={order.id}>
                  <td className="py-3 pr-4 font-mono text-xs">
                    {new Date(order.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-3 pr-4 text-xs text-mist">
                    {order.items.map((item) => `${item.product_name} ×${item.quantity}`).join(', ')}
                  </td>
                  <td className="py-3 pr-4 font-mono">${order.total}</td>
                  <td className="py-3 pr-4">
                    <select
                      value={order.status}
                      onChange={(e) => updateStatus(order, e.target.value)}
                      className="border border-line-strong bg-ink px-2 py-1.5 text-xs uppercase tracking-wide-caps text-paper outline-none focus:border-signal"
                    >
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {STATUS_LABEL[s]}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
