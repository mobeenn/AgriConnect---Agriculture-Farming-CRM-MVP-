import { guard } from '@/lib/guard.js';
import AppShell from '@/components/AppShell.jsx';

export const dynamic = 'force-dynamic';

export default function BuyerLayout({ children }) {
  const actor = guard('buyer');
  return <AppShell role="buyer" user={{ name: actor.name, refId: actor.refId, email: actor.email }}>{children}</AppShell>;
}
