import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { apiRequest } from '../api/client.js';
import { setSession } from '../auth/auth.js';
import './login.css';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const redirectTo = location.state?.from || '/';

  function handleChange(event) {
    const { name, value } = event.target;

    setForm(current => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    setError('');

    if (!form.email || !form.password) {
      setError('Ingresa tu correo y contraseña.');
      return;
    }

    try {
      setLoading(true);

      const response = await apiRequest('/auth/login', {
        method: 'POST',
        body: {
          email: form.email.trim(),
          password: form.password,
        },
      });

      const accessToken = response?.accessToken;
      const refreshToken = response?.refreshToken;
      const user = response?.user;

      if (!accessToken) {
        throw new Error(
          'El servidor inició sesión, pero no devolvió un token.'
        );
      }

      setSession({
        accessToken,
        refreshToken,
        user,
      });

      navigate(redirectTo, {
        replace: true,
      });
    } catch (err) {
      console.error('Error iniciando sesión:', err);

      if (err.status === 401) {
        setError('Correo o contraseña incorrectos.');
      } else {
        setError(
          err.message ||
            'No fue posible iniciar sesión. Intenta nuevamente.'
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-page">
      <div className="login-layout">

        <section className="login-intro">
          <Link to="/" className="login-brand">
            <strong>FYF</strong>
            <span>TICKETS</span>
          </Link>

          <div className="login-intro__content">
            <span className="login-eyebrow">
              FIND YOUR FREQUENCY
            </span>

            <h1>
              Tu acceso a
              <br />
              tus eventos.
            </h1>

            <p>
              Inicia sesión para administrar tus reservas,
              consultar tus boletos y acceder a las funciones
              disponibles para tu cuenta.
            </p>
          </div>

          <div className="login-intro__footer">
            <span>FYF Tickets</span>
            <span>01 / 01</span>
          </div>
        </section>

        <section className="login-form-section">
          <div className="login-form-wrapper">

            <div className="login-heading">
              <span>ACCESO</span>

              <h2>Iniciar sesión</h2>

              <p>
                Ingresa con las credenciales de tu cuenta.
              </p>
            </div>

            <form
              className="login-form"
              onSubmit={handleSubmit}
            >
              {error && (
                <div
                  className="login-error"
                  role="alert"
                >
                  {error}
                </div>
              )}

              <label className="login-field">
                <span>Correo electrónico</span>

                <input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="tu@correo.com"
                  autoComplete="email"
                  disabled={loading}
                  required
                />
              </label>

              <label className="login-field">
                <span>Contraseña</span>

                <input
                  type="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={loading}
                  required
                />
              </label>

              <button
                type="submit"
                className="login-submit"
                disabled={loading}
              >
                {loading ? (
                  'Iniciando sesión...'
                ) : (
                  <>
                    Entrar
                    <span aria-hidden="true">→</span>
                  </>
                )}
              </button>
            </form>

          <Link to="/" className="login-back">
            ← Volver a eventos
          </Link>
          <p className="login-back">¿Aún no tienes cuenta? <Link to="/registro" state={{ from: location.state?.from }}>Crear cuenta</Link></p>

          </div>
        </section>

      </div>
    </main>
  );
}
