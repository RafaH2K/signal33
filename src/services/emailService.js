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

// separado del envío para poder previsualizarlo y probarlo sin mandar nada
export function buildReservationEmail({ reservation, tickets, qrSrc = remoteQrSrc }) {
  const trackUrl = `${env.frontendUrl}/boletos/${reservation.tracking_code}`;
  const amount = Number(reservation.amount_due ?? 0);
  const amountText = amount > 0 ? `: ${formatMoney(amount)}` : '';

  const ticketBlocks = tickets
    .map(
      (ticket, index) => `
        <div style="border:1px solid #ddd;border-radius:12px;padding:16px;margin:12px 0;text-align:center">
          <p style="margin:0 0 4px;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#666">
            Acceso ${index + 1} de ${tickets.length} · ${ACCESS_LABELS[reservation.access_type]}
          </p>
          <img src="${qrSrc(ticket)}"
               alt="Código QR del acceso ${index + 1}" width="220" height="220" style="display:block;margin:8px auto" />
          <p style="margin:0;font-family:monospace;font-size:14px;letter-spacing:.08em">${ticket.code}</p>
          <p style="margin:6px 0 0;font-size:11px;color:#888">Si no ves el QR, está adjunto a este correo.</p>
        </div>`
    )
    .join('');

  return {
    subject: `Tu acceso a ${reservation.event_title}`,
    html: `
      <div style="font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;color:#111">
        <h1 style="font-size:22px;margin:0 0 4px">${escapeHtml(reservation.event_title)}</h1>
        <p style="margin:0 0 16px;color:#555">${formatEventDate(reservation.event_date)} · ${escapeHtml(reservation.venue)}</p>
        <p>Hola ${escapeHtml(reservation.full_name)}, tu lugar está apartado.</p>
        <p style="background:#fff4e5;border-left:4px solid #f59e0b;padding:12px 16px;margin:16px 0">
          <strong>El pago se realiza en taquilla${amountText}.</strong> No se cobra nada en línea:
          presentá este correo en la entrada, pagá ahí y tu acceso queda liberado.
        </p>
        ${ticketBlocks}
        <p>Código de seguimiento: <strong style="font-family:monospace">${reservation.tracking_code}</strong></p>
        <p><a href="${trackUrl}">Consultá el estado de tu reserva</a></p>
      </div>`,
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
