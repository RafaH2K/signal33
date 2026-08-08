import { useEffect, useState } from 'react';
import { usersApi } from '../../api/resources.js';
import { useAuth } from '../../context/AuthContext.jsx';

export default function AdminUsers() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState(null);

  function load() {
    usersApi
      .adminList('?pageSize=100')
      .then((data) => setUsers(data.users))
      .catch(() => setUsers([]));
  }

  useEffect(load, []);

  async function handleDelete(user) {
    if (!confirm(`¿Eliminar a "${user.name}"?`)) return;
    await usersApi.adminRemove(user.id);
    load();
  }

  return (
    <div>
      <h1 className="mb-10 font-display text-xl uppercase tracking-wide-caps">Usuarios</h1>

      {users === null ? (
        <p className="text-sm text-mist">Cargando...</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide-caps text-mist">
                <th className="py-3 pr-4 font-normal">Nombre</th>
                <th className="py-3 pr-4 font-normal">Email</th>
                <th className="py-3 pr-4 font-normal">Rol</th>
                <th className="py-3 pr-4 font-normal" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="py-3 pr-4">{user.name}</td>
                  <td className="py-3 pr-4 text-mist">{user.email}</td>
                  <td className="py-3 pr-4">
                    <span className={`text-xs uppercase tracking-wide-caps ${user.role === 'ADMIN' ? 'text-signal-glow' : 'text-mist'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    {user.id !== currentUser?.id && (
                      <button
                        type="button"
                        onClick={() => handleDelete(user)}
                        className="text-xs uppercase tracking-wide-caps text-mist transition hover:text-signal-glow"
                      >
                        Eliminar
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
