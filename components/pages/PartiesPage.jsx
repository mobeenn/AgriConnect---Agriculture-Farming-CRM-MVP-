'use client';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Eye } from 'lucide-react';
import { useApi, useDebounced } from '@/components/hooks.js';
import { Button, Card, DataTable, FilterBar, SearchInput, Select, Pagination, Modal, ConfirmDialog, EntityForm, PageHeader, StatusBadge, EmptyState, Ref, Spinner, KeyValue } from '@/components/ui.jsx';
import { useToast } from '@/components/Toast.jsx';
import { api, qs, dateOf, money, dateTimeOf } from '@/lib/client-api.js';

const LOCATIONS = ['Lahore', 'Faisalabad', 'Multan', 'Sahiwal', 'Islamabad', 'Rawalpindi', 'Bahawalpur', 'Gujranwala'];
const STATUSES = ['Active', 'Inactive', 'Suspended'];
const BUYER_TYPES = ['Retail Chain', 'Commercial Farm', 'Feed Mill', 'Dairy Cooperative', 'Agri Retailer', 'Orchard', 'Growers Association', 'Poultry Farm', 'Other'];
const SUPPLIER_CATS = ['Seeds', 'Fertilizers', 'Pesticides', 'Agricultural Machinery', 'Irrigation Equipment', 'Grains & Crops', 'Fruits & Vegetables', 'Animal Feed'];

const CFG = {
  buyer: { path: '/api/buyers', label: 'Buyer', plural: 'Buyers', typeField: 'businessType', typeLabel: 'Business type', types: BUYER_TYPES },
  supplier: { path: '/api/suppliers', label: 'Supplier', plural: 'Suppliers', typeField: 'supplierCategory', typeLabel: 'Supplier category', types: SUPPLIER_CATS },
};

function PartyDetail({ kind, id, onClose }) {
  const cfg = CFG[kind];
  const { data, loading, error } = useApi(`${cfg.path}/${id}`);
  return (
    <Modal open onClose={onClose} title={data ? `${data.businessName}` : `${cfg.label} ${id}`} size="xl">
      {loading ? <Spinner /> : error ? <p className="text-sm text-red-700">{error}</p> : (
        <div className="space-y-6">
          <KeyValue items={[['ID', data.id], ['Contact person', data.contactPerson], ['Email', data.email], ['Phone', data.phone], ['Location', data.location], [cfg.typeLabel, data[cfg.typeField]], ['Registered', dateOf(data.registrationDate)], ['Status', <StatusBadge key="s" status={data.status} />]]} />
          {kind === 'supplier' && (
            <div><h3 className="mb-2 text-sm font-semibold text-forest">Products ({data.products.length})</h3>
              {data.products.length === 0 ? <p className="text-sm text-muted">No products listed.</p> : <ul className="grid gap-2 sm:grid-cols-2">{data.products.map((p) => <li key={p.id} className="rounded-lg bg-cream px-3 py-2 text-sm">{p.name}<span className="block text-xs text-muted">{money(p.pricePerUnit)} / {p.unit} · {p.availableQuantity} in stock</span></li>)}</ul>}
            </div>)}
          <div><h3 className="mb-2 text-sm font-semibold text-forest">{kind === 'buyer' ? 'Purchase history' : 'Order history'} ({data.orders.length})</h3>
            {data.orders.length === 0 ? <p className="text-sm text-muted">No orders yet.</p> : (
              <div className="overflow-x-auto"><table className="w-full min-w-[520px] text-left text-sm"><tbody>{data.orders.map((o) => (
                <tr key={o.id} className="border-b border-sage/40"><td className="py-2 pr-3"><Ref>{o.id}</Ref></td><td className="pr-3">{o.productName}</td><td className="pr-3 text-xs text-muted">{kind === 'buyer' ? o.supplierRef : o.buyerRef}</td><td className="pr-3"><StatusBadge status={o.status} /></td><td className="text-right">{money(o.totalPrice)}</td></tr>))}</tbody></table></div>)}
          </div>
          <div><h3 className="mb-2 text-sm font-semibold text-forest">Recent activity</h3>
            {data.activities.length === 0 ? <p className="text-sm text-muted">No activity recorded.</p> : <ul className="divide-y divide-sage/50">{data.activities.map((a) => <li key={a.id} className="flex justify-between gap-3 py-2 text-sm"><span>{a.message}</span><span className="shrink-0 text-xs text-muted">{dateTimeOf(a.createdAt)}</span></li>)}</ul>}
          </div>
        </div>)}
    </Modal>
  );
}

export default function PartiesPage({ kind }) {
  const cfg = CFG[kind];
  const { toast } = useToast();
  const [f, setF] = useState({ search: '', status: '', type: '', location: '', sort: 'id', page: 1 });
  const search = useDebounced(f.search);
  const url = `${cfg.path}?${qs({ ...f, search, pageSize: 8 })}`;
  const { data, meta, loading, error, reload } = useApi(url);
  const [modal, setModal] = useState(null); // {mode:'create'|'edit'|'view'|'delete', row}
  const set = (k, v) => setF((s) => ({ ...s, [k]: v, page: k === 'page' ? v : 1 }));

  const fields = [
    { name: 'businessName', label: 'Business name', required: true },
    { name: 'contactPerson', label: 'Contact person', required: true },
    { name: 'email', label: 'Email', type: 'email', required: true },
    { name: 'phone', label: 'Phone', type: 'tel', required: true, placeholder: '+92 300 1234567' },
    { name: 'location', label: 'Location', type: 'select', options: LOCATIONS, required: true },
    { name: cfg.typeField, label: cfg.typeLabel, type: 'select', options: cfg.types, required: true },
    { name: 'status', label: 'Account status', type: 'select', options: STATUSES, default: 'Active', required: true },
    ...(modal?.mode === 'create' ? [{ name: 'password', label: 'Initial password', type: 'password', hint: `Leave empty to use the default (${kind === 'buyer' ? 'Buyer123' : 'Supplier123'}).` }] : []),
  ];

  const columns = [
    { key: 'id', label: 'ID', render: (r) => <Ref>{r.id}</Ref> },
    { key: 'businessName', label: 'Business', render: (r) => <><span className="font-medium">{r.businessName}</span><span className="block text-xs text-muted">{r.contactPerson}</span></> },
    { key: 'contact', label: 'Contact', render: (r) => <><span>{r.email}</span><span className="block text-xs text-muted">{r.phone}</span></> },
    { key: 'location', label: 'Location' },
    { key: 'type', label: cfg.typeLabel, render: (r) => r[cfg.typeField] },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'actions', label: '', className: 'text-right', render: (r) => (
      <div className="flex justify-end gap-1">
        <Button variant="ghost" size="sm" aria-label={`View ${r.id}`} onClick={() => setModal({ mode: 'view', row: r })}><Eye className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" aria-label={`Edit ${r.id}`} onClick={() => setModal({ mode: 'edit', row: r })}><Pencil className="h-4 w-4" /></Button>
        <Button variant="ghost" size="sm" aria-label={`Delete ${r.id}`} onClick={() => setModal({ mode: 'delete', row: r })}><Trash2 className="h-4 w-4 text-red-700" /></Button>
      </div>) },
  ];

  const close = () => setModal(null);
  const save = async (values) => {
    const body = { ...values };
    if (!body.password) delete body.password;
    if (modal.mode === 'create') await api(cfg.path, { method: 'POST', body });
    else await api(`${cfg.path}/${modal.row.id}`, { method: 'PUT', body });
    toast(modal.mode === 'create' ? `${cfg.label} added` : `${cfg.label} updated`);
    close(); reload();
  };
  const remove = async () => {
    try { await api(`${cfg.path}/${modal.row.id}`, { method: 'DELETE' }); toast(`${cfg.label} deleted`); close(); reload(); }
    catch (e) { toast(e.message, 'error'); close(); }
  };

  return (
    <>
      <PageHeader title={cfg.plural} subtitle={`Full ${cfg.label.toLowerCase()} records are visible to administrators only.`}
        actions={<Button onClick={() => setModal({ mode: 'create' })}><Plus className="h-4 w-4" />Add {cfg.label.toLowerCase()}</Button>} />
      <Card>
        <FilterBar>
          <SearchInput value={f.search} onChange={(v) => set('search', v)} placeholder={`Search ${cfg.plural.toLowerCase()} by name, email or ID`} />
          <Select aria-label="Status" value={f.status} onChange={(e) => set('status', e.target.value)} options={STATUSES} placeholder="All statuses" className="!w-auto" />
          <Select aria-label={cfg.typeLabel} value={f.type} onChange={(e) => set('type', e.target.value)} options={cfg.types} placeholder={`All ${cfg.typeLabel.toLowerCase()}s`} className="!w-auto" />
          <Select aria-label="Location" value={f.location} onChange={(e) => set('location', e.target.value)} options={LOCATIONS} placeholder="All locations" className="!w-auto" />
          <Select aria-label="Sort" value={f.sort} onChange={(e) => set('sort', e.target.value)} options={[{ value: 'id', label: 'Sort: ID' }, { value: 'businessName', label: 'Sort: Name' }, { value: 'registrationDate', label: 'Sort: Registered' }]} className="!w-auto" />
        </FilterBar>
        <DataTable columns={columns} rows={data} loading={loading} error={error} onRetry={reload}
          empty={<EmptyState title={`No ${cfg.plural.toLowerCase()} match`} hint="Try clearing the filters or add a new one." />} />
        <Pagination meta={meta} onPage={(p) => set('page', p)} />
      </Card>

      <Modal open={modal?.mode === 'create' || modal?.mode === 'edit'} onClose={close} title={modal?.mode === 'create' ? `Add ${cfg.label.toLowerCase()}` : `Edit ${modal?.row?.id}`} size="lg">
        {(modal?.mode === 'create' || modal?.mode === 'edit') && <EntityForm key={modal.row?.id || 'new'} fields={fields} initial={modal.row || {}} onSubmit={save} onCancel={close} submitLabel={modal.mode === 'create' ? `Add ${cfg.label.toLowerCase()}` : 'Save changes'} />}
      </Modal>
      {modal?.mode === 'view' && <PartyDetail kind={kind} id={modal.row.id} onClose={close} />}
      <ConfirmDialog open={modal?.mode === 'delete'} danger title={`Delete ${modal?.row?.id}?`} confirmLabel="Delete"
        message={`${modal?.row?.businessName} and its login will be removed${kind === 'supplier' ? ', along with its products' : ''}. This cannot be undone. Accounts with open orders cannot be deleted.`} onConfirm={remove} onClose={close} />
    </>
  );
}
