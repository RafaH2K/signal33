import { useEffect, useState } from 'react';
import { aboutApi } from '../../api/resources.js';
import Field from '../../components/Field.jsx';

export default function AdminAbout() {
  const [form, setForm] = useState({ bio: '', story: '', influences: '', career: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    aboutApi
      .get()
      .then((about) =>
        setForm({
          bio: about.bio ?? '',
          story: about.story ?? '',
          influences: about.influences ?? '',
          career: about.career ?? '',
        })
      )
      .finally(() => setLoading(false));
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setMessage('');
    setSaving(true);
    try {
      await aboutApi.update(form);
      setMessage('Guardado.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <p className="text-sm text-mist">Cargando...</p>;

  return (
    <div className="max-w-xl">
      <h1 className="mb-10 font-display text-xl uppercase tracking-wide-caps">Trayectoria</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        <Field label="Biografía" textarea rows={3} value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
        <Field label="Historia" textarea rows={4} value={form.story} onChange={(e) => setForm({ ...form, story: e.target.value })} />
        <Field
          label="Influencias"
          textarea
          rows={3}
          value={form.influences}
          onChange={(e) => setForm({ ...form, influences: e.target.value })}
        />
        <Field
          label="Evolución artística"
          textarea
          rows={4}
          value={form.career}
          onChange={(e) => setForm({ ...form, career: e.target.value })}
        />
        {message && <p className="text-xs text-mist">{message}</p>}
        <button
          type="submit"
          disabled={saving}
          className="w-fit bg-paper px-8 py-3.5 font-display text-sm uppercase tracking-wide-caps text-ink transition hover:opacity-90 disabled:opacity-50"
        >
          {saving ? 'Guardando...' : 'Guardar'}
        </button>
      </form>
    </div>
  );
}
