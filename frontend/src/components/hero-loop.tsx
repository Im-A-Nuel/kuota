// Glossy figure-eight in place of the reference's 3D object. It stands for the kuota loop:
// a provider sells capacity, an agent spends it, the spent token is burned. Pure SVG, no
// image asset, decorative only (the copy around it carries the meaning).

const LOOP =
  "M120 160 C120 52 300 52 400 160 C500 268 680 268 680 160 C680 52 500 52 400 160 C300 268 120 268 120 160 Z";

export function HeroLoop() {
  return (
    <svg viewBox="0 0 800 320" className="h-auto w-full" aria-hidden="true">
      <defs>
        <linearGradient id="loop-metal" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" />
          <stop offset="0.45" stopColor="#dfe2ee" />
          <stop offset="0.75" stopColor="#a7adc6" />
          <stop offset="1" stopColor="#eef0f8" />
        </linearGradient>
        <linearGradient id="loop-blue" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#8a9bff" stopOpacity="0" />
          <stop offset="0.35" stopColor="#2340ff" />
          <stop offset="0.7" stopColor="#6d5bff" />
          <stop offset="1" stopColor="#8a9bff" stopOpacity="0" />
        </linearGradient>
        <filter id="loop-soft" x="-20%" y="-50%" width="140%" height="200%">
          <feGaussianBlur stdDeviation="3" />
        </filter>
        <filter id="loop-shadow" x="-20%" y="-100%" width="140%" height="300%">
          <feGaussianBlur stdDeviation="14" />
        </filter>
      </defs>

      <ellipse cx="400" cy="292" rx="260" ry="14" fill="#0e1330" opacity="0.18" filter="url(#loop-shadow)" />

      {/* Tube: dark rim, metal body, then a soft top highlight. */}
      <path d={LOOP} fill="none" stroke="#8b91ad" strokeWidth="50" strokeLinejoin="round" />
      <path d={LOOP} fill="none" stroke="url(#loop-metal)" strokeWidth="44" strokeLinejoin="round" />
      <path
        d={LOOP}
        fill="none"
        stroke="url(#loop-blue)"
        strokeWidth="16"
        strokeLinecap="round"
        strokeDasharray="520 900"
        strokeDashoffset="-80"
        filter="url(#loop-soft)"
      />
      <path
        d={LOOP}
        fill="none"
        stroke="#ffffff"
        strokeOpacity="0.85"
        strokeWidth="6"
        strokeLinecap="round"
        strokeDasharray="160 260"
        transform="translate(0 -12)"
        filter="url(#loop-soft)"
      />
    </svg>
  );
}
