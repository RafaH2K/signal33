# FYF Tickets

Frontend separado para asistentes y organizaciones, conectado a la API existente.

## Desarrollo

1. Copia `.env.example` como `.env.local` y configura `VITE_API_URL` con la URL base de la API, incluyendo `/api`.
2. Desde esta carpeta ejecuta `pnpm install` y `pnpm dev`.

## Publicación

En el hosting del frontend configura `VITE_API_URL` con la URL pública de la API. En la configuración del backend agrega el dominio publicado del frontend a `CORS_ALLOWED_ORIGINS` (separado por comas si hay más de uno).

Antes de usar el panel, aplica la nueva migración `src/database/migrations/0014_organizations.sql` a la misma base configurada en la API. La migración crea organizaciones, membresías y asignación de eventos.

Las reservaciones no cobran en línea: el organizador registra el pago cuando se recibe en taquilla.
