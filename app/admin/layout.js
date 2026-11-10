import { guard } from '@/lib/guard.js';
import AppShell from '@/components/AppShell.jsx';

export const dynamic = 'force-dynamic';

export default function AdminLayout({ children }) {
  const actor = guard('admin');
  return <AppShell role="admin" user={{ name: actor.name, refId: actor.refId, email: actor.email }}>{children}</AppShell>;
}
