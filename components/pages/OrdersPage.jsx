'use client';
import { useState } from 'react';
import { Eye } from 'lucide-react';
import { useApi, useDebounced } from '@/components/hooks.js';
import { Button, Card, DataTable, FilterBar, SearchInput, Select, Pagination, PageHeader, StatusBadge, EmptyState, Ref } from '@/components/ui.jsx';
import { qs, money, dateOf } from '@/lib/client-api.js';
import OrderDetail from '@/components/pages/OrderDetail.jsx';

const REQUEST_STATUSES = ['Pending', 'Quotation Submitted', 'Rejected', 'Cancelled'];
const ORDER_STATUSES = ['Accepted', 'Processing', 'Dispatched', 'Delivered', 'Completed'];
const ALL = [...REQUEST_STATUSES.slice(0, 2), ...ORDER_STATUSES, 'Rejected', 'Cancelled'];

const TITLES = {
  'admin:all': ['Orders', 'Every order on the platform with both parties visible.', ALL],
  'admin:requests': ['Purchase requests', 'Requests that have not yet become orders, or were closed before acceptance.', REQUEST_STATUSES],
  'buyer:requests': ['My purchase requests', 'Requests waiting for quotations, and those that were rejected or cancelled.', REQUEST_STATUSES],
  'buyer:orders': ['My orders', 'Accepted orders from processing to completion.', ORDER_STATUSES],
  'supplier:requests': ['Incoming requests', 'Buyers asking for a quotation. Open one to respond.', REQUEST_STATUSES],
  'supplier:orders': ['My orders', 'Accepted orders you need to fulfil.', ORDER_STATUSES],
};

export default function OrdersPage({ role, mode }) {
  const [title, subtitle, statuses] = TITLES[`${role}:${mode}`];
  const [f, setF] = useState({ search: '', status: '', page: 1 });
  const [openId, setOpenId] = useState(null);
  const search = useDebounced(f.search);
  const scope = mode === 'all' ? '' : statuses.join(',');
  const { data, meta, loading, error, reload } = useApi(`/api/orders?${qs({ search, status: f.status || scope, page: f.page, pageSize: 8 })}`);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v, page: k === 'page' ? v : 1 }));
  const who = role === 'buyer' ? 'Supplier' : role === 'supplier' ? 'Buyer' : 'Buyer / Supplier';

  const columns = [
    { key: 'id', label: 'Order', render: (r) => <><Ref>{r.id}</Ref><span className="mt-1 block text-xs text-muted">{r.requestId}</span></> },
    { key: 'product', label: 'Product', render: (r) => <><span className="font-medium">{r.productName}</span><span className="block text-xs text-muted">{r.quantity} {r.unit} · {r.deliveryLocation}</span></> },
    { key: 'who', label: who, render: (r) => role === 'admin' ? <><span className="text-sm">{r.buyerName}</span><span className="block text-xs text-muted">{r.supplierName}</span></> : <Ref>{r.supplierRef || r.buyerRef}</Ref> },
    { key: 'price', label: role === 'supplier' ? 'Quoted price' : 'Price', render: (r) => <span className={r.totalPrice ? '' : 'text-muted'}>{money(r.totalPrice)}</span> },
    { key: 'status', label: 'Status', render: (r) => <StatusBadge status={r.status} /> },
    { key: 'date', label: 'Date', render: (r) => dateOf(r.createdAt) },
    { key: 'a', label: '', className: 'text-right', render: (r) => <Button variant="ghost" size="sm" aria-label={`Open ${r.id}`}><Eye className="h-4 w-4" /></Button> },
  ];

  return (
    <>
      <PageHeader title={title} subtitle={subtitle} />
      <Card>
        <FilterBar>
          <SearchInput value={f.search} onChange={(v) => set('search', v)} placeholder="Search by order, request or product" />
          <Select aria-label="Status" value={f.status} onChange={(e) => set('status', e.target.value)} options={statuses} placeholder="All statuses" className="!w-auto" />
        </FilterBar>
        <DataTable columns={columns} rows={data} loading={loading} error={error} onRetry={reload} onRowClick={(r) => setOpenId(r.id)}
          empty={<EmptyState title={mode === 'requests' ? 'No requests yet' : 'No orders yet'} hint={role === 'buyer' ? 'Browse products and send a purchase request to get started.' : 'New items will appear here as they arrive.'} />} />
        <Pagination meta={meta} onPage={(p) => set('page', p)} />
      </Card>
      {openId && <OrderDetail id={openId} role={role} onClose={() => setOpenId(null)} onChanged={reload} />}
    </>
  );
}
