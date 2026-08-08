import { query } from '../database/query.js';

export async function getSummary() {
  const [users, products, ordersByStatus, revenue, upcomingEvents, galleryItems] = await Promise.all([
    query('SELECT COUNT(*)::int AS count FROM users WHERE deleted_at IS NULL'),
    query('SELECT COUNT(*)::int AS count FROM products WHERE deleted_at IS NULL AND is_active = true'),
    query('SELECT status, COUNT(*)::int AS count FROM orders GROUP BY status'),
    query(`SELECT COALESCE(SUM(total), 0)::float AS total FROM orders WHERE status = 'PAID'`),
    query(
      `SELECT COUNT(*)::int AS count FROM events
       WHERE deleted_at IS NULL AND is_active = true AND event_date >= now()`
    ),
    query('SELECT COUNT(*)::int AS count FROM gallery_items WHERE deleted_at IS NULL AND is_active = true'),
  ]);

  return {
    totalUsers: users.rows[0].count,
    totalActiveProducts: products.rows[0].count,
    ordersByStatus: Object.fromEntries(ordersByStatus.rows.map((row) => [row.status, row.count])),
    totalOrders: ordersByStatus.rows.reduce((sum, row) => sum + row.count, 0),
    totalRevenuePaid: revenue.rows[0].total,
    upcomingActiveEvents: upcomingEvents.rows[0].count,
    activeGalleryItems: galleryItems.rows[0].count,
  };
}
