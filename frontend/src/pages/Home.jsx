import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, useReducedMotion } from 'motion/react';
import { eventsApi } from '../api/resources.js';

const EASE = [0.16, 1, 0.3, 1];
const FOCUS = 'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-signal-glow';

const HERO_SLIDES = [
  { src: '/media/hero-1.webp', alt: 'DJ con audífonos en la cabina, bajo un árbol y una letra H iluminada' },
  { src: '/media/hero-2.webp', alt: 'DJ de perfil frente a la cabina, con el campo al fondo' },
  { src: '/media/hero-3.webp', alt: 'DJ de perfil mirando hacia un lado' },
  { src: '/media/hero-4.webp', alt: 'DJ con audífonos concentrado en el mezclador' },
  { src: '/media/hero-5.webp', alt: 'DJ de espaldas frente a los controladores, con montañas al fondo' },
  { src: '/media/hero-6.webp', alt: 'DJ mirando a cámara sobre la cabina' },
];

// se usan las fotos como parte del ritmo de la página; alt describe la imagen
const RETRATOS = [
  { src: '/media/retrato-1.webp', alt: 'Retrato de DJ con audífonos y mirada al frente', offset: 'mt-10' },
  { src: '/media/retrato-2.webp', alt: 'Primer plano del rostro, mirando hacia abajo', offset: '' },
  { src: '/media/retrato-3.webp', alt: 'DJ de perfil con audífonos, mezclando', offset: 'mt-20' },
];

export default function Home() {
  const [events, setEvents] = useState(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    eventsApi
      .list()
      .then((data) => setEvents(data.events.slice(0, 3)))
      .catch(() => setEvents([]));
  }, []);

  return (
    <>
      <HeroSection reduce={reduce} />
      <EventosSection events={events} reduce={reduce} />
      <TrayectoriaSection reduce={reduce} />
      <GaleriaSection reduce={reduce} />
      <CierreSection />
    </>
  );
}

function HeroSection({ reduce }) {
  const [index, setIndex] = useState(0);

  // sin movimiento (prefers-reduced-motion) se queda en la primera foto
  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % HERO_SLIDES.length), 6500);
    return () => clearInterval(id);
  }, [reduce]);

  return (
    <section className="relative isolate flex min-h-[100dvh] items-end overflow-hidden lg:items-center">
      <div className="absolute inset-0 lg:left-[30%]">
        {HERO_SLIDES.map((slide, i) => (
          <img
            key={slide.src}
            src={slide.src}
            alt={i === index ? slide.alt : ''}
            width={1920}
            height={1442}
            fetchPriority={i === 0 ? 'high' : 'auto'}
            className={`absolute inset-0 h-full w-full object-cover [transition:opacity_1.6s_ease,transform_9s_linear] motion-reduce:transition-none ${
              i === index ? 'scale-105 opacity-100' : 'scale-100 opacity-0'
            }`}
          />
        ))}
      </div>

      {/* velo: en móvil sube desde abajo para leer el texto; en escritorio funde la foto hacia el lado del texto */}
      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/60 to-ink/10 lg:bg-gradient-to-r lg:from-ink lg:from-30% lg:via-ink/25 lg:via-55% lg:to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-ink to-transparent" />
      {/* el navbar es transparente sobre la foto: este velo mantiene legibles el logo y los links */}
      <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-ink/85 to-transparent" />

      <motion.div
        className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 pt-24 lg:pb-0"
        initial={reduce ? false : { opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.9, ease: EASE }}
      >
        <h1 className="font-brand text-3xl leading-[1.15] sm:text-5xl lg:text-6xl">
          <span className="sr-only">Signal33. </span>
          Find your
          <br />
          frequency
        </h1>

        <p className="mt-6 max-w-sm text-sm text-mist md:text-base">
          Frecuencias, señales y fragmentos de un universo sonoro en construcción.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Link
            to="/boletos"
            className={`bg-paper px-10 py-3.5 text-center font-display text-sm uppercase tracking-wide-caps text-ink transition hover:bg-mist active:scale-[0.98] ${FOCUS}`}
          >
            Boletos
          </Link>
          <Link
            to="/tienda"
            className={`border border-line-strong bg-ink/40 px-10 py-3.5 text-center font-display text-sm uppercase tracking-wide-caps text-paper backdrop-blur-sm transition hover:border-paper active:scale-[0.98] ${FOCUS}`}
          >
            Tienda
          </Link>
        </div>
      </motion.div>
    </section>
  );
}

function EventosSection({ events, reduce }) {
  return (
    <section className="px-6 py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl gap-10 lg:grid-cols-12">
        <h2 className="font-brand text-2xl lg:sticky lg:top-28 lg:col-span-4 lg:self-start">Próximos eventos</h2>

        <div className="lg:col-span-8">
          {events === null ? (
            <ul className="divide-y divide-line" aria-hidden="true">
              {[0, 1, 2].map((n) => (
                <li key={n} className="h-24 animate-pulse py-6">
                  <div className="h-3 w-1/2 bg-white/5" />
                  <div className="mt-3 h-3 w-1/4 bg-white/5" />
                </li>
              ))}
            </ul>
          ) : events.length === 0 ? (
            <p className="text-sm text-mist">Todavía no hay eventos anunciados. Vuelve pronto.</p>
          ) : (
            <ul className="divide-y divide-line">
              {events.map((event, i) => (
                <EventRow key={event.id} event={event} index={i} reduce={reduce} />
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function EventRow({ event, index, reduce }) {
  const date = new Date(event.event_date);
  const cta = event.reservations_enabled ? (
    <Link to="/boletos" className={`border border-signal px-4 py-2 text-xs uppercase tracking-wide-caps text-paper transition hover:bg-signal/20 ${FOCUS}`}>
      Apartar
    </Link>
  ) : event.ticket_url ? (
    <a href={event.ticket_url} target="_blank" rel="noreferrer" className={`border border-signal px-4 py-2 text-xs uppercase tracking-wide-caps text-paper transition hover:bg-signal/20 ${FOCUS}`}>
      Boletos
    </a>
  ) : null;

  return (
    <motion.li
      initial={reduce ? false : { opacity: 0, y: 14 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay: index * 0.08, ease: EASE }}
      className="grid grid-cols-[4rem_1fr] items-center gap-x-6 gap-y-4 py-6 sm:grid-cols-[5rem_1fr_auto]"
    >
      <time dateTime={date.toISOString()} className="text-center">
        <span className="block font-brand text-3xl leading-none">{date.toLocaleDateString('es-MX', { day: '2-digit' })}</span>
        <span className="mt-2 block font-mono text-xs uppercase text-mist">
          {date.toLocaleDateString('es-MX', { month: 'short' }).replace('.', '')}
        </span>
      </time>

      <div className="flex items-center gap-5">
        {event.cover_image_url && (
          <img src={event.cover_image_url} alt="" loading="lazy" className="hidden h-16 w-24 object-cover md:block" />
        )}
        <div>
          <p className="text-base">{event.title}</p>
          <p className="mt-1 text-xs text-mist-dim">{event.venue}</p>
        </div>
      </div>

      {cta && <div className="col-span-2 sm:col-span-1">{cta}</div>}
    </motion.li>
  );
}

function TrayectoriaSection({ reduce }) {
  return (
    <section className="border-t border-line px-6 py-24 lg:py-32">
      <div className="mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-12">
        <div className="grid grid-cols-3 gap-3 sm:gap-5 lg:col-span-7">
          {RETRATOS.map((photo, i) => (
            <motion.img
              key={photo.src}
              src={photo.src}
              alt={photo.alt}
              width={900}
              height={1199}
              loading="lazy"
              initial={reduce ? false : { opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.8, delay: i * 0.12, ease: EASE }}
              className={`aspect-[3/4] w-full object-cover ${photo.offset}`}
            />
          ))}
        </div>

        <div className="lg:col-span-5">
          <h2 className="font-brand text-2xl leading-tight md:text-3xl">Trayectoria</h2>
          <p className="mt-6 max-w-[42ch] text-mist">Conoce la historia de Signal33 y lo que viene.</p>
          <Link
            to="/trayectoria"
            className={`mt-8 inline-block border border-line-strong px-10 py-3.5 font-display text-sm uppercase tracking-wide-caps text-paper transition hover:border-paper active:scale-[0.98] ${FOCUS}`}
          >
            Ver más
          </Link>
        </div>
      </div>
    </section>
  );
}

// Bento de 4 celdas exactas: en 4 columnas ocupa 2 filas completas; en móvil (2 columnas) 4 filas.
const GALERIA = [
  { src: '/media/detalle-1.webp', w: 1100, h: 1465, pos: 'object-[50%_65%]', span: 'col-span-2 row-span-2', alt: 'DJ de pie tras la cabina, bajo la letra H iluminada' },
  { src: '/media/detalle-2.webp', w: 1200, h: 901, pos: 'object-center', span: 'col-span-2', alt: 'Manos sobre el equipo de mezcla' },
  { src: '/media/detalle-3.webp', w: 800, h: 1065, pos: 'object-[50%_70%]', span: '', alt: 'Mano sobre el mezclador' },
  { src: '/media/detalle-4.webp', w: 800, h: 1065, pos: 'object-[50%_40%]', span: '', alt: 'Colgante morado sobre la chamarra roja' },
];

function GaleriaSection({ reduce }) {
  return (
    <section className="border-t border-line px-6 py-24 lg:py-32">
      <div className="mx-auto max-w-7xl">
        <h2 className="font-brand text-2xl md:text-3xl">Galería</h2>

        <div className="mt-12 grid auto-rows-[190px] grid-cols-2 gap-3 sm:auto-rows-[260px] md:auto-rows-[280px] md:grid-cols-4 md:gap-4 lg:auto-rows-[320px]">
          {GALERIA.map((photo, i) => (
            <motion.figure
              key={photo.src}
              initial={reduce ? false : { opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.15 }}
              transition={{ duration: 0.7, delay: i * 0.08, ease: EASE }}
              className={`group m-0 overflow-hidden ${photo.span}`}
            >
              <img
                src={photo.src}
                alt={photo.alt}
                width={photo.w}
                height={photo.h}
                loading="lazy"
                className={`h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04] motion-reduce:transition-none ${photo.pos}`}
              />
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function CierreSection() {
  return (
    <section className="relative isolate flex min-h-[70dvh] items-center overflow-hidden border-t border-line px-6 py-24">
      <img src="/media/cierre.webp" alt="" width={1600} height={1201} loading="lazy" className="absolute inset-0 -z-10 h-full w-full object-cover" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink via-ink/80 to-ink/30" />
      <div className="absolute inset-0 -z-10 bg-ink/40 md:hidden" />

      <div className="mx-auto w-full max-w-7xl">
        <h2 className="max-w-xl font-brand text-2xl leading-snug md:text-3xl">Escribe cualquier palabra.</h2>
        <p className="mt-4 max-w-sm text-mist">Algunas abren puertas, la mayoría no.</p>
        <Link
          to="/signal"
          className={`mt-8 inline-block bg-paper px-10 py-3.5 font-display text-sm uppercase tracking-wide-caps text-ink transition hover:bg-mist active:scale-[0.98] ${FOCUS}`}
        >
          Entrar a Signal
        </Link>
      </div>
    </section>
  );
}
