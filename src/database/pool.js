import pg from 'pg';
import { env } from '../config/env.js';

const { Pool } = pg;

export const pool = new Pool({
  host: env.db.host,
  port: env.db.port,
  database: env.db.database,
  user: env.db.user,
  password: env.db.password,
  ssl: env.db.ssl ? { rejectUnauthorized: false } : false,
  // por defecto pg abre 10 conexiones: en una noche de venta fuerte eso se
  // vuelve el cuello de botella, pero subirlo sin medir tampoco sirve porque
  // Postgres aguanta ~100 en total (max_connections) entre todas las instancias
  max: env.db.poolMax,
  idleTimeoutMillis: 30_000,
  // preferimos fallar rápido y que el usuario reintente a dejar peticiones
  // colgadas acumulándose cuando la base está saturada
  connectionTimeoutMillis: 10_000,
});
