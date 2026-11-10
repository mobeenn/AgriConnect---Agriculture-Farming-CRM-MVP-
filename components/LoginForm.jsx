'use client';
import { useState } from 'react';
import { Sprout, ShieldCheck, Handshake, Loader2 } from 'lucide-react';
import { api } from '@/lib/client-api.js';
import { FieldScene, Leaf } from '@/components/Illustrations.jsx';

const DEMOS = [
  { role: 'Admin', email: 'admin@agriconnect.com', password: 'Admin123' },
  { role: 'Buyer', email: 'buyer@agriconnect.com', password: 'Buyer123' },
  { role: 'Supplier', email: 'supplier@agriconnect.com', password: 'Supplier123' },
];

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const { data } = await api('/api/auth/login', { method: 'POST', body: { email, password } });
      window.location.href = `/${data.role}/dashboard`;
    } catch (err) { setError(err.message); setBusy(false); }
  }

  return (
    <main className="grid min-h-screen gap-4 bg-cream p-3 lg:grid-cols-[1.15fr_1fr] lg:p-4">
      <section className="relative hidden flex-col justify-between overflow-hidden rounded-[32px] bg-gradient-to-br from-[#FFF7DC] via-[#EAF1DB] to-sage p-12 shadow-soft lg:flex">
        <FieldScene className="absolute inset-x-0 bottom-0 h-[52%] w-full" />
        <Leaf className="absolute -right-6 top-16 h-40 w-40 rotate-12 animate-float-slow text-fresh/25" />
        <div className="relative flex items-center gap-3 font-display text-xl font-semibold text-forest"><span className="grid h-11 w-11 place-items-center rounded-2xl bg-forest text-harvest shadow-md"><Sprout className="h-6 w-6" /></span>AgriConnect</div>
        <div className="relative max-w-lg animate-fade-up">
          <h1 className="font-display text-5xl font-semibold leading-[1.08] text-forest">Trade seed to harvest, without exposing who you buy from.</h1>
          <p className="mt-5 max-w-md text-base leading-relaxed text-forest/75">Buyers and suppliers meet through anonymous references. Requests, quotations and deliveries run on the platform, so relationships stay protected.</p>
          <ul className="mt-6 space-y-3 text-sm text-forest">
            <li className="flex w-fit items-center gap-3 rounded-2xl bg-white/70 px-4 py-2 backdrop-blur"><ShieldCheck className="h-5 w-5 text-leaf" />Identities stay hidden on both sides.</li>
            <li className="flex w-fit items-center gap-3 rounded-2xl bg-white/70 px-4 py-2 backdrop-blur"><Handshake className="h-5 w-5 text-leaf" />Request, quote, accept and track in one place.</li>
          </ul>
        </div>
        <div />
      </section>
      <section className="flex items-center justify-center p-4 sm:p-10">
        <div className="w-full max-w-sm animate-pop-in rounded-[28px] bg-white p-7 shadow-lift ring-1 ring-sage/60">
          <div className="mb-8 flex items-center gap-2 font-display text-xl font-semibold text-forest lg:hidden"><Sprout className="h-6 w-6 text-leaf" />AgriConnect</div>
          <h2 className="font-display text-3xl font-semibold text-forest">Sign in</h2>
          <p className="mt-1 text-sm text-muted">Use your AgriConnect account to continue.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <label className="block text-sm font-medium">Email
              <input type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1 w-full rounded-xl border border-sage bg-white px-3 py-2.5 text-sm focus:border-leaf focus:outline-none focus:ring-2 focus:ring-fresh/40" />
            </label>
            <label className="block text-sm font-medium">Password
              <input type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full rounded-xl border border-sage bg-white px-3 py-2.5 text-sm focus:border-leaf focus:outline-none focus:ring-2 focus:ring-fresh/40" />
            </label>
            {error && <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800">{error}</p>}
            <button disabled={busy} className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-b from-[#4A8656] to-leaf py-2.5 text-sm font-semibold text-white shadow-sm transition hover:to-forest active:scale-[0.98] disabled:opacity-60">
              {busy && <Loader2 className="h-4 w-4 animate-spin" />}Sign in
            </button>
          </form>
          <div className="mt-6 rounded-2xl border border-sage/70 bg-cream p-4">
            <p className="text-sm font-medium text-forest">Demo accounts</p>
            <p className="mb-3 text-xs text-muted">Select one to fill the form.</p>
            <div className="grid gap-2">
              {DEMOS.map((d) => (
                <button key={d.role} type="button" onClick={() => { setEmail(d.email); setPassword(d.password); }}
                  className="flex items-center justify-between rounded-xl border border-sage/80 bg-white px-3 py-2 text-left text-xs transition hover:-translate-y-0.5 hover:bg-sage/40">
                  <span className="font-semibold text-forest">{d.role}</span><span className="text-muted">{d.email}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
