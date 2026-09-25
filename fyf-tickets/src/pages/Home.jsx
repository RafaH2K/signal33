import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.js';
import { eventsApi } from '../api/resources.js';
import { getUser, isAuthenticated } from '../auth/auth.js';
import { formatEventDate, formatTime } from '../lib/format.js';
import heroImage from '../assets/hero.png';

function EventCard({ event }) {
  return (
    <Link to={`/evento/${event.id}`} className="event-card">
      <div className="event-card__image">
        {event.cover_image_url ? (
          <img
            src={event.cover_image_url}
            alt={event.title}
            loading="lazy"
          />
        ) : (
          <div className="event-card__placeholder">
            <span>FYF</span>
          </div>
        )}

        <div className="event-card__date">
          <span>
            {new Date(event.event_date).getDate()}
          </span>
          <small>
            {new Intl.DateTimeFormat('es-MX', {
              month: 'short',
            }).format(new Date(event.event_date))}
          </small>
        </div>
      </div>

      <div className="event-card__content">
        <div className="event-card__meta">
          <span>{formatEventDate(event.event_date)}</span>
          <span>•</span>
          <span>{formatTime(event.event_date)}</span>
        </div>

        <h3>{event.title}</h3>

        {event.venue && (
          <p className="event-card__venue">
            {event.venue}
          </p>
        )}

        <span className="event-card__link">
          Ver evento
          <span aria-hidden="true">↗</span>
        </span>
      </div>
    </Link>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const accountMenuRef = useRef(null);
  const [user, setUser] = useState(() => isAuthenticated() ? getUser() : null);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!accountMenuOpen) return undefined;

    function handlePointerDown(event) {
      if (!accountMenuRef.current?.contains(event.target)) setAccountMenuOpen(false);
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') setAccountMenuOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [accountMenuOpen]);

  async function handleLogout() {
    setAccountMenuOpen(false);
    try {
      await authApi.logout();
    } catch (logoutError) {
      console.error('Error cerrando sesión:', logoutError);
    } finally {
      setUser(null);
      navigate('/', { replace: true });
    }
  }

  useEffect(() => {
    eventsApi
      .list('?pageSize=100')
      .then(data => {
        const now = new Date();

        const openEvents = (data?.events ?? [])
          .filter(event => {
            return (
              event.reservations_enabled &&
              new Date(event.event_date) > now
            );
          })
          .sort(
            (a, b) =>
              new Date(a.event_date) -
              new Date(b.event_date)
          );

        setEvents(openEvents);
      })
      .catch(error => {
        console.error('Error cargando eventos:', error);
        setError(true);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  return (
    <div className="fyf-home">
      <header className="site-header">
        <Link to="/" className="brand">
          <span className="brand__mark">FYF</span>
          <span className="brand__name">TICKETS</span>
        </Link>

        <nav className="site-nav" aria-label="Navegación principal">
          <a href="#eventos">Eventos</a>
          <a href="#about">FYF Tickets</a>
        </nav>

        <div className="site-header-actions">
          <Link to="/mis-boletos" className="header-action">
            Mis boletos
          </Link>
          <Link to="/organizador" className="header-action">Organizadores</Link>
          {user ? (
            <div className="account-menu" ref={accountMenuRef}>
              <button
                type="button"
                className="account-menu__trigger"
                aria-haspopup="menu"
                aria-expanded={accountMenuOpen}
                onClick={() => setAccountMenuOpen(open => !open)}
              >
                <span className="account-menu__avatar" aria-hidden="true">
                  {(user.name || user.email || 'U').trim().charAt(0).toUpperCase()}
                </span>
                <span className="account-menu__name">{user.name || user.email || 'Mi cuenta'}</span>
                <span className="account-menu__chevron" aria-hidden="true">⌄</span>
              </button>
              {accountMenuOpen && (
                <div className="account-menu__dropdown" role="menu">
                  {user.email && <span className="account-menu__email">{user.email}</span>}
                  <Link to="/mis-boletos" role="menuitem" onClick={() => setAccountMenuOpen(false)}>
                    Mis boletos
                  </Link>
                  <button type="button" role="menuitem" onClick={handleLogout}>
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link to="/login" className="header-action header-action--primary">Iniciar sesión</Link>
          )}
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="hero__container">
            <div className="hero__content">
              <div className="hero__eyebrow">
                <span className="hero__dot" />
                Find Your Frequency
              </div>

              <h1>
                Tu próximo
                <br />
                evento está aquí.
              </h1>

              <p className="hero__description">
                Descubre eventos, reserva tu entrada y vive la experiencia.
              </p>

              <div className="hero__actions">
                <a href="#eventos" className="hero__cta">
                  Explorar eventos
                  <span aria-hidden="true">↓</span>
                </a>
                <Link to="/mis-boletos" className="hero__cta-secondary">
                  Mis boletos
                  <span aria-hidden="true">→</span>
                </Link>
              </div>
            </div>

            <div className="hero__visual" aria-hidden="true">
              <div className="hero__glow" />
              <img
                src={heroImage}
                alt="Find Your Frequency Tickets"
                className="hero__image"
              />
              <div className="hero__badge">
                <span className="hero__badge-dot" />
                <span>Boletos digitales con QR</span>
              </div>
            </div>
          </div>
        </section>

        <section id="eventos" className="events-section">
          <div className="section-heading">
            <div>
              <span className="section-eyebrow">
                Agenda
              </span>

              <h2>Próximos eventos</h2>
            </div>

            {!loading && events.length > 0 && (
              <span className="event-count">
                {events.length}{' '}
                {events.length === 1
                  ? 'evento'
                  : 'eventos'}
              </span>
            )}
          </div>

          {loading && (
            <div className="events-grid">
              {[1, 2, 3].map(item => (
                <div
                  key={item}
                  className="event-card event-card--loading"
                >
                  <div className="skeleton skeleton--image" />

                  <div className="event-card__content">
                    <div className="skeleton skeleton--small" />
                    <div className="skeleton skeleton--title" />
                    <div className="skeleton skeleton--text" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && error && (
            <div className="events-state">
              <span className="events-state__icon">!</span>

              <h3>No pudimos cargar los eventos.</h3>

              <p>
                Intenta actualizar la página en unos
                momentos.
              </p>

              <button
                type="button"
                onClick={() => window.location.reload()}
              >
                Intentar nuevamente
              </button>
            </div>
          )}

          {!loading && !error && events.length === 0 && (
            <div className="events-state">
              <span className="events-state__icon">—</span>

              <h3>No hay eventos disponibles.</h3>

              <p>
                Regresa pronto para descubrir nuevas
                experiencias.
              </p>
            </div>
          )}

          {!loading && !error && events.length > 0 && (
            <div className="events-grid">
              {events.map(event => (
                <EventCard
                  key={event.id}
                  event={event}
                />
              ))}
            </div>
          )}
        </section>

        <section id="about" className="about-section">
          <div className="about-section__label">
            FYF
          </div>

          <div className="about-section__content">
            <span className="section-eyebrow">
              Find Your Frequency
            </span>

            <h2>
              El lugar donde
              <br />
              comienzan las experiencias.
            </h2>

            <p>
              FYF Tickets conecta personas con eventos y
              experiencias. Encuentra tu próximo destino,
              reserva tu entrada y ten tu boleto siempre
              contigo.
            </p>
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <div className="brand">
          <span className="brand__mark">FYF</span>
          <span className="brand__name">TICKETS</span>
        </div>

        <nav className="footer-links" aria-label="Enlaces de pie de página">
          <a href="#eventos">Eventos</a>
          <Link to="/mis-boletos">Mis boletos</Link>
          <Link to="/organizador">Organizadores</Link>
        </nav>

        <span>
          © {new Date().getFullYear()} Find Your Frequency
        </span>
      </footer>
    </div>
  );
}
