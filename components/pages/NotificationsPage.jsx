'use client';
import { useState } from 'react';
import { Bell, FilePlus2, FileText, RefreshCw, MessageSquare, PackageMinus, CheckCheck } from 'lucide-react';
import { useApi } from '@/components/hooks.js';
import { Button, Card, Spinner, ErrorState, EmptyState, PageHeader, Pagination, Ref, Select } from '@/components/ui.jsx';
import { useToast } from '@/components/Toast.jsx';
import { api, qs, dateTimeOf, cx } from '@/lib/client-api.js';

const ICONS = { new_order: FilePlus2, quotation: FileText, order_status: RefreshCw, message: MessageSquare, low_stock: PackageMinus };

export default function NotificationsPage() {
  const { toast } = useToast();
  const [f, setF] = useState({ unread: '', type: '', page: 1 });
  const { data, meta, loading, error, reload } = useApi(`/api/notifications?${qs({ ...f, pageSize: 10 })}`);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v, page: k === 'page' ? v : 1 }));
  const refreshBell = () => window.dispatchEvent(new Event('agri:notifications'));

  const toggle = async (n) => {
    try { await api(`/api/notifications/${n.id}`, { method: 'PUT', body: { read: !n.read } }); reload(); refreshBell(); }
    catch (e) { toast(e.message, 'error'); }
  };
  const markAll = async () => {
    try { const r = await api('/api/notifications/read-all', { method: 'POST' }); toast(r.data.updated ? `${r.data.updated} notifications marked as read` : 'Everything is already read'); reload(); refreshBell(); }
    catch (e) { toast(e.message, 'error'); }
  };

  return (
    <>
      <PageHeader title="Notifications" subtitle="New orders, quotations, status changes, messages and inventory alerts."
        actions={<Button variant="secondary" onClick={markAll}><CheckCheck className="h-4 w-4" />Mark all as read</Button>} />
      <Card>
        <div className="flex flex-wrap items-center gap-2 border-b border-sage/60 p-3">
          <Select aria-label="Read state" value={f.unread} onChange={(e) => set('unread', e.target.value)} options={[{ value: 'true', label: 'Unread only' }]} placeholder="All notifications" className="!w-auto" />
          <Select aria-label="Type" value={f.type} onChange={(e) => set('type', e.target.value)} options={[{ value: 'new_order', label: 'New orders' }, { value: 'quotation', label: 'Quotations' }, { value: 'order_status', label: 'Status updates' }, { value: 'message', label: 'Messages' }, { value: 'low_stock', label: 'Low inventory' }]} placeholder="All types" className="!w-auto" />
          {meta && <span className="ml-auto text-xs text-muted">{meta.unreadCount} unread</span>}
        </div>
        {loading && !data ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> : !data?.length ? <EmptyState title="You are all caught up" hint="New activity will appear here." /> : (
          <ul>{data.map((n) => {
            const Icon = ICONS[n.type] || Bell;
            return (
              <li key={n.id} className={cx('flex items-start gap-3 border-b border-sage/40 px-4 py-4 last:border-0', !n.read && 'bg-[#FBF8EA]')}>
                <span className={cx('mt-0.5 rounded-lg p-2', n.type === 'low_stock' ? 'bg-[#FBF1D3] text-[#7A5A10]' : 'bg-sage text-forest')}><Icon className="h-4 w-4" /></span>
                <div className="min-w-0 flex-1">
                  <p className={cx('text-sm', !n.read ? 'font-semibold text-ink' : 'font-medium text-ink')}>{n.title}{n.orderId && <span className="ml-2"><Ref>{n.orderId}</Ref></span>}</p>
                  <p className="mt-0.5 text-sm text-ink/80">{n.message}</p>
                  <p className="mt-1 text-xs text-muted">{dateTimeOf(n.createdAt)}</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => toggle(n)}>{n.read ? 'Mark unread' : 'Mark read'}</Button>
              </li>);
          })}</ul>)}
        <Pagination meta={meta} onPage={(p) => set('page', p)} />
      </Card>
    </>
  );
}
