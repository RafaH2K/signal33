import { resend } from '../config/email.js';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';

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

// Los QR van como <img> apuntando al endpoint público del boleto en vez de ir
// adjuntos: así el correo pesa poco y el mismo enlace sirve si lo reenvían.
export async function sendReservationEmail({ reservation, tickets }) {
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
          <img src="${env.appUrl}/api/reservations/tickets/${ticket.code}/qr.png"
               alt="Código QR del acceso ${index + 1}" width="220" height="220" style="display:block;margin:8px auto" />
          <p style="margin:0;font-family:monospace;font-size:14px;letter-spacing:.08em">${ticket.code}</p>
        </div>`
    )
    .join('');

  const { error } = await resend.emails.send({
    from: env.resend.fromEmail,
    to: reservation.email,
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
  });

  // la cola necesita enterarse del fallo para reintentar: por eso lanza
  if (error) throw new Error(error.message ?? 'Resend rechazó el envío');
}
