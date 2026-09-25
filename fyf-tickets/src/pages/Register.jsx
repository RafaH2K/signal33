import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth.js';

export default function Register() {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      await authApi.register({ ...form, name: form.name.trim(), email: form.email.trim() });
      const destination = location.state?.from || '/';
      navigate(destination === '/organizador' ? '/' : destination, { replace: true });
    } catch (err) {
      setError(err.message || 'No se pudo crear la cuenta.');
    } finally {
      setLoading(false);
    }
  }

  return <main className="account-page">
    <Link to="/" className="brand"><span className="brand__mark">FYF</span><span className="brand__name">TICKETS</span></Link>
    <form className="account-card" onSubmit={submit}>
      <span className="section-eyebrow">CREA TU CUENTA</span>
      <h1>Empieza a organizar.</h1>
      <p>Con tu cuenta puedes reservar entradas. Para publicar y administrar eventos necesitas el rol de taquilla.</p>
      {error && <div className="account-error" role="alert">{error}</div>}
      <label>Nombre<input required minLength={2} autoComplete="name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} /></label>
      <label>Correo electrónico<input required type="email" autoComplete="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} /></label>
      <label>Contraseña<input required type="password" minLength={8} autoComplete="new-password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} /></label>
      <button className="account-submit" disabled={loading}>{loading ? 'Creando cuenta…' : 'Crear cuenta'}</button>
      <p className="account-footnote">¿Ya tienes cuenta? <Link to="/login" state={{ from: location.state?.from }}>Inicia sesión</Link></p>
    </form>
  </main>;
}
