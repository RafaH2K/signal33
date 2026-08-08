import { useEffect, useState } from 'react';
import { productsApi } from '../../api/resources.js';
import Field from '../../components/Field.jsx';
import Modal from '../../components/admin/Modal.jsx';
import ImageUploadField from '../../components/admin/ImageUploadField.jsx';

const EMPTY_FORM = { name: '', description: '', price: '', stock: '', imageUrl: '', isActive: true };

export default function AdminProducts() {
  const [products, setProducts] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function load() {
    productsApi
      .list('?includeInactive=true&pageSize=100')
      .then((data) => setProducts(data.products))
      .catch(() => setProducts([]));
  }

  useEffect(load, []);

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setError('');
    setModalOpen(true);
  }

  function openEdit(product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      description: product.description ?? '',
      price: product.price,
      stock: product.stock,
      imageUrl: product.image_url ?? '',
      isActive: product.is_active,
    });
    setError('');
    setModalOpen(true);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSaving(true);
    const payload = {
      name: form.name,
      description: form.description || undefined,
      price: Number(form.price),
      stock: Number(form.stock),
      imageUrl: form.imageUrl || undefined,
      isActive: form.isActive,
    };
    try {
      if (editingId) await productsApi.update(editingId, payload);
      else await productsApi.create(payload);
      setModalOpen(false);
      load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(product) {
    await productsApi.update(product.id, { isActive: !product.is_active });
    load();
  }

  async function handleDelete(product) {
    if (!confirm(`¿Eliminar "${product.name}"?`)) return;
    await productsApi.remove(product.id);
    load();
  }

  return (
    <div>
      <div className="mb-10 flex items-center justify-between">
        <h1 className="font-display text-xl uppercase tracking-wide-caps">Productos</h1>
        <button
          type="button"
          onClick={openCreate}
          className="bg-paper px-5 py-2.5 font-display text-xs uppercase tracking-wide-caps text-ink transition hover:opacity-90"
        >
          Nuevo producto
        </button>
      </div>

      {products === null ? (
        <p className="text-sm text-mist">Cargando...</p>
      ) : products.length === 0 ? (
        <p className="text-sm text-mist">Todavía no hay productos.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <thead>
              <tr className="border-b border-line text-xs uppercase tracking-wide-caps text-mist">
                <th className="py-3 pr-4 font-normal">Producto</th>
                <th className="py-3 pr-4 font-normal">Precio</th>
                <th className="py-3 pr-4 font-normal">Stock</th>
                <th className="py-3 pr-4 font-normal">Estado</th>
                <th className="py-3 pr-4 font-normal" />
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-10 shrink-0 overflow-hidden bg-white/5">
                        {product.image_url && (
                          <img src={product.image_url} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      {product.name}
                    </div>
                  </td>
                  <td className="py-3 pr-4 font-mono">${product.price}</td>
                  <td className="py-3 pr-4 font-mono">{product.stock}</td>
                  <td className="py-3 pr-4">
                    <button
                      type="button"
                      onClick={() => toggleActive(product)}
                      className={`text-xs uppercase tracking-wide-caps transition ${
                        product.is_active ? 'text-signal-glow' : 'text-mist-dim'
                      }`}
                    >
                      {product.is_active ? 'Activo' : 'Inactivo'}
                    </button>
                  </td>
                  <td className="py-3 pr-4 text-right">
                    <button type="button" onClick={() => openEdit(product)} className="mr-4 text-xs uppercase tracking-wide-caps text-mist transition hover:text-paper">
                      Editar
                    </button>
                    <button type="button" onClick={() => handleDelete(product)} className="text-xs uppercase tracking-wide-caps text-mist transition hover:text-signal-glow">
                      Eliminar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modalOpen} title={editingId ? 'Editar producto' : 'Nuevo producto'} onClose={() => setModalOpen(false)}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label="Nombre" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          <Field
            label="Descripción"
            textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Precio"
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
              required
            />
            <Field
              label="Stock"
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
              required
            />
          </div>
          <ImageUploadField label="Imagen" value={form.imageUrl} onChange={(url) => setForm({ ...form, imageUrl: url })} />
          <label className="flex items-center gap-2 text-xs uppercase tracking-wide-caps text-mist">
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
            />
            Activo (visible en la tienda)
          </label>
          {error && <p className="text-xs text-signal-glow">{error}</p>}
          <button
            type="submit"
            disabled={saving}
            className="mt-2 bg-paper py-3.5 font-display text-sm uppercase tracking-wide-caps text-ink transition hover:opacity-90 disabled:opacity-50"
          >
            {saving ? 'Guardando...' : 'Guardar'}
          </button>
        </form>
      </Modal>
    </div>
  );
}
