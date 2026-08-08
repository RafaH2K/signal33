import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { galleryApi, eventsApi } from '../api/resources.js';

export default function Home() {
  const [hero, setHero] = useState([]);
  const [events, setEvents] = useState([]);
  const reduce = useReducedMotion();

  useEffect(() => {
    galleryApi
      .list()
      .then((items) => setHero(items.filter((item) => item.type === 'IMAGE' || item.type === 'VIDEO')))
      .catch(() => setHero([]));
    eventsApi
      .list()
      .then((data) => setEvents(data.events.slice(0, 3)))
      .catch(() => setEvents([]));
  }, []);

  return (
    <>
      <HeroSection hero={hero} reduce={reduce} />
      <NovedadesSection events={events} reduce={reduce} />
    </>
  );
}

function HeroSection({ hero, reduce }) {
  return (
    <section className="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-6 pt-24">
      <HeroBackground slides={hero} />

      <motion.div
        className="relative z-10 flex flex-col items-center gap-6 text-center"
        initial={reduce ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      >
        <svg width="40" height="40" viewBox="0 0 18 18" fill="none" aria-hidden="true" className="text-paper">
          <circle cx="9" cy="9" r="8" stroke="currentColor" strokeWidth="0.75" />
          <circle cx="9" cy="9" r="2" fill="currentColor" />
        </svg>

        <h1 className="font-display text-5xl uppercase tracking-wide-caps md:text-7xl">signal33</h1>

        <p className="max-w-md text-sm text-mist md:text-base">
          Frecuencias, señales y fragmentos de un universo sonoro en construcción.
        </p>

        <div className="mt-2 flex flex-col gap-4 sm:flex-row">
          <Link
            to="/tienda"
            className="bg-paper px-8 py-3.5 text-center font-display text-sm uppercase tracking-wide-caps text-ink transition hover:opacity-90 active:scale-[0.98]"
          >
            Ver tienda
          </Link>
          <Link
            to="/signal"
            className="border border-line-strong px-8 py-3.5 text-center font-display text-sm uppercase tracking-wide-caps text-paper transition hover:border-paper active:scale-[0.98]"
          >
            Entrar a Signal
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

function HeroBackground({ slides }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 7000);
    return () => clearInterval(id);
  }, [slides.length]);

  if (slides.length === 0) {
    return <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(46,94,255,0.08),transparent_60%)]" />;
  }

  const slide = slides[index];
  return (
    <div className="absolute inset-0">
      {slide.type === 'VIDEO' ? (
        <video
          key={slide.id}
          src={slide.url}
          autoPlay
          muted
          loop
          playsInline
          className="h-full w-full object-cover opacity-0 transition-opacity duration-1000"
          onLoadedData={(e) => e.currentTarget.classList.remove('opacity-0')}
        />
      ) : (
        <img key={slide.id} src={slide.url} alt={slide.title ?? ''} className="h-full w-full object-cover" />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-ink/50 to-ink" />
    </div>
  );
}

function NovedadesSection({ events, reduce }) {
  return (
    <section className="border-t border-line px-6 py-24">
      <div className="mx-auto max-w-4xl">
        <h2 className="mb-12 text-center font-display text-xl uppercase tracking-wide-caps">Novedades</h2>

        {events.length === 0 ? (
          <p className="text-center text-sm text-mist">Todavía no hay anuncios. Volvé pronto.</p>
        ) : (
          <ul className="divide-y divide-line">
            {events.map((event, i) => (
              <motion.li
                key={event.id}
                initial={reduce ? false : { opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.5, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
                className="flex flex-col items-start justify-between gap-2 py-6 sm:flex-row sm:items-center"
              >
                <div>
                  <p className="text-sm">{event.title}</p>
                  <p className="text-xs text-mist-dim">{event.venue}</p>
                </div>
                <span className="font-mono text-xs text-mist">
                  {new Date(event.event_date).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </motion.li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
