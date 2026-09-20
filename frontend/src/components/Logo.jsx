// Logo oficial (blanco, para fondo oscuro). 'vertical' incluye el eslogan.
const VARIANTS = {
  horizontal: { src: '/brand/signal33-horizontal-blanco.png', width: 1200, height: 200, size: 'h-6' },
  vertical: { src: '/brand/signal33-vertical-eslogan-blanco.png', width: 1200, height: 739, size: 'h-28' },
};

export default function Logo({ variant = 'horizontal', className = '' }) {
  const { src, width, height, size } = VARIANTS[variant];
  return <img src={src} width={width} height={height} alt="Signal33" className={`w-auto ${size} ${className}`} />;
}
