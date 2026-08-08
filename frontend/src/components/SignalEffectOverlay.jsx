import { useEffect } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

const DISCO_COLORS = ['#2e5eff', '#6b8bff', '#ffffff', '#2e5eff'];

// Efectos reconocidos por nombre; cualquier otro `effect` cae en el genérico
// (pulso del acento + el nombre), así un comando nuevo que el admin invente
// desde el Dashboard nunca rompe la experiencia.
export default function SignalEffectOverlay({ effect, onDone }) {
  const reduce = useReducedMotion();
  const isDisco = effect?.name === 'disco_ball' || effect?.name === 'disco';

  useEffect(() => {
    if (!effect) return;
    const id = setTimeout(onDone, (effect.durationSeconds ?? 4) * 1000);
    return () => clearTimeout(id);
  }, [effect, onDone]);

  return (
    <AnimatePresence>
      {effect && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[60] flex items-center justify-center overflow-hidden"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {isDisco ? (
            <div className={`relative h-[140vmax] w-[140vmax] ${reduce ? '' : 'animate-disco-spin'}`}>
              {DISCO_COLORS.map((color, i) => (
                <div
                  key={i}
                  className={`absolute inset-0 ${reduce ? 'opacity-60' : 'animate-disco-flash'}`}
                  style={{
                    background: `conic-gradient(from ${i * 90}deg, transparent 0deg, ${color}33 8deg, transparent 16deg, transparent 90deg)`,
                    animationDelay: `${i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          ) : (
            <div className={`h-64 w-64 rounded-full bg-signal/20 ${reduce ? '' : 'animate-disco-flash'}`} />
          )}

          {!isDisco && (
            <p className="absolute font-mono text-xs uppercase tracking-wide-caps text-signal-glow">
              {effect.name}
            </p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}
