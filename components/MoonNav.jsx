'use client';
import Link from 'next/link';
import { ChevronDown, Moon } from 'lucide-react';
import { cx } from '@/lib/client-api.js';

// Stars scattered in the upper part of the half-moon (x, y as fractions of the dome box)
const STARS = [[0.18, 0.2, 2.2], [0.3, 0.1, 1.6], [0.42, 0.26, 1.4], [0.58, 0.14, 2], [0.7, 0.3, 1.5], [0.82, 0.18, 2.2], [0.1, 0.45, 1.5], [0.9, 0.5, 1.6]];
const CRATERS = [[0.28, 0.58, 0.07], [0.72, 0.62, 0.09], [0.5, 0.42, 0.045], [0.38, 0.8, 0.05], [0.64, 0.85, 0.04]];

/**
 * Half-moon bottom navigation. Items sit on an arc inside a semicircle.
 * items: [label, slug, Icon]
 */
export default function MoonNav({ role, items, pathname, unread, user, roleLabel, size: R, open, setOpen }) {
  const n = items.length;
  const r = Math.round(R * 0.76);
  const from = 165; const to = 15;
  const step = n > 1 ? (from - to) / (n - 1) : 0;
  const s = Math.min(48, Math.floor(r * ((step * Math.PI) / 180) * 0.84));
  const rad = (d) => (d * Math.PI) / 180;
  const pt = (deg, rr = r) => [R + rr * Math.cos(rad(deg)), R - rr * Math.sin(rad(deg))];
  const [x1, y1] = pt(from); const [x2, y2] = pt(to);
  const [rx1, ry1] = pt(176, R - 4); const [rx2, ry2] = pt(4, R - 4);
  const activeIdx = items.findIndex(([, slug]) => pathname === `/${role}/${slug}` || pathname.startsWith(`/${role}/${slug}/`));
  const active = items[activeIdx];
  const initial = (user.name || '?').trim()[0]?.toUpperCase();

  if (!open) {
    return (
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
        <button onClick={() => setOpen(true)} aria-label="Open navigation menu"
          className="pointer-events-auto relative flex h-16 w-36 animate-moon-rise items-end justify-center overflow-hidden rounded-t-full bg-gradient-to-t from-[#18331F] via-forest to-[#3A7A4C] pb-2 text-sage shadow-lift ring-1 ring-white/10 transition-transform hover:-translate-y-1">
          <span className="absolute left-3 top-3 h-1 w-1 animate-twinkle rounded-full bg-harvest" /><span className="absolute right-6 top-5 h-1 w-1 animate-twinkle rounded-full bg-white" style={{ animationDelay: '1s' }} />
          <span className="flex items-center gap-1.5 text-xs font-medium"><Moon className="h-4 w-4 text-harvest" />Menu</span>
          {unread > 0 && <span className="absolute right-6 top-2 rounded-full bg-harvest px-1.5 text-[10px] font-bold text-ink">{unread}</span>}
        </button>
      </div>
    );
  }

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center">
      <nav aria-label="Main" className="pointer-events-auto relative animate-moon-rise" style={{ width: 2 * R, height: R }}>
        {/* the moon body */}
        <div className="absolute inset-0 overflow-hidden" style={{
          borderRadius: `${R}px ${R}px 0 0`,
          background: 'radial-gradient(120% 120% at 50% 100%, #3F7B50 0%, #2A5B3B 38%, #1B3B26 70%, #112A1A 100%)',
          boxShadow: '0 -14px 60px -10px rgba(36,75,50,.55), inset 0 2px 0 rgba(255,255,255,.16)',
        }}>
          <svg className="absolute inset-0 h-full w-full" viewBox={`0 0 ${2 * R} ${R}`} aria-hidden="true">
            <defs>
              <linearGradient id="mn-rim" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#FBE9A9" stopOpacity=".95" /><stop offset=".5" stopColor="#FBE9A9" stopOpacity=".18" /><stop offset="1" stopColor="#FBE9A9" stopOpacity="0" /></linearGradient>
              <radialGradient id="mn-glow" cx=".1" cy=".6" r=".6"><stop offset="0" stopColor="#F6D77A" stopOpacity=".35" /><stop offset="1" stopColor="#F6D77A" stopOpacity="0" /></radialGradient>
            </defs>
            <rect width={2 * R} height={R} fill="url(#mn-glow)" />
            {CRATERS.map(([cx0, cy0, cr], i) => <circle key={i} cx={cx0 * 2 * R} cy={cy0 * R} r={cr * R} fill="rgba(255,255,255,.045)" stroke="rgba(255,255,255,.08)" />)}
            {STARS.map(([sx, sy, sr], i) => <circle key={i} className="twinkle" cx={sx * 2 * R} cy={sy * R} r={sr} fill="#FFF4CF" style={{ animationDelay: `${i * 0.45}s` }} />)}
            <path d={`M ${rx1} ${ry1} A ${R - 4} ${R - 4} 0 0 1 ${rx2} ${ry2}`} stroke="url(#mn-rim)" strokeWidth="3.5" fill="none" strokeLinecap="round" />
            <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`} stroke="rgba(255,255,255,.18)" strokeWidth="1.5" strokeDasharray="2 7" strokeLinecap="round" fill="none" />
          </svg>

          <div className="absolute inset-x-0 bottom-3 flex flex-col items-center text-center">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-gradient-to-br from-harvest to-[#F3D98B] font-display text-base font-semibold text-forest shadow-md">{initial}</span>
            <p key={active?.[1] || 'none'} className="mt-1.5 max-w-[150px] animate-fade-up truncate font-display text-sm font-semibold leading-tight text-white sm:max-w-[200px] sm:text-lg">{active ? active[0] : 'Menu'}</p>
            <p className="text-[11px] text-sage/70">{user.refId ? `ID ${user.refId}` : roleLabel}</p>
          </div>
        </div>

        {/* items on the arc */}
        {items.map(([label, slug, Icon], i) => {
          const deg = from - i * step;
          const [px, py] = pt(deg);
          const isActive = i === activeIdx;
          return (
            <div key={slug} className="absolute animate-pop-in" style={{ left: px - s / 2, bottom: R - py - s / 2, width: s, height: s, animationDelay: `${0.35 + i * 0.07}s` }}>
              <Link href={`/${role}/${slug}`} aria-label={label} aria-current={isActive ? 'page' : undefined}
                className={cx('group relative grid h-full w-full place-items-center rounded-full transition-all duration-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-harvest',
                  isActive ? 'scale-110 bg-gradient-to-br from-[#F8DE8A] to-harvest text-forest shadow-[0_0_22px_6px_rgba(231,189,88,.55)]'
                    : 'bg-white/10 text-sage ring-1 ring-white/10 hover:-translate-y-1.5 hover:scale-110 hover:bg-white/25 hover:text-white')}>
                <Icon style={{ width: s * 0.42, height: s * 0.42 }} />
                {slug === 'notifications' && unread > 0 && <span className="absolute -right-1 -top-1 grid min-w-[18px] place-items-center rounded-full bg-harvest px-1 text-[10px] font-bold text-ink ring-2 ring-[#1B3B26]">{unread}</span>}
                <span className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-white px-2.5 py-1 text-xs font-medium text-forest opacity-0 shadow-lift transition-all duration-200 group-hover:-top-10 group-hover:opacity-100 group-focus-visible:opacity-100">{label}</span>
              </Link>
            </div>
          );
        })}

        <button onClick={() => setOpen(false)} aria-label="Collapse navigation menu" className="absolute left-1/2 -top-3 grid h-7 w-7 -translate-x-1/2 place-items-center rounded-full bg-white text-forest shadow-lift transition hover:scale-110">
          <ChevronDown className="h-4 w-4" />
        </button>
      </nav>
    </div>
  );
}
