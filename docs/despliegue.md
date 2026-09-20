# Despliegue

Backend Node + Postgres, frontend React estático, todo detrás de Caddy (que
saca el certificado HTTPS solo). **La cámara del escáner de taquilla sólo
funciona con HTTPS**, así que el certificado no es opcional.

## Requisitos del servidor

- Docker y Docker Compose.
- Un dominio apuntando (registro A) a la IP del servidor.
- Puertos 80 y 443 abiertos.
- 2 GB de RAM alcanzan de sobra para un evento de 10 000 personas.

## Pasos

```sh
git clone https://github.com/RafaH2K/signal33.git
cd signal33
cp .env.example .env
```

Editá `.env`:

| Variable | Valor |
| --- | --- |
| `APP_URL` | `https://tu-dominio.com` (de acá salen los QR de los correos) |
| `FRONTEND_URL` | `https://tu-dominio.com` |
| `SITE_DOMAIN` | `tu-dominio.com` (lo usa Caddy para el certificado) |
| `DATABASE_PASSWORD` | una contraseña larga y nueva |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | `openssl rand -hex 48` para cada uno |
| `CORS_ALLOWED_ORIGINS` | `https://tu-dominio.com` |
| `RESEND_API_KEY` | la de tu cuenta de Resend |
| `RESEND_FROM_EMAIL` | `SIGNAL33 <signal@findyourfrequency.com>` |

`SITE_DOMAIN` también tiene que estar en `.env` porque lo lee docker compose.

Compilá el frontend y levantá todo:

```sh
cd frontend && npm install && npm run build && cd ..
docker compose up -d --build
```

`migrate` corre solo al levantar y aplica las migraciones pendientes.

Comprobá: `curl https://tu-dominio.com/api/health`

## Después de cada cambio de código

```sh
git pull
cd frontend && npm run build && cd ..
docker compose up -d --build
```

## Correos

Resend sólo manda a nombre de tu dominio si lo verificás:

1. Entrá a Resend → Domains → Add Domain → `findyourfrequency.com`.
2. Copiá los registros DNS que te da (SPF, DKIM y DMARC) al panel donde
   compraste el dominio.
3. Esperá a que diga *Verified*.

El plan gratuito manda unos 100 correos al día y 2 por segundo: **para 10 000
asistentes necesitás plan de pago**. Con plan de pago, subí
`EMAIL_QUEUE_CONCURRENCY` (por ejemplo a 8) para que la cola aproveche el
límite mayor.

Si un correo falla, la cola lo reintenta con esperas crecientes hasta 6 veces.
En taquilla se ve el estado de cada correo y hay botón para reenviarlo.

## Respaldos

```sh
./scripts/backup-db.sh
```

Programalo en cron. Los días previos al evento, cada hora:

```
0 * * * * cd /ruta/signal33 && ./scripts/backup-db.sh >> backups/backup.log 2>&1
```

Restaurar:

```sh
gunzip -c backups/signal33-XXXX.sql.gz | docker compose exec -T db psql -U postgres -d signal33
```

## Prueba de carga

Contra un entorno de prueba, **nunca contra producción con gente usando**:

```sh
node scripts/loadtest.mjs --base https://staging.tu-dominio.com/api \
  --reservations 10000 --concurrency 60 --scans 2000 \
  --email admin@tu-dominio.com --password '...'
```

El script crea un evento de prueba, lo usa y lo borra al terminar. Los límites
por IP bloquearían la prueba, así que en ese entorno de prueba (y sólo ahí) se
levanta con `RATE_LIMIT_ENABLED=false`.

Medición en una laptop (Windows, Postgres local), como referencia:

| Escenario | Resultado |
| --- | --- |
| 10 000 reservas, 60 simultáneas | 25 s · 398 req/s · p95 272 ms · 0 errores |
| 2 000 cobros + escaneos, 12 lectores | 9.9 s · 202 req/s · p95 79 ms · 0 errores |
| Pantallas de taquilla con 10 000 reservas cargadas | p95 61 ms |

## Límites por IP en producción

- Apartar: 60 por hora por IP, y 12 por hora por correo.
- Taquilla: 240 operaciones por minuto **por usuario**, no por IP: todo el
  personal en el mismo wifi no se estorba entre sí.
- Resto de la API: 300 cada 15 minutos por usuario (o por IP si no hay sesión).

Si en la venta ves muchos rechazos con "Demasiadas reservas desde esta
conexión", subí el límite de `reservationLimiter` en
`src/middlewares/rateLimit.js` y volvé a desplegar.

## Escalar a más de una instancia

- La cola de correos usa `FOR UPDATE SKIP LOCKED`: cada instancia toma correos
  distintos, ninguno se manda dos veces.
- El cupo y el "un QR una sola vez" se resuelven en Postgres con locks, así que
  también aguantan varias instancias.
- Lo que **no** está listo para varias instancias: el conteo de los límites por
  IP vive en memoria de cada proceso (habría que moverlo a Redis) y el timer de
  limpieza de tokens se duplicaría.
