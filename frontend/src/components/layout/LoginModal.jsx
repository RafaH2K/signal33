import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { X } from '@phosphor-icons/react';
import { useAuth } from '../../context/AuthContext.jsx';
import { authApi } from '../../api/resources.js';
import Field from '../Field.jsx';

const TABS = [
  { key: 'login', label: 'Ingresar' },
  { key: 'register', label: 'Registro' },
  { key: 'forgot', label: 'Recuperar' },
];

export default function LoginModal({ open, initialTab = 'login', onClose }) {
  const [tab, setTab] = useState(initialTab);
  const { login, register } = useAuth();
  const reduce = useReducedMotion();

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 px-4"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        onClick={onClose}
      >
        <motion.div
          className="w-full max-w-md border border-line bg-ink p-8"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
          animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.98 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-8 flex items-center justify-between">
            <div className="flex gap-6">
              {TABS.map((t) => (
                <button
                  key={t.key}
                  type="button"
                  onClick={() => setTab(t.key)}
                  className={`whitespace-nowrap font-display text-xs uppercase tracking-wide-caps transition ${
                    tab === t.key ? 'text-paper' : 'text-mist-dim hover:text-mist'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
            <button type="button" onClick={onClose} aria-label="Cerrar" className="text-mist hover:text-paper transition">
              <X size={18} />
            </button>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={tab}
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
              transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              {tab === 'login' && <LoginForm onDone={onClose} login={login} />}
              {tab === 'register' && <RegisterForm onDone={onClose} register={register} />}
              {tab === 'forgot' && <ForgotForm />}
            </motion.div>
          </AnimatePresence>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function LoginForm({ onDone, login }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(email, password);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Field
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        required
      />
      {error && <p className="text-xs text-signal-glow">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 bg-paper py-3.5 font-display text-sm uppercase tracking-wide-caps text-ink transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? 'Ingresando...' : 'Ingresar'}
      </button>
    </form>
  );
}

function RegisterForm({ onDone, register }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(name, email, password);
      onDone();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
      <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <Field
        label="Contraseña"
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        minLength={8}
        required
      />
      {error && <p className="text-xs text-signal-glow">{error}</p>}
      <button
        type="submit"
        disabled={loading}
        className="mt-2 bg-paper py-3.5 font-display text-sm uppercase tracking-wide-caps text-ink transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? 'Creando...' : 'Crear cuenta'}
      </button>
    </form>
  );
}

function ForgotForm() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    try {
      await authApi.forgotPassword(email);
    } finally {
      setLoading(false);
      setSent(true);
    }
  }

  if (sent) {
    return <p className="text-sm text-mist">Si el email existe, te enviamos un link para recuperar tu contraseña.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <button
        type="submit"
        disabled={loading}
        className="mt-2 border border-line-strong py-3.5 font-display text-sm uppercase tracking-wide-caps text-paper transition hover:border-paper active:scale-[0.98] disabled:opacity-50"
      >
        {loading ? 'Enviando...' : 'Enviar link'}
      </button>
    </form>
  );
}
