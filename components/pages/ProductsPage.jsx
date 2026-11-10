'use client';
import { useState } from 'react';
import { Plus, Pencil, Trash2, Boxes, AlertTriangle, ShoppingCart, PackageX } from 'lucide-react';
import { useApi, useDebounced } from '@/components/hooks.js';
import { Button, Card, DataTable, FilterBar, SearchInput, Select, Input, Pagination, Modal, ConfirmDialog, EntityForm, PageHeader, StatusBadge, EmptyState, Ref, Spinner, ErrorState } from '@/components/ui.jsx';
import { useToast } from '@/components/Toast.jsx';
import { api, qs, money } from '@/lib/client-api.js';

const UNITS = ['KG', 'Ton', 'Bag', 'Liter', 'Piece'];
const TITLES = {
  admin: ['Products & inventory', 'All listings across suppliers. Supplier names are visible to administrators only.'],
  buyer: ['Browse products', 'Every listing shows an anonymous supplier reference. Request a quotation to start an order.'],
  supplier: ['My products', 'Manage your catalogue and inventory. Buyers only see your anonymous ID.'],
};

function RequestModal({ product, onClose, onDone }) {
  const { toast } = useToast();
  const fields = [
    { name: 'quantity', label: `Quantity (${product.unit})`, type: 'number', required: true, hint: `Minimum ${product.minOrderQuantity} ${product.unit}, up to ${product.availableQuantity} available.` },
    { name: 'deliveryLocation', label: 'Delivery location', required: true, full: true, placeholder: 'City or area, e.g. Faisalabad Industrial Estate', hint: 'Do not include phone numbers or emails. Contact details cannot be shared on the platform.' },
    { name: 'requirements', label: 'Additional requirements', type: 'textarea' },
  ];
  return (
    <Modal open onClose={onClose} title={`Request: ${product.name}`} size="lg">
      <div className="mb-4 flex flex-wrap items-center gap-3 rounded-lg bg-cream p-3 text-sm">
        <img src={product.image} alt="" className="h-14 w-20 rounded object-cover" />
        <div><p className="font-medium">{product.name}</p><p className="text-xs text-muted">List price {money(product.pricePerUnit)} / {product.unit} · Supplier <Ref>{product.supplierRef}</Ref></p></div>
      </div>
      <EntityForm fields={fields} initial={{ quantity: product.minOrderQuantity }} submitLabel="Send purchase request" onCancel={onClose}
        onSubmit={async (v) => { const r = await api('/api/purchase-requests', { method: 'POST', body: { ...v, productId: product.id } }); toast(`Request sent. Reference ${r.data.order.id}`); onDone(); }} />
    </Modal>
  );
}

export default function ProductsPage({ role }) {
  const { toast } = useToast();
  const isBuyer = role === 'buyer';
  const [f, setF] = useState({ search: '', category: '', availability: '', minPrice: '', maxPrice: '', sort: 'name', dir: 'asc', lowStock: false, page: 1 });
  const search = useDebounced(f.search);
  const minPrice = useDebounced(f.minPrice, 500);
  const maxPrice = useDebounced(f.maxPrice, 500);
  const { data, meta, loading, error, reload } = useApi(`/api/products?${qs({ ...f, search, minPrice, maxPrice, lowStock: f.lowStock ? 'true' : '', pageSize: isBuyer ? 9 : 8 })}`);
  const { data: categories } = useApi('/api/categories');
  const { data: suppliers } = useApi(role === 'admin' ? '/api/suppliers?pageSize=100' : null);
  const [modal, setModal] = useState(null);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v, page: k === 'page' ? v : 1 }));
  const catNames = (categories || []).map((c) => c.name);

  const fields = [
    ...(role === 'admin' ? [{ name: 'supplierId', label: 'Supplier', type: 'select', required: true, options: (suppliers || []).map((s) => ({ value: s.id, label: `${s.id} - ${s.businessName}` })), disabled: modal?.mode === 'edit' }] : []),
    { name: 'name', label: 'Product name', required: true, full: true },
    { name: 'category', label: 'Category', type: 'select', options: catNames, required: true },
    { name: 'unit', label: 'Unit', type: 'select', options: UNITS, required: true },
    { name: 'pricePerUnit', label: 'Price per unit (PKR)', type: 'number', required: true },
    { name: 'availableQuantity', label: 'Available quantity', type: 'number', required: true },
    { name: 'minOrderQuantity', label: 'Minimum order quantity', type: 'number', default: 1 },
    { name: 'lowStockThreshold', label: 'Low-stock alert at', type: 'number', hint: 'Alert when stock falls to this level.' },
    { name: 'availability', label: 'Availability', type: 'select', options: ['Available', 'Unavailable'], default: 'Available' },
    { name: 'image', label: 'Image URL (optional)', hint: 'Starts with / or https://. A category image is used if empty.' },
    { name: 'description', label: 'Description', type: 'textarea' },
  ];
  const clean = (v) => Object.fromEntries(Object.entries(v).filter(([, x]) => x !== ''));
  const close = () => setModal(null);
  const save = async (v) => {
    if (modal.mode === 'create') await api('/api/products', { method: 'POST', body: clean(v) });
    else await api(`/api/products/${modal.row.id}`, { method: 'PUT', body: clean(v) });
    toast(modal.mode === 'create' ? 'Product added' : 'Product updated');
    close(); reload();
  };
  const remove = async () => {
    try { await api(`/api/products/${modal.row.id}`, { method: 'DELETE' }); toast('Product deleted'); reload(); }
    catch (e) { toast(e.message, 'error'); }
    close();
  };
  const updateStock = async (v) => {
    await api(`/api/products/${modal.row.id}`, { method: 'PUT', body: { availableQuantity: v.availableQuantity } });
    toast('Inventory updated'); close(); reload();
  };

  const filters = (
    <FilterBar>
      <SearchInput value={f.search} onChange={(v) => set('search', v)} placeholder="Search products" />
      <Select aria-label="Category" value={f.category} onChange={(e) => set('category', e.target.value)} options={catNames} placeholder="All categories" className="!w-auto" />
      <Select aria-label="Availability" value={f.availability} onChange={(e) => set('availability', e.target.value)} options={isBuyer ? ['Available', 'Out of Stock'] : ['Available', 'Unavailable', 'Out of Stock']} placeholder="Any availability" className="!w-auto" />
      <Input aria-label="Minimum price" type="number" min="0" placeholder="Min PKR" value={f.minPrice} onChange={(e) => set('minPrice', e.target.value)} className="!w-28" />
      <Input aria-label="Maximum price" type="number" min="0" placeholder="Max PKR" value={f.maxPrice} onChange={(e) => set('maxPrice', e.target.value)} className="!w-28" />
      <Select aria-label="Sort" value={`${f.sort}:${f.dir}`} onChange={(e) => { const [s, d] = e.target.value.split(':'); setF((x) => ({ ...x, sort: s, dir: d, page: 1 })); }}
        options={[{ value: 'name:asc', label: 'Name A-Z' }, { value: 'price:asc', label: 'Price low to high' }, { value: 'price:desc', label: 'Price high to low' }, { value: 'quantity:asc', label: 'Stock low to high' }, { value: 'created:desc', label: 'Newest' }]} className="!w-auto" />
      {!isBuyer && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.lowStock} onChange={(e) => set('lowStock', e.target.checked)} className="h-4 w-4 accent-[#3D7548]" />Low stock only</label>}
    </FilterBar>
  );

  const [title, subtitle] = TITLES[role];
  return (
    <>
      <PageHeader title={title} subtitle={subtitle} actions={!isBuyer && <Button onClick={() => setModal({ mode: 'create' })}><Plus className="h-4 w-4" />Add product</Button>} />
      {!isBuyer && meta?.lowStockCount > 0 && (
        <button onClick={() => set('lowStock', true)} className="mb-4 flex w-full items-center gap-2 rounded-xl border border-harvest/60 bg-[#FBF6E4] px-4 py-3 text-left text-sm text-[#7A5A10]">
          <AlertTriangle className="h-4 w-4 shrink-0" />{meta.lowStockCount} {meta.lowStockCount === 1 ? 'product is' : 'products are'} at or below the low-stock level. Select to review.
        </button>)}

      {isBuyer ? (
        <>
          <Card className="mb-4">{filters}</Card>
          {loading && !data ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> : !data?.length ? <Card><EmptyState title="No products match" hint="Adjust the filters or search term." /></Card> : (
            <div className={`grid gap-4 sm:grid-cols-2 xl:grid-cols-3 ${loading ? 'opacity-60' : ''}`}>
              {data.map((p) => (
                <Card key={p.id} className="group flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-lift">
                  <div className="overflow-hidden"><img src={p.image} alt={p.category} className="h-40 w-full object-cover transition-transform duration-500 group-hover:scale-110" /></div>
                  <div className="flex flex-1 flex-col p-4">
                    <div className="flex items-start justify-between gap-2"><h3 className="font-display text-lg font-semibold leading-snug text-forest">{p.name}</h3><StatusBadge status={p.availability} /></div>
                    <p className="mt-1 text-xs text-muted">{p.category} · Supplier <Ref>{p.supplierRef}</Ref></p>
                    <p className="mt-2 line-clamp-2 text-sm text-ink/80">{p.description}</p>
                    <div className="mt-3 flex items-end justify-between">
                      <div><p className="text-lg font-semibold text-forest">{money(p.pricePerUnit)}<span className="text-xs font-normal text-muted"> / {p.unit}</span></p><p className="text-xs text-muted">Min {p.minOrderQuantity} {p.unit} · {p.availableQuantity} available</p></div>
                    </div>
                    <Button className="mt-4" disabled={p.availability !== 'Available'} onClick={() => setModal({ mode: 'request', row: p })}>
                      {p.availability === 'Available' ? <><ShoppingCart className="h-4 w-4" />Request purchase</> : <><PackageX className="h-4 w-4" />Out of stock</>}
                    </Button>
                  </div>
                </Card>))}
            </div>)}
          <Card className="mt-4"><Pagination meta={meta} onPage={(p) => set('page', p)} /></Card>
        </>
      ) : (
        <Card>
          {filters}
          <DataTable rows={data} loading={loading} error={error} onRetry={reload}
            empty={<EmptyState title="No products found" hint="Add your first product or change the filters." action={<Button onClick={() => setModal({ mode: 'create' })}>Add product</Button>} />}
            columns={[
              { key: 'name', label: 'Product', render: (r) => <div className="flex items-center gap-3"><img src={r.image} alt="" className="h-10 w-14 rounded object-cover" /><div><p className="font-medium">{r.name}</p><p className="text-xs text-muted">{r.id} · {r.category}</p></div></div> },
              ...(role === 'admin' ? [{ key: 'supplier', label: 'Supplier', render: (r) => <><span>{r.supplierName}</span><span className="block"><Ref>{r.supplierRef}</Ref></span></> }] : []),
              { key: 'price', label: 'Price', render: (r) => <>{money(r.pricePerUnit)}<span className="block text-xs text-muted">per {r.unit}</span></> },
              { key: 'stock', label: 'Stock', render: (r) => <span className={r.lowStock ? 'font-medium text-[#9B6A00]' : ''}>{r.availableQuantity} {r.unit}{r.lowStock && <AlertTriangle className="ml-1 inline h-3.5 w-3.5" />}<span className="block text-xs font-normal text-muted">MOQ {r.minOrderQuantity}</span></span> },
              { key: 'availability', label: 'Status', render: (r) => <StatusBadge status={r.availability} /> },
              { key: 'actions', label: '', className: 'text-right', render: (r) => (
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="sm" aria-label={`Update stock for ${r.name}`} onClick={() => setModal({ mode: 'stock', row: r })}><Boxes className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" aria-label={`Edit ${r.name}`} onClick={() => setModal({ mode: 'edit', row: r })}><Pencil className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="sm" aria-label={`Delete ${r.name}`} onClick={() => setModal({ mode: 'delete', row: r })}><Trash2 className="h-4 w-4 text-red-700" /></Button>
                </div>) },
            ]} />
          <Pagination meta={meta} onPage={(p) => set('page', p)} />
        </Card>
      )}

      <Modal open={modal?.mode === 'create' || modal?.mode === 'edit'} onClose={close} title={modal?.mode === 'create' ? 'Add product' : `Edit ${modal?.row?.id}`} size="lg">
        {(modal?.mode === 'create' || modal?.mode === 'edit') && <EntityForm key={modal.row?.id || 'new'} fields={fields} initial={modal.row ? { ...modal.row, supplierId: modal.row.supplierRef } : {}} onSubmit={save} onCancel={close} submitLabel={modal.mode === 'create' ? 'Add product' : 'Save changes'} />}
      </Modal>
      <Modal open={modal?.mode === 'stock'} onClose={close} title="Update inventory" size="sm">
        {modal?.mode === 'stock' && <EntityForm key={modal.row.id} fields={[{ name: 'availableQuantity', label: `Available quantity (${modal.row.unit})`, type: 'number', required: true, hint: `${modal.row.name}. Low-stock alert at ${modal.row.lowStockThreshold}.` }]} initial={modal.row} onSubmit={updateStock} onCancel={close} submitLabel="Update stock" />}
      </Modal>
      {modal?.mode === 'request' && <RequestModal product={modal.row} onClose={close} onDone={() => { close(); reload(); }} />}
      <ConfirmDialog open={modal?.mode === 'delete'} danger title="Delete this product?" confirmLabel="Delete product" message={`${modal?.row?.name} will be removed from the catalogue. Products with open orders cannot be deleted; mark them Unavailable instead.`} onConfirm={remove} onClose={close} />
    </>
  );
}
