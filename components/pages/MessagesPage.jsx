'use client';
import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Send, ShieldCheck, MessageSquare } from 'lucide-react';
import { useApi } from '@/components/hooks.js';
import { Button, Card, Spinner, ErrorState, EmptyState, PageHeader, StatusBadge, Ref } from '@/components/ui.jsx';
import { api, cx, dateTimeOf } from '@/lib/client-api.js';

function Thread({ orderId, role, convo, onSent }) {
  const { data, loading, error, reload } = useApi(`/api/messages?orderId=${orderId}`);
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const bottom = useRef(null);

  useEffect(() => { const t = setInterval(reload, 8000); return () => clearInterval(t); }, [reload]);
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [data?.length]);
  useEffect(() => { window.dispatchEvent(new Event('agri:notifications')); }, [data?.length]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim()) return;
    setBusy(true); setErr('');
    try { await api('/api/messages', { method: 'POST', body: { orderId, body: text } }); setText(''); reload(); onSent(); }
    catch (ex) { setErr(ex.details?.body || ex.message); } finally { setBusy(false); }
  }

  const counterpart = role === 'admin' ? `${convo?.buyerRef} ↔ ${convo?.supplierRef}` : convo?.counterpartRef;
  return (
    <div className="flex h-full min-h-[420px] flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-sage/60 px-4 py-3">
        <div><p className="font-medium text-forest">{convo?.productName}</p><p className="text-xs text-muted">Order <Ref>{orderId}</Ref> · {role === 'admin' ? 'Parties' : 'With'} <Ref>{counterpart}</Ref></p></div>
        {convo && <StatusBadge status={convo.status} />}
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto bg-cream/60 p-4" aria-live="polite">
        {loading && !data ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> : !data?.length ? <EmptyState title="No messages yet" hint="Start the conversation about this order." /> : data.map((m) => {
          const mine = role !== 'admin' && m.fromMe;
          return (
            <div key={m.id} className={cx('flex', mine ? 'justify-end' : 'justify-start')}>
              <div className={cx('max-w-[78%] rounded-2xl px-3.5 py-2 text-sm', mine ? 'rounded-br-sm bg-leaf text-white' : 'rounded-bl-sm bg-white text-ink shadow-soft')}>
                <p className={cx('mb-0.5 text-[11px]', mine ? 'text-sage' : 'text-muted')}>{mine ? 'You' : role === 'admin' ? `${m.senderName} (${m.senderRef})` : m.senderRef} · {dateTimeOf(m.createdAt)}</p>
                <p className="whitespace-pre-wrap break-words">{m.body}</p>
              </div>
            </div>);
        })}
        <div ref={bottom} />
      </div>
      {role === 'admin' ? <p className="border-t border-sage/60 p-3 text-center text-xs text-muted">Administrators can read conversations but cannot post in them.</p> : (
        <form onSubmit={send} className="border-t border-sage/60 p-3">
          <div className="flex gap-2">
            <input aria-label="Message" value={text} onChange={(e) => setText(e.target.value)} maxLength={1000} placeholder="Write a message" disabled={convo?.status === 'Cancelled'}
              className="flex-1 rounded-lg border border-sage px-3 py-2 text-sm focus:border-leaf focus:outline-none focus:ring-2 focus:ring-fresh/40" />
            <Button type="submit" loading={busy} disabled={!text.trim() || convo?.status === 'Cancelled'}><Send className="h-4 w-4" />Send</Button>
          </div>
          {err && <p role="alert" className="mt-2 text-xs text-red-700">{err}</p>}
        </form>)}
    </div>
  );
}

export default function MessagesPage({ role }) {
  const params = useSearchParams();
  const [selected, setSelected] = useState(params.get('order'));
  const { data: convos, loading, error, reload } = useApi('/api/messages');
  const current = convos?.find((c) => c.orderId === selected);

  useEffect(() => { const t = setInterval(reload, 15000); return () => clearInterval(t); }, [reload]);
  useEffect(() => { if (!selected && convos?.length) setSelected(convos[0].orderId); }, [convos, selected]);

  return (
    <>
      <PageHeader title={role === 'admin' ? 'Communications' : 'Messages'} subtitle={role === 'admin' ? 'Read-only view of buyer and supplier conversations.' : 'Conversations are tied to an order and use anonymous references only.'} />
      <p className="mb-4 flex items-center gap-2 rounded-lg bg-sage/60 px-3 py-2 text-xs text-forest"><ShieldCheck className="h-4 w-4 shrink-0" />Phone numbers, emails and links are blocked in messages to protect both parties.</p>
      <Card className="grid overflow-hidden md:grid-cols-[320px_1fr]">
        <div className="max-h-[560px] overflow-y-auto border-b border-sage/60 md:border-b-0 md:border-r">
          {loading && !convos ? <Spinner /> : error ? <ErrorState message={error} onRetry={reload} /> : !convos?.length ? <EmptyState title="No conversations" hint="Conversations appear once you have an order." /> : (
            <ul>{convos.map((c) => (
              <li key={c.orderId}>
                <button onClick={() => setSelected(c.orderId)} className={cx('w-full border-b border-sage/40 px-4 py-3 text-left hover:bg-cream', selected === c.orderId && 'bg-sage/40')}>
                  <div className="flex items-center justify-between gap-2"><Ref>{c.orderId}</Ref>{c.unread > 0 && <span className="rounded-full bg-harvest px-2 text-xs font-semibold">{c.unread}</span>}</div>
                  <p className="mt-1 truncate text-sm font-medium">{c.productName}</p>
                  <p className="truncate text-xs text-muted">{c.lastMessage ? c.lastMessage.body : 'No messages yet'}</p>
                </button>
              </li>))}</ul>)}
        </div>
        {selected ? <Thread key={selected} orderId={selected} role={role} convo={current} onSent={reload} /> : <div className="flex min-h-[300px] items-center justify-center text-sm text-muted"><MessageSquare className="mr-2 h-5 w-5" />Select a conversation</div>}
      </Card>
    </>
  );
}
