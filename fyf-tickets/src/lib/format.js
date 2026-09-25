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
