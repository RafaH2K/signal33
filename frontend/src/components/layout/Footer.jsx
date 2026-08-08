import Logo from '../Logo.jsx';

// TODO: reemplazar "#" por los perfiles reales una vez estén disponibles.
const SOCIALS = [
  { slug: 'spotify', label: 'Spotify', href: '#' },
  { slug: 'applemusic', label: 'Apple Music', href: '#' },
  { slug: 'youtube', label: 'YouTube', href: '#' },
  { slug: 'instagram', label: 'Instagram', href: '#' },
  { slug: 'tiktok', label: 'TikTok', href: '#' },
];

export default function Footer() {
  return (
    <footer className="border-t border-line px-6 py-16">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-10 text-center">
        <Logo />

        <div className="flex items-center gap-6">
          {SOCIALS.map((social) => (
            <a
              key={social.slug}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              aria-label={social.label}
              className="opacity-70 transition hover:opacity-100"
            >
              <img src={`https://cdn.simpleicons.org/${social.slug}/ffffff`} alt="" width={18} height={18} />
            </a>
          ))}
        </div>

        <a href="mailto:contacto@signal33.com" className="text-sm text-mist transition hover:text-paper">
          contacto@signal33.com
        </a>

        <p className="text-xs text-mist-dim">© {new Date().getFullYear()} signal33. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
