// Prueba de carga de reservas y taquilla.
//
//   node scripts/loadtest.mjs --reservations 10000 --concurrency 50
//
// Crea un evento temporal, simula gente apartando y luego al personal cobrando
// y escaneando en la puerta, y al final borra todo lo que creó.
// Requiere el servidor corriendo y las credenciales de un admin.
import 'dotenv/config';

const args = Object.fromEntries(
  process.argv.slice(2).reduce((pairs, arg, i, all) => {
    if (arg.startsWith('--')) pairs.push([arg.slice(2), all[i + 1]]);
    return pairs;
  }, [])
);

const BASE = args.base ?? 'http://localhost:4000/api';
const TOTAL = Number(args.reservations ?? 10000);
const CONCURRENCY = Number(args.concurrency ?? 50);
const SCANS = Number(args.scans ?? 1000);
const SCAN_CONCURRENCY = Number(args.scanConcurrency ?? 10);
const EMAIL = args.email ?? process.env.LOADTEST_EMAIL;
const PASSWORD = args.password ?? process.env.LOADTEST_PASSWORD;

if (!EMAIL || !PASSWORD) {
  console.error('Faltan credenciales de admin: --email y --password (o LOADTEST_EMAIL / LOADTEST_PASSWORD)');
  process.exit(1);
}

const json = { 'Content-Type': 'application/json' };

async function api(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { ...json, ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const payload = await res.json().catch(() => null);
  return { status: res.status, body: payload };
}

function percentile(sorted, p) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length))];
}

function report(title, { durations, errors, started, finished }) {
  const sorted = [...durations].sort((a, b) => a - b);
  const seconds = (finished - started) / 1000;
  console.log(`\n${title}`);
  console.log(`  peticiones OK ....... ${durations.length}`);
  console.log(`  errores ............. ${Object.entries(errors).map(([k, v]) => `${k}:${v}`).join(' ') || 'ninguno'}`);
  console.log(`  duración ............ ${seconds.toFixed(1)}s`);
  console.log(`  throughput .......... ${(durations.length / seconds).toFixed(1)} req/s`);
  console.log(`  latencia p50 ........ ${percentile(sorted, 50)} ms`);
  console.log(`  latencia p95 ........ ${percentile(sorted, 95)} ms`);
  console.log(`  latencia p99 ........ ${percentile(sorted, 99)} ms`);
  console.log(`  latencia máx ........ ${sorted.at(-1) ?? 0} ms`);
}

// ejecuta `task` sobre cada elemento manteniendo `concurrency` en vuelo
async function pool(items, concurrency, task) {
  const durations = [];
  const errors = {};
  const results = [];
  let index = 0;

  const started = Date.now();
  await Promise.all(
    Array.from({ length: concurrency }, async () => {
      while (index < items.length) {
        const item = items[index++];
        const begin = Date.now();
        try {
          const { status, body } = await task(item);
          const elapsed = Date.now() - begin;
          if (status >= 200 && status < 300) {
            durations.push(elapsed);
            results.push(body?.data);
          } else {
            errors[`${status} ${body?.message ?? ''}`.trim()] = (errors[`${status} ${body?.message ?? ''}`.trim()] ?? 0) + 1;
          }
        } catch (error) {
          errors[error.message] = (errors[error.message] ?? 0) + 1;
        }
      }
    })
  );

  return { durations, errors, results, started, finished: Date.now() };
}

const run = `load-${Date.now()}`;

console.log(`Servidor: ${BASE}`);
const login = await api('/auth/login', { method: 'POST', body: { email: EMAIL, password: PASSWORD } });
if (login.status !== 200) {
  console.error('No se pudo iniciar sesión como admin:', login.body?.message);
  process.exit(1);
}
const token = login.body.data.accessToken;

const event = await api('/events/', {
  method: 'POST',
  token,
  body: {
    title: `[PRUEBA DE CARGA] ${run}`,
    eventDate: new Date(Date.now() + 7 * 86400000).toISOString(),
    venue: 'Prueba',
    // tiene que estar activo: un evento inactivo no acepta reservas
    isActive: true,
    reservationsEnabled: true,
    maxAccessesPerPerson: 2,
    priceGeneral: 300,
    priceOpenBar: 650,
  },
});
if (event.status !== 201) {
  console.error('No se pudo crear el evento de prueba:', event.body?.message);
  process.exit(1);
}
const eventId = event.body.data.id;
console.log(`Evento de prueba: ${eventId}`);

console.log(`\nApartando ${TOTAL} boletos con ${CONCURRENCY} personas a la vez...`);
const reservations = await pool(
  Array.from({ length: TOTAL }, (_, i) => i),
  CONCURRENCY,
  (i) =>
    api('/reservations/', {
      method: 'POST',
      body: {
        eventId,
        fullName: `Asistente ${i}`,
        email: `${run}-${i}@loadtest.local`,
        accessType: i % 3 === 0 ? 'OPEN_BAR' : 'GENERAL',
        quantity: i % 2 === 0 ? 2 : 1,
      },
    })
);
report('APARTAR BOLETO', reservations);

const created = reservations.results.filter(Boolean);
const toScan = created.slice(0, SCANS);

console.log(`\nTaquilla: cobrando y escaneando ${toScan.length} accesos con ${SCAN_CONCURRENCY} lectores...`);
const scans = await pool(toScan, SCAN_CONCURRENCY, async (reservation) => {
  // lo que hace el personal por persona: abre la ficha, cobra y da acceso
  await api(`/reservations/tickets/${reservation.tickets[0].code}`, { token });
  await api(`/reservations/${reservation.id}/payment`, { method: 'PATCH', token, body: { isPaid: true } });
  return api(`/reservations/tickets/${reservation.tickets[0].code}/check-in`, { method: 'POST', token });
});
report('COBRAR + ESCANEAR', scans);

console.log('\nPantallas de taquilla (lista y contadores) con los datos ya cargados...');
const dashboard = await pool(
  Array.from({ length: 30 }, (_, i) => i),
  5,
  (i) => (i % 2 === 0 ? api(`/reservations/stats/${eventId}`, { token }) : api(`/reservations/?eventId=${eventId}&pageSize=200`, { token }))
);
report('PANTALLA DE TAQUILLA', dashboard);

console.log('\nLimpiando el evento de prueba y sus reservas...');
// Se borra de verdad, no soft delete: si no, las reservas de prueba se quedan
// en la cola de correos y le quitan el turno a las reservas reales.
const { default: pg } = await import('pg');
const db = new pg.Client({
  host: process.env.DATABASE_HOST,
  port: Number(process.env.DATABASE_PORT) || 5432,
  database: process.env.DATABASE_NAME,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
await db.connect();
const removed = await db.query('DELETE FROM events WHERE id = $1', [eventId]);
await db.end();
console.log(removed.rowCount === 1 ? 'Evento de prueba y sus reservas borrados.' : 'No se encontró el evento para borrar.');
