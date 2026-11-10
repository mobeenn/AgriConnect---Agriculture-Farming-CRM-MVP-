'use client';
import { useApi } from '@/components/hooks.js';
import { Card, Spinner, ErrorState, PageHeader, EntityForm } from '@/components/ui.jsx';
import { useToast } from '@/components/Toast.jsx';
import { api } from '@/lib/client-api.js';

export default function SettingsPage() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi('/api/settings');
  const { data: cats } = useApi('/api/categories');
  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  return (
    <>
      <PageHeader title="Settings" subtitle="Platform-wide defaults." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-forest">Platform</h2>
          <EntityForm key={JSON.stringify(data)} initial={data} submitLabel="Save settings"
            fields={[{ name: 'platformName', label: 'Platform name', required: true }, { name: 'supportEmail', label: 'Support email', type: 'email', required: true }, { name: 'lowStockDefault', label: 'Default low-stock threshold', type: 'number', required: true, hint: 'Used for new products without their own threshold.' }]}
            onSubmit={async (v) => { await api('/api/settings', { method: 'PUT', body: v }); toast('Settings saved'); reload(); }} />
        </Card>
        <Card className="p-5">
          <h2 className="mb-3 font-display text-lg font-semibold text-forest">Product categories</h2>
          <ul className="space-y-2">{(cats || []).map((c) => <li key={c.id} className="flex items-center gap-3 text-sm"><img src={c.image} alt="" className="h-8 w-12 rounded object-cover" />{c.name}</li>)}</ul>
          <p className="mt-4 text-xs text-muted">Currency: {data.defaultCurrency}. To restore the demo data, run <code className="rounded bg-cream px-1">npm run reset-db</code>.</p>
        </Card>
      </div>
    </>
  );
}
