'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Users, Factory, Package, ClipboardList, FileText, MessagesSquare, Bell, Settings, Store, UserCircle, Sprout, LogOut, Sun, Sunrise, Moon } from 'lucide-react';
import { api } from '@/lib/client-api.js';
import { Backdrop } from '@/components/Illustrations.jsx';
import MoonNav from '@/components/MoonNav.jsx';

const NAV = {
  admin: [
    ['Dashboard', 'dashboard', LayoutDashboard], ['Buyers', 'buyers', Users], ['Suppliers', 'suppliers', Factory],
    ['Products', 'products', Package], ['Orders', 'orders', ClipboardList], ['Purchase Requests', 'requests', FileText],
    ['Communications', 'messages', MessagesSquare], ['Notifications', 'notifications', Bell], ['Settings', 'settings', Settings],
  ],
  buyer: [
    ['Dashboard', 'dashboard', LayoutDashboard], ['Browse Products', 'products', Store], ['My Purchase Requests', 'requests', FileText],
    ['My Orders', 'orders', ClipboardList], ['Messages', 'messages', MessagesSquare], ['Notifications', 'notifications', Bell], ['My Profile', 'profile', UserCircle],
  ],
  supplier: [
    ['Dashboard', 'dashboard', LayoutDashboard], ['My Products', 'products', Package], ['Incoming Requests', 'requests', FileText],
    ['My Orders', 'orders', ClipboardList], ['Messages', 'messages', MessagesSquare], ['Notifications', 'notifications', Bell], ['My Profile', 'profile', UserCircle],
  ],
};
const ROLE_LABEL = { admin: 'Administrator', buyer: 'Buyer portal', supplier: 'Supplier portal' };

function greeting() {
  const h = new Date().getHours();
  if (h < 12) return { text: 'Good morning', Icon: Sunrise };
  if (h < 18) return { text: 'Good afternoon', Icon: Sun };
  return { text: 'Good evening', Icon: Moon };
}

export default function AppShell({ role, user, children }) {
  const pathname = usePathname();
  const [unread, setUnread] = useState(0);
  const [hello, setHello] = useState(null);
  const [today, setToday] = useState('');
  const [moonOpen, setMoonOpen] = useState(true);
  const [vw, setVw] = useState(1024);

  useEffect(() => { setHello(greeting()); setToday(new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })); }, []);
  useEffect(() => {
    const onResize = () => setVw(window.innerWidth);
    onResize();
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  useEffect(() => {
    let alive = true;
    const load = () => api('/api/notifications?unread=true&pageSize=1').then((r) => alive && setUnread(r.meta.unreadCount)).catch(() => {});
    load();
    const t = setInterval(load, 30000);
    window.addEventListener('agri:notifications', load);
    return () => { alive = false; clearInterval(t); window.removeEventListener('agri:notifications', load); };
  }, [pathname]);

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    window.location.href = '/login';
  }

  const R = Math.max(150, Math.min(230, Math.floor((vw - 16) / 2)));
  const initial = (user.name || '?').trim()[0]?.toUpperCase();

  return (
    <div className="relative min-h-screen">
      <Backdrop />
      <div className="relative z-10 mx-auto flex max-w-[1480px] flex-col gap-4 p-3 lg:p-5">
        <header className="sticky top-3 z-30 flex animate-fade-up items-center justify-between gap-3 rounded-[24px] border border-white bg-white/80 px-4 py-2.5 shadow-soft ring-1 ring-sage/50 backdrop-blur-xl lg:top-4">
          <Link href={`/${role}/dashboard`} className="flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-gradient-to-br from-forest to-leaf text-harvest shadow-md"><Sprout className="h-6 w-6" /></span>
            <span className="hidden sm:block"><span className="block font-display text-xl font-semibold leading-none text-forest">AgriConnect</span><span className="mt-1 block text-[11px] tracking-wide text-muted">Farm to market</span></span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="hidden min-h-[2.5rem] text-right md:block">
              {hello && (<><p className="flex items-center justify-end gap-2 text-sm font-semibold text-forest"><hello.Icon className="h-4 w-4 text-harvest" />{hello.text}, {user.name.split(' ')[0]}</p><p className="text-xs text-muted">{today} · {ROLE_LABEL[role]}</p></>)}
            </div>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-harvest to-[#F3D98B] font-display text-lg font-semibold text-forest shadow-sm" title={user.name}>{initial}</span>
            <Link href={`/${role}/notifications`} className="relative grid h-10 w-10 place-items-center rounded-2xl bg-sage/50 text-forest transition hover:scale-105 hover:bg-sage" aria-label={`Notifications, ${unread} unread`}>
              <Bell className="h-[18px] w-[18px]" />{unread > 0 && <span className="absolute right-1.5 top-1.5 h-2.5 w-2.5 animate-pulse rounded-full bg-harvest ring-2 ring-white" />}
            </Link>
            <button onClick={logout} className="flex items-center gap-2 rounded-2xl bg-forest px-4 py-2.5 text-sm font-medium text-white transition hover:bg-leaf active:scale-95"><LogOut className="h-4 w-4" /><span className="hidden sm:inline">Sign out</span></button>
          </div>
        </header>
        <main key={pathname} className="page-enter flex-1 pt-1" style={{ paddingBottom: moonOpen ? R + 40 : 96 }}>{children}</main>
      </div>
      <MoonNav role={role} items={NAV[role]} pathname={pathname} unread={unread} user={user} roleLabel={ROLE_LABEL[role]} size={R} open={moonOpen} setOpen={setMoonOpen} />
    </div>
  );
}
