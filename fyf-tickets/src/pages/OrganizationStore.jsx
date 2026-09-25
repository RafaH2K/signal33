import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { organizationsApi } from '../api/resources.js';

export default function OrganizationStore() {
  const { slug } = useParams();
  const [store, setStore] = useState(null);
  const [error, setError] = useState('');
  useEffect(() => { organizationsApi.publicEvents(slug).then(setStore).catch(err => setError(err.message || 'No encontramos esta organización.')); }, [slug]);
  if (error) return <main className="lookup-page"><Link to="/" className="brand">FYF TICKETS</Link><section className="lookup-card"><h1>Organización no encontrada</h1><p>{error}</p><Link to="/">Volver al catálogo</Link></section></main>;
  if (!store) return <main className="lookup-page"><p className="lookup-loading">Cargando eventos…</p></main>;
  return <div className="fyf-home"><header className="site-header"><Link to="/" className="brand"><span className="brand__mark">FYF</span><span className="brand__name">TICKETS</span></Link><Link to="/" className="header-action">Todos los eventos</Link></header><main><section className="hero"><div className="hero__eyebrow"><span className="hero__dot"/>ORGANIZADOR</div><h1>{store.organization.name}</h1><p className="hero__description">Próximas experiencias y eventos.</p></section><section className="events-section"><div className="section-heading"><div><span className="section-eyebrow">AGENDA</span><h2>Próximos eventos</h2></div></div>{store.events.length ? <div className="events-grid">{store.events.map(event => <Link key={event.id} to={`/evento/${event.id}`} className="event-card"><div className="event-card__image">{event.cover_image_url ? <img src={event.cover_image_url} alt={event.title} loading="lazy"/> : <div className="event-card__placeholder"><span>FYF</span></div>}</div><div className="event-card__content"><div className="event-card__meta">{new Intl.DateTimeFormat('es-MX',{dateStyle:'medium',timeStyle:'short'}).format(new Date(event.event_date))}</div><h3>{event.title}</h3><p className="event-card__venue">{event.venue}</p><span className="event-card__link">Ver evento →</span></div></Link>)}</div> : <div className="events-state"><h3>Aún no hay eventos publicados.</h3><p>Vuelve pronto para descubrir nuevas fechas.</p></div>}</section></main></div>;
}
