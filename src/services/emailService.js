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
