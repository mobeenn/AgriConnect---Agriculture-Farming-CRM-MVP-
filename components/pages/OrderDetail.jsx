'use client';
import { useState } from 'react';
import Link from 'next/link';
import { MessageSquare, CheckCircle2, XCircle, Truck, PackageCheck, Ban, FileText, Pencil, Play, Check } from 'lucide-react';
import { useApi } from '@/components/hooks.js';
import { Button, Modal, ConfirmDialog, EntityForm, StatusBadge, Ref, Spinner, KeyValue, Select, Textarea, Field } from '@/components/ui.jsx';
import { useToast } from '@/components/Toast.jsx';
import { api, money, dateOf, dateTimeOf } from '@/lib/client-api.js';

const ALL_STATUSES = ['Pending', 'Quotation Submitted', 'Accepted', 'Processing', 'Dispatched', 'Delivered', 'Completed', 'Rejected', 'Cancelled'];

export default function OrderDetail({ id, role, onClose, onChanged }) {
  const { toast } = useToast();
  const { data: o, loading, error, reload } = useApi(`/api/orders/${id}`);
  const [panel, setPanel] = useState(null);
  const [adminStatus, setAdminStatus] = useState('');
  const [adminNote, setAdminNote] = useState('');

  const run = async (fn, msg) => {
    try { await fn(); toast(msg); window.dispatchEvent(new Event('agri:notifications')); setPanel(null); reload(); onChanged(); }
    catch (e) { if (!e.details) toast(e.message, 'error'); throw e; }
  };
  const setStatus = (status, msg, extra = {}) => run(() => api(`/api/orders/${id}`, { method: 'PUT', body: { status, ...extra } }), msg);

  if (loading) return <Modal open onClose={onClose} title={`Order ${id}`} size="lg"><Spinner /></Modal>;
  if (error) return <Modal open onClose={onClose} title={`Order ${id}`} size="lg"><p className="text-sm text-red-700">{error}</p></Modal>;

  const openQuote = o.quotations.find((q) => q.status === 'Submitted');
  const canEditRequest = role === 'buyer' && o.status === 'Pending';
  const counterpart = role === 'buyer' ? ['Supplier', o.supplierRef] : role === 'supplier' ? ['Buyer', o.buyerRef] : null;

  const actions = [];
  if (role === 'supplier') {
    if (['Pending', 'Quotation Submitted'].includes(o.status)) {
      actions.push(<Button key="q" onClick={() => setPanel('quote')}><FileText className="h-4 w-4" />{o.status === 'Pending' ? 'Submit quotation' : 'Send revised quotation'}</Button>);
      actions.push(<Button key="r" variant="danger" onClick={() => setPanel('reject')}><XCircle className="h-4 w-4" />Decline request</Button>);
    }
    if (o.status === 'Accepted') actions.push(<Button key="p" onClick={() => setStatus('Processing', 'Order is now processing')}><Play className="h-4 w-4" />Start processing</Button>);
    if (o.status === 'Processing') actions.push(<Button key="d" onClick={() => setPanel('dispatch')}><Truck className="h-4 w-4" />Mark as dispatched</Button>);
    if (o.status === 'Dispatched') actions.push(<Button key="v" onClick={() => setStatus('Delivered', 'Marked as delivered')}><PackageCheck className="h-4 w-4" />Mark as delivered</Button>);
  }
  if (role === 'buyer') {
    if (openQuote) {
      actions.push(<Button key="a" onClick={() => run(() => api(`/api/quotations/${openQuote.id}`, { method: 'PUT', body: { action: 'accept' } }), 'Quotation accepted. The order is now in progress.')}><CheckCircle2 className="h-4 w-4" />Accept quotation</Button>);
      actions.push(<Button key="j" variant="danger" onClick={() => setPanel('rejectQuote')}><XCircle className="h-4 w-4" />Reject quotation</Button>);
    }
    if (canEditRequest) actions.push(<Button key="e" variant="secondary" onClick={() => setPanel('edit')}><Pencil className="h-4 w-4" />Edit request</Button>);
    if (['Pending', 'Quotation Submitted'].includes(o.status)) actions.push(<Button key="c" variant="danger" onClick={() => setPanel('cancel')}><Ban className="h-4 w-4" />Cancel request</Button>);
    if (o.status === 'Delivered') actions.push(<Button key="f" onClick={() => setStatus('Completed', 'Order completed. Thank you!')}><Check className="h-4 w-4" />Confirm receipt</Button>);
  }

  return (
    <>
      <Modal open onClose={onClose} title={`Order ${o.id}`} size="xl"
        footer={<Link href={`/${role}/messages?order=${o.id}`} className="inline-flex items-center gap-2 rounded-lg border border-sage px-4 py-2 text-sm font-medium text-forest hover:bg-sage/50"><MessageSquare className="h-4 w-4" />{role === 'admin' ? 'View conversation' : 'Message'}</Link>}>
        <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
          <div className="space-y-5">
            <div className="flex flex-wrap items-center gap-3"><StatusBadge status={o.status} /><span className="text-xs text-muted">Request <Ref>{o.requestId}</Ref> · created {dateOf(o.createdAt)}</span></div>
            <KeyValue items={[
              ['Product', `${o.productName} (${o.productId})`], ['Quantity', `${o.quantity} ${o.unit}`],
              ['Unit price', money(o.unitPrice)], ['Total price', money(o.totalPrice)],
              ['Delivery location', o.deliveryLocation],
              role === 'admin' ? ['Buyer', `${o.buyerName} (${o.buyerRef})`] : counterpart && [counterpart[0] + ' reference', <Ref key="c">{counterpart[1]}</Ref>],
              role === 'admin' && ['Supplier', `${o.supplierName} (${o.supplierRef})`],
              o.requirements && ['Additional requirements', o.requirements],
              o.deliveryInfo && ['Expected delivery', o.deliveryInfo.expectedDate ? dateOf(o.deliveryInfo.expectedDate) : '-'],
              o.deliveryInfo?.carrier && ['Transport', o.deliveryInfo.carrier],
              o.deliveryInfo?.note && ['Delivery note', o.deliveryInfo.note],
            ]} />

            {actions.length > 0 && <div className="flex flex-wrap gap-2 border-t border-sage/60 pt-4">{actions}</div>}

            {role === 'admin' && (
              <div className="space-y-3 rounded-xl bg-cream p-4">
                <p className="text-sm font-semibold text-forest">Override status</p>
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[180px] flex-1"><Select aria-label="New status" value={adminStatus} onChange={(e) => setAdminStatus(e.target.value)} options={ALL_STATUSES.filter((s) => s !== o.status)} placeholder="Select new status" /></div>
                  <Button disabled={!adminStatus} onClick={() => setStatus(adminStatus, 'Status updated', { note: adminNote || undefined })}>Update status</Button>
                </div>
                <Field label="Note (optional)"><Textarea rows={2} value={adminNote} onChange={(e) => setAdminNote(e.target.value)} /></Field>
              </div>)}
          </div>

          <div className="space-y-5">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-forest">Quotations</h3>
              {o.quotations.length === 0 ? <p className="rounded-lg bg-cream p-3 text-sm text-muted">{role === 'supplier' ? 'No quotation sent yet.' : 'Waiting for a quotation.'}</p> : (
                <ul className="space-y-2">{o.quotations.map((q) => (
                  <li key={q.id} className="rounded-lg border border-sage/70 p-3 text-sm">
                    <div className="flex items-center justify-between"><Ref>{q.id}</Ref><StatusBadge status={q.status} /></div>
                    <p className="mt-2 font-semibold text-forest">{money(q.totalPrice)}</p>
                    <p className="text-xs text-muted">{money(q.unitPrice)} per {o.unit} · delivery in {q.deliveryDays} days{q.validUntil ? ` · valid until ${dateOf(q.validUntil)}` : ''}</p>
                    {q.notes && <p className="mt-1 text-xs">{q.notes}</p>}
                  </li>))}</ul>)}
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-forest">Progress</h3>
              <ol className="relative space-y-3 border-l-2 border-sage pl-4">
                {[...o.statusHistory].reverse().map((h, i) => (
                  <li key={i} className="relative text-sm">
                    <span className={`absolute -left-[22px] top-1 h-3 w-3 rounded-full ring-2 ring-white ${i === 0 ? 'bg-leaf' : 'bg-sage'}`} />
                    <p className="font-medium">{h.status}</p><p className="text-xs text-muted">{dateTimeOf(h.at)}{h.note ? ` · ${h.note}` : ''}</p>
                  </li>))}
              </ol>
            </div>
          </div>
        </div>
      </Modal>

      <Modal open={panel === 'quote'} onClose={() => setPanel(null)} title={`Quotation for ${o.id}`} size="md">
        <p className="mb-3 text-sm text-muted">Quantity requested: {o.quantity} {o.unit}. The total is calculated from your unit price.</p>
        <EntityForm submitLabel="Send quotation" onCancel={() => setPanel(null)} initial={{ deliveryDays: 5 }}
          fields={[{ name: 'unitPrice', label: `Unit price (PKR per ${o.unit})`, type: 'number', required: true }, { name: 'deliveryDays', label: 'Delivery time (days)', type: 'number', required: true }, { name: 'validUntil', label: 'Valid until', type: 'date' }, { name: 'notes', label: 'Notes', type: 'textarea', hint: 'Do not include phone numbers, emails or links.' }]}
          onSubmit={(v) => run(() => api('/api/quotations', { method: 'POST', body: { ...Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '')), orderId: id } }), 'Quotation sent to the buyer')} />
      </Modal>
      <Modal open={panel === 'dispatch'} onClose={() => setPanel(null)} title="Dispatch details" size="md">
        <EntityForm submitLabel="Mark as dispatched" onCancel={() => setPanel(null)}
          fields={[{ name: 'expectedDate', label: 'Expected delivery date', type: 'date' }, { name: 'carrier', label: 'Transport method', type: 'select', options: ['Truck', 'Pickup', 'Courier', 'Tractor trolley', 'Rail freight'] }, { name: 'note', label: 'Delivery note', type: 'textarea' }]}
          onSubmit={(v) => run(() => api(`/api/orders/${id}`, { method: 'PUT', body: { status: 'Dispatched', deliveryInfo: Object.fromEntries(Object.entries(v).filter(([, x]) => x !== '')) } }), 'Order dispatched')} />
      </Modal>
      <Modal open={panel === 'edit'} onClose={() => setPanel(null)} title="Edit purchase request" size="md">
        <EntityForm submitLabel="Save request" onCancel={() => setPanel(null)} initial={o}
          fields={[{ name: 'quantity', label: `Quantity (${o.unit})`, type: 'number', required: true }, { name: 'deliveryLocation', label: 'Delivery location', required: true }, { name: 'requirements', label: 'Additional requirements', type: 'textarea' }]}
          onSubmit={(v) => run(() => api(`/api/purchase-requests/${o.requestId}`, { method: 'PUT', body: v }), 'Request updated')} />
      </Modal>
      <ConfirmDialog open={panel === 'cancel'} danger title="Cancel this request?" confirmLabel="Cancel request" message="The supplier will be notified. This cannot be undone." onClose={() => setPanel(null)} onConfirm={() => setStatus('Cancelled', 'Request cancelled').catch(() => {})} />
      <ConfirmDialog open={panel === 'reject'} danger title="Decline this request?" confirmLabel="Decline request" message="The buyer will be told the request was declined." onClose={() => setPanel(null)} onConfirm={() => setStatus('Rejected', 'Request declined').catch(() => {})} />
      <ConfirmDialog open={panel === 'rejectQuote'} danger title="Reject this quotation?" confirmLabel="Reject quotation" message="The order will be closed as Rejected. You can submit a new purchase request at any time." onClose={() => setPanel(null)} onConfirm={() => run(() => api(`/api/quotations/${openQuote.id}`, { method: 'PUT', body: { action: 'reject' } }), 'Quotation rejected').catch(() => {})} />
    </>
  );
}
