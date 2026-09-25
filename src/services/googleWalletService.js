import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import { logger } from '../config/logger.js';
import { ticketQrPayload } from './qrService.js';

function formatEventDate(date) {
  return new Intl.DateTimeFormat('es-MX', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Mexico_City',
  }).format(new Date(date));
}

export function buildGoogleWalletPass({ reservation, ticket, event }) {
  const targetBaseUrl = env.ticketsUrl || env.frontendUrl || 'https://tickets.findyourfrequency.com.mx';
  const qrUrl = ticketQrPayload(targetBaseUrl, ticket.code);
  const issuerId = env.googleWallet.issuerId || 'FYF_ISSUER';
  const classId = `${issuerId}.fyf_event_${(event.id || reservation.event_id || 'general').replace(/-/g, '_')}`;
  const objectId = `${issuerId}.${ticket.code}`;

  const accessLabel =
    reservation.ticket_type_name ||
    (reservation.access_type === 'OPEN_BAR' ? 'Barra libre' : 'Acceso general');

  const paymentStatus = reservation.is_paid ? 'PAGADO' : 'PENDIENTE DE PAGO EN TAQUILLA';

  const genericObject = {
    id: objectId,
    classId,
    genericType: 'GENERIC_OTHER',
    cardTitle: {
      defaultValue: {
        language: 'es-MX',
        value: 'FYF TICKETS',
      },
    },
    header: {
      defaultValue: {
        language: 'es-MX',
        value: event.title || reservation.event_title || 'Evento FYF',
      },
    },
    subheader: {
      defaultValue: {
        language: 'es-MX',
        value: reservation.full_name,
      },
    },
    logo: {
      sourceUri: {
        uri: 'https://tickets.findyourfrequency.com.mx/assets/hero.png',
      },
      contentDescription: {
        defaultValue: {
          language: 'es-MX',
          value: 'Find Your Frequency Tickets',
        },
      },
    },
    hexBackgroundColor: '#171815',
    barcode: {
      type: 'QR_CODE',
      value: qrUrl,
      alternateText: ticket.code,
    },
    textModulesData: [
      {
        id: 'date',
        header: 'FECHA Y HORA',
        body: formatEventDate(event.event_date || reservation.event_date),
      },
      {
        id: 'venue',
        header: 'LUGAR',
        body: event.venue || reservation.venue || 'Por confirmar',
      },
      {
        id: 'access',
        header: 'TIPO DE ENTRADA',
        body: accessLabel,
      },
      {
        id: 'tracking',
        header: 'CÓDIGO DE RESERVA',
        body: reservation.tracking_code,
      },
      {
        id: 'payment',
        header: 'ESTADO DE PAGO',
        body: paymentStatus,
      },
    ],
  };

  return {
    genericObject,
    qrUrl,
    ticketCode: ticket.code,
    eventTitle: event.title || reservation.event_title,
    eventDate: event.event_date || reservation.event_date,
    venue: event.venue || reservation.venue,
    fullName: reservation.full_name,
    trackingCode: reservation.tracking_code,
    accessLabel,
    isPaid: reservation.is_paid,
  };
}

export function generateGoogleWalletUrl({ reservation, ticket, event }) {
  const passData = buildGoogleWalletPass({ reservation, ticket, event });

  const { issuerId, serviceAccountEmail, privateKey } = env.googleWallet;

  if (!issuerId || !serviceAccountEmail || !privateKey) {
    return {
      configured: false,
      message:
        'Google Wallet no tiene credenciales configuradas en el servidor. Configura GOOGLE_WALLET_ISSUER_ID, GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL y GOOGLE_WALLET_PRIVATE_KEY en las variables de entorno.',
      pass: passData,
    };
  }

  try {
    const claims = {
      iss: serviceAccountEmail,
      aud: 'google',
      origins: [
        'https://tickets.findyourfrequency.com.mx',
        'https://findyourfrequency.com.mx',
        'http://localhost:5173',
        'http://localhost:5174',
      ],
      typ: 'savetowallet',
      payload: {
        genericObjects: [passData.genericObject],
      },
    };

    const token = jwt.sign(claims, privateKey, { algorithm: 'RS256' });
    const saveUrl = `https://pay.google.com/gp/v/save/${token}`;

    return {
      configured: true,
      saveUrl,
      pass: passData,
    };
  } catch (error) {
    logger.error({ error, ticketCode: ticket.code }, 'Error signing Google Wallet JWT pass');
    return {
      configured: false,
      error: error.message,
      pass: passData,
    };
  }
}
