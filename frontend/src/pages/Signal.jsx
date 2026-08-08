import { useEffect, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { signalApi } from '../api/resources.js';
import SignalEffectOverlay from '../components/SignalEffectOverlay.jsx';

const INTRO = 'signal33 // sistema listo. escribí un comando.';

export default function Signal() {
  const [log, setLog] = useState([{ type: 'response', text: INTRO }]);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);
  const [effect, setEffect] = useState(null);
  const logRef = useRef(null);
  const inputRef = useRef(null);
  const reduce = useReducedMotion();

  useEffect(() => {
    logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
  }, [log]);

  function push(entry) {
    setLog((prev) => [...prev, entry]);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    const command = value.trim();
    if (!command || busy) return;

    push({ type: 'input', text: command });
    setValue('');

    if (command.toLowerCase() === 'help' || command.toLowerCase() === 'ayuda') {
      push({ type: 'response', text: 'escribí cualquier palabra. algunas abren puertas, la mayoría no.' });
      return;
    }
    if (command.toLowerCase() === 'clear' || command.toLowerCase() === 'limpiar') {
      setLog([{ type: 'response', text: INTRO }]);
      return;
    }

    setBusy(true);
    try {
      const result = await signalApi.resolve(command);
      handleResult(result);
    } catch {
      push({ type: 'response', text: 'señal no reconocida.' });
    } finally {
      setBusy(false);
    }
  }

  function handleResult(result) {
    if (result.type === 'MESSAGE') {
      push({ type: 'response', text: result.payload.message });
    } else if (result.type === 'EFFECT') {
      push({ type: 'response', text: `activando: ${result.payload.effect}` });
      setEffect({ name: result.payload.effect, durationSeconds: result.payload.durationSeconds });
    } else if (result.type === 'REDIRECT') {
      push({ type: 'response', text: 'conectando...' });
      setTimeout(() => {
        window.location.href = result.payload.url;
      }, 1200);
    }
  }

  return (
    <main
      className="fixed inset-0 z-20 flex flex-col bg-ink px-6 py-10 font-mono"
      onClick={() => inputRef.current?.focus()}
    >
      <SignalEffectOverlay effect={effect} onDone={() => setEffect(null)} />

      <div ref={logRef} className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-3 overflow-y-auto">
        {log.map((entry, i) => (
          <motion.p
            key={i}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
            className={`text-sm leading-relaxed ${entry.type === 'input' ? 'text-mist' : 'text-signal-glow'}`}
          >
            {entry.type === 'input' ? '> ' : '// '}
            {entry.text}
          </motion.p>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mx-auto flex w-full max-w-2xl items-center gap-2 pt-6">
        <span className="text-sm text-paper">{'>'}</span>
        <input
          ref={inputRef}
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={busy}
          aria-label="Comando"
          className="flex-1 bg-transparent text-sm text-paper caret-paper outline-none placeholder:text-mist-dim"
          autoComplete="off"
          spellCheck={false}
        />
      </form>
    </main>
  );
}
