import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { currentActor } from '@/lib/guard.js';

export const dynamic = 'force-dynamic';

export default function Unauthorized() {
  const actor = currentActor();
  return (
    <main className="flex min-h-screen items-center justify-center bg-cream p-6">
      <div className="max-w-md rounded-2xl border border-sage bg-white p-8 text-center shadow-soft">
        <ShieldAlert className="mx-auto h-10 w-10 text-earth" />
        <h1 className="mt-4 font-display text-2xl font-semibold text-forest">Access denied</h1>
        <p className="mt-2 text-sm text-muted">Your account does not have permission to open that page.</p>
        <Link href={actor ? `/${actor.role}/dashboard` : '/login'} className="mt-6 inline-block rounded-lg bg-leaf px-4 py-2 text-sm font-medium text-white hover:bg-forest">
          {actor ? 'Go to my dashboard' : 'Sign in'}
        </Link>
      </div>
    </main>
  );
}
