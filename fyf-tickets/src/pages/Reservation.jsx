import { useEffect, useMemo, useState } from 'react';
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from 'react-router-dom';

import { eventsApi, reservationsApi } from '../api/resources.js';
import { getUser } from '../auth/auth.js';
import { formatLongDate, formatMoney, formatTime } from '../lib/format.js';
import './event.css';

export default function Reservation() {
  const { id } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const user = getUser();
  const params = new URLSearchParams(location.search);
  const ticketTypeId = params.get('ticketTypeId');
  const requestedQuantity = Number(params.get('quantity'));
  const quantity = Number.isInteger(requestedQuantity) && requestedQuantity > 0
    ? requestedQuantity
    : 1;

  const [event, setEvent] = useState(null);
  const [availability, setAvailability] = useState(null);

  const [fullName, setFullName] = useState(
    user?.name ?? ''
  );

  const [email, setEmail] = useState(
    user?.email ?? ''
  );

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadReservationData() {
      try {
        setLoading(true);
        setError(null);

        const eventsData = await eventsApi.list(
          '?pageSize=100'
        );

        const foundEvent = (eventsData?.events ?? []).find(
          item => String(item.id) === String(id)
        );

        if (!foundEvent) {
          throw new Error('Evento no encontrado.');
        }

        const availabilityData =
          await reservationsApi.availability(foundEvent.id);

        setEvent(foundEvent);
        setAvailability(availabilityData);

        const selectedAccess =
          availabilityData?.ticketTypes?.find(
            access => access.id === ticketTypeId
          );

        if (!selectedAccess) {
          throw new Error(
            'El tipo de acceso seleccionado ya no está disponible.'
          );
        }

        if (
          selectedAccess.remaining !== null &&
          selectedAccess.remaining < quantity
        ) {
          throw new Error(
            'La cantidad seleccionada ya no está disponible.'
          );
        }
      } catch (err) {
        console.error(
          'Error cargando reserva:',
          err
        );

        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadReservationData();
  }, [id, ticketTypeId, quantity]);

  const selectedAccess = useMemo(() => {
    return availability?.ticketTypes?.find(
      access => access.id === ticketTypeId
    );
  }, [availability, ticketTypeId]);

  const total = selectedAccess
    ? selectedAccess.price * quantity
    : 0;

  async function handleSubmit(eventSubmit) {
    eventSubmit.preventDefault();

    if (!event || !selectedAccess) {
      return;
    }

    if (!fullName.trim() || !email.trim()) {
      setError(
        new Error('Completa todos los campos.')
      );

      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      const reservation =
        await reservationsApi.create({
          eventId: event.id,
          fullName: fullName.trim(),
          email: email.trim(),
          ticketTypeId,
          quantity,
        });

      if (!reservation?.tracking_code) {
        throw new Error(
          'La reserva fue creada, pero no se recibió el código de seguimiento.'
        );
      }

      navigate(
        `/reserva/${reservation.tracking_code}`
      );
    } catch (err) {
      console.error(
        'Error creando reserva:',
        err
      );

      if (err.status === 409) {
        setError(
          new Error(
            'La disponibilidad cambió. Regresa al evento y selecciona nuevamente tus entradas.'
          )
        );
      } else {
        setError(
          err instanceof Error
            ? err
            : new Error(
                'No fue posible crear la reserva.'
              )
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="reservation-page reservation-page--loading">
        <div className="reservation-loading" />
      </main>
    );
  }

  if (
    error ||
    !event ||
    !selectedAccess
  ) {
    return (
      <main className="reservation-error">
        <span>FYF TICKETS</span>

        <h1>No pudimos continuar</h1>

        <p>
          {error?.message ??
            'La información de esta reserva ya no está disponible.'}
        </p>

        <Link
          to={`/evento/${id}`}
          className="reservation-error__link"
        >
          Volver al evento
        </Link>
      </main>
    );
  }

  return (
    <div className="reservation-page">
      <header className="reservation-header">
        <Link
          to={`/evento/${event.id}`}
          className="reservation-back"
        >
          <span aria-hidden="true">←</span>
          Volver al evento
        </Link>

        <Link
          to="/"
          className="reservation-brand"
        >
          <strong>FYF</strong>
          <span>TICKETS</span>
        </Link>
      </header>

      <main className="reservation-main">
        <div className="reservation-heading">
          <span>RESERVACIÓN</span>

          <h1>Completa tus datos.</h1>

          <p>
            Guarda tu información para generar tus
            entradas.
          </p>
        </div>

        <div className="reservation-layout">
          <section className="reservation-form-section">
            <form
              className="reservation-form"
              onSubmit={handleSubmit}
            >
              <div className="form-field">
                <label htmlFor="fullName">
                  Nombre completo
                </label>

                <input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={event =>
                    setFullName(
                      event.target.value
                    )
                  }
                  placeholder="Ej. Rafael Morales"
                  autoComplete="name"
                  required
                  disabled={submitting}
                />
              </div>

              <div className="form-field">
                <label htmlFor="email">
                  Correo electrónico
                </label>

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={event =>
                    setEmail(
                      event.target.value
                    )
                  }
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  required
                  disabled={submitting}
                />

                <small>
                  Aquí enviaremos la información
                  de tu reservación.
                </small>
              </div>

              {error && (
                <div
                  className="reservation-form-error"
                  role="alert"
                >
                  {error.message}
                </div>
              )}

              <button
                type="submit"
                className="reservation-submit"
                disabled={submitting}
              >
                {submitting
                  ? 'Generando reservación...'
                  : 'Confirmar reservación'}
              </button>

              <p className="reservation-note">
                Actualmente el pago se realiza en
                taquilla. Esta reservación no realiza
                ningún cobro en línea.
              </p>
            </form>
          </section>

          <aside className="reservation-summary">
            <span className="reservation-summary__label">
              TU RESERVA
            </span>

            <div className="reservation-summary__image">
              {event.cover_image_url ? (
                <img
                  src={event.cover_image_url}
                  alt={event.title}
                />
              ) : (
                <div>FYF</div>
              )}
            </div>

            <div className="reservation-summary__content">
              <h2>{event.title}</h2>

              <div className="reservation-summary__details">
                <div>
                  <span>Fecha</span>

                  <strong>
                    {formatLongDate(
                      event.event_date
                    )}
                  </strong>
                </div>

                <div>
                  <span>Hora</span>

                  <strong>
                    {formatTime(
                      event.event_date
                    )}
                  </strong>
                </div>

                {event.venue && (
                  <div>
                    <span>Lugar</span>

                    <strong>
                      {event.venue}
                    </strong>
                  </div>
                )}
              </div>

              <div className="reservation-summary__ticket">
                <div>
                  <span>Acceso</span>

                  <strong>
                    {selectedAccess.name}
                  </strong>
                </div>

                <div>
                  <span>Cantidad</span>

                  <strong>
                    {quantity}
                  </strong>
                </div>
              </div>

              <div className="reservation-summary__total">
                <span>Total</span>

                <strong>
                  {formatMoney(total)}
                </strong>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
