export const ACCESS_LABEL = { GENERAL: 'Acceso general', OPEN_BAR: 'Barra libre' };

export function formatMoney(amount) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(
    Number(amount ?? 0)
  );
}

export function formatTime(iso) {
  return new Date(iso).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' });
}

const TICKET_CODE = /([2-9A-Z]{16})\/?$/;

// El QR contiene la URL pública del boleto; nos quedamos con el código del final.
// También acepta el código solo, tecleado a mano.
export function extractTicketCode(text) {
  return text.trim().toUpperCase().match(TICKET_CODE)?.[1] ?? null;
}
