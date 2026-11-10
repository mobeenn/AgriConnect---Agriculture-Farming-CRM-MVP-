'use client';
import { ShieldCheck } from 'lucide-react';
import { useApi } from '@/components/hooks.js';
import { Card, Spinner, ErrorState, PageHeader, EntityForm, KeyValue, StatusBadge, Ref } from '@/components/ui.jsx';
import { useToast } from '@/components/Toast.jsx';
import { api, dateOf } from '@/lib/client-api.js';

const LOCATIONS = ['Lahore', 'Faisalabad', 'Multan', 'Sahiwal', 'Islamabad', 'Rawalpindi', 'Bahawalpur', 'Gujranwala'];

export default function ProfilePage({ role }) {
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi('/api/profile');
  if (loading) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const typeLabel = role === 'buyer' ? 'Business type' : 'Supplier category';
  const type = role === 'buyer' ? data.businessType : data.supplierCategory;
  return (
    <>
      <PageHeader title="My profile" subtitle="Keep your business details up to date. Only administrators can see them." />
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <Card className="p-5">
          <h2 className="mb-4 font-display text-lg font-semibold text-forest">Business details</h2>
          <EntityForm key={data.contactPerson + data.phone} initial={data} submitLabel="Save profile"
            fields={[{ name: 'businessName', label: 'Business name', required: true }, { name: 'contactPerson', label: 'Contact person', required: true }, { name: 'phone', label: 'Phone', type: 'tel', required: true }, { name: 'location', label: 'Location', type: 'select', options: LOCATIONS, required: true }]}
            onSubmit={async (v) => { await api('/api/profile', { method: 'PUT', body: v }); toast('Profile saved'); reload(); }} />
        </Card>
        <div className="space-y-4">
          <Card className="p-5">
            <h2 className="mb-4 font-display text-lg font-semibold text-forest">Account</h2>
            <KeyValue items={[['Your public ID', <Ref key="r">{data.id}</Ref>], ['Email', data.email], [typeLabel, type], ['Registered', dateOf(data.registrationDate)], ['Status', <StatusBadge key="s" status={data.status} />]]} />
            <p className="mt-4 text-xs text-muted">Email and account status are managed by an administrator.</p>
          </Card>
          <Card className="flex gap-3 bg-sage/50 p-5 text-sm text-forest"><ShieldCheck className="h-5 w-5 shrink-0" /><p>{role === 'buyer' ? 'Suppliers only ever see your ID' : 'Buyers only ever see your ID'}, <b>{data.id}</b>. Your name, phone, email and address stay private.</p></Card>
        </div>
      </div>
    </>
  );
}
