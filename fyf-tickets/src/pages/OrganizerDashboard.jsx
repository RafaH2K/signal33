import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { organizationsApi } from '../api/resources.js';
import { clearSession, getUser } from '../auth/auth.js';
import { formatMoney, formatOrganizerDate } from '../lib/format.js';
import './organizer.css';

export default function OrganizerDashboard() {
  const navigate = useNavigate();
  const user = getUser();
  const canManageEvents = user?.role === 'ADMIN' || user?.role === 'STAFF';
  const [organizations, setOrganizations] = useState([]);
  const [organization, setOrganization] = useState(null);
  const [events, setEvents] = useState([]);
  const [reservations, setReservations] = useState([]);
  const [orgName, setOrgName] = useState('');
  const emptyEventForm = { title: '', description: '', venue: '', eventDate: '', ticketTypes: [{ name: 'General', price: '0', capacity: '' }] };
  const [eventForm, setEventForm] = useState(emptyEventForm);
  const [editingEventId, setEditingEventId] = useState(null);
  const [ticketCode, setTicketCode] = useState('');
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [coverFile, setCoverFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');
  const videoRef = useRef(null);

  const reload = useCallback(async orgId => {
    const [nextEvents, nextReservations] = await Promise.all([
      organizationsApi.events(orgId), organizationsApi.reservations(orgId),
    ]);
    setEvents(nextEvents || []);
    setReservations(nextReservations || []);
  }, []);

  useEffect(() => {
    organizationsApi.mine().then(list => {
      setOrganizations(list || []);
      setOrganization(list?.[0] || null);
    }).catch(err => setError(err.message || 'No pudimos cargar tu espacio.'))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!organization) { setEvents([]); setReservations([]); return; }
    setLoading(true);
    reload(organization.id).catch(err => setError(err.message || 'No se pudo cargar el panel.'))
      .finally(() => setLoading(false));
  }, [organization, reload]);

  async function createOrganization(event) {
    event.preventDefault(); setError(''); setNotice('');
    try {
      const created = await organizationsApi.create(orgName);
      const next = [...organizations, created];
      setOrganizations(next); setOrgName(''); setOrganization(created);
      setNotice('Tu espacio de organización está listo.');
    } catch (err) { setError(err.message || 'No se pudo crear la organización.'); }
  }

  async function createEvent(event) {
    event.preventDefault(); setError(''); setNotice('');
    const wasEditing = Boolean(editingEventId);
    try {
      let coverImageUrl;
      if (coverFile) coverImageUrl = (await organizationsApi.uploadCover(organization.id, coverFile)).url;
      const data = {
        title: eventForm.title.trim(), description: eventForm.description.trim(), venue: eventForm.venue.trim(),
        eventDate: new Date(eventForm.eventDate).toISOString(),
        ...(coverImageUrl ? { coverImageUrl } : {}),
        ticketTypes: eventForm.ticketTypes.map(type => ({
          ...(type.id ? { id: type.id } : {}),
          name: type.name.trim(),
          price: Number(type.price),
          capacity: type.capacity === '' ? null : Number(type.capacity),
        })),
      };
      if (editingEventId) {
        await organizationsApi.updateEvent(organization.id, editingEventId, data);
      } else {
        await organizationsApi.createEvent(organization.id, { ...data, reservationsEnabled: true, isActive: true, maxAccessesPerPerson: 2 });
      }
      if (coverPreview) URL.revokeObjectURL(coverPreview);
      setCoverFile(null); setCoverPreview('');
      const coverInput = document.querySelector('.event-cover-field input');
      if (coverInput) coverInput.value = '';
      setEditingEventId(null);
      setEventForm(emptyEventForm);
      await reload(organization.id); setNotice(wasEditing ? 'Cambios guardados.' : 'Evento publicado en el catálogo.');
    } catch (err) { setError(err.message || (wasEditing ? 'No se pudo actualizar el evento.' : 'No se pudo crear el evento.')); }
  }

  function startEditingEvent(item) {
    const eventDate = new Date(item.event_date);
    const localDate = new Date(eventDate.getTime() - eventDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
    setEditingEventId(item.id);
    const plans = item.ticket_types?.length ? item.ticket_types : [{
      name: 'General', price: item.price_general ?? 0, capacity: item.capacity_general,
    }];
    setEventForm({
      title: item.title || '', description: item.description || '', venue: item.venue || '', eventDate: localDate,
      ticketTypes: plans.map(type => ({
        id: type.id, name: type.name, price: String(type.price ?? 0),
        capacity: type.capacity == null ? '' : String(type.capacity),
      })),
    });
    setCoverFile(null);
    setCoverPreview(item.cover_image_url || '');
    setError(''); setNotice('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function cancelEditingEvent() {
    if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview);
    setEditingEventId(null);
    setCoverFile(null); setCoverPreview('');
    setEventForm(emptyEventForm);
    const coverInput = document.querySelector('.event-cover-field input');
    if (coverInput) coverInput.value = '';
  }

  function updateTicketType(index, field, value) {
    setEventForm(current => ({
      ...current,
      ticketTypes: current.ticketTypes.map((type, typeIndex) =>
        typeIndex === index ? { ...type, [field]: value } : type
      ),
    }));
  }

  function addTicketType() {
    if (eventForm.ticketTypes.length >= 20) return;
    setEventForm(current => ({
      ...current,
      ticketTypes: [...current.ticketTypes, { name: '', price: '', capacity: '' }],
    }));
  }

  function removeTicketType(index) {
    setEventForm(current => ({
      ...current,
      ticketTypes: current.ticketTypes.filter((_, typeIndex) => typeIndex !== index),
    }));
  }

  async function removeEvent(item) {
    if (!window.confirm(`¿Eliminar “${item.title}”? El evento dejará de aparecer en la tienda.`)) return;
    setError(''); setNotice('');
    try {
      await organizationsApi.deleteEvent(organization.id, item.id);
      if (editingEventId === item.id) cancelEditingEvent();
      await reload(organization.id);
      setNotice('Evento eliminado de la tienda.');
    } catch (err) { setError(err.message || 'No se pudo eliminar el evento.'); }
  }

  async function markPaid(reservation) {
    setError(''); setNotice('');
    try {
      await organizationsApi.setPaid(organization.id, reservation.id, !reservation.is_paid);
      await reload(organization.id); setNotice(reservation.is_paid ? 'Pago actualizado.' : 'Pago registrado en taquilla.');
    } catch (err) { setError(err.message || 'No se pudo actualizar el pago.'); }
  }

  async function toggleEvent(eventItem) {
    setError(''); setNotice('');
    try {
      await organizationsApi.updateEvent(organization.id, eventItem.id, { isActive: !eventItem.is_active });
      await reload(organization.id);
      setNotice(eventItem.is_active ? 'Evento pausado; ya no aparece en la tienda.' : 'Evento publicado en la tienda.');
    } catch (err) { setError(err.message || 'No se pudo actualizar el evento.'); }
  }

  const validateTicket = useCallback(async code => {
    setError(''); setNotice('');
    try {
      const result = await organizationsApi.checkIn(organization.id, code.trim());
      setTicketCode(''); setNotice(`Acceso validado para ${result.full_name}.`);
      await reload(organization.id);
    } catch (err) { setError(err.message || 'No se pudo validar el boleto.'); }
  }, [organization, reload]);

  async function checkIn(event) {
    event.preventDefault();
    await validateTicket(ticketCode);
  }

  useEffect(() => {
    if (!scannerOpen) return undefined;
    let cancelled = false;
    let frameId;
    let detector;
    let cameraStream;
    const video = videoRef.current;
    async function startScanner() {
      try {
        if (!('BarcodeDetector' in window)) throw new Error('Este navegador no ofrece lectura QR. Ingresa el código manualmente.');
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('No se pudo acceder a la cámara. Ingresa el código manualmente.');
        detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (cancelled) { cameraStream.getTracks().forEach(track => track.stop()); return; }
        if (!video) return;
        video.srcObject = cameraStream;
        await video.play();
        const scan = async () => {
          if (cancelled) return;
          if (!videoRef.current || videoRef.current.readyState < 2) { frameId = requestAnimationFrame(scan); return; }
          try {
            const [result] = await detector.detect(videoRef.current);
            if (result?.rawValue) {
              const raw = result.rawValue.trim();
              let code = raw;
              try { code = new URL(raw).pathname.match(/\/boletos\/validar\/([^/]+)\/?$/i)?.[1] || raw; } catch { /* QR de código directo */ }
              code = decodeURIComponent(code).toUpperCase();
              if (/^[2-9A-Z]{16}$/.test(code)) {
                setScannerOpen(false);
                await validateTicket(code);
                return;
              }
              setScannerError('El QR no contiene un código de boleto válido.');
            }
          } catch { setScannerError('No se pudo leer el QR. Mantén el código dentro de la cámara.'); }
          if (!cancelled) frameId = requestAnimationFrame(scan);
        };
        frameId = requestAnimationFrame(scan);
      } catch (err) { if (!cancelled) setScannerError(err.message || 'No se pudo iniciar la cámara.'); }
    }
    startScanner();
    return () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
      cameraStream?.getTracks().forEach(track => track.stop());
      if (video) video.srcObject = null;
    };
  }, [scannerOpen, validateTicket]);

  useEffect(() => () => { if (coverPreview) URL.revokeObjectURL(coverPreview); }, [coverPreview]);

  function logout() { clearSession(); navigate('/login', { replace: true }); }

  return <main className="organizer-page">
    <header className="organizer-header">
      <Link to="/" className="brand"><span className="brand__mark">FYF</span><span className="brand__name">TICKETS</span></Link>
      <div className="organizer-user"><span>{user?.name || 'Organizador'}</span><button onClick={logout}>Salir</button></div>
    </header>
    <div className="organizer-shell">
      <div className="organizer-welcome"><div><span className="section-eyebrow">CENTRO DE ORGANIZACIÓN</span><h1>Tu operación,<br />en un solo lugar.</h1></div>
        {organizations.length > 1 && <select aria-label="Organización" value={organization?.id || ''} onChange={e => setOrganization(organizations.find(org => org.id === e.target.value))}>{organizations.map(org => <option key={org.id} value={org.id}>{org.name}</option>)}</select>}
      </div>
      {organization && <Link className="dashboard-store-link" to={`/organizacion/${organization.slug}`}>Ver tienda pública ↗</Link>}
      {error && <div className="dashboard-alert dashboard-alert--error" role="alert">{error}<button onClick={() => setError('')}>Cerrar</button></div>}
      {notice && <div className="dashboard-alert" role="status">{notice}<button onClick={() => setNotice('')}>Cerrar</button></div>}
      {loading ? <p className="dashboard-loading">Cargando tu espacio…</p> : !organization ? <section className="dashboard-panel dashboard-empty"><span className="section-eyebrow">PRIMER PASO</span><h2>Crea el espacio de tu organización.</h2><p>Desde aquí vas a publicar eventos, consultar reservas y registrar pagos en taquilla.</p><form className="dashboard-form dashboard-form--inline" onSubmit={createOrganization}><label>Nombre de la organización<input required minLength={2} value={orgName} onChange={e => setOrgName(e.target.value)} placeholder="Ej. Find Your Frequency" /></label><button className="dashboard-button">Crear espacio</button></form></section> : <>
        <section className="dashboard-stats">
          <article><span>Eventos</span><strong>{events.length}</strong></article>
          <article><span>Reservas activas</span><strong>{reservations.length}</strong></article>
          <article><span>Pagos pendientes</span><strong>{reservations.filter(r => !r.is_paid).length}</strong></article>
          <article><span>Espacio</span><strong className="dashboard-org-name">{organization.name}</strong></article>
        </section>
        <div className="dashboard-columns">
          {canManageEvents && <section className="dashboard-panel" id="event-editor"><span className="section-eyebrow">{editingEventId ? 'ACTUALIZA TU EVENTO' : 'PUBLICA UNA FECHA'}</span><h2>{editingEventId ? 'Editar evento' : 'Nuevo evento'}</h2><form className="dashboard-form" onSubmit={createEvent}>
            <label>Nombre del evento<input required minLength={2} value={eventForm.title} onChange={e => setEventForm({ ...eventForm, title: e.target.value })} placeholder="Nombre del evento" /></label>
            <label>Descripción<textarea rows="3" maxLength="2000" value={eventForm.description} onChange={e => setEventForm({ ...eventForm, description: e.target.value })} placeholder="Detalles para quienes asistirán" /></label>
            <label>Lugar<input required minLength={2} value={eventForm.venue} onChange={e => setEventForm({ ...eventForm, venue: e.target.value })} placeholder="Foro o recinto" /></label>
            <label className="event-cover-field">Imagen de portada<input type="file" accept="image/jpeg,image/png,image/webp,image/gif" onChange={e => { const file = e.target.files?.[0] || null; if (coverPreview) URL.revokeObjectURL(coverPreview); setCoverFile(file); setCoverPreview(file ? URL.createObjectURL(file) : ''); }} /><small>JPG, PNG, WebP o GIF. Máximo 25 MB.</small>{coverPreview && <img className="event-cover-preview" src={coverPreview} alt="Vista previa de portada" />}</label>
            <label>Fecha y hora<input required type="datetime-local" value={eventForm.eventDate} onChange={e => setEventForm({ ...eventForm, eventDate: e.target.value })} /></label>
            <section className="ticket-plans" aria-label="Planes de boletos">
              <div className="ticket-plans__heading"><strong>Precios y boletos</strong><span>Configura el nombre, precio y cupo de cada plan.</span></div>
              {eventForm.ticketTypes.map((type, index) => <fieldset className="ticket-plan-editor" key={type.id || `plan-${index}`}>
                <legend>{index === 0 ? 'Precio general' : `Plan ${index + 1}`}</legend>
                <label>Nombre del plan<input required minLength={2} maxLength={80} value={type.name} onChange={e => updateTicketType(index, 'name', e.target.value)} placeholder="Ej. VIP" /></label>
                <div className="dashboard-form-row">
                  <label>Precio<input required type="number" min="0" max="1000000" step="0.01" value={type.price} onChange={e => updateTicketType(index, 'price', e.target.value)} /></label>
                  <label>Boletos disponibles<input type="number" min="0" value={type.capacity} onChange={e => updateTicketType(index, 'capacity', e.target.value)} placeholder="Sin límite" /><small>Déjalo vacío para no limitar el cupo.</small></label>
                </div>
                {index > 0 && <button type="button" className="payment-action payment-action--danger" onClick={() => removeTicketType(index)}>Quitar plan</button>}
              </fieldset>)}
              <button type="button" className="payment-action add-ticket-plan" onClick={addTicketType} disabled={eventForm.ticketTypes.length >= 20}>+ Añadir otro precio</button>
            </section>
            <div className="event-editor-actions"><button className="dashboard-button">{editingEventId ? 'Guardar cambios' : 'Publicar evento'}</button>{editingEventId && <button type="button" className="payment-action" onClick={cancelEditingEvent}>Cancelar edición</button>}</div>
          </form></section>}
          <section className="dashboard-panel dashboard-event-panel"><div className="dashboard-panel-heading"><div><span className="section-eyebrow">TU AGENDA</span><h2>Eventos publicados</h2></div></div>
            {events.length ? <div className="dashboard-events">{events.map(item => <article key={item.id}><div><strong>{item.title}</strong><span>{formatOrganizerDate(item.event_date)} · {item.venue}</span></div><span className={`event-status ${item.is_active ? '' : 'event-status--off'}`}>{item.is_active ? 'Publicado' : 'Pausado'}</span>{canManageEvents && <div className="dashboard-event-actions"><button className="payment-action" onClick={() => startEditingEvent(item)}>Editar</button><button className="payment-action" onClick={() => toggleEvent(item)}>{item.is_active ? 'Pausar' : 'Activar'}</button><button className="payment-action payment-action--danger" onClick={() => removeEvent(item)}>Eliminar</button></div>}</article>)}</div> : <p className="dashboard-muted">Todavía no hay eventos. Crea el primero desde este panel.</p>}
          </section>
        </div>
        <section className="dashboard-panel dashboard-reservations"><div className="dashboard-panel-heading"><div><span className="section-eyebrow">TAQUILLA</span><h2>Reservas</h2></div><span className="dashboard-count">{reservations.length} activas</span></div>
          {reservations.length ? <div className="reservation-table"><div className="reservation-table-head"><span>Asistente</span><span>Evento y acceso</span><span>Total</span><span>Pago</span><span /></div>{reservations.map(r => <article key={r.id} className="reservation-row"><div><strong>{r.full_name}</strong><small>{r.email} · {r.tracking_code}</small></div><div><strong>{r.event_title}</strong><small>{r.quantity} × {r.ticket_type_name || (r.access_type === 'OPEN_BAR' ? 'Barra libre' : 'General')} · {r.checked_in}/{r.ticket_count} ingresaron</small></div><strong>{formatMoney(r.amount_due)}</strong><span className={`payment-pill ${r.is_paid ? 'payment-pill--paid' : ''}`}>{r.is_paid ? 'Pagado' : 'Pendiente'}</span><button className="payment-action" onClick={() => markPaid(r)}>{r.is_paid ? 'Deshacer' : 'Registrar pago'}</button></article>)}</div> : <p className="dashboard-muted">Las nuevas reservas aparecerán aquí. El pago se registra en taquilla.</p>}
        </section>
        <section className="dashboard-panel checkin-panel"><div><span className="section-eyebrow">ACCESO AL EVENTO</span><h2>Validar un boleto</h2><p>Confirma que el boleto esté pagado y registra su entrada.</p></div><div className="checkin-tools"><button type="button" className="payment-action scanner-toggle" onClick={() => { setScannerError(''); setScannerOpen(value => !value); }}>{scannerOpen ? 'Cerrar cámara' : 'Escanear QR'}</button><form className="dashboard-form--inline" onSubmit={checkIn}><input required value={ticketCode} onChange={e => setTicketCode(e.target.value)} placeholder="Código del boleto" aria-label="Código del boleto" /><button className="dashboard-button">Validar acceso</button></form>{scannerOpen && <div className="qr-scanner"><video ref={videoRef} autoPlay muted playsInline aria-label="Cámara para escanear el boleto" />{scannerError && <p role="status">{scannerError}</p>}</div>}</div></section>
      </>}
    </div>
  </main>;
}
