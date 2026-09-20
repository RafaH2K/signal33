import { resend } from '../config/email.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { renderQrPng, ticketQrPayload } from './qrService.js';

export async function sendPasswordResetEmail(to, resetUrl) {
  const { error } = await resend.emails.send({
    from: env.resend.fromEmail,
    to,
    subject: 'Recuperación de contraseña',
    html: `<p>Solicitaste restablecer tu contraseña.</p><p><a href="${resetUrl}">Hacé clic acá para elegir una nueva</a> (expira en 1 hora).</p><p>Si no fuiste vos, ignorá este correo.</p>`,
  });

  if (error) logger.error({ error }, 'Failed to send password reset email');
}

// el nombre lo escribe el visitante: sin escapar podría inyectar HTML en el correo
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

const ACCESS_LABELS = { GENERAL: 'Acceso general', OPEN_BAR: 'Barra libre' };

export function formatMoney(amount) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(amount);
}

function formatEventDate(date) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  }).format(new Date(date));
}

// identificador del QR incrustado dentro del correo
function qrContentId(ticket) {
  return `qr-${ticket.code}@signal33`;
}

// QR servido por la API: sirve para la vista previa en el navegador; el correo
// real usa la versión incrustada (cid:)
function remoteQrSrc(ticket) {
  return `${env.appUrl}/api/reservations/tickets/${ticket.code}/qr.png`;
}

// Paleta y tipografías del sitio. En correo todo va en estilos incrustados
// (nada de clases ni hojas externas) y las fuentes de marca no se pueden
// cargar, así que Archivo y JetBrains Mono caen a las del sistema.
const INK = '#090909';
const SURFACE = '#111111';
const PAPER = '#ffffff';
const MIST = '#a3a3a3';
const MIST_DIM = '#6b6b6b';
const LINE = '#262626';
const SIGNAL = '#2e5eff';
const SIGNAL_GLOW = '#6b8bff';
const SANS = "'Archivo', ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Helvetica, Arial, sans-serif";
const MONO = "'JetBrains Mono', ui-monospace, Menlo, Consolas, monospace";
const CAPS = 'text-transform:uppercase;letter-spacing:.14em';

// separado del envío para poder previsualizarlo y probarlo sin mandar nada
export function buildReservationEmail({ reservation, tickets, qrSrc = remoteQrSrc }) {
  const trackUrl = `${env.frontendUrl}/boletos/${reservation.tracking_code}`;
  const amount = Number(reservation.amount_due ?? 0);
  const accessLabel = ACCESS_LABELS[reservation.access_type];

  const ticketBlocks = tickets
    .map(
      (ticket, index) => `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 16px">
        <tr>
          <td style="background:${SURFACE};border:1px solid ${LINE};padding:24px;text-align:center">
            <p style="margin:0 0 16px;font-family:${SANS};font-size:11px;${CAPS};color:${MIST}">
              Acceso ${index + 1} de ${tickets.length} &middot; ${accessLabel}
            </p>
            <!-- el QR va sobre blanco a propósito: los lectores necesitan ese contraste -->
            <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto">
              <tr>
                <td style="background:${PAPER};padding:12px;line-height:0">
                  <img src="${qrSrc(ticket)}" alt="Código QR del acceso ${index + 1}"
                       width="200" height="200" style="display:block;width:200px;height:200px" />
                </td>
              </tr>
            </table>
            <p style="margin:16px 0 0;font-family:${MONO};font-size:14px;letter-spacing:.12em;color:${PAPER}">
              ${ticket.code}
            </p>
            <p style="margin:6px 0 0;font-family:${SANS};font-size:11px;color:${MIST_DIM}">
              ¿No ves el código? Está adjunto a este correo.
            </p>
          </td>
        </tr>
      </table>`
    )
    .join('');

  const amountRow =
    amount > 0
      ? `
              <tr>
                <td style="padding:10px 0;border-top:1px solid ${LINE};font-family:${SANS};font-size:11px;${CAPS};color:${MIST}">
                  Total a pagar
                </td>
                <td style="padding:10px 0;border-top:1px solid ${LINE};font-family:${MONO};font-size:18px;color:${PAPER};text-align:right">
                  ${formatMoney(amount)}
                </td>
              </tr>`
      : '';

  return {
    subject: `Tu acceso a ${reservation.event_title}`,
    html: `
<!-- preheader: el resumen que muestra la bandeja antes de abrir el correo -->
<div style="display:none;max-height:0;overflow:hidden;opacity:0">
  ${reservation.quantity} &times; ${accessLabel} &middot; ${reservation.tracking_code} &middot; Pago en taquilla
</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${INK};margin:0;padding:0">
  <tr>
    <td align="center" style="padding:32px 16px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%">

        <tr>
          <td style="padding:0 0 28px;text-align:center">
            <span style="font-family:${SANS};font-size:16px;font-weight:600;${CAPS};color:${PAPER}">
              <span style="color:${SIGNAL}">&#9673;</span>&nbsp; signal33
            </span>
          </td>
        </tr>

        <tr>
          <td style="border-top:1px solid ${LINE};border-bottom:1px solid ${LINE};padding:32px 24px;text-align:center">
            <p style="margin:0 0 10px;font-family:${SANS};font-size:10px;${CAPS};color:${SIGNAL_GLOW}">
              Tu lugar está apartado
            </p>
            <h1 style="margin:0;font-family:${SANS};font-size:26px;font-weight:700;${CAPS};color:${PAPER};line-height:1.25">
              ${escapeHtml(reservation.event_title)}
            </h1>
            <p style="margin:14px 0 0;font-family:${MONO};font-size:12px;color:${MIST}">
              ${formatEventDate(reservation.event_date)}
            </p>
            <p style="margin:4px 0 0;font-family:${MONO};font-size:12px;color:${MIST}">
              ${escapeHtml(reservation.venue)}
            </p>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 0 20px;font-family:${SANS};font-size:15px;color:${PAPER};line-height:1.6">
            Hola ${escapeHtml(reservation.full_name)}, guardá este correo: es tu entrada.
          </td>
        </tr>

        <tr>
          <td style="padding:0 0 28px">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="background:${SURFACE};border-left:3px solid ${SIGNAL};padding:16px 20px;font-family:${SANS};font-size:14px;color:${PAPER};line-height:1.6">
                  <strong style="${CAPS};font-size:12px">No se paga nada en línea</strong><br />
                  <span style="color:${MIST}">El cobro es en taquilla el día del evento. Presentá los códigos de abajo en la entrada.</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:0 0 12px;font-family:${SANS};font-size:11px;${CAPS};color:${MIST}">
            ${tickets.length === 1 ? 'Tu acceso' : `Tus ${tickets.length} accesos`}
          </td>
        </tr>
        <tr>
          <td>${ticketBlocks}</td>
        </tr>

        <tr>
          <td style="padding:12px 0 0">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td style="padding:10px 0;border-top:1px solid ${LINE};font-family:${SANS};font-size:11px;${CAPS};color:${MIST}">
                  A nombre de
                </td>
                <td style="padding:10px 0;border-top:1px solid ${LINE};font-family:${SANS};font-size:14px;color:${PAPER};text-align:right">
                  ${escapeHtml(reservation.full_name)}
                </td>
              </tr>
              <tr>
                <td style="padding:10px 0;border-top:1px solid ${LINE};font-family:${SANS};font-size:11px;${CAPS};color:${MIST}">
                  Código de seguimiento
                </td>
                <td style="padding:10px 0;border-top:1px solid ${LINE};font-family:${MONO};font-size:14px;color:${PAPER};text-align:right">
                  ${reservation.tracking_code}
                </td>
              </tr>${amountRow}
            </table>
          </td>
        </tr>

        <tr>
          <td style="padding:28px 0 32px;text-align:center">
            <a href="${trackUrl}"
               style="display:inline-block;background:${PAPER};color:${INK};font-family:${SANS};font-size:12px;font-weight:600;${CAPS};text-decoration:none;padding:16px 32px">
              Ver mi reserva
            </a>
          </td>
        </tr>

        <tr>
          <td style="border-top:1px solid ${LINE};padding:24px 0 0">
            <p style="margin:0;font-family:${SANS};font-size:11px;color:${MIST_DIM};line-height:1.7;text-align:center">
              Cada código sirve una sola vez. Si venís acompañado, cada persona entra con su propio código.<br />
              ¿Dudas? Respondé este correo.
            </p>
          </td>
        </tr>

      </table>
    </td>
  </tr>
</table>`,
  };
}

export async function sendReservationEmail({ reservation, tickets }) {
  // Los QR viajan dentro del correo (cid:), no como imagen remota: así se ven
  // sin depender de que el servidor sea alcanzable desde fuera ni de que el
  // cliente de correo permita cargar imágenes externas.
  const { subject, html } = buildReservationEmail({
    reservation,
    tickets,
    qrSrc: (ticket) => `cid:${qrContentId(ticket)}`,
  });

  const attachments = await Promise.all(
    tickets.map(async (ticket, index) => ({
      filename: `acceso-${index + 1}-${ticket.code}.png`,
      content: (await renderQrPng(ticketQrPayload(env.frontendUrl, ticket.code))).toString('base64'),
      contentType: 'image/png',
      contentId: qrContentId(ticket),
    }))
  );

  const { error } = await resend.emails.send({
    from: env.resend.fromEmail,
    to: reservation.email,
    subject,
    html,
    attachments,
  });

  // la cola necesita enterarse del fallo para reintentar: por eso lanza
  if (error) throw new Error(error.message ?? 'Resend rechazó el envío');
}
