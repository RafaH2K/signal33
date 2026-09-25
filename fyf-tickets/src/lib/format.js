export const formatMoney = value => new Intl.NumberFormat('es-MX', {
  style: 'currency', currency: 'MXN', minimumFractionDigits: 0, maximumFractionDigits: 2,
}).format(Number(value || 0));

export const formatEventDate = value => new Intl.DateTimeFormat('es-MX', {
  weekday: 'short', day: 'numeric', month: 'short',
}).format(new Date(value));

export const formatLongDate = value => new Intl.DateTimeFormat('es-MX', {
  weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
}).format(new Date(value));

export const formatTime = value => new Intl.DateTimeFormat('es-MX', {
  hour: 'numeric', minute: '2-digit',
}).format(new Date(value));

export const formatDateTime = value => new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'long', timeStyle: 'short',
}).format(new Date(value));

export const formatOrganizerDate = value => new Intl.DateTimeFormat('es-MX', {
  dateStyle: 'medium', timeStyle: 'short',
}).format(new Date(value));

const CODE_REGEX = /([2-9A-Z]{16})\/?$/i;

export function extractTicketCode(rawText) {
  if (!rawText) return null;
  const trimmed = String(rawText).trim();
  try {
    const url = new URL(trimmed);
    const match = url.pathname.match(/\/boletos\/(?:validar\/)?([2-9A-Z]{16})/i);
    if (match?.[1]) return match[1].toUpperCase();
  } catch {
    // No es una URL, continuar
  }
  const match = trimmed.match(CODE_REGEX);
  return match?.[1] ? match[1].toUpperCase() : null;
}

