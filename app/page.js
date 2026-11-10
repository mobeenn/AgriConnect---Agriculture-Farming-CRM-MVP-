import { redirect } from 'next/navigation';
import { currentActor } from '@/lib/guard.js';

export const dynamic = 'force-dynamic';

export default function Home() {
  const actor = currentActor();
  redirect(actor ? `/${actor.role}/dashboard` : '/login');
}
