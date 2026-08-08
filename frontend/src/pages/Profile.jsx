import { useEffect, useState } from 'react';
import { usersApi } from '../api/resources.js';
import Field from '../components/Field.jsx';

export default function Profile() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [profileMsg, setProfileMsg] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    usersApi.me().then((user) => {
      setName(user.name);
      setEmail(user.email);
    });
  }, []);

  async function saveProfile(e) {
    e.preventDefault();
    setProfileMsg('');
    setSavingProfile(true);
    try {
      await usersApi.updateMe({ name, email });
      setProfileMsg('Perfil actualizado.');
    } catch (err) {
      setProfileMsg(err.message);
    } finally {
      setSavingProfile(false);
    }
  }

  async function savePassword(e) {
    e.preventDefault();
    setPasswordMsg('');
    setSavingPassword(true);
    try {
      await usersApi.changePassword({ currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      setPasswordMsg('Contraseña actualizada.');
    } catch (err) {
      setPasswordMsg(err.message);
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <main className="mx-auto max-w-md px-6 pb-24 pt-32">
      <h1 className="mb-16 text-center font-display text-2xl uppercase tracking-wide-caps">Perfil</h1>

      <form onSubmit={saveProfile} className="mb-16 flex flex-col gap-4">
        <Field label="Nombre" value={name} onChange={(e) => setName(e.target.value)} required />
        <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {profileMsg && <p className="text-xs text-mist">{profileMsg}</p>}
        <button
          type="submit"
          disabled={savingProfile}
          className="mt-2 bg-paper py-3.5 font-display text-sm uppercase tracking-wide-caps text-ink transition hover:opacity-90 active:scale-[0.98] disabled:opacity-50"
        >
          {savingProfile ? 'Guardando...' : 'Guardar cambios'}
        </button>
      </form>

      <form onSubmit={savePassword} className="flex flex-col gap-4 border-t border-line pt-16">
        <h2 className="font-display text-xs uppercase tracking-wide-caps text-mist">Cambiar contraseña</h2>
        <Field
          label="Contraseña actual"
          type="password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          required
        />
        <Field
          label="Nueva contraseña"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          minLength={8}
          required
        />
        {passwordMsg && <p className="text-xs text-mist">{passwordMsg}</p>}
        <button
          type="submit"
          disabled={savingPassword}
          className="mt-2 border border-line-strong py-3.5 font-display text-sm uppercase tracking-wide-caps text-paper transition hover:border-paper active:scale-[0.98] disabled:opacity-50"
        >
          {savingPassword ? 'Guardando...' : 'Actualizar contraseña'}
        </button>
      </form>
    </main>
  );
}
