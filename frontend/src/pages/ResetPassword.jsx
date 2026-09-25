import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { authApi } from '../api/resources.js';
import Field from '../components/Field.jsx';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [complete, setComplete] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    if (password !== confirmation) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      await authApi.resetPassword(token, password);
      setComplete(true);
    } catch (err) {
      setError(err.message || 'No se pudo restablecer la contraseña. Solicita un enlace nuevo.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 pb-24 pt-32">
      <header className="mb-10 text-center">
        <p className="mb-3 font-display text-xs uppercase tracking-wide-caps text-mist">Cuenta SIGNAL33</p>
        <h1 className="font-brand text-xl sm:text-2xl">Restablecer contraseña</h1>
        <p className="mt-4 text-sm text-mist">
          {complete
            ? 'Tu contraseña se actualizó. Ya puedes iniciar sesión.'
            : 'Elige una contraseña nueva para volver a entrar a tu cuenta.'}
        </p>
      </header>

      {!token ? (
        <div className="flex flex-col gap-6 text-center">
          <p className="text-sm text-signal-glow" role="alert">Este enlace no contiene un token válido.</p>
          <Link to="/" className="font-display text-xs uppercase tracking-wide-caps text-paper underline underline-offset-4">
            Volver al inicio
          </Link>
        </div>
      ) : complete ? (
        <div className="text-center">
          <Link to="/" className="font-display text-xs uppercase tracking-wide-caps text-paper underline underline-offset-4">
            Volver e iniciar sesión
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <Field
            label="Nueva contraseña"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            disabled={loading}
          />
          <Field
            label="Confirmar contraseña"
            type="password"
            autoComplete="new-password"
            minLength={8}
            maxLength={72}
            value={confirmation}
            onChange={(event) => setConfirmation(event.target.value)}
            required
            disabled={loading}
          />
          {error && <p className="text-sm text-signal-glow" role="alert">{error}</p>}
          <button
            type="submit"
            className="mt-2 bg-paper py-3.5 font-display text-sm uppercase tracking-wide-caps text-ink transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
            disabled={loading}
          >
            {loading ? 'Actualizando...' : 'Guardar contraseña'}
          </button>
          <Link to="/" className="text-center text-xs text-mist transition hover:text-paper">
            Volver al inicio
          </Link>
        </form>
      )}
    </main>
  );
}
