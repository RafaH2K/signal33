import { useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { aboutApi, eventsApi } from '../api/resources.js';

function Block({ title, text, reduce, delay = 0 }) {
  if (!text) return null;
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.6, delay, ease: [0.16, 1, 0.3, 1] }}
      className="mx-auto max-w-2xl py-12"
    >
      <h2 className="mb-4 font-display text-xs uppercase tracking-wide-caps text-mist">{title}</h2>
      <p className="whitespace-pre-line text-base leading-relaxed text-paper/90">{text}</p>
    </motion.div>
  );
}

export default function Trayectoria() {
  const [about, setAbout] = useState(null);
  const [eventPhotos, setEventPhotos] = useState([]);
  const reduce = useReducedMotion();

  useEffect(() => {
    aboutApi.get().then(setAbout).catch(() => setAbout({}));
    eventsApi
      .list()
      .then((data) => setEventPhotos(data.events.filter((e) => e.cover_image_url).slice(0, 6)))
      .catch(() => setEventPhotos([]));
  }, []);

  if (!about) return <main className="min-h-[60vh] px-6 pt-24" />;

  const hasContent = about.bio || about.story || about.influences || about.career;

  return (
    <main className="px-6 pb-24 pt-32">
      {/* TODO: fotografía principal del DJ. Placeholder hasta subir una imagen real vía Uploads. */}
      <div className="mx-auto mb-20 aspect-[16/9] max-w-4xl bg-[radial-gradient(circle_at_center,rgba(46,94,255,0.06),transparent_60%)]" />

      <h1 className="mb-16 text-center font-display text-2xl uppercase tracking-wide-caps">Trayectoria</h1>

      {!hasContent && <p className="text-center text-sm text-mist">Contenido próximamente.</p>}

      <div className="divide-y divide-line">
        <Block title="Biografía" text={about.bio} reduce={reduce} delay={0} />
        <Block title="Historia" text={about.story} reduce={reduce} delay={0.05} />
        <Block title="Influencias" text={about.influences} reduce={reduce} delay={0.1} />
        <Block title="Evolución artística" text={about.career} reduce={reduce} delay={0.15} />
      </div>

      {eventPhotos.length > 0 && (
        <div className="mx-auto mt-20 max-w-5xl">
          <h2 className="mb-8 text-center font-display text-xs uppercase tracking-wide-caps text-mist">
            En vivo
          </h2>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {eventPhotos.map((event) => (
              <div key={event.id} className="aspect-square overflow-hidden bg-white/5">
                <img src={event.cover_image_url} alt={event.title} className="h-full w-full object-cover" />
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
