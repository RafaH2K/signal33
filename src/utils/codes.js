import { randomInt } from 'node:crypto';

// alfabeto sin 0/O/1/I/L: los códigos se dictan por teléfono y se tipean en taquilla
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ';

function randomCode(length) {
  let code = '';
  for (let i = 0; i < length; i += 1) code += ALPHABET[randomInt(ALPHABET.length)];
  return code;
}

// corto y legible: lo usa la persona para consultar su reserva
export function generateTrackingCode() {
  return `SR-${randomCode(8)}`;
}

// largo: va dentro del QR y la ruta del QR es pública, así que tiene que ser
// imposible de adivinar (~80 bits de entropía)
export function generateTicketCode() {
  return randomCode(16);
}
