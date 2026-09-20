import Logo from '../Logo.jsx';

const SOCIALS = [
  { slug: 'soundcloud', label: 'SoundCloud', href: 'https://on.soundcloud.com/DE2a6pEuFymCy0tfZc' },
  { slug: 'youtube', label: 'YouTube', href: 'https://www.youtube.com/@Sign4l-33' },
  { slug: 'instagram', label: 'Instagram', href: 'https://www.instagram.com/dj.signal33' },
  { slug: 'tiktok', label: 'TikTok', href: 'https://www.tiktok.com/@dj_signal33' },
  { slug: 'linktree', label: 'Linktree', href: 'https://linktr.ee/Signal.33' },
];

export default function Footer() {
  return (
    <footer className="border-t border-line px-6 py-16">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-10 text-center">
        <Logo variant="vertical" />

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

        <a href="mailto:signal-33@findyourfrequency.com.mx" className="text-sm text-mist transition hover:text-paper">
          signal-33@findyourfrequency.com.mx
        </a>

        <p className="text-xs text-mist-dim">© {new Date().getFullYear()} signal33. Todos los derechos reservados.</p>
      </div>
    </footer>
  );
}
