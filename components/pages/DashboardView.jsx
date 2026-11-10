'use client';
import Link from 'next/link';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { useEffect, useState } from 'react';
import { AlertTriangle, Sprout, Users, Factory, Package, ClipboardList, Clock, CheckCircle2, FileText, Wallet, TrendingUp, Truck, Hourglass, Inbox, Bell, Leaf } from 'lucide-react';
import { FieldScene } from '@/components/Illustrations.jsx';
import { useApi } from '@/components/hooks.js';
import { Card, Spinner, ErrorState, StatusBadge, Ref, EmptyState } from '@/components/ui.jsx';
import { money, dateOf, dateTimeOf } from '@/lib/client-api.js';

const PALETTE = ['#244B32', '#3D7548', '#79A95B', '#E7BD58', '#8B6748', '#DCE8D4', '#B8923A', '#5E8F66'];
const STATUS_COLORS = { Pending: '#E7BD58', 'Quotation Submitted': '#8B6748', Accepted: '#79A95B', Processing: '#3D7548', Dispatched: '#5E8F66', Delivered: '#244B32', Completed: '#1B3A26', Rejected: '#B5533C', Cancelled: '#9AA39A' };
const GREETING = { admin: 'Platform overview', buyer: 'Your sourcing at a glance', supplier: 'Your sales at a glance' };
const ICONS = { buyers: Users, suppliers: Factory, products: Package, orders: ClipboardList, pending: Clock, completed: CheckCircle2, requests: FileText, gmv: Wallet, spend: Wallet, revenue: TrendingUp, active: Truck, open: Hourglass, incoming: Inbox, unread: Bell, low: AlertTriangle };

// numbers count up smoothly when the dashboard loads
function CountUp({ value, format }) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf; const t0 = performance.now(); const dur = 900;
    const tick = (t) => { const k = Math.min(1, (t - t0) / dur); setV(value * (1 - Math.pow(1 - k, 3))); if (k < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value]);
  const n = Math.round(v);
  return format === 'currency' ? money(n) : n.toLocaleString('en-PK');
}

const tip = { borderRadius: 10, border: '1px solid #DCE8D4', fontSize: 12 };

function ChartCard({ title, children, empty }) {
  return (
    <Card className="p-5 hover:shadow-lift">
      <h3 className="mb-4 flex items-center gap-2 text-base font-semibold text-forest"><span className="h-2 w-2 rounded-full bg-fresh" />{title}</h3>
      <div className="h-64">{empty ? <EmptyState title="No data yet" /> : children}</div>
    </Card>
  );
}

export default function DashboardView({ role }) {
  const { data, loading, error, reload } = useApi('/api/dashboard');
  if (loading) return <Spinner label="Loading dashboard" />;
  if (error) return <ErrorState message={error} onRetry={reload} />;
  const { stats, charts, recentOrders, recentRequests, recentActivities, lowStockProducts } = data;
  const lead = stats.find((s) => s.format === 'currency') || stats[0];
  const base = `/${role}`;

  return (
    <div className="space-y-6">
      <section className="relative isolate min-h-[250px] overflow-hidden rounded-[28px] bg-gradient-to-br from-[#FFF7DC] to-sage shadow-soft ring-1 ring-sage/50">
        <FieldScene className="absolute inset-0 -z-20 h-full w-full" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-white/70 via-white/25 to-transparent" />
        <div className="relative px-6 py-8 sm:px-10 sm:py-10">
          <p className="inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-medium text-forest shadow-sm backdrop-blur"><Sprout className="h-3.5 w-3.5 text-leaf" />{GREETING[role]}</p>
          <h1 className="mt-4 font-display text-4xl font-semibold text-forest sm:text-5xl"><CountUp value={lead.value} format={lead.format} /></h1>
          <p className="mt-1 text-sm font-medium text-forest/75">{lead.label}</p>
          <div className="mt-5 flex flex-wrap gap-2 text-sm">
            <Link href={`${base}/orders`} className="rounded-xl bg-forest px-5 py-2.5 font-medium text-white shadow-md transition hover:-translate-y-0.5 hover:bg-leaf">View orders</Link>
            <Link href={`${base}/${role === 'admin' ? 'requests' : 'products'}`} className="rounded-xl bg-white/85 px-5 py-2.5 font-medium text-forest shadow-sm backdrop-blur transition hover:-translate-y-0.5 hover:bg-white">{role === 'buyer' ? 'Browse products' : role === 'supplier' ? 'Manage products' : 'Purchase requests'}</Link>
          </div>
        </div>
      </section>

      <section className="stagger grid grid-cols-2 gap-3 md:grid-cols-4">
        {stats.map((s) => {
          const Icon = ICONS[s.key] || Leaf;
          return (
            <Card key={s.key} className="group p-4 hover:-translate-y-1 hover:shadow-lift">
              <div className="flex items-center justify-between"><p className="text-xs font-medium text-muted">{s.label}</p><span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-sage to-[#EEF3E2] text-leaf transition-transform duration-300 group-hover:rotate-6 group-hover:scale-110"><Icon className="h-[18px] w-[18px]" /></span></div>
              <p className="mt-2 font-display text-2xl font-semibold text-forest"><CountUp value={s.value} format={s.format} /></p>
              {s.hint && <p className="mt-1 text-xs text-earth">{s.hint}</p>}
            </Card>
          );
        })}
      </section>

      <section className="stagger grid gap-4 lg:grid-cols-2">
        <ChartCard title="Monthly orders" empty={!charts.monthlyOrders.some((m) => m.orders)}>
          <ResponsiveContainer><BarChart data={charts.monthlyOrders}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DCE8D4" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: '#788477' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#788477' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tip} cursor={{ fill: '#F7F8F1' }} /><Bar dataKey="orders" name="Orders" fill="#3D7548" radius={[6, 6, 0, 0]} /></BarChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Purchase requests overview" empty={!charts.requestsOverview.some((m) => m.requests)}>
          <ResponsiveContainer><LineChart data={charts.requestsOverview}><CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#DCE8D4" /><XAxis dataKey="month" tick={{ fontSize: 12, fill: '#788477' }} axisLine={false} tickLine={false} /><YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#788477' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tip} /><Legend wrapperStyle={{ fontSize: 12 }} /><Line type="monotone" dataKey="requests" name="Requests" stroke="#E7BD58" strokeWidth={3} dot={{ r: 3 }} /><Line type="monotone" dataKey="converted" name="Became orders" stroke="#244B32" strokeWidth={3} dot={{ r: 3 }} /></LineChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title={role === 'buyer' ? 'Categories you order' : 'Product categories'} empty={!charts.categoryDistribution.length}>
          <ResponsiveContainer><PieChart><Pie data={charts.categoryDistribution} dataKey="value" nameKey="name" innerRadius={50} outerRadius={85} paddingAngle={2}>{charts.categoryDistribution.map((c, i) => <Cell key={c.name} fill={PALETTE[i % PALETTE.length]} />)}</Pie><Tooltip contentStyle={tip} /><Legend wrapperStyle={{ fontSize: 11 }} /></PieChart></ResponsiveContainer>
        </ChartCard>
        <ChartCard title="Order status" empty={!charts.orderStatus.length}>
          <ResponsiveContainer><BarChart data={charts.orderStatus} layout="vertical" margin={{ left: 40 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#DCE8D4" /><XAxis type="number" allowDecimals={false} tick={{ fontSize: 12, fill: '#788477' }} axisLine={false} tickLine={false} /><YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12, fill: '#26352A' }} axisLine={false} tickLine={false} /><Tooltip contentStyle={tip} cursor={{ fill: '#F7F8F1' }} /><Bar dataKey="value" name="Orders" radius={[0, 6, 6, 0]}>{charts.orderStatus.map((s) => <Cell key={s.name} fill={STATUS_COLORS[s.name]} />)}</Bar></BarChart></ResponsiveContainer>
        </ChartCard>
      </section>

      {role !== 'buyer' && lowStockProducts.length > 0 && (
        <Card className="border-harvest/60 bg-[#FBF6E4] p-5">
          <h3 className="flex items-center gap-2 text-base font-semibold text-[#7A5A10]"><AlertTriangle className="h-5 w-5" />Low-stock alerts</h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {lowStockProducts.map((p) => (
              <li key={p.id} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
                <span>{p.name}{role === 'admin' && <span className="ml-2 text-xs text-muted">{p.supplierRef}</span>}</span>
                <span className="font-medium text-[#7A5A10]">{p.availableQuantity} {p.unit} left</span>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <section className="grid gap-4 xl:grid-cols-3">
        <Card className="overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between px-5 pt-5"><h3 className="text-base font-semibold text-forest">Recent orders</h3><Link href={`${base}/orders`} className="text-sm text-leaf hover:underline">View all</Link></div>
          {recentOrders.length === 0 ? <EmptyState title="No orders yet" /> : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead><tr className="border-y border-sage/60 text-xs text-muted"><th className="px-5 py-2 font-medium">Order</th><th className="px-3 py-2 font-medium">Product</th><th className="px-3 py-2 font-medium">{role === 'buyer' ? 'Supplier' : role === 'supplier' ? 'Buyer' : 'Buyer / Supplier'}</th><th className="px-3 py-2 font-medium">Status</th><th className="px-5 py-2 text-right font-medium">Price</th></tr></thead>
                <tbody>{recentOrders.map((o) => (
                  <tr key={o.id} className="border-b border-sage/40 last:border-0">
                    <td className="px-5 py-3"><Ref>{o.id}</Ref></td><td className="px-3 py-3">{o.productName}<span className="block text-xs text-muted">{o.quantity} {o.unit}</span></td>
                    <td className="px-3 py-3 text-xs">{role === 'admin' ? <>{o.buyerName}<span className="block text-muted">{o.supplierName}</span></> : <Ref>{o.supplierRef || o.buyerRef}</Ref>}</td>
                    <td className="px-3 py-3"><StatusBadge status={o.status} /></td><td className="px-5 py-3 text-right">{money(o.totalPrice)}</td>
                  </tr>))}</tbody>
              </table>
            </div>)}
        </Card>
        <Card className="p-5">
          <h3 className="text-base font-semibold text-forest">{role === 'supplier' ? 'Requests awaiting your quotation' : 'Recent purchase requests'}</h3>
          {recentRequests.length === 0 ? <EmptyState title="No open requests" /> : (
            <ul className="mt-3 space-y-3">{recentRequests.map((r) => (
              <li key={r.id} className="rounded-lg bg-cream p-3 text-sm">
                <div className="flex items-center justify-between"><Ref>{r.id}</Ref><StatusBadge status={r.status} /></div>
                <p className="mt-2 font-medium">{r.productName}</p>
                <p className="text-xs text-muted">{r.quantity} {r.unit} · {role === 'admin' ? `${r.buyerName} → ${r.supplierName}` : (r.supplierRef || r.buyerRef)} · {dateOf(r.createdAt)}</p>
              </li>))}</ul>)}
        </Card>
      </section>

      <Card className="p-5">
        <h3 className="text-base font-semibold text-forest">Recent activity</h3>
        {recentActivities.length === 0 ? <EmptyState title="No activity yet" /> : (
          <ul className="mt-3 divide-y divide-sage/50">{recentActivities.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-4 py-2.5 text-sm"><span>{a.message}</span><span className="shrink-0 text-xs text-muted">{dateTimeOf(a.createdAt)}</span></li>))}</ul>)}
      </Card>
    </div>
  );
}
