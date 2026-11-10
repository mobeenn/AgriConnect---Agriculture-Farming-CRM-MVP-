import { guard } from '@/lib/guard.js';
import AppShell from '@/components/AppShell.jsx';

export const dynamic = 'force-dynamic';

export default function SupplierLayout({ children }) {
  const actor = guard('supplier');
  return <AppShell role="supplier" user={{ name: actor.name, refId: actor.refId, email: actor.email }}>{children}</AppShell>;
}
