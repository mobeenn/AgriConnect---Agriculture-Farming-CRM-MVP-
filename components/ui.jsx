'use client';
import { useEffect, useState } from 'react';
import { Loader2, X, ChevronLeft, ChevronRight, Sprout, AlertTriangle, Search } from 'lucide-react';
import { cx } from '@/lib/client-api.js';

export function Button({ variant = 'primary', size = 'md', loading, className, children, ...p }) {
  const v = {
    primary: 'bg-gradient-to-b from-[#4A8656] to-leaf text-white shadow-sm hover:from-leaf hover:to-forest hover:shadow-md',
    secondary: 'bg-white text-forest border border-sage hover:bg-sage/50 hover:shadow-sm',
    danger: 'bg-white text-red-800 border border-red-200 hover:bg-red-50',
    ghost: 'text-forest hover:bg-sage/60',
    accent: 'bg-harvest text-ink hover:brightness-95',
  }[variant];
  const s = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm' }[size];
  return (
    <button {...p} disabled={p.disabled || loading}
      className={cx('inline-flex items-center justify-center gap-2 rounded-xl font-medium transition-all duration-200 active:scale-[0.97] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-leaf disabled:cursor-not-allowed disabled:opacity-50', v, s, className)}>
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}{children}
    </button>
  );
}

export const Card = ({ className, children, ...p }) => <div {...p} className={cx('rounded-2xl border border-white bg-white shadow-soft ring-1 ring-sage/50 transition-shadow duration-300', className)}>{children}</div>;

const STATUS = {
  Pending: 'bg-[#FBF1D3] text-[#7A5A10]',
  'Quotation Submitted': 'bg-[#F1E6D3] text-[#6B4D33]',
  Accepted: 'bg-sage text-forest',
  Processing: 'bg-sage text-forest',
  Dispatched: 'bg-[#CFE3C2] text-forest',
  Delivered: 'bg-fresh text-white',
  Completed: 'bg-forest text-white',
  Rejected: 'bg-[#F8DEDA] text-[#9B3328]',
  Cancelled: 'bg-gray-200 text-gray-700',
  Active: 'bg-sage text-forest', Inactive: 'bg-gray-200 text-gray-700', Suspended: 'bg-[#F8DEDA] text-[#9B3328]',
  Available: 'bg-sage text-forest', Unavailable: 'bg-gray-200 text-gray-700', 'Out of Stock': 'bg-[#F8DEDA] text-[#9B3328]',
  Submitted: 'bg-[#F1E6D3] text-[#6B4D33]', Superseded: 'bg-gray-200 text-gray-700',
};
export const StatusBadge = ({ status }) => <span className={cx('inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium', STATUS[status] || 'bg-gray-100 text-gray-700')}>{status}</span>;
export const Ref = ({ children }) => <span className="rounded bg-cream px-1.5 py-0.5 font-mono text-xs text-forest ring-1 ring-sage">{children}</span>;

export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="flex items-center gap-3 font-display text-2xl font-semibold text-forest sm:text-3xl"><span className="h-8 w-1.5 rounded-full bg-gradient-to-b from-fresh to-leaf" />{title}</h1>
        {subtitle && <p className="mt-1 max-w-xl text-sm text-muted">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{actions}</div>
    </div>
  );
}

export function Spinner({ label = 'Loading' }) {
  return <div className="flex flex-col items-center justify-center gap-3 py-16 text-sm text-muted" role="status"><Sprout className="h-8 w-8 animate-bounce text-fresh" />{label}...</div>;
}
export function EmptyState({ title = 'Nothing here yet', hint, action }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
      <span className="grid h-16 w-16 animate-float place-items-center rounded-full bg-gradient-to-br from-sage to-[#F3EBCB]"><Sprout className="h-8 w-8 text-leaf" /></span>
      <p className="font-medium text-ink">{title}</p>
      {hint && <p className="max-w-sm text-sm text-muted">{hint}</p>}
      {action}
    </div>
  );
}
export function ErrorState({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-14 text-center">
      <AlertTriangle className="h-9 w-9 text-earth" />
      <p className="font-medium text-ink">We could not load this</p>
      <p className="text-sm text-muted">{message}</p>
      {onRetry && <Button variant="secondary" size="sm" onClick={onRetry}>Try again</Button>}
    </div>
  );
}

export function Modal({ open, onClose, title, children, size = 'md', footer }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);
  if (!open) return null;
  const w = { sm: 'max-w-md', md: 'max-w-xl', lg: 'max-w-3xl', xl: 'max-w-5xl' }[size];
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto animate-fade-in bg-forest/40 p-3 backdrop-blur-sm sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={cx('w-full animate-pop-in rounded-[28px] bg-white shadow-lift ring-1 ring-sage/60', w)}>
        <div className="flex items-center justify-between border-b border-sage/70 px-5 py-4">
          <h2 className="font-display text-lg font-semibold text-forest">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded p-1 text-muted hover:bg-sage/60"><X className="h-5 w-5" /></button>
        </div>
        <div className="px-5 py-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-sage/70 px-5 py-3">{footer}</div>}
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', danger, onConfirm, onClose }) {
  const [busy, setBusy] = useState(false);
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm"
      footer={<><Button variant="secondary" onClick={onClose}>Keep it</Button>
        <Button variant={danger ? 'danger' : 'primary'} loading={busy} onClick={async () => { setBusy(true); try { await onConfirm(); } finally { setBusy(false); } }}>{confirmLabel}</Button></>}>
      <p className="text-sm text-ink">{message}</p>
    </Modal>
  );
}

const inputCls = 'w-full rounded-xl border border-sage/80 bg-white px-3 py-2 text-sm text-ink placeholder:text-muted/70 focus:border-leaf focus:outline-none focus:ring-2 focus:ring-fresh/40';
export function Field({ label, error, hint, children }) {
  return (
    <label className="block text-sm">
      <span className="mb-1 block font-medium text-ink">{label}</span>
      {children}
      {hint && !error && <span className="mt-1 block text-xs text-muted">{hint}</span>}
      {error && <span className="mt-1 block text-xs text-red-700">{error}</span>}
    </label>
  );
}
export const Input = (p) => <input {...p} className={cx(inputCls, p.className)} />;
export const Textarea = (p) => <textarea rows={3} {...p} className={cx(inputCls, p.className)} />;
export const Select = ({ options, placeholder, ...p }) => (
  <select {...p} className={cx(inputCls, p.className)}>
    {placeholder !== undefined && <option value="">{placeholder}</option>}
    {options.map((o) => (typeof o === 'string' ? <option key={o} value={o}>{o}</option> : <option key={o.value} value={o.value}>{o.label}</option>))}
  </select>
);
export function SearchInput({ value, onChange, placeholder = 'Search' }) {
  return (
    <div className="relative min-w-[200px] flex-1">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
      <input aria-label={placeholder} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className={cx(inputCls, 'pl-9')} />
    </div>
  );
}

/** Generic form. fields: [{name,label,type,options,required,hint,full}] */
export function EntityForm({ fields, initial = {}, onSubmit, submitLabel = 'Save changes', onCancel }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.name, initial[f.name] ?? f.default ?? ''])));
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const [formError, setFormError] = useState('');
  const set = (k, v) => setValues((s) => ({ ...s, [k]: v }));
  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErrors({}); setFormError('');
    try { await onSubmit(values); } catch (err) { setErrors(err.details || {}); setFormError(err.details ? 'Please fix the highlighted fields.' : err.message); } finally { setBusy(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((f) => (
          <div key={f.name} className={f.full || f.type === 'textarea' ? 'sm:col-span-2' : ''}>
            <Field label={f.label + (f.required ? ' *' : '')} error={errors[f.name]} hint={f.hint}>
              {f.type === 'select' ? <Select value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} options={f.options} placeholder={f.required ? 'Select...' : 'None'} disabled={f.disabled} />
                : f.type === 'textarea' ? <Textarea value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} />
                : <Input type={f.type || 'text'} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} step={f.type === 'number' ? 'any' : undefined} disabled={f.disabled} />}
            </Field>
          </div>
        ))}
      </div>
      {formError && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800" role="alert">{formError}</p>}
      <div className="flex justify-end gap-2 pt-1">
        {onCancel && <Button type="button" variant="secondary" onClick={onCancel}>Cancel</Button>}
        <Button type="submit" loading={busy}>{submitLabel}</Button>
      </div>
    </form>
  );
}

export function DataTable({ columns, rows, loading, error, onRetry, empty, onRowClick, rowKey = 'id' }) {
  if (loading && !rows?.length) return <Spinner />;
  if (error) return <ErrorState message={error} onRetry={onRetry} />;
  if (!rows?.length) return empty || <EmptyState />;
  return (
    <div className={cx('overflow-x-auto', loading && 'opacity-60 transition-opacity')}>
      <table className="w-full min-w-[640px] text-left text-sm">
        <thead>
          <tr className="border-b border-sage/70 bg-cream/70 text-xs uppercase tracking-wide text-muted">
            {columns.map((c) => <th key={c.key} className={cx('px-4 py-3 font-medium', c.className)}>{c.label}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r[rowKey]} onClick={onRowClick ? () => onRowClick(r) : undefined}
              className={cx('border-b border-sage/40 last:border-0', 'transition-colors hover:bg-sage/30', onRowClick && 'cursor-pointer')}>
              {columns.map((c) => <td key={c.key} className={cx('px-4 py-3 align-middle text-ink', c.className)}>{c.render ? c.render(r) : r[c.key]}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.totalPages <= 1) return meta ? <p className="px-4 py-3 text-xs text-muted">{meta.total} {meta.total === 1 ? 'record' : 'records'}</p> : null;
  return (
    <div className="flex items-center justify-between border-t border-sage/60 px-4 py-3 text-sm">
      <span className="text-muted">Page {meta.page} of {meta.totalPages} ({meta.total} records)</span>
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" disabled={meta.page <= 1} onClick={() => onPage(meta.page - 1)} aria-label="Previous page"><ChevronLeft className="h-4 w-4" /></Button>
        <Button variant="secondary" size="sm" disabled={meta.page >= meta.totalPages} onClick={() => onPage(meta.page + 1)} aria-label="Next page"><ChevronRight className="h-4 w-4" /></Button>
      </div>
    </div>
  );
}

export const FilterBar = ({ children }) => <div className="flex flex-wrap items-center gap-2 border-b border-sage/60 p-3">{children}</div>;

export function KeyValue({ items }) {
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {items.filter(Boolean).map(([k, v]) => (
        <div key={k}><dt className="text-xs text-muted">{k}</dt><dd className="mt-0.5 text-sm text-ink">{v || '-'}</dd></div>
      ))}
    </dl>
  );
}
