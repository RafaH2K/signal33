// Toma las capturas de pantalla que ilustran el manual (docs/manual.pdf).
// Usa el Edge instalado en Windows, sin descargar navegadores.
//
//   node scripts/capturas.mjs
import 'dotenv/config';
import { mkdir } from 'node:fs/promises';
import { chromium } from 'playwright-core';

const SITE = process.env.FRONTEND_URL ?? 'http://localhost:5173';
const API = (process.env.APP_URL ?? 'http://localhost:4000') + '/api';
const EMAIL = process.env.DOCS_ADMIN_EMAIL;
const PASSWORD = process.env.DOCS_ADMIN_PASSWORD;
const OUT = 'docs/capturas';
const DEMO_CODE = process.env.DOCS_DEMO_TICKET;

const shots = [];

async function login() {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: EMAIL, password: PASSWORD }),
  });
  const body = await res.json();
  if (!res.ok) throw new Error(`No se pudo iniciar sesión: ${body.message}`);
  return body.data;
}

async function shot(page, name, caption) {
  const file = `${OUT}/${name}.png`;
  await page.screenshot({ path: file, fullPage: false });
  shots.push({ file: `capturas/${name}.png`, caption });
  console.log(`  ${name}.png`);
}

await mkdir(OUT, { recursive: true });
const session = EMAIL && PASSWORD ? await login() : null;

const browser = await chromium.launch({
  channel: 'msedge',
  // cámara sintética: así el modo puerta aparece funcionando en las capturas
  args: [
    '--use-fake-ui-for-media-stream',
    '--use-fake-device-for-media-stream',
    // video con un QR real, para que las capturas muestren el escáner leyendo
    ...(process.env.DOCS_CAMERA_VIDEO ? [`--use-file-for-fake-video-capture=${process.env.DOCS_CAMERA_VIDEO}`] : []),
  ],
});
const context = await browser.newContext({
  permissions: ['camera'],
  // en desarrollo el sitio usa un certificado propio
  ignoreHTTPSErrors: true,
  viewport: { width: 1280, height: 900 },
  deviceScaleFactor: 2,
  locale: 'es-MX',
  timezoneId: 'America/Mexico_City',
});

// el cliente lee los tokens de localStorage al arrancar: así entramos ya con sesión
if (session) {
  await context.addInitScript(
    ([accessToken, refreshToken]) => {
      localStorage.setItem('accessToken', accessToken);
      localStorage.setItem('refreshToken', refreshToken);
    },
    [session.accessToken, session.refreshToken]
  );
}

const page = await context.newPage();

async function go(path) {
  await page.goto(`${SITE}${path}`, { waitUntil: 'networkidle' });
  // deja asentar animaciones de entrada
  await page.waitForTimeout(900);
}

console.log('Capturando...');

await go('/boletos');
await shot(page, '01-apartar', 'La página donde el público aparta su boleto. El aviso de pago en taquilla va arriba de todo.');

// selecciona el evento y llena el formulario para mostrarlo completo
const eventButton = page.locator('main button', { hasText: 'Haunted Frequency' }).first();
if (await eventButton.count()) {
  await eventButton.click();
  await page.waitForTimeout(500);
  await page.getByLabel('Nombre completo').fill('María Fernanda Ruiz');
  await page.getByLabel('Correo electrónico').fill('maria@ejemplo.com');
  await page.waitForTimeout(300);
  await shot(page, '02-formulario', 'Sólo pide nombre y correo. Debajo se elige el tipo de acceso y cuántos (máximo 2 por persona).');
}

if (process.env.DOCS_TRACKING_CODE) {
  await go(`/boletos/${process.env.DOCS_TRACKING_CODE}`);
  await shot(page, '03-boleto', 'Lo que ve el asistente: sus QR, el estado del pago y su código de seguimiento.');
}

// la puerta se usa desde el celular: estas capturas van en tamaño teléfono
const puerta = await context.newPage();
await puerta.setViewportSize({ width: 420, height: 880 });

async function irPuerta() {
  await puerta.goto(`${SITE}/taquilla`, { waitUntil: 'networkidle' });
  await puerta.waitForTimeout(1500);
}

async function shotPuerta(name, caption) {
  const file = `${OUT}/${name}.png`;
  await puerta.screenshot({ path: file });
  shots.push({ file: `capturas/${name}.png`, caption });
  console.log(`  ${name}.png`);
}

await irPuerta();
await puerta.waitForTimeout(2500);
await shotPuerta('04-taquilla', 'La puerta desde el celular: la cámara queda encendida y sólo hay que apuntar.');

// el modo puerta deja la cámara encendida; para las capturas se usa la
// entrada manual, que lleva a la misma ficha
async function validarManual(code) {
  await irPuerta();
  await puerta.getByRole('button', { name: 'Escribir código' }).click();
  await puerta.getByPlaceholder('Código de 16 caracteres').fill(code);
  await puerta.getByRole('button', { name: 'Buscar', exact: true }).click();
  await puerta.waitForTimeout(1500);
}

if (process.env.DOCS_TICKET_UNPAID) {
  await validarManual(process.env.DOCS_TICKET_UNPAID);
  await shotPuerta('05-sin-pagar', 'AMARILLO: falta cobrar. El botón grande dice cuánto. "Dar acceso" está apagado hasta cobrar.');
}

if (process.env.DOCS_TICKET_GREEN) {
  await validarManual(process.env.DOCS_TICKET_GREEN);
  await puerta.getByRole('button', { name: /^Cobrar/ }).click();
  await puerta.waitForTimeout(1000);
  await puerta.getByRole('button', { name: 'Dar acceso' }).click();
  await puerta.waitForTimeout(800);
  await shotPuerta('06-puede-pasar', 'VERDE: puede pasar. A los 2 segundos vuelve sola a la cámara para el siguiente.');
}

if (process.env.DOCS_TICKET_RED) {
  // se usa una vez y se vuelve a escanear para mostrar el rechazo
  await validarManual(process.env.DOCS_TICKET_RED);
  await puerta.getByRole('button', { name: /^Cobrar/ }).click();
  await puerta.waitForTimeout(900);
  await puerta.getByRole('button', { name: 'Dar acceso' }).click();
  await puerta.waitForTimeout(2600);
  await validarManual(process.env.DOCS_TICKET_RED);
  await shotPuerta('07-ya-usado', 'ROJO: ese código ya entró. Dice la hora y quién lo validó. Suena distinto al verde.');
}

if (process.env.DOCS_EMAIL_HTML) {
  const mail = await context.newPage();
  await mail.setViewportSize({ width: 760, height: 1400 });
  await mail.goto(`file://${process.env.DOCS_EMAIL_HTML}`, { waitUntil: 'networkidle' });
  await mail.waitForTimeout(600);
  await mail.screenshot({ path: `${OUT}/08-correo.png`, fullPage: true });
  shots.push({ file: 'capturas/08-correo.png', caption: 'El correo que recibe cada asistente, con un QR por acceso.' });
  console.log('  08-correo.png');
  await mail.close();
}

await go('/admin/eventos');
await shot(page, '09-eventos', 'Desde Eventos se activan las reservas y se definen precios y cupo por tipo de acceso.');

await go('/admin/usuarios');
await shot(page, '10-usuarios', 'Acá se le da el rol Taquilla al personal: pueden cobrar y validar, nada más.');

await browser.close();

console.log(JSON.stringify(shots, null, 2));
