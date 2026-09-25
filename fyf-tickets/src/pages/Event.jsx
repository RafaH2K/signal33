import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { eventsApi, reservationsApi } from '../api/resources.js';
import { formatLongDate, formatMoney, formatTime } from '../lib/format.js';
import './event.css';

export default function Event() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [event, setEvent] = useState(null);
  const [availability, setAvailability] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [quantity, setQuantity] = useState(1);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadEvent() {
      try {
        setLoading(true);
        setError(null);

        const eventsData = await eventsApi.list('?pageSize=100');

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

        const availableTypes =
          availabilityData?.ticketTypes ?? [];

        if (availableTypes.length > 0) {
          const firstAvailable = availableTypes.find(
            access =>
              access.remaining === null ||
              access.remaining > 0
          );

          setSelectedType(firstAvailable?.id ?? null);
        }
      } catch (err) {
        console.error('Error cargando evento:', err);
        setError(err);
      } finally {
        setLoading(false);
      }
    }

    loadEvent();
  }, [id]);

  const selectedAccess = useMemo(() => {
    return availability?.ticketTypes?.find(
      access => access.id === selectedType
    );
  }, [availability, selectedType]);

  const maxQuantity = useMemo(() => {
    if (!availability) return 1;

    const maxPerPerson =
      availability.maxAccessesPerPerson ?? 1;

    if (
      selectedAccess &&
      selectedAccess.remaining !== null
    ) {
      return Math.min(
        maxPerPerson,
        selectedAccess.remaining
      );
    }

    return maxPerPerson;
  }, [availability, selectedAccess]);

  const total = selectedAccess
    ? selectedAccess.price * quantity
    : 0;

  useEffect(() => {
    if (quantity > maxQuantity) {
      setQuantity(maxQuantity);
    }
  }, [quantity, maxQuantity]);

  if (loading) {
    return (
      <main className="event-page event-page--loading">
        <div className="event-loading-image" />

        <div className="event-loading-content">
          <div />
          <div />
          <div />
        </div>
      </main>
    );
  }

  if (error || !event) {
    return (
      <main className="event-error">
        <span>404</span>

        <h1>Evento no encontrado</h1>

        <p>
          El evento que buscas no existe o ya no está
          disponible.
        </p>

        <Link to="/" className="event-error__link">
          Volver a eventos
        </Link>
      </main>
    );
  }

  const eventClosed =
    !availability?.isOpen ||
    !availability?.ticketTypes?.some(
      access =>
        access.remaining === null ||
        access.remaining > 0
    );

  return (
    <div className="event-page">
      <header className="event-header">
        <Link to="/" className="event-back">
          <span aria-hidden="true">←</span>
          Todos los eventos
        </Link>

        <Link to="/" className="event-brand">
          <strong>FYF</strong>
          <span>TICKETS</span>
        </Link>
      </header>

      <main>
        <section className="event-hero">
          <div className="event-hero__image">
            {event.cover_image_url ? (
              <img
                src={event.cover_image_url}
                alt={event.title}
              />
            ) : (
              <div className="event-hero__placeholder">
                FYF
              </div>
            )}
          </div>

          <div className="event-hero__content">
            <div className="event-eyebrow">
              {event.organizer_name ?? 'Find Your Frequency'}
            </div>

            <h1>{event.title}</h1>

            <div className="event-details">
              <div>
                <span>Fecha</span>
                <strong>
                  {formatLongDate(event.event_date)}
                </strong>
              </div>

              <div>
                <span>Hora</span>
                <strong>
                  {formatTime(event.event_date)}
                </strong>
              </div>

              {event.venue && (
                <div>
                  <span>Lugar</span>
                  <strong>{event.venue}</strong>
                </div>
              )}
            </div>

            {event.description && (
              <p className="event-description">
                {event.description}
              </p>
            )}
          </div>
        </section>

        <section className="ticket-section">
          <div className="ticket-section__heading">
            <span>Entradas</span>

            <p>
              Máximo {availability.maxAccessesPerPerson}{' '}
              por persona
            </p>
          </div>

          {eventClosed ? (
            <div className="event-closed">
              <h2>Entradas no disponibles</h2>
              <p>
                Este evento ya no está disponible para
                reservaciones.
              </p>
            </div>
          ) : (
            <>
              <div className="access-list">
                {availability.ticketTypes.map(access => {
                  const soldOut =
                    access.remaining !== null &&
                    access.remaining <= 0;

                  const selected =
                    selectedType === access.id;

                  return (
                    <button
                      key={access.id}
                      type="button"
                      disabled={soldOut}
                      onClick={() => {
                        setSelectedType(access.id);
                        setQuantity(1);
                      }}
                      className={`access-option ${
                        selected
                          ? 'access-option--selected'
                          : ''
                      }`}
                    >
                      <div>
                        <span className="access-option__name">
                          {access.name}
                        </span>

                        <span className="access-option__availability">
                          {soldOut
                            ? 'Agotado'
                            : access.remaining === null
                              ? 'Disponible'
                              : `${access.remaining} disponibles`}
                        </span>
                      </div>

                      <strong>
                        {formatMoney(access.price)}
                      </strong>
                    </button>
                  );
                })}
              </div>

              {selectedAccess && (
                <div className="purchase-bar">
                  <div className="quantity">
                    <span>Cantidad</span>

                    <div className="quantity__controls">
                      <button
                        type="button"
                        disabled={quantity <= 1}
                        onClick={() =>
                          setQuantity(current =>
                            Math.max(1, current - 1)
                          )
                        }
                      >
                        −
                      </button>

                      <strong>{quantity}</strong>

                      <button
                        type="button"
                        disabled={quantity >= maxQuantity}
                        onClick={() =>
                          setQuantity(current =>
                            Math.min(
                              maxQuantity,
                              current + 1
                            )
                          )
                        }
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="purchase-total">
                    <span>Total</span>

                    <strong>
                      {formatMoney(total)}
                    </strong>
                  </div>

                  <button
                    type="button"
                    className="purchase-button"
                    onClick={() =>
                      navigate(
                        `/evento/${event.id}/reservar?ticketTypeId=${encodeURIComponent(selectedType)}&quantity=${quantity}`
                      )
                    }
                  >
                    Continuar
                    <span aria-hidden="true">→</span>
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
